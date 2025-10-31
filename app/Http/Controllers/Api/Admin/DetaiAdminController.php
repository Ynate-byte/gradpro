<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Detai;
use App\Models\GoiyDetai;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class DetaiAdminController extends Controller
{
    /**
     * Get all topics for admin review
     */
    public function index(Request $request)
    {
        $query = Detai::with([
            'nguoiDexuat.nguoidung',
            'chuyennganh',
            'kehoachKhoaluan',
            'goiyDetai.nguoiGoiy.nguoidung'
        ]);

        // Filter by status
        if ($request->has('status')) {
            $query->where('TRANGTHAI', $request->status);
        }

        // Filter by plan
        if ($request->has('plan_id')) {
            $query->where('ID_KEHOACH', $request->plan_id);
        }

        // Search by title or lecturer
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('TEN_DETAI', 'like', '%' . $search . '%')
                  ->orWhereHas('nguoiDexuat.nguoidung', function ($subQ) use ($search) {
                      $subQ->where('HODEM_VA_TEN', 'like', '%' . $search . '%');
                  });
            });
        }

        $topics = $query->orderBy('NGAYTAO', 'desc')->get();

        // Add lecturer name for display
        $topics->transform(function ($topic) {
            $topic->ten_giang_vien = $topic->nguoiDexuat?->nguoidung?->HODEM_VA_TEN ?? 'N/A';
            return $topic;
        });

        return response()->json($topics);
    }

    /**
     * Get topic details with suggestions for approval
     */
    public function show($id)
    {
        $topic = Detai::with([
            'nguoiDexuat.nguoidung',
            'chuyennganh',
            'kehoachKhoaluan',
            'goiyDetai.nguoiGoiy.nguoidung',
            'phancongDetaiNhom.nhom.thanhvienNhom.nguoidung'
        ])->findOrFail($id);

        return response()->json($topic);
    }

    /**
     * Approve or reject topic with suggestions consideration
     */
    public function approveOrReject(Request $request, $id)
    {
        $currentUser = Auth::user();
        if ($currentUser->vaitro->TEN_VAITRO !== 'Admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:approve,reject,request_edit',
            'reason' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $topic = Detai::findOrFail($id);

        if ($request->action === 'approve') {
            $topic->update([
                'TRANGTHAI' => 'Đã duyệt',
                'ID_NGUOI_DUYET' => $currentUser->ID_NGUOIDUNG,
                'NGAY_DUYET' => now(),
                'LYDO_TUCHOI' => null,
            ]);
            $message = 'Đề tài đã được duyệt thành công';
        } elseif ($request->action === 'reject') {
            $topic->update([
                'TRANGTHAI' => 'Từ chối',
                'LYDO_TUCHOI' => $request->reason,
            ]);
            $message = 'Đề tài đã bị từ chối với lý do: ' . ($request->reason ?: 'Không có lý do cụ thể');
        } elseif ($request->action === 'request_edit') {
            $topic->update([
                'TRANGTHAI' => 'Yêu cầu chỉnh sửa',
                'LYDO_TUCHOI' => $request->reason,
            ]);
            $message = 'Đề tài đã được yêu cầu chỉnh sửa với lý do: ' . ($request->reason ?: 'Không có lý do cụ thể');
        }

        return response()->json(['message' => $message]);
    }

    /**
     * Get topics pending approval with suggestions
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

        // Add lecturer name for display
        $topics->transform(function ($topic) {
            $topic->ten_giang_vien = $topic->nguoiDexuat?->nguoidung?->HODEM_VA_TEN ?? 'N/A';
            return $topic;
        });

        return response()->json($topics);
    }

    /**
     * Get topic statistics
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