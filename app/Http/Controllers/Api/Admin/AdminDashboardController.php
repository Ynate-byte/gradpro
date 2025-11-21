<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Nguoidung;
use App\Models\KehoachKhoaluan;
use App\Models\Detai;
use App\Models\Nhom;
use App\Models\NopSanpham;
use App\Models\KhoaBomon;
use App\Models\QuotaKhoaBomon;
use Carbon\Carbon;

class AdminDashboardController extends Controller
{
    public function getStats()
    {
        // 1. Thống kê Người dùng (Giữ nguyên)
        $userStats = [
            'total' => Nguoidung::count(),
            'students' => Nguoidung::whereHas('vaitro', fn($q) => $q->where('TEN_VAITRO', 'Sinh viên'))->count(),
            'lecturers' => Nguoidung::whereHas('vaitro', fn($q) => $q->where('TEN_VAITRO', 'Giảng viên'))->count(),
        ];

        // 2. Kế hoạch hiện tại
        $activePlan = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm'])
            ->orderBy('NGAYTAO', 'desc')
            ->first();
        
        // Default data nếu không có kế hoạch
        $workflow = [
            'quota_percent' => 0,
            'quota_missing' => 0, // Số khoa chưa có quota
            'topic_percent' => 0, // Tỉ lệ đề tài đã duyệt / tổng đề tài
            'group_topic_percent' => 0, // Tỉ lệ nhóm có đề tài
            'council_percent' => 0, // Tỉ lệ nhóm có hội đồng
            'grading_percent' => 0, // Tỉ lệ nhóm đã có điểm
            'groups_missing_council' => 0,
        ];

        $planStats = [
            'total_active' => KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm'])->count(),
            'current_name' => $activePlan ? $activePlan->TEN_DOT : 'Không có kế hoạch chạy',
            'current_status' => $activePlan ? $activePlan->TRANGTHAI : 'N/A',
        ];

        $actions = [
            'pending_topics' => 0,
            'pending_submissions' => 0,
            'groups_no_topic' => 0,
            'draft_plans' => KehoachKhoaluan::where('TRANGTHAI', 'Bản nháp')->count(),
        ];

        if ($activePlan) {
            $planId = $activePlan->ID_KEHOACH;

            // --- TÍNH TOÁN WORKFLOW ---
            
            // A. Quota: Số bộ môn đã được phân quota / Tổng bộ môn active
            $totalDepts = KhoaBomon::where('TRANGTHAI_KICHHOAT', true)->count();
            $deptsWithQuota = QuotaKhoaBomon::where('ID_KEHOACH', $planId)->count();
            $workflow['quota_percent'] = $totalDepts > 0 ? round(($deptsWithQuota / $totalDepts) * 100) : 0;
            $workflow['quota_missing'] = max(0, $totalDepts - $deptsWithQuota);

            // B. Đề tài
            $totalTopics = Detai::where('ID_KEHOACH', $planId)->count();
            $approvedTopics = Detai::where('ID_KEHOACH', $planId)->where('TRANGTHAI', 'Đã duyệt')->count();
            $workflow['topic_percent'] = $totalTopics > 0 ? round(($approvedTopics / $totalTopics) * 100) : 0;

            // C. Nhóm & Hội đồng
            $totalGroups = Nhom::where('ID_KEHOACH', $planId)->count();
            $groupsWithTopic = Nhom::where('ID_KEHOACH', $planId)->has('phancongDetaiNhom')->count();
            $groupsWithCouncil = Nhom::where('ID_KEHOACH', $planId)->has('hoidongs')->count();
            $groupsGraded = Nhom::where('ID_KEHOACH', $planId)->has('diemTongKet')->count();

            $workflow['group_topic_percent'] = $totalGroups > 0 ? round(($groupsWithTopic / $totalGroups) * 100) : 0;
            $workflow['council_percent'] = $totalGroups > 0 ? round(($groupsWithCouncil / $totalGroups) * 100) : 0;
            $workflow['grading_percent'] = $totalGroups > 0 ? round(($groupsGraded / $totalGroups) * 100) : 0;
            $workflow['groups_missing_council'] = max(0, $groupsWithTopic - $groupsWithCouncil); // Chỉ tính nhóm đã có đề tài mà chưa có HĐ

            // --- ACTIONS ---
            $actions['pending_topics'] = Detai::where('ID_KEHOACH', $planId)->where('TRANGTHAI', 'Chờ duyệt')->count();
            $actions['pending_submissions'] = NopSanpham::whereHas('phancong.nhom', fn($q) => $q->where('ID_KEHOACH', $planId))
                                                ->where('TRANGTHAI', 'Chờ xác nhận')->count();
            $actions['groups_no_topic'] = max(0, $totalGroups - $groupsWithTopic);
        }

        return response()->json([
            'users' => $userStats,
            'plan' => $planStats,
            'actions' => $actions,
            'workflow' => $workflow
        ]);
    }
}