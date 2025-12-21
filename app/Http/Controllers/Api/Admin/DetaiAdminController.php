<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Detai;
use App\Models\GoiyDetai;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use App\Models\KehoachKhoaluan;
use Barryvdh\DomPDF\Facade\Pdf;

class DetaiAdminController extends Controller
{
    /**
     * Lấy danh sách tất cả đề tài để Admin hoặc Trưởng khoa/Trưởng bộ môn xét duyệt.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        
        // Xác định quyền hạn
        $isTruongBoMon = in_array('TRUONG_BOMON', $this->getUserPositionCodes());
        // Admin, Giáo vụ, Trưởng khoa được coi là Quản lý cấp cao (xem hết)
        $isManager = $this->isAdmin() || $this->isTruongKhoa() || $this->isGiaoVu();

        // Khởi tạo query và eager load các quan hệ cần thiết
        $query = Detai::with([
            'nguoiDexuat.nguoidung',
            'khoaBomon',
            'kehoachKhoaluan',
            'goiyDetai.nguoiGoiy.nguoidung' 
        ]);

        // --- LOGIC PHÂN QUYỀN DỮ LIỆU ---
        // Nếu là Trưởng bộ môn VÀ KHÔNG PHẢI Quản lý cấp cao -> Chỉ lấy đề tài thuộc bộ môn của họ
        if ($isTruongBoMon && !$isManager) {
            if ($user->giangvien) {
                $query->where('ID_KHOA_BOMON', $user->giangvien->ID_KHOA_BOMON);
            } else {
                // Trường hợp lỗi data: user có role nhưng không có thông tin giảng viên
                return response()->json([], 200); 
            }
        }

        // Lọc theo trạng thái đề tài (VD: Chờ duyệt, Đã duyệt...)
        if ($request->has('status')) {
            $query->where('TRANGTHAI', $request->status);
        }

        // Lọc theo ID kế hoạch khóa luận
        if ($request->has('plan_id')) {
            $query->where('ID_KEHOACH', $request->plan_id);
        }

        // Tìm kiếm theo tên đề tài hoặc tên giảng viên đề xuất
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('TEN_DETAI', 'like', '%' . $search . '%')
                  ->orWhereHas('nguoiDexuat.nguoidung', function ($subQ) use ($search) {
                      $subQ->where('HODEM_VA_TEN', 'like', '%' . $search . '%');
                  });
            });
        }

        // Lọc theo ID khoa/bộ môn (Chỉ áp dụng cho Admin/Manager vì Trưởng bộ môn đã bị force filter ở trên)
        if ($isManager && $request->has('department_id')) {
            $query->where('ID_KHOA_BOMON', $request->department_id);
        }

        // Lấy danh sách và sắp xếp theo ngày tạo mới nhất
        $topics = $query->orderBy('NGAYTAO', 'desc')->get();

        // Biến đổi dữ liệu: Thêm các trường tên giảng viên và bộ môn để frontend dễ hiển thị
        $topics->transform(function ($topic) {
            $topic->ten_giang_vien = $topic->nguoiDexuat?->nguoidung?->HODEM_VA_TEN ?? 'N/A';
            $topic->ten_bo_mon = $topic->khoaBomon?->TEN_KHOA_BOMON ?? 'N/A';
            return $topic;
        });

        return response()->json($topics);
    }

    /**
     * Lấy chi tiết một đề tài cụ thể, bao gồm các gợi ý và phân công để phục vụ việc duyệt.
     */
    public function show($id)
    {
        $topic = Detai::with([
            'nguoiDexuat.nguoidung',
            'chuyennganh',
            'kehoachKhoaluan',
            
            // Eager load gợi ý đề tài, sắp xếp theo ngày tạo và kèm thông tin phản hồi
            'goiyDetai' => function ($query) {
                $query->with([
                    'giangvien.nguoidung', 
                    'phanhois.giangvien.nguoidung'
                ])->orderBy('NGAYTAO', 'asc');
            },

            // Eager load thông tin nhóm sinh viên được phân công (nếu có)
            'phancongDetaiNhom.nhom.thanhvienNhom.nguoidung'
        ])->findOrFail($id);

        return response()->json($topic);
    }

