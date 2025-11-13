<?php

namespace App\Http\Controllers\Api\DepartmentHead;

use App\Http\Controllers\Api\Admin\DetaiAdminController;
use Illuminate\Http\Request;

class DetaiController extends DetaiAdminController
{
    /**
     * Override index method to filter topics by department
     */
    public function index(Request $request)
    {
        $currentUser = auth()->user();

        // Check if user is department head
        if (!$currentUser->giangvien || $currentUser->giangvien->CHUCVU !== 'Trưởng bộ môn') {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        $query = \App\Models\Detai::with([
            'nguoiDexuat.nguoidung',
            'chuyennganh',
            'kehoachKhoaluan',
            'goiyDetai.nguoiGoiy.nguoidung'
        ])
        ->whereHas('nguoiDexuat', function($q) use ($departmentId) {
            $q->where('ID_KHOA_BOMON', $departmentId);
        });

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

        // Check if user is department head
        if (!$currentUser->giangvien || $currentUser->giangvien->CHUCVU !== 'Trưởng bộ môn') {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        $topics = \App\Models\Detai::with([
            'nguoiDexuat.nguoidung',
            'chuyennganh',
            'goiyDetai.nguoiGoiy.nguoidung'
        ])
        ->where('TRANGTHAI', 'Chờ duyệt')
        ->whereHas('nguoiDexuat', function($q) use ($departmentId) {
            $q->where('ID_KHOA_BOMON', $departmentId);
        })
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
     * Override getStatistics to filter by department
     */
    public function getStatistics()
    {
        $currentUser = auth()->user();

        // Check if user is department head
        if (!$currentUser->giangvien || $currentUser->giangvien->CHUCVU !== 'Trưởng bộ môn') {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        $stats = [
            'total_topics' => \App\Models\Detai::whereHas('nguoiDexuat', function($q) use ($departmentId) {
                $q->where('ID_KHOA_BOMON', $departmentId);
            })->count(),
            'draft_topics' => \App\Models\Detai::where('TRANGTHAI', 'Nháp')
                ->whereHas('nguoiDexuat', function($q) use ($departmentId) {
                    $q->where('ID_KHOA_BOMON', $departmentId);
                })->count(),
            'pending_topics' => \App\Models\Detai::where('TRANGTHAI', 'Chờ duyệt')
                ->whereHas('nguoiDexuat', function($q) use ($departmentId) {
                    $q->where('ID_KHOA_BOMON', $departmentId);
                })->count(),
            'approved_topics' => \App\Models\Detai::where('TRANGTHAI', 'Đã duyệt')
                ->whereHas('nguoiDexuat', function($q) use ($departmentId) {
                    $q->where('ID_KHOA_BOMON', $departmentId);
                })->count(),
            'rejected_topics' => \App\Models\Detai::where('TRANGTHAI', 'Từ chối')
                ->whereHas('nguoiDexuat', function($q) use ($departmentId) {
                    $q->where('ID_KHOA_BOMON', $departmentId);
                })->count(),
            'edit_requested_topics' => \App\Models\Detai::where('TRANGTHAI', 'Yêu cầu chỉnh sửa')
                ->whereHas('nguoiDexuat', function($q) use ($departmentId) {
                    $q->where('ID_KHOA_BOMON', $departmentId);
                })->count(),
            'full_topics' => \App\Models\Detai::where('TRANGTHAI', 'Đã đầy')
                ->whereHas('nguoiDexuat', function($q) use ($departmentId) {
                    $q->where('ID_KHOA_BOMON', $departmentId);
                })->count(),
            'locked_topics' => \App\Models\Detai::where('TRANGTHAI', 'Đã khóa')
                ->whereHas('nguoiDexuat', function($q) use ($departmentId) {
                    $q->where('ID_KHOA_BOMON', $departmentId);
                })->count(),
            'topics_with_suggestions' => \App\Models\Detai::whereHas('goiyDetai')
                ->whereHas('nguoiDexuat', function($q) use ($departmentId) {
                    $q->where('ID_KHOA_BOMON', $departmentId);
                })->count(),
        ];

        return response()->json($stats);
    }
}
