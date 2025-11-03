<?php

namespace App\Http\Controllers\Api\Lecturer;

use App\Http\Controllers\Controller;
use App\Models\Detai;
use App\Models\Giangvien;
use App\Models\KhoaBomon;
use App\Models\KehoachKhoaluan;
use App\Models\Nhom;
use App\Models\QuotaGiangvien;
use App\Models\QuotaKhoaBomon;
use App\Models\SinhvienThamgia;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class QuotaController extends Controller
{
    /**
     * Get lecturers in department with quota info for a specific plan
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

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        // Get department quota for this plan
        $departmentQuota = QuotaKhoaBomon::where('ID_KEHOACH', $planId)
            ->where('ID_KHOA_BOMON', $departmentId)
            ->where('TRANGTHAI', 'Đang phân công')
            ->first();

        // Get all lecturers in the department
        $lecturers = Giangvien::where('ID_KHOA_BOMON', $departmentId)
            ->with(['nguoidung'])
            ->get();

      

        // Calculate total quota already assigned to lecturers in department
        $totalAssigned = QuotaGiangvien::where('ID_KEHOACH', $planId)
            ->whereHas('giangvien', function($q) use ($departmentId) {
                $q->where('ID_KHOA_BOMON', $departmentId);
            })
            ->where('TRANGTHAI', 'Đang phân công')
            ->sum('SO_DETAI_QUOTA');

        $departmentQuotaValue = $departmentQuota ? $departmentQuota->SO_DETAI_QUOTA : 0;
        $remainingDepartmentQuota = $departmentQuotaValue - $totalAssigned;

        $result = $lecturers->map(function($lecturer) use ($planId, $departmentQuotaValue, $totalAssigned) {
            // Get current lecturer quota assignment for this plan
            $quota = QuotaGiangvien::where('ID_KEHOACH', $planId)
                ->where('ID_GIANGVIEN', $lecturer->ID_GIANGVIEN)
                ->where('TRANGTHAI', 'Đang phân công')
                ->first();

            // Get actual topics created by this lecturer for this plan
            // Count all created topics including drafts, approved and pending
            $actualCreated = Detai::where('ID_KEHOACH', $planId)
                ->where('ID_NGUOI_DEXUAT', $lecturer->ID_GIANGVIEN)
                ->whereIn('TRANGTHAI', ['Đã duyệt', 'Chờ duyệt'])
                ->count();

            $lecturerAssigned = $quota ? $quota->SO_DETAI_QUOTA : 0;

            // Calculate available quota for this lecturer (department quota - assigned to others)
            $availableQuota = $departmentQuotaValue - ($totalAssigned - $lecturerAssigned);

            return [
                'ID_GIANGVIEN' => $lecturer->ID_GIANGVIEN,
                'TEN_GIANGVIEN' => $lecturer->nguoidung->HODEM_VA_TEN,
                'EMAIL' => $lecturer->nguoidung->EMAIL,
                'HOCVI' => $lecturer->HOCVI,
                'CHUCVU' => $lecturer->CHUCVU,
                'quota_assigned' => $lecturerAssigned,
                'topics_created' => $actualCreated,
                'available_quota' => max(0, $availableQuota),
            ];
        });

        return response()->json([
            'department_quota' => $departmentQuota ? $departmentQuota->SO_DETAI_QUOTA : 0,
            'lecturers' => $result,
        ]);
    }

    /**
     * Assign topic quota to lecturer for a specific plan
     */
    public function assignLecturerQuota(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'ID_GIANGVIEN' => 'required|exists:GIANGVIEN,ID_GIANGVIEN',
            'SO_DETAI_QUOTA' => 'required|integer|min:0|max:50',
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

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        // Check if lecturer belongs to the same department
        $lecturer = Giangvien::findOrFail($request->ID_GIANGVIEN);
        if ($lecturer->ID_KHOA_BOMON !== $departmentId) {
            return response()->json(['message' => 'Lecturer does not belong to your department'], 403);
        }

        // Check department quota limit
        $departmentQuota = QuotaKhoaBomon::where('ID_KEHOACH', $request->ID_KEHOACH)
            ->where('ID_KHOA_BOMON', $departmentId)
            ->where('TRANGTHAI', 'Đang phân công')
            ->first();

        if (!$departmentQuota) {
            return response()->json(['message' => 'No department quota assigned for this plan'], 400);
        }

        // Calculate total quota already assigned to other lecturers in department
        $totalAssignedToOthers = QuotaGiangvien::where('ID_KEHOACH', $request->ID_KEHOACH)
            ->whereHas('giangvien', function($q) use ($departmentId) {
                $q->where('ID_KHOA_BOMON', $departmentId);
            })
            ->where('ID_GIANGVIEN', '!=', $request->ID_GIANGVIEN)
            ->where('TRANGTHAI', 'Đang phân công')
            ->sum('SO_DETAI_QUOTA');

        $availableQuota = $departmentQuota->SO_DETAI_QUOTA - $totalAssignedToOthers;

        if ($request->SO_DETAI_QUOTA > $availableQuota) {
            return response()->json([
                'message' => "Quota exceeds department limit. Available: {$availableQuota}"
            ], 400);
        }

        DB::transaction(function () use ($request, $currentUser) {
            // Check if lecturer already has quota for this plan
            $existingQuota = QuotaGiangvien::where('ID_KEHOACH', $request->ID_KEHOACH)
                ->where('ID_GIANGVIEN', $request->ID_GIANGVIEN)
                ->first();

            if ($existingQuota) {
                if ($request->SO_DETAI_QUOTA == 0) {
                    // Remove quota if set to 0
                    $existingQuota->delete();
                } else {
                    // Update existing quota
                    $existingQuota->update([
                        'SO_DETAI_QUOTA' => $request->SO_DETAI_QUOTA,
                        'GHICHU' => $request->GHICHU,
                        'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    ]);
                }
            } else if ($request->SO_DETAI_QUOTA > 0) {
                // Create new quota assignment
                QuotaGiangvien::create([
                    'ID_KEHOACH' => $request->ID_KEHOACH,
                    'ID_GIANGVIEN' => $request->ID_GIANGVIEN,
                    'SO_DETAI_QUOTA' => $request->SO_DETAI_QUOTA,
                    'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    'GHICHU' => $request->GHICHU,
                    'TRANGTHAI' => 'Đang phân công',
                ]);

                // Send notification to lecturer
                $lecturer = Giangvien::find($request->ID_GIANGVIEN);
                if ($lecturer && $lecturer->nguoidung) {
                    Notification::create([
                        'user_id' => $lecturer->nguoidung->ID_NGUOIDUNG,
                        'type' => 'lecturer_quota_assigned',
                        'data' => [
                            'message' => "Bạn đã được phân công {$request->SO_DETAI_QUOTA} đề tài",
                            'quota' => $request->SO_DETAI_QUOTA,
                            'plan_id' => $request->ID_KEHOACH,
                        ],
                    ]);
                }
            }
        });

        return response()->json(['message' => 'Cập nhật quota đề tài cho giảng viên thành công']);
    }

    /**
     * Auto assign topic quotas to lecturers in department based on plan
     */
    public function autoAssignLecturerQuotas(Request $request)
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

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;
        $planId = $request->ID_KEHOACH;

        try {
            DB::transaction(function () use ($planId, $departmentId, $currentUser) {
                // Get department quota for this plan
                $departmentQuota = QuotaKhoaBomon::where('ID_KEHOACH', $planId)
                    ->where('ID_KHOA_BOMON', $departmentId)
                    ->where('TRANGTHAI', 'Đang phân công')
                    ->first();

                if (!$departmentQuota) {
                    throw new \Exception('Chưa có quota được phân công cho bộ môn này');
                }

                // Get all lecturers in the department
                $lecturers = Giangvien::where('ID_KHOA_BOMON', $departmentId)->get();

                if ($lecturers->isEmpty()) {
                    throw new \Exception('Không có giảng viên nào trong bộ môn');
                }

                // Calculate topics per lecturer (equal distribution)
                $topicsPerLecturer = floor($departmentQuota->SO_DETAI_QUOTA / $lecturers->count());
                $remainingTopics = $departmentQuota->SO_DETAI_QUOTA % $lecturers->count();

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
                    // Check if lecturer already has quota for this plan
                    $existingQuota = QuotaGiangvien::where('ID_KEHOACH', $planId)
                        ->where('ID_GIANGVIEN', $assignment['lecturer_id'])
                        ->first();

                    if ($existingQuota) {
                        // Update existing quota
                        $existingQuota->update([
                            'SO_DETAI_QUOTA' => $assignment['quota'],
                            'GHICHU' => 'Tự động phân công từ giảng viên',
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                        ]);
                    } else {
                        // Create new quota assignment
                        QuotaGiangvien::create([
                            'ID_KEHOACH' => $planId,
                            'ID_GIANGVIEN' => $assignment['lecturer_id'],
                            'SO_DETAI_QUOTA' => $assignment['quota'],
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
     * Get current lecturer's quota info for a specific plan
     */
    public function getMyQuota(Request $request)
    {
        $planId = $request->query('plan_id');

        if (!$planId) {
            return response()->json(['message' => 'Plan ID is required'], 400);
        }

        $currentUser = Auth::user();

        // Check if user is lecturer
        if (!$currentUser->giangvien) {
            return response()->json(['message' => 'Chỉ giảng viên mới có quyền truy cập chức năng này'], 403);
        }

        $lecturerId = $currentUser->giangvien->ID_GIANGVIEN;
        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        // Get department quota for this plan
        $departmentQuota = QuotaKhoaBomon::where('ID_KEHOACH', $planId)
            ->where('ID_KHOA_BOMON', $departmentId)
            ->where('TRANGTHAI', 'Đang phân công')
            ->first();

        // Get lecturer's quota assignment for this plan
        $quota = QuotaGiangvien::where('ID_KEHOACH', $planId)
            ->where('ID_GIANGVIEN', $lecturerId)
            ->where('TRANGTHAI', 'Đang phân công')
            ->first();

        // Get topics created by this lecturer for this plan (count all created topics including drafts, approved and pending)
        $topicsCreated = Detai::where('ID_KEHOACH', $planId)
            ->where('ID_NGUOI_DEXUAT', $lecturerId)
            ->whereIn('TRANGTHAI', ['Đã duyệt', 'Chờ duyệt'])
            ->count();

        // Get actual assigned topics count for this plan
        $actualAssigned = \App\Models\PhancongGvDetai::where('ID_GIANGVIEN', $lecturerId)
            ->whereNotNull('ID_DETAI')
            ->where('TRANGTHAI', 'Đang phân công')
            ->whereHas('detai', function($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            })
            ->count();

        // Get total topics assigned in the department
        $totalDepartmentAssigned = QuotaGiangvien::where('ID_KEHOACH', $planId)
            ->whereHas('giangvien', function($q) use ($departmentId) {
                $q->where('ID_KHOA_BOMON', $departmentId);
            })
            ->where('TRANGTHAI', 'Đang phân công')
            ->sum('SO_DETAI_QUOTA');

        $quotaAssigned = $quota ? $quota->SO_DETAI_QUOTA : 0;
        $topicsNeeded = max(0, $quotaAssigned - $topicsCreated);

        return response()->json([
            'quota_assigned' => $quotaAssigned,
            'topics_created' => $topicsCreated,
            'topics_needed' => $topicsNeeded,
            'actual_assigned' => $actualAssigned,
            'remaining_quota' => $quotaAssigned - $actualAssigned,
            'department_quota' => $departmentQuota ? $departmentQuota->SO_DETAI_QUOTA : 0,
            'department_assigned' => $totalDepartmentAssigned,
            'department_remaining' => ($departmentQuota ? $departmentQuota->SO_DETAI_QUOTA : 0) - $totalDepartmentAssigned,
        ]);
    }
}