    /**
     * Xóa hàng loạt đề tài
     */
    public function bulkDelete(Request $request)
    {
        // 1. Kiểm tra quyền hạn
        $isManager = $this->isAdmin() || $this->isTruongKhoa() || $this->isGiaoVu();
        if (!$isManager) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'topic_ids' => 'required|array|min:1',
            'topic_ids.*' => 'exists:DETAI,ID_DETAI',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $topicIds = $request->input('topic_ids');
        $deletedCount = 0;
        $failedCount = 0;

        DB::beginTransaction();
        try {
            $topics = Detai::whereIn('ID_DETAI', $topicIds)->get();

            foreach ($topics as $topic) {
                if ($topic->SO_NHOM_HIENTAI > 0) {
                    $failedCount++;
                    continue; 
                }

                // Không check trạng thái kế hoạch nữa

                $planId = $topic->ID_KEHOACH;
                $lecturerId = $topic->ID_NGUOI_DEXUAT;
                
                // Dọn dẹp quan hệ con trước khi xóa
                $topic->phancong_nguoi_gop_y()->delete();
                $topic->goiyDetai()->delete();

                $topic->delete();
                $deletedCount++;

                // Hồi phục Quota
                if ($planId && $lecturerId) {
                    $quotaGV = \App\Models\QuotaGiangvien::where('ID_KEHOACH', $planId)
                        ->where('ID_GIANGVIEN', $lecturerId)
                        ->first();

                    if ($quotaGV && $quotaGV->TRANGTHAI === 'Hoàn thành') {
                        $currentCount = Detai::where('ID_KEHOACH', $planId)
                            ->where('ID_NGUOI_DEXUAT', $lecturerId)
                            ->count();
                        
                        if ($currentCount < $quotaGV->SO_DETAI_QUOTA) {
                            $quotaGV->update(['TRANGTHAI' => 'Đang phân công']);
                        }
                    }
                }
            }

            DB::commit();

            $message = "Đã xóa thành công {$deletedCount} đề tài.";
            if ($failedCount > 0) {
                $message .= " Có {$failedCount} đề tài không thể xóa vì đã có nhóm đăng ký.";
            }

            return response()->json(['message' => $message]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Lỗi khi xóa hàng loạt: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Xử lý duyệt, từ chối hoặc yêu cầu chỉnh sửa đề tài.
     */
    public function approveOrReject(Request $request, $id)
    {
        $currentUser = Auth::user();
        
        $isTruongBoMon = in_array('TRUONG_BOMON', $this->getUserPositionCodes());
        $isManager = $this->isAdmin() || $this->isTruongKhoa() || $this->isGiaoVu();

        // Kiểm tra quyền hạn: Chỉ Admin, Giáo vụ, Trưởng khoa HOẶC Trưởng bộ môn mới được thực hiện
        if (!$isManager && !$isTruongBoMon) {
            return response()->json(['message' => 'Không có quyền thực hiện.'], 403);
        }

        // Validate dữ liệu đầu vào
        $validator = Validator::make($request->all(), [
            'action' => 'required|in:approve,reject,request_edit', // Hành động bắt buộc
            'reason' => 'nullable|string',                         // Lý do (bắt buộc nếu từ chối/yêu cầu sửa)
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Tìm đề tài cần xử lý
        $topic = Detai::with('nguoiDexuat')->findOrFail($id);

        // --- LOGIC BẢO MẬT CHO TRƯỞNG BỘ MÔN ---
        // Nếu là Trưởng bộ môn (và không phải Admin), chỉ được duyệt đề tài CÙNG BỘ MÔN
        if ($isTruongBoMon && !$isManager) {
            if (!$currentUser->giangvien || $topic->ID_KHOA_BOMON !== $currentUser->giangvien->ID_KHOA_BOMON) {
                return response()->json(['message' => 'Bạn chỉ có thể duyệt đề tài thuộc bộ môn của mình.'], 403);
            }
        }

        // Xử lý logic cập nhật trạng thái dựa trên action
        if ($request->action === 'approve') {
            $topic->update([
                'TRANGTHAI' => 'Đã duyệt',
                'ID_NGUOI_DUYET' => $currentUser->ID_NGUOIDUNG,
                'NGAY_DUYET' => now(),
                'LYDO_TUCHOI' => null,
                'LA_TAISUDUNG' => false,
            ]);
            $message = 'Đề tài đã được duyệt thành công';

        } elseif ($request->action === 'reject') {
            $topic->update([
                'TRANGTHAI' => 'Từ chối',
                'LYDO_TUCHOI' => $request->reason,
            ]);
            $message = 'Đề tài đã bị từ chối';

        } elseif ($request->action === 'request_edit') {
            $topic->update([
                'TRANGTHAI' => 'Yêu cầu chỉnh sửa',
                'LYDO_TUCHOI' => $request->reason,
            ]);
            $message = 'Đề tài đã được yêu cầu chỉnh sửa';
        }

        // Gửi thông báo cho giảng viên đề xuất
        $lecturerId = $topic->nguoiDexuat->ID_NGUOIDUNG ?? null;
        
        if ($lecturerId) {
            $notiTitle = "";
            $notiContent = "";
            $notiType = "ACADEMIC";

            if ($request->action === 'approve') {
                $notiTitle = "Đề tài được duyệt";
                $notiContent = "Đề tài '{$topic->TEN_DETAI}' của bạn đã được phê duyệt.";
            } elseif ($request->action === 'reject') {
                $notiTitle = "Đề tài bị từ chối";
                $notiContent = "Đề tài '{$topic->TEN_DETAI}' bị từ chối. Lý do: {$request->reason}";
                $notiType = "ACADEMIC";
            } elseif ($request->action === 'request_edit') {
                $notiTitle = "Yêu cầu chỉnh sửa đề tài";
                $notiContent = "Đề tài '{$topic->TEN_DETAI}' cần chỉnh sửa. Góp ý: {$request->reason}";
                $notiType = "ACADEMIC";
            }

            // Gọi service gửi thông báo
            NotificationService::send(
                $lecturerId,
                $notiTitle,
                $notiContent,
                $notiType,
                '/lecturer/thesis-topics',
                ['topic_id' => $topic->ID_DETAI],
                'HIGH'
            );
        }

        return response()->json(['message' => $message]);
    }

    /**
     * Duyệt hàng loạt đề tài (Bulk Approve).
     */
    public function bulkApprove(Request $request)
    {
        $currentUser = Auth::user();
        
        $isTruongBoMon = in_array('TRUONG_BOMON', $this->getUserPositionCodes());
        $isManager = $this->isAdmin() || $this->isTruongKhoa() || $this->isGiaoVu();

        // Kiểm tra quyền hạn
        if (!$isManager && !$isTruongBoMon) {
            return response()->json(['message' => 'Không có quyền thực hiện.'], 403);
        }

        // Validate danh sách ID đề tài
        $validator = Validator::make($request->all(), [
            'topic_ids' => 'required|array|min:1',
            'topic_ids.*' => 'exists:DETAI,ID_DETAI',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $topicIds = $request->input('topic_ids');
        $count = 0;

        // Khởi tạo query update
        $query = Detai::whereIn('ID_DETAI', $topicIds)->where('TRANGTHAI', 'Chờ duyệt');

        // --- LOGIC BẢO MẬT CHO TRƯỞNG BỘ MÔN ---
        // Chỉ cho phép update những đề tài thuộc bộ môn của họ
        if ($isTruongBoMon && !$isManager) {
            if ($currentUser->giangvien) {
                $query->where('ID_KHOA_BOMON', $currentUser->giangvien->ID_KHOA_BOMON);
            } else {
                return response()->json(['message' => 'Lỗi thông tin giảng viên.'], 403);
            }
        }

        // Sử dụng Transaction để đảm bảo tính toàn vẹn dữ liệu
        DB::beginTransaction();
        try {
            // Cập nhật trạng thái hàng loạt
            $count = $query->update([
                'TRANGTHAI' => 'Đã duyệt',
                'ID_NGUOI_DUYET' => $currentUser->ID_NGUOIDUNG,
                'NGAY_DUYET' => now(),
                'LYDO_TUCHOI' => null,
                'LA_TAISUDUNG' => false, 
            ]);

            // Lấy lại danh sách các đề tài vừa được duyệt để gửi thông báo
            // Lưu ý: Cần filter lại theo ID và TRANGTHAI 'Đã duyệt' để lấy đúng những cái vừa update
            $topics = Detai::whereIn('ID_DETAI', $topicIds)
                           ->where('TRANGTHAI', 'Đã duyệt')
                           ->with('nguoiDexuat.nguoidung')
                           ->get();

            // Vòng lặp gửi thông báo cho từng giảng viên
            foreach ($topics as $topic) {
                if ($topic->nguoiDexuat && $topic->nguoiDexuat->nguoidung) {
                      NotificationService::send(
                        $topic->nguoiDexuat->nguoidung->ID_NGUOIDUNG,
                        "Đề tài được duyệt",
                        "Đề tài '{$topic->TEN_DETAI}' của bạn đã được phê duyệt.",
                        'ACADEMIC',
                        '/lecturer/thesis-topics',
                        ['topic_id' => $topic->ID_DETAI],
                        'HIGH'
                    );
                }
            }

            DB::commit();
            return response()->json(['message' => "Đã duyệt thành công {$count} đề tài."]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Lỗi khi duyệt hàng loạt: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Lấy danh sách các đề tài đang ở trạng thái "Chờ duyệt".
     */
    public function getPendingTopics()
    {
        // Hàm này giữ nguyên, vì index() đã xử lý logic lọc rồi.
        // Tuy nhiên, để nhất quán, ta dùng query tương tự index nếu cần
        // Hoặc đơn giản là return danh sách rỗng nếu frontend gọi API này riêng biệt
        
        $currentUser = Auth::user();
        $isTruongBoMon = in_array('TRUONG_BOMON', $this->getUserPositionCodes());
        $isManager = $this->isAdmin() || $this->isTruongKhoa() || $this->isGiaoVu();

        $query = Detai::with([
            'nguoiDexuat.nguoidung',
            'chuyennganh',
            'goiyDetai.nguoiGoiy.nguoidung'
        ])
        ->where('TRANGTHAI', 'Chờ duyệt');

        if ($isTruongBoMon && !$isManager && $currentUser->giangvien) {
            $query->where('ID_KHOA_BOMON', $currentUser->giangvien->ID_KHOA_BOMON);
        }

        $topics = $query->orderBy('NGAYTAO', 'asc')->get();

        // Thêm tên giảng viên vào kết quả trả về
        $topics->transform(function ($topic) {
            $topic->ten_giang_vien = $topic->nguoiDexuat?->nguoidung?->HODEM_VA_TEN ?? 'N/A';
            return $topic;
        });

        return response()->json($topics);
    }

    /**
     * Lấy số liệu thống kê về tình trạng các đề tài.
     */
    public function getStatistics()
    {
        $currentUser = Auth::user();
        $isTruongBoMon = in_array('TRUONG_BOMON', $this->getUserPositionCodes());
        $isManager = $this->isAdmin() || $this->isTruongKhoa() || $this->isGiaoVu();

        $query = Detai::query();

        if ($isTruongBoMon && !$isManager && $currentUser->giangvien) {
            $query->where('ID_KHOA_BOMON', $currentUser->giangvien->ID_KHOA_BOMON);
        }

        // Clone query để đếm các trạng thái khác nhau
        $stats = [
            'total_topics' => (clone $query)->count(),
            'draft_topics' => (clone $query)->where('TRANGTHAI', 'Nháp')->count(),
            'pending_topics' => (clone $query)->where('TRANGTHAI', 'Chờ duyệt')->count(),
            'approved_topics' => (clone $query)->where('TRANGTHAI', 'Đã duyệt')->count(),
            'rejected_topics' => (clone $query)->where('TRANGTHAI', 'Từ chối')->count(),
            'edit_requested_topics' => (clone $query)->where('TRANGTHAI', 'Yêu cầu chỉnh sửa')->count(),
            'full_topics' => (clone $query)->where('TRANGTHAI', 'Đã đầy')->count(),
            'locked_topics' => (clone $query)->where('TRANGTHAI', 'Đã khóa')->count(),
            'topics_with_suggestions' => (clone $query)->whereHas('goiyDetai')->count(),
        ];

        return response()->json($stats);
    }

    public function exportPdf(Request $request)
    {
        $planId = $request->input('plan_id');
        if (!$planId) {
            return response()->json(['message' => 'Vui lòng chọn Kế hoạch để xuất file.'], 400);
        }

        // 1. Lấy thông tin Kế hoạch
        $plan = KehoachKhoaluan::findOrFail($planId);

        // 2. Query lấy danh sách đề tài ĐÃ DUYỆT
        // Có thể áp dụng thêm bộ lọc Department nếu cần
        $query = Detai::with([
            'nguoiDexuat.nguoidung', 
            'khoaBomon'
        ])
        ->where('ID_KEHOACH', $planId)
        ->where('TRANGTHAI', 'Đã duyệt');

        // Nếu có lọc theo bộ môn từ client gửi lên
        if ($request->filled('department_id')) {
            $query->where('ID_KHOA_BOMON', $request->department_id);
        }

        $topics = $query->orderBy('ID_KHOA_BOMON', 'asc') // Gom theo bộ môn cho đẹp
                        ->orderBy('TEN_DETAI', 'asc')
                        ->get();

        // 3. Render PDF
        $pdf = Pdf::loadView('documents.topic_list', [
            'plan' => $plan,
            'topics' => $topics
        ]);

        // Set khổ giấy ngang (Landscape) như ảnh mẫu
        $pdf->setPaper('A3', 'landscape');

        return $pdf->download('Danh-sach-de-tai-' . $plan->KHOAHOC . '.pdf');
    }
}