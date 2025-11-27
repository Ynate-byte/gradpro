<?php

namespace App\Http\Controllers\Api\Lecturer;

use App\Http\Controllers\Controller;
use App\Models\Detai;
use App\Models\Giangvien;
use App\Models\QuotaGiangvien;
use App\Models\QuotaKhoaBomon;
use App\Models\PhancongNguoiGopY;
use App\Models\Thongbao;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Services\NotificationService;

class QuotaController extends Controller
{
    /**
     * [TRƯỞNG BỘ MÔN] Lấy danh sách giảng viên và quota của họ trong bộ môn
     */
    public function getLecturers(Request $request)
    {
        $planId = $request->query('plan_id');

        if (!$planId) {
            return response()->json(['message' => 'Yêu cầu ID kế hoạch'], 400);
        }

        $currentUser = Auth::user();

        // Kiểm tra quyền Trưởng bộ môn
        if (!$currentUser->giangvien || !in_array('TRUONG_BOMON', $this->getUserPositionCodes())) {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        // 1. Lấy Quota tổng của Bộ môn
        $departmentQuota = QuotaKhoaBomon::where('ID_KEHOACH', $planId)
            ->where('ID_KHOA_BOMON', $departmentId)
            ->where('TRANGTHAI', 'Đang phân công')
            ->first();

        // 2. Lấy tất cả giảng viên trong bộ môn
        $lecturers = Giangvien::where('ID_KHOA_BOMON', $departmentId)
            ->with(['nguoidung'])
            ->get();

        // 3. Tính tổng quota đã phân công cho các GV
        $totalAssigned = QuotaGiangvien::where('ID_KEHOACH', $planId)
            ->whereHas('giangvien', function($q) use ($departmentId) {
                $q->where('ID_KHOA_BOMON', $departmentId);
            })
            ->where('TRANGTHAI', 'Đang phân công')
            ->sum('SO_DETAI_QUOTA');

        $departmentQuotaValue = $departmentQuota ? $departmentQuota->SO_DETAI_QUOTA : 0;

        $result = $lecturers->map(function($lecturer) use ($planId, $departmentQuotaValue, $totalAssigned) {
            // Quota cá nhân
            $quota = QuotaGiangvien::where('ID_KEHOACH', $planId)
                ->where('ID_GIANGVIEN', $lecturer->ID_GIANGVIEN)
                ->where('TRANGTHAI', 'Đang phân công')
                ->first();

            // Số đề tài đã tạo (Tính cả Đã duyệt & Chờ duyệt)
            // [LOGIC]: Đề tài do GV này tạo (ID_NGUOI_DEXUAT)
            $actualCreated = Detai::where('ID_KEHOACH', $planId)
                ->where('ID_NGUOI_DEXUAT', $lecturer->ID_GIANGVIEN)
                ->whereIn('TRANGTHAI', ['Đã duyệt', 'Chờ duyệt'])
                ->count();

            $lecturerAssigned = $quota ? $quota->SO_DETAI_QUOTA : 0;
            
            // Quota còn lại có thể phân (Của bộ môn)
            // = Tổng bộ môn - (Tổng đã phân - Quota của chính người này)
            $availableQuota = $departmentQuotaValue - ($totalAssigned - $lecturerAssigned);

            return [
                'ID_GIANGVIEN' => $lecturer->ID_GIANGVIEN,
                'TEN_GIANGVIEN' => $lecturer->nguoidung->HODEM_VA_TEN,
                'EMAIL' => $lecturer->nguoidung->EMAIL,
                'HOCVI' => $lecturer->HOCVI,
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
     * [TRƯỞNG BỘ MÔN] Phân công quota cho 1 giảng viên
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
        if (!$currentUser->giangvien || !in_array('TRUONG_BOMON', $this->getUserPositionCodes())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;
        $lecturer = Giangvien::findOrFail($request->ID_GIANGVIEN);
        
        if ($lecturer->ID_KHOA_BOMON !== $departmentId) {
            return response()->json(['message' => 'Giảng viên không thuộc bộ môn của bạn'], 403);
        }

        // Kiểm tra xem có vượt quá quota bộ môn không
        $departmentQuota = QuotaKhoaBomon::where('ID_KEHOACH', $request->ID_KEHOACH)
            ->where('ID_KHOA_BOMON', $departmentId)
            ->where('TRANGTHAI', 'Đang phân công')
            ->first();

        if (!$departmentQuota) {
            return response()->json(['message' => 'Chưa có quota phân công cho bộ môn trong kế hoạch này'], 400);
        }

        // Tính tổng đã phân cho NHỮNG NGƯỜI KHÁC
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
                'message' => "Quota vượt quá giới hạn bộ môn. Còn lại: {$availableQuota}"
            ], 400);
        }

        DB::transaction(function () use ($request, $currentUser, $lecturer) {
            $existingQuota = QuotaGiangvien::where('ID_KEHOACH', $request->ID_KEHOACH)
                ->where('ID_GIANGVIEN', $request->ID_GIANGVIEN)
                ->first();

            if ($existingQuota) {
                if ($request->SO_DETAI_QUOTA == 0) {
                    $existingQuota->delete();
                } else {
                    $existingQuota->update([
                        'SO_DETAI_QUOTA' => $request->SO_DETAI_QUOTA,
                        'GHICHU' => $request->GHICHU,
                        'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    ]);
                }
            } else if ($request->SO_DETAI_QUOTA > 0) {
                QuotaGiangvien::create([
                    'ID_KEHOACH' => $request->ID_KEHOACH,
                    'ID_GIANGVIEN' => $request->ID_GIANGVIEN,
                    'SO_DETAI_QUOTA' => $request->SO_DETAI_QUOTA,
                    'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    'GHICHU' => $request->GHICHU,
                    'TRANGTHAI' => 'Đang phân công',
                ]);
            }

            if ($request->SO_DETAI_QUOTA > 0 && $lecturer->nguoidung) {
                NotificationService::send(
                    $lecturer->nguoidung->ID_NGUOIDUNG,
                    "Phân công chỉ tiêu hướng dẫn",
                    "Trưởng bộ môn đã phân công cho bạn hướng dẫn tối đa {$request->SO_DETAI_QUOTA} đề tài.",
                    'ACADEMIC',
                    '/lecturer/quota-management',
                    ['quota' => $request->SO_DETAI_QUOTA, 'plan_id' => $request->ID_KEHOACH],
                    'HIGH'
                );
            }
        });

        return response()->json(['message' => 'Cập nhật quota đề tài cho giảng viên thành công']);
    }

    /**
     * [TRƯỞNG BỘ MÔN] Tự động phân bổ đều quota
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
        if (!$currentUser->giangvien || !in_array('TRUONG_BOMON', $this->getUserPositionCodes())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;
        $planId = $request->ID_KEHOACH;

        try {
            DB::transaction(function () use ($planId, $departmentId, $currentUser) {
                $departmentQuota = QuotaKhoaBomon::where('ID_KEHOACH', $planId)
                    ->where('ID_KHOA_BOMON', $departmentId)
                    ->where('TRANGTHAI', 'Đang phân công')
                    ->first();

                if (!$departmentQuota) {
                    throw new \Exception('Chưa có quota được phân công cho bộ môn này');
                }

                $lecturers = Giangvien::where('ID_KHOA_BOMON', $departmentId)->get();
                if ($lecturers->isEmpty()) {
                    throw new \Exception('Không có giảng viên nào trong bộ môn');
                }

                $topicsPerLecturer = floor($departmentQuota->SO_DETAI_QUOTA / $lecturers->count());
                $remainingTopics = $departmentQuota->SO_DETAI_QUOTA % $lecturers->count();

                $assignments = [];
                foreach ($lecturers as $index => $lecturer) {
                    $lecturerTopics = $topicsPerLecturer + ($index < $remainingTopics ? 1 : 0);
                    $assignments[] = [
                        'lecturer_id' => $lecturer->ID_GIANGVIEN,
                        'quota' => $lecturerTopics,
                        'lecturer_obj' => $lecturer
                    ];
                }

                foreach ($assignments as $assignment) {
                    $existingQuota = QuotaGiangvien::where('ID_KEHOACH', $planId)
                        ->where('ID_GIANGVIEN', $assignment['lecturer_id'])
                        ->first();

                    if ($existingQuota) {
                        $existingQuota->update([
                            'SO_DETAI_QUOTA' => $assignment['quota'],
                            'GHICHU' => 'Tự động phân công từ bộ môn',
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                        ]);
                    } else {
                        QuotaGiangvien::create([
                            'ID_KEHOACH' => $planId,
                            'ID_GIANGVIEN' => $assignment['lecturer_id'],
                            'SO_DETAI_QUOTA' => $assignment['quota'],
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                            'GHICHU' => 'Tự động phân công từ bộ môn',
                            'TRANGTHAI' => 'Đang phân công',
                        ]);
                    }

                    if ($assignment['lecturer_obj']->nguoidung) {
                        NotificationService::send(
                            $assignment['lecturer_obj']->nguoidung->ID_NGUOIDUNG,
                            "Phân công chỉ tiêu tự động",
                            "Bạn được phân công hướng dẫn {$assignment['quota']} đề tài (Chia đều).",
                            'ACADEMIC',
                            '/lecturer/quota-management',
                            ['quota' => $assignment['quota'], 'plan_id' => $planId]
                        );
                    }
                }
            });

            return response()->json(['message' => 'Tự động phân công đề tài cho giảng viên thành công']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * [GIẢNG VIÊN] Xem quota cá nhân và thống kê Review
     */
    public function getMyQuota(Request $request)
    {
        $planId = $request->query('plan_id');

        if (!$planId) {
            return response()->json(['message' => 'Plan ID is required'], 400);
        }

        $currentUser = Auth::user();

        if (!$currentUser->giangvien) {
            return response()->json(['message' => 'Chỉ giảng viên mới có quyền truy cập chức năng này'], 403);
        }

        $lecturerId = $currentUser->giangvien->ID_GIANGVIEN;
        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        // 1. Quota cá nhân
        $quota = QuotaGiangvien::where('ID_KEHOACH', $planId)
            ->where('ID_GIANGVIEN', $lecturerId)
            ->where('TRANGTHAI', 'Đang phân công')
            ->first();

        // 2. Đếm số đề tài GV đã tạo
        $topicsCreated = Detai::where('ID_KEHOACH', $planId)
            ->where('ID_NGUOI_DEXUAT', $lecturerId)
            ->whereIn('TRANGTHAI', ['Đã duyệt', 'Chờ duyệt', 'Yêu cầu chỉnh sửa', 'Đang chỉnh sửa'])
            ->count();

        // 3. Đếm số đề tài thực tế đã có nhóm đăng ký
        $actualAssigned = Detai::where('ID_KEHOACH', $planId)
            ->where('ID_NGUOI_DEXUAT', $lecturerId)
            ->sum('SO_NHOM_HIENTAI');

        // 4. Quota Bộ Môn
        $departmentQuota = QuotaKhoaBomon::where('ID_KEHOACH', $planId)
            ->where('ID_KHOA_BOMON', $departmentId)
            ->where('TRANGTHAI', 'Đang phân công')
            ->first();

        // 5. Tổng quota đã phân công trong Bộ Môn
        $totalDepartmentAssigned = QuotaGiangvien::where('ID_KEHOACH', $planId)
            ->whereHas('giangvien', function($q) use ($departmentId) {
                $q->where('ID_KHOA_BOMON', $departmentId);
            })
            ->where('TRANGTHAI', 'Đang phân công')
            ->sum('SO_DETAI_QUOTA');
        
        // 6. [THỐNG KÊ REVIEW]
        // Tổng số đề tài được phân công phản biện (Góp ý)
        $totalReviewsAssigned = PhancongNguoiGopY::where('ID_GIANGVIEN', $lecturerId)
            ->whereHas('detai', function($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            })
            ->count();

        // Số đề tài ĐÃ góp ý (Có bản ghi trong GOIY_DETAI)
        $reviewedCount = PhancongNguoiGopY::where('ID_GIANGVIEN', $lecturerId)
            ->whereHas('detai', function($q) use ($planId, $lecturerId) {
                $q->where('ID_KEHOACH', $planId)
                  ->whereHas('goiyDetai', function($subQ) use ($lecturerId) {
                      $subQ->where('ID_NGUOI_GOIY', $lecturerId)
                           ->orWhere('ID_GIANGVIEN', $lecturerId);
                  });
            })
            ->count();

        $pendingReviews = max(0, $totalReviewsAssigned - $reviewedCount);
        $quotaAssigned = $quota ? $quota->SO_DETAI_QUOTA : 0;
        $topicsNeeded = max(0, $quotaAssigned - $topicsCreated);

        return response()->json([
            // Hướng dẫn
            'quota_assigned' => $quotaAssigned,
            'topics_created' => $topicsCreated,
            'topics_needed' => $topicsNeeded,
            'actual_assigned' => $actualAssigned,
            'remaining_quota' => $quotaAssigned - $actualAssigned,
            
            // Bộ môn
            'department_quota' => $departmentQuota ? $departmentQuota->SO_DETAI_QUOTA : 0,
            'department_assigned' => $totalDepartmentAssigned,
            'department_remaining' => ($departmentQuota ? $departmentQuota->SO_DETAI_QUOTA : 0) - $totalDepartmentAssigned,
            
            // Phản biện (Review)
            'total_reviews_assigned' => $totalReviewsAssigned,
            'reviewed_count' => $reviewedCount,
            'pending_reviews' => $pendingReviews
        ]);
    }
}