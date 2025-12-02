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

class DetaiAdminController extends Controller
{
    /**
     * Lấy danh sách tất cả đề tài để Admin hoặc Trưởng khoa xét duyệt.
     */
    public function index(Request $request)
    {
        // Khởi tạo query và eager load các quan hệ cần thiết
        $query = Detai::with([
            'nguoiDexuat.nguoidung',
            'khoaBomon',
            'kehoachKhoaluan',
            'goiyDetai.nguoiGoiy.nguoidung' 
        ]);

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

        // Lọc theo ID khoa/bộ môn
        if ($request->has('department_id')) {
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
     * Xử lý duyệt, từ chối hoặc yêu cầu chỉnh sửa đề tài.
     */
    public function approveOrReject(Request $request, $id)
    {
        $currentUser = Auth::user();
        
        // Kiểm tra quyền hạn: Chỉ Admin hoặc Trưởng khoa mới được thực hiện
        if (!$this->isAdmin() && !$this->isTruongKhoa()) {
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
        
        // Kiểm tra quyền hạn
        if (!$this->isAdmin() && !$this->isTruongKhoa()) {
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

        // Sử dụng Transaction để đảm bảo tính toàn vẹn dữ liệu
        DB::beginTransaction();
        try {
            // Cập nhật trạng thái hàng loạt cho các đề tài đang "Chờ duyệt"
            $count = Detai::whereIn('ID_DETAI', $topicIds)
                ->where('TRANGTHAI', 'Chờ duyệt')
                ->update([
                    'TRANGTHAI' => 'Đã duyệt',
                    'ID_NGUOI_DUYET' => $currentUser->ID_NGUOIDUNG,
                    'NGAY_DUYET' => now(),
                    'LYDO_TUCHOI' => null,
                    'LA_TAISUDUNG' => false, 
                ]);

            // Lấy lại danh sách các đề tài vừa được duyệt để gửi thông báo
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
        $topics = Detai::with([
            'nguoiDexuat.nguoidung',
            'chuyennganh',
            'goiyDetai.nguoiGoiy.nguoidung'
        ])
        ->where('TRANGTHAI', 'Chờ duyệt')
        ->orderBy('NGAYTAO', 'asc')
        ->get();

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
        $stats = [
            'total_topics' => Detai::count(),
            'draft_topics' => Detai::where('TRANGTHAI', 'Nháp')->count(),
            'pending_topics' => Detai::where('TRANGTHAI', 'Chờ duyệt')->count(),
            'approved_topics' => Detai::where('TRANGTHAI', 'Đã duyệt')->count(),
            'rejected_topics' => Detai::where('TRANGTHAI', 'Từ chối')->count(),
            'edit_requested_topics' => Detai::where('TRANGTHAI', 'Yêu cầu chỉnh sửa')->count(),
            'full_topics' => Detai::where('TRANGTHAI', 'Đã đầy')->count(),
            'locked_topics' => Detai::where('TRANGTHAI', 'Đã khóa')->count(),
            'topics_with_suggestions' => Detai::whereHas('goiyDetai')->count(),
        ];

        return response()->json($stats);
    }
}