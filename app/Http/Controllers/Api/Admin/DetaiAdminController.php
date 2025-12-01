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
     * Lấy tất cả đề tài để admin/trưởng khoa duyệt
     */
    public function index(Request $request)
    {
        $query = Detai::with([
            'nguoiDexuat.nguoidung',
            'khoaBomon',
            'kehoachKhoaluan',
            'goiyDetai.nguoiGoiy.nguoidung'
        ]);

        // Lọc theo trạng thái
        if ($request->has('status')) {
            $query->where('TRANGTHAI', $request->status);
        }

        // Lọc theo kế hoạch
        if ($request->has('plan_id')) {
            $query->where('ID_KEHOACH', $request->plan_id);
        }

        // Tìm kiếm theo tên đề tài hoặc tên giảng viên
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('TEN_DETAI', 'like', '%' . $search . '%')
                  ->orWhereHas('nguoiDexuat.nguoidung', function ($subQ) use ($search) {
                      $subQ->where('HODEM_VA_TEN', 'like', '%' . $search . '%');
                  });
            });
        }

        if ($request->has('department_id')) {
            $query->where('ID_KHOA_BOMON', $request->department_id);
        }

        $topics = $query->orderBy('NGAYTAO', 'desc')->get();

        // Thêm tên giảng viên để hiển thị
        $topics->transform(function ($topic) {
            $topic->ten_giang_vien = $topic->nguoiDexuat?->nguoidung?->HODEM_VA_TEN ?? 'N/A';
            $topic->ten_bo_mon = $topic->khoaBomon?->TEN_KHOA_BOMON ?? 'N/A';
            return $topic;
        });

        return response()->json($topics);
    }

    /**
     * Lấy chi tiết đề tài cùng các gợi ý để duyệt
     */
    public function show($id)
    {
        $topic = Detai::with([
            'nguoiDexuat.nguoidung',
            'chuyennganh',
            'kehoachKhoaluan',
            
            'goiyDetai' => function ($query) {
                $query->with([
                    'giangvien.nguoidung', 
                    'phanhois.giangvien.nguoidung'
                ])->orderBy('NGAYTAO', 'asc');
            },

            'phancongDetaiNhom.nhom.thanhvienNhom.nguoidung'
        ])->findOrFail($id);

        return response()->json($topic);
    }

    /**
     * Duyệt hoặc từ chối đề tài
     */
    public function approveOrReject(Request $request, $id)
    {
        $currentUser = Auth::user();
        
        if (!$this->isAdmin() && !$this->isTruongKhoa()) {
            return response()->json(['message' => 'Không có quyền thực hiện.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:approve,reject,request_edit',
            'reason' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $topic = Detai::with('nguoiDexuat')->findOrFail($id);

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
     * Duyệt hàng loạt đề tài
     */
    public function bulkApprove(Request $request)
    {
        $currentUser = Auth::user();
        
        if (!$this->isAdmin() && !$this->isTruongKhoa()) {
            return response()->json(['message' => 'Không có quyền thực hiện.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'topic_ids' => 'required|array|min:1',
            'topic_ids.*' => 'exists:DETAI,ID_DETAI',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $topicIds = $request->input('topic_ids');
        $count = 0;

        DB::beginTransaction();
        try {
            $count = Detai::whereIn('ID_DETAI', $topicIds)
                ->where('TRANGTHAI', 'Chờ duyệt')
                ->update([
                    'TRANGTHAI' => 'Đã duyệt',
                    'ID_NGUOI_DUYET' => $currentUser->ID_NGUOIDUNG,
                    'NGAY_DUYET' => now(),
                    'LYDO_TUCHOI' => null,
                    'LA_TAISUDUNG' => false, 
                ]);

            $topics = Detai::whereIn('ID_DETAI', $topicIds)
                           ->where('TRANGTHAI', 'Đã duyệt')
                           ->with('nguoiDexuat.nguoidung')
                           ->get();

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
     * Lấy các đề tài đang chờ duyệt
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

        $topics->transform(function ($topic) {
            $topic->ten_giang_vien = $topic->nguoiDexuat?->nguoidung?->HODEM_VA_TEN ?? 'N/A';
            return $topic;
        });

        return response()->json($topics);
    }

    /**
     * Lấy thống kê đề tài
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