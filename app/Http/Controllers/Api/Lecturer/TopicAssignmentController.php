<?php

namespace App\Http\Controllers\Api\Lecturer;

use App\Http\Controllers\Controller;
use App\Models\Detai;
use App\Models\Giangvien;
use App\Models\PhancongGvDetai;
use App\Models\PhancongNguoiGopY;
use App\Models\KhoaBomon;
use App\Models\KehoachKhoaluan;
use App\Models\Nhom;
use App\Models\SinhvienThamgia;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class TopicAssignmentController extends Controller
{
    /**
     * Get lecturers in same department with topic assignment info
     */
    public function getLecturers(Request $request)
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

        // Get lecturer's department
        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        // Get all lecturers in the same department
        $lecturers = Giangvien::where('ID_KHOA_BOMON', $departmentId)
            ->with(['nguoidung'])
            ->get();

        $result = $lecturers->map(function($lecturer) use ($planId) {
            // Get current topic quota assignment
            $quotaAssignment = PhancongGvDetai::where('ID_GIANGVIEN', $lecturer->ID_GIANGVIEN)
                ->whereNull('ID_DETAI')
                ->where('TRANGTHAI', 'Đang phân công')
                ->first();

            // Get actual assigned topics count for this plan
            $actualAssigned = PhancongGvDetai::where('ID_GIANGVIEN', $lecturer->ID_GIANGVIEN)
                ->whereNotNull('ID_DETAI')
                ->where('TRANGTHAI', 'Đang phân công')
                ->whereHas('detai', function($q) use ($planId) {
                    $q->where('ID_KEHOACH', $planId);
                })
                ->count();

            // Get topics created by this lecturer for this plan (only count approved or pending, not draft)
            $topicsCreated = Detai::where('ID_KEHOACH', $planId)
                ->where('ID_NGUOI_DEXUAT', $lecturer->ID_GIANGVIEN)
                ->whereIn('TRANGTHAI', ['Đã duyệt', 'Chờ duyệt'])
                ->count();

            $quotaAssigned = $quotaAssignment ? $quotaAssignment->SO_DETAI_PHANCONG : 0;
            $topicsNeeded = max(0, $quotaAssigned - $topicsCreated);
            $guidingCapacityRemaining = $lecturer->SO_NHOM_TOIDA - $actualAssigned;

            return [
                'ID_GIANGVIEN' => $lecturer->ID_GIANGVIEN,
                'TEN_GIANGVIEN' => $lecturer->nguoidung->HODEM_VA_TEN,
                'EMAIL' => $lecturer->nguoidung->EMAIL,
                'HOCVI' => $lecturer->HOCVI,
                'CHUCVU' => $lecturer->CHUCVU,
                'SO_NHOM_TOIDA' => $lecturer->SO_NHOM_TOIDA,
                'quota_assigned' => $quotaAssigned,
                'actual_assigned' => $actualAssigned,
                'topics_created' => $topicsCreated,
                'topics_needed' => $topicsNeeded,
                'remaining_quota' => $guidingCapacityRemaining,
                'CHUYENMON' => $lecturer->CHUYENMON,
            ];
        });

        return response()->json([
            'department_id' => $departmentId,
            'lecturers' => $result,
        ]);
    }

    /**
     * Assign topic quota to lecturer in same department
     */
    public function assignTopicQuota(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ID_GIANGVIEN' => 'required|exists:GIANGVIEN,ID_GIANGVIEN',
            'SO_DETAI_PHANCONG' => 'required|integer|min:0|max:50',
            'GHICHU' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();

        // Check if user is department head (Trưởng bộ môn)
        if (!$currentUser->giangvien || $currentUser->giangvien->CHUCVU !== 'Trưởng bộ môn') {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        // Get lecturer's department
        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        // Check if target lecturer belongs to the same department
        $lecturer = Giangvien::findOrFail($request->ID_GIANGVIEN);
        if ($lecturer->ID_KHOA_BOMON !== $departmentId) {
            return response()->json(['message' => 'Lecturer does not belong to your department'], 403);
        }

        DB::transaction(function () use ($request, $currentUser, $lecturer) {
            // Check if lecturer already has topic quota assigned
            $existingQuota = PhancongGvDetai::where('ID_GIANGVIEN', $request->ID_GIANGVIEN)
                ->whereNull('ID_DETAI')
                ->first();

            if ($existingQuota) {
                if ($request->SO_DETAI_PHANCONG == 0) {
                    // Remove quota if set to 0
                    $existingQuota->delete();
                } else {
                    // Update existing quota
                    $existingQuota->update([
                        'SO_DETAI_PHANCONG' => $request->SO_DETAI_PHANCONG,
                        'GHICHU' => $request->GHICHU,
                        'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    ]);
                }
            } else if ($request->SO_DETAI_PHANCONG > 0) {
                // Create new quota assignment
                PhancongGvDetai::create([
                    'ID_GIANGVIEN' => $request->ID_GIANGVIEN,
                    'SO_DETAI_PHANCONG' => $request->SO_DETAI_PHANCONG,
                    'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    'GHICHU' => $request->GHICHU,
                    'TRANGTHAI' => 'Đang phân công',
                ]);

                // Send notification to lecturer
                if ($lecturer && $lecturer->nguoidung) {
                    Notification::create([
                        'user_id' => $lecturer->nguoidung->ID_NGUOIDUNG,
                        'type' => 'topic_quota_assigned',
                        'data' => [
                            'message' => "Bạn đã được phân công hướng dẫn {$request->SO_DETAI_PHANCONG} đề tài",
                            'quota' => $request->SO_DETAI_PHANCONG,
                        ],
                    ]);
                }
            }
        });

        return response()->json(['message' => 'Cập nhật phân công đề tài cho giảng viên thành công']);
    }

    /**
     * Auto assign topic quotas to lecturers in same department
     */
    public function autoAssignTopicQuotas(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();

        // Check if user is department head (Trưởng bộ môn)
        if (!$currentUser->giangvien || $currentUser->giangvien->CHUCVU !== 'Trưởng bộ môn') {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        // Get lecturer's department
        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;
        $planId = $request->ID_KEHOACH;

        try {
            DB::transaction(function () use ($planId, $departmentId, $currentUser) {
                // Get all lecturers in the department
                $lecturers = Giangvien::where('ID_KHOA_BOMON', $departmentId)->get();

                if ($lecturers->isEmpty()) {
                    throw new \Exception('Không có giảng viên nào trong bộ môn');
                }

                // Get total groups in this department for this plan
                $totalGroups = Nhom::where('ID_KEHOACH', $planId)
                    ->where('ID_KHOA_BOMON', $departmentId)
                    ->count();

                if ($totalGroups === 0) {
                    throw new \Exception('Không có nhóm nào trong bộ môn cho kế hoạch này');
                }

                // Calculate topics needed (minimum number of topics required)
                $totalTopics = ceil($totalGroups * 1.5);

                // Calculate topics per lecturer (equal distribution)
                $topicsPerLecturer = floor($totalTopics / $lecturers->count());
                $remainingTopics = $totalTopics % $lecturers->count();

                $assignments = [];

                foreach ($lecturers as $index => $lecturer) {
                    // Add remaining topics to first lecturers
                    $lecturerTopics = $topicsPerLecturer + ($index < $remainingTopics ? 1 : 0);

                    $assignments[] = [
                        'lecturer_id' => $lecturer->ID_GIANGVIEN,
                        'quota' => $lecturerTopics,
                    ];
                }

                // Apply assignments to lecturers
                foreach ($assignments as $assignment) {
                    // Check if lecturer already has quota
                    $existingQuota = PhancongGvDetai::where('ID_GIANGVIEN', $assignment['lecturer_id'])
                        ->whereNull('ID_DETAI')
                        ->first();

                    if ($existingQuota) {
                        // Update existing quota
                        $existingQuota->update([
                            'SO_DETAI_PHANCONG' => $assignment['quota'],
                            'GHICHU' => 'Tự động phân công - số lượng đề tài tối thiểu cần ra đề tài',
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                        ]);
                    } else {
                        // Create new quota assignment
                        PhancongGvDetai::create([
                            'ID_GIANGVIEN' => $assignment['lecturer_id'],
                            'SO_DETAI_PHANCONG' => $assignment['quota'],
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                            'GHICHU' => 'Tự động phân công - số lượng đề tài tối thiểu cần ra đề tài',
                            'TRANGTHAI' => 'Đang phân công',
                        ]);
                    }
                }
            });

            return response()->json(['message' => 'Tự động phân công đề tài cho giảng viên thành công']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Get topics available for assignment in department
     */
    public function getAvailableTopics(Request $request)
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

        // Get lecturer's department
        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        // Get approved topics from this department that are not yet assigned
        $topics = Detai::where('ID_KEHOACH', $planId)
            ->where('TRANGTHAI', 'Đã duyệt')
            ->whereHas('nguoiDexuat', function($q) use ($departmentId) {
                $q->where('ID_KHOA_BOMON', $departmentId);
            })
            ->whereDoesntHave('phancongGvDetai', function($q) {
                $q->where('TRANGTHAI', 'Đang phân công');
            })
            ->with(['nguoiDexuat.nguoidung', 'chuyennganh'])
            ->get();

        $result = $topics->map(function($topic) {
            return [
                'ID_DETAI' => $topic->ID_DETAI,
                'TEN_DETAI' => $topic->TEN_DETAI,
                'MO_TA' => $topic->MO_TA,
                'NGUOI_DE_XUAT' => $topic->nguoiDexuat->nguoidung->HODEM_VA_TEN ?? 'N/A',
                'CHUYEN_NGANH' => $topic->chuyennganh->TEN_CHUYEN_NGANH ?? 'N/A',
                'NGAY_TAO' => $topic->NGAY_TAO,
            ];
        });

        return response()->json($result);
    }

    /**
     * Get topics for reviewer assignment in department
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

        // Get lecturer's department
        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        // Get approved/pending topics from all departments in the plan
        $topics = Detai::where('ID_KEHOACH', $planId)
            ->whereIn('TRANGTHAI', ['Đã duyệt', 'Chờ duyệt'])
            ->with(['nguoiDexuat.nguoidung', 'chuyennganh', 'phancong_nguoi_gop_y.giangvien.nguoidung'])
            ->get();

        $result = $topics->map(function($topic) {
            return [
                'ID_DETAI' => $topic->ID_DETAI,
                'TEN_DETAI' => $topic->TEN_DETAI,
                'MO_TA' => $topic->MO_TA,
                'ID_NGUOI_DEXUAT' => $topic->ID_NGUOI_DEXUAT,
                'nguoiDexuat' => $topic->nguoiDexuat,
                'phancong_nguoi_gop_y' => $topic->phancong_nguoi_gop_y,
                'TRANGTHAI' => $topic->TRANGTHAI,
            ];
        });

        return response()->json($result);
    }

    /**
     * Assign specific topic to lecturer in same department
     */
    public function assignSpecificTopic(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ID_DETAI' => 'required|exists:DETAI,ID_DETAI',
            'ID_GIANGVIEN' => 'required|exists:GIANGVIEN,ID_GIANGVIEN',
            'GHICHU' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();

        // Check if user is department head (Trưởng bộ môn)
        if (!$currentUser->giangvien || $currentUser->giangvien->CHUCVU !== 'Trưởng bộ môn') {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        // Get lecturer's department
        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        // Check if target lecturer belongs to the same department
        $lecturer = Giangvien::findOrFail($request->ID_GIANGVIEN);
        if ($lecturer->ID_KHOA_BOMON !== $departmentId) {
            return response()->json(['message' => 'Lecturer does not belong to your department'], 403);
        }

        // Check if topic belongs to this department
        $topic = Detai::with('nguoiDexuat')->findOrFail($request->ID_DETAI);
        if ($topic->nguoiDexuat->ID_KHOA_BOMON !== $departmentId) {
            return response()->json(['message' => 'Topic does not belong to your department'], 403);
        }

        // Check if topic is already assigned
        $existingAssignment = PhancongGvDetai::where('ID_DETAI', $request->ID_DETAI)
            ->where('TRANGTHAI', 'Đang phân công')
            ->first();

        if ($existingAssignment) {
            return response()->json(['message' => 'Topic is already assigned'], 409);
        }

        // Check lecturer's remaining quota
        $quotaAssignment = PhancongGvDetai::where('ID_GIANGVIEN', $request->ID_GIANGVIEN)
            ->whereNull('ID_DETAI')
            ->where('TRANGTHAI', 'Đang phân công')
            ->first();

        $actualAssigned = PhancongGvDetai::where('ID_GIANGVIEN', $request->ID_GIANGVIEN)
            ->whereNotNull('ID_DETAI')
            ->where('TRANGTHAI', 'Đang phân công')
            ->count();

        $remainingQuota = ($quotaAssignment ? $quotaAssignment->SO_DETAI_PHANCONG : 0) - $actualAssigned;
        $guidingCapacityRemaining = $lecturer->SO_NHOM_TOIDA - $actualAssigned;

        if ($remainingQuota <= 0) {
            return response()->json(['message' => 'Lecturer has no remaining quota'], 400);
        }

        if ($guidingCapacityRemaining <= 0) {
            return response()->json(['message' => 'Lecturer has reached maximum guiding capacity'], 400);
        }

        DB::transaction(function () use ($request, $currentUser, $lecturer, $topic) {
            // Create topic assignment
            PhancongGvDetai::create([
                'ID_GIANGVIEN' => $request->ID_GIANGVIEN,
                'ID_DETAI' => $request->ID_DETAI,
                'SO_DETAI_PHANCONG' => 1, // Specific topic assignment
                'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                'GHICHU' => $request->GHICHU,
                'TRANGTHAI' => 'Đang phân công',
            ]);

            // Send notification to lecturer
            if ($lecturer && $lecturer->nguoidung) {
                Notification::create([
                    'user_id' => $lecturer->nguoidung->ID_NGUOIDUNG,
                    'type' => 'topic_assigned',
                    'data' => [
                        'message' => "Bạn đã được phân công hướng dẫn đề tài: {$topic->TEN_DETAI}",
                        'topic_name' => $topic->TEN_DETAI,
                        'topic_id' => $topic->ID_DETAI,
                    ],
                ]);
            }
        });

        return response()->json(['message' => 'Phân công đề tài thành công']);
    }

    /**
     * Assign reviewers to topics (Manual assignment)
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
                $reviewer = Giangvien::findOrFail($assignment['reviewer_id']);
                if ($reviewer->ID_KHOA_BOMON !== $departmentId) {
                    throw new \Exception("Reviewer {$reviewer->nguoidung->TEN_NGUOIDUNG} is not from your department");
                }

                // Check if reviewer is not the lecturer assigned to this topic
                $lecturerAssignment = PhancongGvDetai::where('ID_DETAI', $assignment['topic_id'])
                    ->where('TRANGTHAI', 'Đang phân công')
                    ->first();

                if ($lecturerAssignment && $lecturerAssignment->ID_GIANGVIEN == $assignment['reviewer_id']) {
                    throw new \Exception("Reviewer cannot be the lecturer assigned to this topic");
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
                    Notification::create([
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
     * Auto assign reviewers to topics (Random assignment)
     */
    public function autoAssignReviewers(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'plan_id' => 'required|exists:kehoach_khoaluan,ID_KEHOACH',
            'reviewers_per_topic' => 'required|integer|min:1|max:5',
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

        // Get all approved topics in the plan from this department
        $topics = Detai::where('ID_KEHOACH', $request->plan_id)
            ->whereIn('TRANGTHAI', ['Đã duyệt', 'Chờ duyệt'])
            ->whereHas('nguoiDexuat', function($q) use ($departmentId) {
                $q->where('ID_KHOA_BOMON', $departmentId);
            })
            ->with('nguoiDexuat')
            ->get();

        if ($topics->isEmpty()) {
            return response()->json(['message' => 'Không có đề tài nào trong kế hoạch này'], 400);
        }

        // Get all lecturers in the department (potential reviewers)
        $lecturers = Giangvien::where('ID_KHOA_BOMON', $departmentId)
            ->with('nguoidung')
            ->get();

        if ($lecturers->count() < 2) {
            return response()->json(['message' => 'Cần ít nhất 2 giảng viên trong bộ môn để phân công người góp ý'], 400);
        }

        DB::transaction(function () use ($topics, $lecturers, $request, $currentUser) {
            foreach ($topics as $topic) {
                // Get lecturer assigned to this topic
                $lecturerAssignment = PhancongGvDetai::where('ID_DETAI', $topic->ID_DETAI)
                    ->where('TRANGTHAI', 'Đang phân công')
                    ->first();

                $assignedLecturerId = $lecturerAssignment ? $lecturerAssignment->ID_GIANGVIEN : null;

                // Get available reviewers (exclude the assigned lecturer)
                $availableReviewers = $lecturers->filter(function($lecturer) use ($assignedLecturerId) {
                    return $lecturer->ID_GIANGVIEN !== $assignedLecturerId;
                });

                if ($availableReviewers->count() < $request->reviewers_per_topic) {
                    throw new \Exception("Không đủ giảng viên để phân công cho đề tài: {$topic->TEN_DETAI}");
                }

                // Randomly select reviewers
                $selectedReviewers = $availableReviewers->random($request->reviewers_per_topic);

                foreach ($selectedReviewers as $reviewer) {
                    // Check if already assigned
                    $existingAssignment = PhancongNguoiGopY::where('ID_DETAI', $topic->ID_DETAI)
                        ->where('ID_GIANGVIEN', $reviewer->ID_GIANGVIEN)
                        ->first();

                    if (!$existingAssignment) {
                        // Create reviewer assignment
                        PhancongNguoiGopY::create([
                            'ID_DETAI' => $topic->ID_DETAI,
                            'ID_GIANGVIEN' => $reviewer->ID_GIANGVIEN,
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                            'GHICHU' => $request->note,
                            'TRANGTHAI' => 'Đang phân công',
                        ]);

                        // Send notification to reviewer
                        if ($reviewer->nguoidung) {
                            Notification::create([
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
                }
            }
        });

        return response()->json(['message' => 'Tự động phân công người góp ý thành công']);
    }
}
