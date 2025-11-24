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
use App\Models\PhancongNguoiGopY;
use App\Models\Thongbao;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class QuotaController extends Controller
{
    /**
     * Lấy danh sách giảng viên trong bộ môn cùng thông tin quota cho một kế hoạch cụ thể
     */
    public function getLecturers(Request $request)
    {
        $planId = $request->query('plan_id');

        if (!$planId) {
            return response()->json(['message' => 'Yêu cầu ID kế hoạch'], 400);
        }

        $currentUser = Auth::user();

        // [CẬP NHẬT] Kiểm tra nếu user là Trưởng bộ môn (Sử dụng logic N-N)
        if (!$currentUser->giangvien || !in_array('TRUONG_BOMON', $this->getUserPositionCodes())) {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        // Lấy quota của bộ môn cho kế hoạch này
        $departmentQuota = QuotaKhoaBomon::where('ID_KEHOACH', $planId)
            ->where('ID_KHOA_BOMON', $departmentId)
            ->where('TRANGTHAI', 'Đang phân công')
            ->first();

        // Lấy tất cả giảng viên trong bộ môn
        $lecturers = Giangvien::where('ID_KHOA_BOMON', $departmentId)
            ->with(['nguoidung'])
            ->get();

        // Tính tổng quota đã phân công cho các giảng viên trong bộ môn
        $totalAssigned = QuotaGiangvien::where('ID_KEHOACH', $planId)
            ->whereHas('giangvien', function($q) use ($departmentId) {
                $q->where('ID_KHOA_BOMON', $departmentId);
            })
            ->where('TRANGTHAI', 'Đang phân công')
            ->sum('SO_DETAI_QUOTA');

        $departmentQuotaValue = $departmentQuota ? $departmentQuota->SO_DETAI_QUOTA : 0;
        // $remainingDepartmentQuota = $departmentQuotaValue - $totalAssigned; // Biến này không dùng trong loop nhưng có thể dùng để validation

        $result = $lecturers->map(function($lecturer) use ($planId, $departmentQuotaValue, $totalAssigned) {
            // Lấy quota hiện tại của giảng viên cho kế hoạch này
            $quota = QuotaGiangvien::where('ID_KEHOACH', $planId)
                ->where('ID_GIANGVIEN', $lecturer->ID_GIANGVIEN)
                ->where('TRANGTHAI', 'Đang phân công')
                ->first();

            // Lấy số lượng đề tài thực tế đã tạo (bao gồm Đã duyệt và Chờ duyệt)
            $actualCreated = Detai::where('ID_KEHOACH', $planId)
                ->where('ID_NGUOI_DEXUAT', $lecturer->ID_GIANGVIEN)
                ->whereIn('TRANGTHAI', ['Đã duyệt', 'Chờ duyệt'])
                ->count();

            $lecturerAssigned = $quota ? $quota->SO_DETAI_QUOTA : 0;

            // Tính quota khả dụng cho giảng viên này (Quota bộ môn - Đã phân cho người khác)
            // Logic: Tổng quota bộ môn - (Tổng đã phân - Quota của chính giảng viên này)
            $availableQuota = $departmentQuotaValue - ($totalAssigned - $lecturerAssigned);

            return [
                'ID_GIANGVIEN' => $lecturer->ID_GIANGVIEN,
                'TEN_GIANGVIEN' => $lecturer->nguoidung->HODEM_VA_TEN,
                'EMAIL' => $lecturer->nguoidung->EMAIL,
                'HOCVI' => $lecturer->HOCVI,
                // 'CHUCVU' => $lecturer->CHUCVU, // Cột này đã xóa, có thể load từ quan hệ chucvus nếu cần
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
     * Phân công quota đề tài cho một giảng viên cụ thể trong bộ môn
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

        // [CẬP NHẬT] Kiểm tra quyền Trưởng bộ môn
        if (!$currentUser->giangvien || !in_array('TRUONG_BOMON', $this->getUserPositionCodes())) {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        // Kiểm tra giảng viên có thuộc cùng bộ môn không
        $lecturer = Giangvien::findOrFail($request->ID_GIANGVIEN);
        if ($lecturer->ID_KHOA_BOMON !== $departmentId) {
            return response()->json(['message' => 'Giảng viên không thuộc bộ môn của bạn'], 403);
        }

        // Kiểm tra giới hạn quota của bộ môn
        $departmentQuota = QuotaKhoaBomon::where('ID_KEHOACH', $request->ID_KEHOACH)
            ->where('ID_KHOA_BOMON', $departmentId)
            ->where('TRANGTHAI', 'Đang phân công')
            ->first();

        if (!$departmentQuota) {
            return response()->json(['message' => 'Chưa có quota phân công cho bộ môn trong kế hoạch này'], 400);
        }

        // Tính tổng quota đã phân công cho các giảng viên KHÁC trong bộ môn
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

        DB::transaction(function () use ($request, $currentUser) {
            // Kiểm tra xem giảng viên đã có quota chưa
            $existingQuota = QuotaGiangvien::where('ID_KEHOACH', $request->ID_KEHOACH)
                ->where('ID_GIANGVIEN', $request->ID_GIANGVIEN)
                ->first();

            if ($existingQuota) {
                if ($request->SO_DETAI_QUOTA == 0) {
                    // Xóa quota nếu đặt về 0
                    $existingQuota->delete();
                } else {
                    // Cập nhật quota
                    $existingQuota->update([
                        'SO_DETAI_QUOTA' => $request->SO_DETAI_QUOTA,
                        'GHICHU' => $request->GHICHU,
                        'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    ]);
                }
            } else if ($request->SO_DETAI_QUOTA > 0) {
                // Tạo mới quota
                QuotaGiangvien::create([
                    'ID_KEHOACH' => $request->ID_KEHOACH,
                    'ID_GIANGVIEN' => $request->ID_GIANGVIEN,
                    'SO_DETAI_QUOTA' => $request->SO_DETAI_QUOTA,
                    'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    'GHICHU' => $request->GHICHU,
                    'TRANGTHAI' => 'Đang phân công',
                ]);

                // Gửi thông báo
                $lecturer = Giangvien::find($request->ID_GIANGVIEN);
                if ($lecturer && $lecturer->nguoidung) {
                    Thongbao::create([
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
     * Tự động phân công quota cho tất cả giảng viên trong bộ môn (chia đều)
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

        // [CẬP NHẬT] Kiểm tra quyền Trưởng bộ môn
        if (!$currentUser->giangvien || !in_array('TRUONG_BOMON', $this->getUserPositionCodes())) {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;
        $planId = $request->ID_KEHOACH;

        try {
            DB::transaction(function () use ($planId, $departmentId, $currentUser) {
                // Lấy quota bộ môn
                $departmentQuota = QuotaKhoaBomon::where('ID_KEHOACH', $planId)
                    ->where('ID_KHOA_BOMON', $departmentId)
                    ->where('TRANGTHAI', 'Đang phân công')
                    ->first();

                if (!$departmentQuota) {
                    throw new \Exception('Chưa có quota được phân công cho bộ môn này');
                }

                // Lấy danh sách giảng viên trong bộ môn
                $lecturers = Giangvien::where('ID_KHOA_BOMON', $departmentId)->get();

                if ($lecturers->isEmpty()) {
                    throw new \Exception('Không có giảng viên nào trong bộ môn');
                }

                // Tính toán chia đều
                $topicsPerLecturer = floor($departmentQuota->SO_DETAI_QUOTA / $lecturers->count());
                $remainingTopics = $departmentQuota->SO_DETAI_QUOTA % $lecturers->count();

                $assignments = [];

                foreach ($lecturers as $index => $lecturer) {
                    // Chia phần dư cho những người đầu danh sách
                    $lecturerTopics = $topicsPerLecturer + ($index < $remainingTopics ? 1 : 0);

                    $assignments[] = [
                        'lecturer_id' => $lecturer->ID_GIANGVIEN,
                        'quota' => $lecturerTopics,
                    ];
                }

                // Áp dụng phân công
                foreach ($assignments as $assignment) {
                    $existingQuota = QuotaGiangvien::where('ID_KEHOACH', $planId)
                        ->where('ID_GIANGVIEN', $assignment['lecturer_id'])
                        ->first();

                    if ($existingQuota) {
                        $existingQuota->update([
                            'SO_DETAI_QUOTA' => $assignment['quota'],
                            'GHICHU' => 'Tự động phân công từ giảng viên',
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                        ]);
                    } else {
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
     * Lấy thông tin quota của chính giảng viên đang đăng nhập
     */
    public function getMyQuota(Request $request)
    {
        $planId = $request->query('plan_id');

        if (!$planId) {
            return response()->json(['message' => 'Plan ID is required'], 400);
        }

        $currentUser = Auth::user();

        // Kiểm tra user là giảng viên
        if (!$currentUser->giangvien) {
            return response()->json(['message' => 'Chỉ giảng viên mới có quyền truy cập chức năng này'], 403);
        }

        $lecturerId = $currentUser->giangvien->ID_GIANGVIEN;
        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        // 1. Lấy quota cá nhân (Giảng viên Hướng dẫn)
        $quota = QuotaGiangvien::where('ID_KEHOACH', $planId)
            ->where('ID_GIANGVIEN', $lecturerId)
            ->where('TRANGTHAI', 'Đang phân công')
            ->first();

        // 2. Đếm số đề tài đã tạo (Đã duyệt + Chờ duyệt + Đang chỉnh sửa + Yêu cầu chỉnh sửa...)
        // Loại bỏ trạng thái 'Nháp' để tính vào chỉ tiêu đã thực hiện (tùy quy định, ở đây lấy Đã duyệt/Chờ duyệt)
        $topicsCreated = Detai::where('ID_KEHOACH', $planId)
            ->where('ID_NGUOI_DEXUAT', $lecturerId)
            ->whereIn('TRANGTHAI', ['Đã duyệt', 'Chờ duyệt', 'Yêu cầu chỉnh sửa', 'Đang chỉnh sửa'])
            ->count();

        // 3. Đếm số nhóm thực tế đã đăng ký đề tài của GV này (để tính tải hướng dẫn thực tế)
        $actualAssigned = Detai::where('ID_KEHOACH', $planId)
            ->where('ID_NGUOI_DEXUAT', $lecturerId)
            ->sum('SO_NHOM_HIENTAI');

        // 4. Lấy quota bộ môn (để tham khảo)
        $departmentQuota = QuotaKhoaBomon::where('ID_KEHOACH', $planId)
            ->where('ID_KHOA_BOMON', $departmentId)
            ->where('TRANGTHAI', 'Đang phân công')
            ->first();

        // 5. Tổng quota đã phân trong bộ môn
        $totalDepartmentAssigned = QuotaGiangvien::where('ID_KEHOACH', $planId)
            ->whereHas('giangvien', function($q) use ($departmentId) {
                $q->where('ID_KHOA_BOMON', $departmentId);
            })
            ->where('TRANGTHAI', 'Đang phân công')
            ->sum('SO_DETAI_QUOTA');

        // =================================================================
        // [MỚI] TÍNH TOÁN THỐNG KÊ GÓP Ý (REVIEWER)
        // =================================================================
        
        // A. Tổng số đề tài được phân công góp ý trong kế hoạch này
        $totalReviewsAssigned = \App\Models\PhancongNguoiGopY::where('ID_GIANGVIEN', $lecturerId)
            ->whereHas('detai', function($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            })
            ->count();

        // B. Số đề tài ĐÃ góp ý 
        // (Logic: Tìm trong bảng phân công, xem đề tài đó đã có bản ghi trong GOIY_DETAI của GV này chưa)
        $reviewedCount = \App\Models\PhancongNguoiGopY::where('ID_GIANGVIEN', $lecturerId)
            ->whereHas('detai', function($q) use ($planId, $lecturerId) {
                $q->where('ID_KEHOACH', $planId)
                  ->whereHas('goiyDetai', function($subQ) use ($lecturerId) {
                      // Kiểm tra xem giảng viên hiện tại đã tạo bản ghi góp ý nào cho đề tài này chưa
                      $subQ->where('ID_NGUOI_GOIY', $lecturerId)
                           ->orWhere('ID_GIANGVIEN', $lecturerId);
                  });
            })
            ->count();
        
        // C. Số lượng còn lại cần góp ý
        $pendingReviews = max(0, $totalReviewsAssigned - $reviewedCount);

        // =================================================================

        $quotaAssigned = $quota ? $quota->SO_DETAI_QUOTA : 0;
        $topicsNeeded = max(0, $quotaAssigned - $topicsCreated);

        return response()->json([
            // Thông tin Hướng dẫn (Quota)
            'quota_assigned' => $quotaAssigned,
            'topics_created' => $topicsCreated,
            'topics_needed' => $topicsNeeded,
            'actual_assigned' => $actualAssigned,
            'remaining_quota' => $quotaAssigned - $actualAssigned,
            
            // Thông tin Bộ môn
            'department_quota' => $departmentQuota ? $departmentQuota->SO_DETAI_QUOTA : 0,
            'department_assigned' => $totalDepartmentAssigned,
            'department_remaining' => ($departmentQuota ? $departmentQuota->SO_DETAI_QUOTA : 0) - $totalDepartmentAssigned,

            // [MỚI] Thông tin Góp ý (Review) -> Để hiển thị StatCard số 4
            'total_reviews_assigned' => $totalReviewsAssigned,
            'reviewed_count' => $reviewedCount,
            'pending_reviews' => $pendingReviews
        ]);
    }
}