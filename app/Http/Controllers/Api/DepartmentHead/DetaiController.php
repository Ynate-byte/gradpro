<?php

namespace App\Http\Controllers\Api\DepartmentHead;

use App\Http\Controllers\Api\Admin\DetaiAdminController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Detai;

class DetaiController extends DetaiAdminController
{
    /**
     * Override index method to filter topics by department
     */
    public function index(Request $request)
    {
        $currentUser = auth()->user();

        // Check if user is department head
        if (!$currentUser->giangvien || !in_array('TRUONG_BOMON', $this->getUserPositionCodes())) {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        $query = Detai::with([
            'nguoiDexuat.nguoidung',
            'khoaBomon', // Load quan hệ Khoa/Bộ môn
            'kehoachKhoaluan',
            'goiyDetai.nguoiGoiy.nguoidung'
        ])
        ->where('ID_KHOA_BOMON', $departmentId);

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
     * Override getPendingTopics to filter by department
     */
    public function getPendingTopics()
    {
        $currentUser = auth()->user();

        if (!$currentUser->giangvien || !in_array('TRUONG_BOMON', $this->getUserPositionCodes())) {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        $topics = Detai::with([
            'nguoiDexuat.nguoidung',
            'khoaBomon',
            'goiyDetai.nguoiGoiy.nguoidung'
        ])
        ->where('TRANGTHAI', 'Chờ duyệt')
        ->where('ID_KHOA_BOMON', $departmentId)
        ->orderBy('NGAYTAO', 'asc')
        ->get();

        $topics->transform(function ($topic) {
            $topic->ten_giang_vien = $topic->nguoiDexuat?->nguoidung?->HODEM_VA_TEN ?? 'N/A';
            return $topic;
        });

        return response()->json($topics);
    }

    /**
     * Override getStatistics to filter by department
     */
    public function getStatistics()
    {
        $currentUser = auth()->user();

        if (!$currentUser->giangvien || !in_array('TRUONG_BOMON', $this->getUserPositionCodes())) {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        $stats = [
            'total_topics' => Detai::where('ID_KHOA_BOMON', $departmentId)->count(),
            
            'draft_topics' => Detai::where('TRANGTHAI', 'Nháp')
                ->where('ID_KHOA_BOMON', $departmentId)->count(),
            
            'pending_topics' => Detai::where('TRANGTHAI', 'Chờ duyệt')
                ->where('ID_KHOA_BOMON', $departmentId)->count(),
            
            'approved_topics' => Detai::where('TRANGTHAI', 'Đã duyệt')
                ->where('ID_KHOA_BOMON', $departmentId)->count(),
            
            'rejected_topics' => Detai::where('TRANGTHAI', 'Từ chối')
                ->where('ID_KHOA_BOMON', $departmentId)->count(),
            
            'edit_requested_topics' => Detai::where('TRANGTHAI', 'Yêu cầu chỉnh sửa')
                ->where('ID_KHOA_BOMON', $departmentId)->count(),
            
            'full_topics' => Detai::where('TRANGTHAI', 'Đã đầy')
                ->where('ID_KHOA_BOMON', $departmentId)->count(),
            
            'locked_topics' => Detai::where('TRANGTHAI', 'Đã khóa')
                ->where('ID_KHOA_BOMON', $departmentId)->count(),
            
            'topics_with_suggestions' => Detai::whereHas('goiyDetai')
                ->where('ID_KHOA_BOMON', $departmentId)->count(),
        ];

        return response()->json($stats);
    }
}