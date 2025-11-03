<?php

namespace App\Http\Controllers\Api\Lecturer;

use App\Http\Controllers\Controller;
use App\Models\Detai;
use App\Models\Giangvien;
use App\Models\PhancongGvDetai;
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
                'remaining_quota' => $quotaAssigned - $actualAssigned,
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

        DB::transaction(function () use ($request, $currentUser) {
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

                // Calculate topics needed (1.5 times groups)
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
                            'GHICHU' => 'Tự động phân công từ giảng viên',
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                        ]);
                    } else {
                        // Create new quota assignment
                        PhancongGvDetai::create([
                            'ID_GIANGVIEN' => $assignment['lecturer_id'],
                            'SO_DETAI_PHANCONG' => $assignment['quota'],
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                            'GHICHU' => 'Tự động phân công từ giảng viên',
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

        if ($remainingQuota <= 0) {
            return response()->json(['message' => 'Lecturer has no remaining quota'], 400);
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
}
