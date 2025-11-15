<?php

namespace App\Http\Controllers\Api\DepartmentHead;

use App\Http\Controllers\Api\Lecturer\TopicAssignmentController as BaseTopicAssignmentController;
use App\Models\Detai;
use App\Models\PhancongNguoiGopY;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class TopicAssignmentController extends BaseTopicAssignmentController
{
    /**
     * Get lecturers in the department for reviewer selection
     */
    public function getLecturers(Request $request)
    {
        $currentUser = Auth::user();

        // Check if user is department head
        if (!$currentUser->giangvien || $currentUser->giangvien->CHUCVU !== 'Trưởng bộ môn') {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        if (!$departmentId) {
            return response()->json(['message' => 'Department not found for user'], 400);
        }

        $lecturers = \App\Models\Giangvien::where('ID_KHOA_BOMON', $departmentId)
            ->with('nguoidung')
            ->get()
            ->map(function($lecturer) {
                return [
                    'ID_GIANGVIEN' => $lecturer->ID_GIANGVIEN,
                    'TEN_GIANGVIEN' => $lecturer->nguoidung ? $lecturer->nguoidung->HODEM_VA_TEN : 'N/A',
                    'HOCVI' => $lecturer->HOCVI,
                ];
            });

        return response()->json(['lecturers' => $lecturers]);
    }

    /**
     * Get topics for reviewer assignment in department (both assigned and unassigned)
     */
    public function getTopicsForReviewers(Request $request)
    {
        $planId = $request->query('plan_id');

        if (!$planId) {
            return response()->json(['message' => 'Plan ID is required'], 400);
        }

        $currentUser = Auth::user();

        // Check if user is department head (Trưởng bộ môn)
        if (!$currentUser->giangvien || $currentUser->giangvien->CHUCVU !== 'Trưởng bộ môn') {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        if (!$departmentId) {
            return response()->json(['message' => 'Department not found for user'], 400);
        }

        // Get all pending topics from the department (both assigned and unassigned)
        // Include both "Chờ duyệt" and "Đang chỉnh sửa" statuses, exclude "Nháp"
        $topics = Detai::where('ID_KEHOACH', $planId)
            ->whereIn('TRANGTHAI', ['Chờ duyệt', 'Đang chỉnh sửa'])
            ->whereHas('nguoiDexuat', function($query) use ($departmentId) {
                $query->where('ID_KHOA_BOMON', $departmentId);
            })
            ->with(['nguoiDexuat.nguoidung', 'chuyennganh', 'phancong_nguoi_gop_y.giangvien.nguoidung'])
            ->get();

        $result = $topics->map(function($topic) {
            $reviewerCount = $topic->phancong_nguoi_gop_y ? $topic->phancong_nguoi_gop_y->count() : 0;
            $reviewerNames = $topic->phancong_nguoi_gop_y ?
                $topic->phancong_nguoi_gop_y->map(function($assignment) {
                    return $assignment->giangvien->nguoidung->HODEM_VA_TEN ?? 'N/A';
                })->join(', ') : '';

            return [
                'ID_DETAI' => $topic->ID_DETAI,
                'TEN_DETAI' => $topic->TEN_DETAI,
                'MO_TA' => $topic->MO_TA,
                'ID_NGUOI_DEXUAT' => $topic->ID_NGUOI_DEXUAT,
                'nguoiDexuat' => $topic->nguoiDexuat,
                'phancong_nguoi_gop_y' => $topic->phancong_nguoi_gop_y,
                'TRANGTHAI' => $topic->TRANGTHAI,
                'reviewer_count' => $reviewerCount,
                'reviewer_names' => $reviewerNames,
            ];
        });

        return response()->json($result);
    }

    /**
     * Assign reviewers to topics (Department-restricted)
     */
    public function assignReviewers(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'assignments' => 'required|array',
            'assignments.*.topic_id' => 'required|exists:detai,ID_DETAI',
            'assignments.*.reviewer_id' => 'required|exists:giangvien,ID_GIANGVIEN',
            'note' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();

        // Check if user is department head
        if (!$currentUser->giangvien || $currentUser->giangvien->CHUCVU !== 'Trưởng bộ môn') {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        DB::transaction(function () use ($request, $currentUser, $departmentId) {
            foreach ($request->assignments as $assignment) {
                $topic = Detai::with('nguoiDexuat')->findOrFail($assignment['topic_id']);

                // Check if topic belongs to department
                if ($topic->nguoiDexuat->ID_KHOA_BOMON !== $departmentId) {
                    throw new \Exception("Topic {$topic->TEN_DETAI} does not belong to your department");
                }

                // Check if reviewer is from same department
                $reviewer = \App\Models\Giangvien::findOrFail($assignment['reviewer_id']);
                if ($reviewer->ID_KHOA_BOMON !== $departmentId) {
                    throw new \Exception("Reviewer {$reviewer->nguoidung->HODEM_VA_TEN} is not from your department");
                }

                // Check if reviewer is not the proposer of this topic
                if ($reviewer->ID_GIANGVIEN == $topic->ID_NGUOI_DEXUAT) {
                    throw new \Exception("Reviewer cannot be the proposer of this topic");
                }

                // Check if reviewer is already assigned to this topic
                $existingAssignment = PhancongNguoiGopY::where('ID_DETAI', $assignment['topic_id'])
                    ->where('ID_GIANGVIEN', $assignment['reviewer_id'])
                    ->first();

                if ($existingAssignment) {
                    continue; // Skip if already assigned
                }

                // Create reviewer assignment
                PhancongNguoiGopY::create([
                    'ID_DETAI' => $assignment['topic_id'],
                    'ID_GIANGVIEN' => $assignment['reviewer_id'],
                    'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    'GHICHU' => $request->note,
                    'TRANGTHAI' => 'Đang phân công',
                ]);

                // Send notification to reviewer
                if ($reviewer->nguoidung) {
                    \App\Models\Notification::create([
                        'user_id' => $reviewer->nguoidung->ID_NGUOIDUNG,
                        'type' => 'reviewer_assigned',
                        'data' => [
                            'message' => "Bạn đã được phân công góp ý đề tài: {$topic->TEN_DETAI}",
                            'topic_name' => $topic->TEN_DETAI,
                            'topic_id' => $topic->ID_DETAI,
                        ],
                    ]);
                }
            }
        });

        return response()->json(['message' => 'Phân công người góp ý thành công']);
    }

    /**
     * Auto assign reviewers to topics (Random assignment within department)
     */
    public function autoAssignReviewers(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ID_KEHOACH' => 'required|exists:kehoach_khoaluan,ID_KEHOACH',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();

        // Check if user is department head
        if (!$currentUser->giangvien || $currentUser->giangvien->CHUCVU !== 'Trưởng bộ môn') {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        // Get all pending topics in the plan from this department
        // Include both "Chờ duyệt" and "Đang chỉnh sửa" statuses, exclude "Nháp"
        $topics = Detai::where('ID_KEHOACH', $request->ID_KEHOACH)
            ->whereIn('TRANGTHAI', ['Chờ duyệt', 'Đang chỉnh sửa'])
            ->whereHas('nguoiDexuat', function($query) use ($departmentId) {
                $query->where('ID_KHOA_BOMON', $departmentId);
            })
            ->whereDoesntHave('phancong_nguoi_gop_y')
            ->with('nguoiDexuat')
            ->get();

        if ($topics->isEmpty()) {
            return response()->json(['message' => 'Không có đề tài nào cần phân công người góp ý'], 400);
        }

        // Get all lecturers in the department (potential reviewers)
        $lecturers = \App\Models\Giangvien::where('ID_KHOA_BOMON', $departmentId)
            ->with('nguoidung')
            ->get();

        if ($lecturers->count() < 1) {
            return response()->json(['message' => 'Cần ít nhất 1 giảng viên trong bộ môn để phân công người góp ý'], 400);
        }

        DB::transaction(function () use ($topics, $lecturers, $request, $currentUser) {
            // Calculate balanced assignment to ensure fair distribution
            $totalTopics = $topics->count();
            $totalLecturers = $lecturers->count();

            if ($totalLecturers == 0) {
                throw new \Exception("Không có giảng viên nào trong bộ môn");
            }

            // Calculate base assignments per lecturer and remainder
            $baseAssignments = intdiv($totalTopics, $totalLecturers);
            $extraAssignments = $totalTopics % $totalLecturers;

            // Initialize assignment counts for each lecturer
            $assignmentCounts = [];
            foreach ($lecturers as $lecturer) {
                $assignmentCounts[$lecturer->ID_GIANGVIEN] = [
                    'count' => 0,
                    'lecturer' => $lecturer,
                    'max_allowed' => $baseAssignments + ($extraAssignments > 0 ? 1 : 0)
                ];
                $extraAssignments--;
            }

            // Shuffle topics for random assignment
            $shuffledTopics = $topics->shuffle();

            foreach ($shuffledTopics as $topic) {
                // Get available reviewers (exclude the proposer and ensure balanced load)
                $availableReviewers = $lecturers->filter(function($lecturer) use ($topic, $assignmentCounts) {
                    return $lecturer->ID_GIANGVIEN !== $topic->ID_NGUOI_DEXUAT &&
                           $assignmentCounts[$lecturer->ID_GIANGVIEN]['count'] < $assignmentCounts[$lecturer->ID_GIANGVIEN]['max_allowed'];
                });

                if ($availableReviewers->isEmpty()) {
                    // If no reviewers available with balanced load, allow slight imbalance (max +1)
                    $availableReviewers = $lecturers->filter(function($lecturer) use ($topic, $assignmentCounts) {
                        return $lecturer->ID_GIANGVIEN !== $topic->ID_NGUOI_DEXUAT &&
                               $assignmentCounts[$lecturer->ID_GIANGVIEN]['count'] < $assignmentCounts[$lecturer->ID_GIANGVIEN]['max_allowed'] + 1;
                    });
                }

                if ($availableReviewers->isEmpty()) {
                    throw new \Exception("Không đủ giảng viên để phân công cho đề tài: {$topic->TEN_DETAI}");
                }

                // Select 1 reviewer (balanced approach uses 1 reviewer per topic to ensure fairness)
                $selectedReviewer = $availableReviewers->random(1)->first();

                // Check if already assigned
                $existingAssignment = PhancongNguoiGopY::where('ID_DETAI', $topic->ID_DETAI)
                    ->where('ID_GIANGVIEN', $selectedReviewer->ID_GIANGVIEN)
                    ->first();

                if (!$existingAssignment) {
                    // Create reviewer assignment
                    PhancongNguoiGopY::create([
                        'ID_DETAI' => $topic->ID_DETAI,
                        'ID_GIANGVIEN' => $selectedReviewer->ID_GIANGVIEN,
                        'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                        'GHICHU' => 'Tự động phân công (cân bằng)',
                        'TRANGTHAI' => 'Đang phân công',
                    ]);

                    // Update assignment count
                    $assignmentCounts[$selectedReviewer->ID_GIANGVIEN]['count']++;

                    // Send notification to reviewer
                    if ($selectedReviewer->nguoidung) {
                        \App\Models\Notification::create([
                            'user_id' => $selectedReviewer->nguoidung->ID_NGUOIDUNG,
                            'type' => 'reviewer_assigned',
                            'data' => [
                                'message' => "Bạn đã được phân công góp ý đề tài: {$topic->TEN_DETAI}",
                                'topic_name' => $topic->TEN_DETAI,
                                'topic_id' => $topic->ID_DETAI,
                            ],
                        ]);
                    }
                }
            }
        });

        return response()->json(['message' => 'Tự động phân công người góp ý thành công']);
    }
}
