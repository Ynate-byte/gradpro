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
use App\Models\SinhvienThamgia;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AdminDashboardController extends Controller
{
    /**
     * Lấy thống kê tổng quan và danh sách kế hoạch Active
     */
    public function getStats()
    {
        // 1. Lấy danh sách các kế hoạch đang chạy
        $activePlansRaw = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm', 'Chờ duyệt chỉnh sửa'])
            ->with('mocThoigians')
            ->orderBy('NGAYTAO', 'desc')
            ->get();

        $activePlanIds = $activePlansRaw->pluck('ID_KEHOACH');

        // Map dữ liệu chi tiết cho từng kế hoạch
        $activePlansData = $activePlansRaw->map(function ($plan) {
            $now = Carbon::now();
            $currentPhase = null;
            
            // Xác định giai đoạn hiện tại
            foreach ($plan->mocThoigians as $moc) {
                if ($now->between($moc->NGAY_BATDAU, $moc->NGAY_KETTHUC)) {
                    $currentPhase = $moc;
                    break;
                }
            }
            if (!$currentPhase) {
                $currentPhase = $plan->mocThoigians->where('NGAY_BATDAU', '>', $now)->sortBy('NGAY_BATDAU')->first();
            }
            if (!$currentPhase) {
                $currentPhase = $plan->mocThoigians->sortByDesc('NGAY_KETTHUC')->first();
            }

            // Thống kê cơ bản
            $totalGroups = Nhom::where('ID_KEHOACH', $plan->ID_KEHOACH)->count();
            $groupsWithTopic = Nhom::where('ID_KEHOACH', $plan->ID_KEHOACH)->has('phancongDetaiNhom')->count();
            $totalTopics = Detai::where('ID_KEHOACH', $plan->ID_KEHOACH)->count();
            
            // Target topics (Quota)
            $targetTopics = QuotaKhoaBomon::where('ID_KEHOACH', $plan->ID_KEHOACH)->sum('SO_DETAI_QUOTA');
            $totalStudents = SinhvienThamgia::where('ID_KEHOACH', $plan->ID_KEHOACH)->count();
            if ($targetTopics == 0 && $totalStudents > 0) {
                $targetTopics = ceil(($totalStudents / 3) * 1.5);
            }

            // [QUERY MỚI] Thống kê chi tiết theo Bộ môn để vẽ biểu đồ
            // Đếm số lượng đề tài đã tạo và số lượng đã được giao (có nhóm) theo từng khoa/bộ môn
            $deptStats = DB::table('KHOA_BOMON')
                ->leftJoin('GIANGVIEN', 'KHOA_BOMON.ID_KHOA_BOMON', '=', 'GIANGVIEN.ID_KHOA_BOMON')
                ->leftJoin('DETAI', function($join) use ($plan) {
                    $join->on('GIANGVIEN.ID_GIANGVIEN', '=', 'DETAI.ID_NGUOI_DEXUAT')
                         ->where('DETAI.ID_KEHOACH', '=', $plan->ID_KEHOACH);
                })
                ->select(
                    'KHOA_BOMON.TEN_KHOA_BOMON as name',
                    DB::raw('COUNT(DETAI.ID_DETAI) as da_tao'),
                    DB::raw('SUM(CASE WHEN DETAI.SO_NHOM_HIENTAI > 0 THEN 1 ELSE 0 END) as da_giao')
                )
                ->groupBy('KHOA_BOMON.ID_KHOA_BOMON', 'KHOA_BOMON.TEN_KHOA_BOMON')
                ->havingRaw('COUNT(DETAI.ID_DETAI) > 0') // Chỉ lấy bộ môn có dữ liệu
                ->get();

            return [
                'id' => $plan->ID_KEHOACH,
                'name' => $plan->TEN_DOT,
                'status' => $plan->TRANGTHAI,
                'current_phase' => $currentPhase ? $currentPhase->TEN_SUKIEN : 'Chưa bắt đầu',
                'phase_deadline' => $currentPhase ? $currentPhase->NGAY_KETTHUC : null,
                'phase_start' => $currentPhase ? $currentPhase->NGAY_BATDAU : null,
                'phase_desc' => $currentPhase ? $currentPhase->MOTA : null,
                'phase_actors' => $currentPhase ? $currentPhase->VAITRO_THUCHIEN : null,
                'groups_registered' => $groupsWithTopic,
                'groups_total' => $totalGroups,
                'topics_current' => $totalTopics,
                'topics_target' => $targetTopics,
                'department_stats' => $deptStats // Trả về dữ liệu cho biểu đồ
            ];
        });

        // 3. Tính toán Workflow tổng hợp
        $workflow = [
            'quota_percent' => 0, 'quota_missing' => 0, 'topic_percent' => 0,
            'council_percent' => 0, 'grading_percent' => 0, 'groups_missing_council' => 0,
        ];

        if ($activePlanIds->isNotEmpty()) {
            // A. Quota
            $totalDepts = KhoaBomon::where('TRANGTHAI_KICHHOAT', true)->count();
            $maxPossibleAssignments = $totalDepts * $activePlanIds->count();
            $actualAssignments = QuotaKhoaBomon::whereIn('ID_KEHOACH', $activePlanIds)->count();
            $workflow['quota_percent'] = $maxPossibleAssignments > 0 ? round(($actualAssignments / $maxPossibleAssignments) * 100) : 0;
            $workflow['quota_missing'] = max(0, $maxPossibleAssignments - $actualAssignments);

            // B. Topic
            $totalTopicsAll = Detai::whereIn('ID_KEHOACH', $activePlanIds)->count();
            $approvedTopicsAll = Detai::whereIn('ID_KEHOACH', $activePlanIds)->where('TRANGTHAI', 'Đã duyệt')->count();
            $workflow['topic_percent'] = $totalTopicsAll > 0 ? round(($approvedTopicsAll / $totalTopicsAll) * 100) : 0;

            // C. Council & Grading
            $totalGroupsAll = Nhom::whereIn('ID_KEHOACH', $activePlanIds)->count();
            $groupsWithTopicAll = Nhom::whereIn('ID_KEHOACH', $activePlanIds)->has('phancongDetaiNhom')->count();
            $groupsWithCouncilAll = Nhom::whereIn('ID_KEHOACH', $activePlanIds)->has('hoidongs')->count();
            $groupsGradedAll = Nhom::whereIn('ID_KEHOACH', $activePlanIds)->has('diemTongKet')->count();

            $workflow['council_percent'] = $totalGroupsAll > 0 ? round(($groupsWithCouncilAll / $totalGroupsAll) * 100) : 0;
            $workflow['grading_percent'] = $totalGroupsAll > 0 ? round(($groupsGradedAll / $totalGroupsAll) * 100) : 0;
            
            // [QUAN TRỌNG] Số nhóm thiếu hội đồng để hiển thị bên frontend
            $workflow['groups_missing_council'] = max(0, $groupsWithTopicAll - $groupsWithCouncilAll);
        }

        // 4. Actions & Risks
        $actions = [
            'pending_topics' => Detai::whereIn('ID_KEHOACH', $activePlanIds)->where('TRANGTHAI', 'Chờ duyệt')->count(),
            'pending_submissions' => NopSanpham::whereHas('phancong.nhom', fn($q) => $q->whereIn('ID_KEHOACH', $activePlanIds))->where('TRANGTHAI', 'Chờ xác nhận')->count(),
        ];

        $risks = [
            'students_no_group' => Nguoidung::whereHas('sinhvien.cacDotThamGia', fn($q) => $q->whereIn('ID_KEHOACH', $activePlanIds))
                ->whereDoesntHave('thanhvienNhom.nhom', fn($q) => $q->whereIn('ID_KEHOACH', $activePlanIds))->count(),
            'lecturers_missing_quota' => 0,
            'groups_no_council' => Nhom::whereIn('ID_KEHOACH', $activePlanIds)->has('phancongDetaiNhom')->doesntHave('hoidongs')->count()
        ];

        return response()->json([
            'active_plans' => $activePlansData,
            'actions' => $actions,
            'risks' => $risks,
            'workflow' => $workflow
        ]);
    }

    /**
     * API Nhắc nhở & Cảnh báo thông minh (To-Do List)
     * [FIXED] Làm tròn thời gian hiển thị (Giờ/Ngày)
     */
    public function getReminders(Request $request)
    {
        $reminders = [];
        $now = Carbon::now();

        // --- 1. CẢNH BÁO KẾ HOẠCH CẦN DUYỆT ---
        $plansPendingApproval = KehoachKhoaluan::where('TRANGTHAI', 'Chờ phê duyệt')->count();
        if ($plansPendingApproval > 0) {
            $reminders[] = [
                'id' => 'plan_approval',
                'type' => 'critical',
                'title' => 'Kế hoạch chờ phê duyệt',
                'message' => "Có $plansPendingApproval kế hoạch mới cần Trưởng khoa phê duyệt.",
                'action_label' => 'Xem ngay',
                'link' => '/admin/thesis-plans',
                'count' => $plansPendingApproval
            ];
        }

        // --- LẤY DANH SÁCH ID CÁC KẾ HOẠCH ĐANG CHẠY ---
        $activePlans = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm', 'Chờ duyệt chỉnh sửa'])
            ->with('mocThoigians')
            ->get();
            
        $activePlanIds = $activePlans->pluck('ID_KEHOACH');

        if ($activePlanIds->isEmpty() && $plansPendingApproval == 0) {
            return response()->json(['reminders' => []]);
        }

        // --- 2. KIỂM TRA DEADLINE (FIXED LOGIC) ---
        // Sử dụng giờ để so sánh chính xác hơn
        $closestHoursDiff = 99999; 
        $closestPhase = null;
        $closestPlanName = '';

        foreach ($activePlans as $plan) {
            foreach ($plan->mocThoigians as $moc) {
                // Chỉ check mốc đang diễn ra hoặc sắp tới
                if ($now->lte($moc->NGAY_KETTHUC)) {
                    // Tính khoảng cách bằng GIỜ
                    $hoursDiff = $now->diffInHours($moc->NGAY_KETTHUC, false);
                    
                    // Nếu còn dưới 72 giờ (3 ngày) và là mốc gần nhất tìm thấy
                    if ($hoursDiff >= 0 && $hoursDiff <= 72 && $hoursDiff < $closestHoursDiff) {
                        $closestHoursDiff = $hoursDiff;
                        $closestPhase = $moc;
                        $closestPlanName = $plan->TEN_DOT;
                    }
                }
            }
        }

        if ($closestPhase) {
            // Logic hiển thị thân thiện với con người
            if ($closestHoursDiff < 1) {
                $timeLeftStr = "sắp kết thúc ngay bây giờ";
            } elseif ($closestHoursDiff < 24) {
                $timeLeftStr = ceil($closestHoursDiff) . " giờ nữa";
            } else {
                $days = ceil($closestHoursDiff / 24);
                $timeLeftStr = "$days ngày nữa";
            }

            $reminders[] = [
                'id' => 'deadline_' . $closestPhase->ID,
                'type' => 'critical',
                'title' => "Sắp hết hạn: {$closestPhase->TEN_SUKIEN}",
                'message' => "Giai đoạn này của '{$closestPlanName}' sẽ kết thúc sau $timeLeftStr.",
                'action_label' => 'Kiểm tra',
                'link' => '/admin/thesis-plans',
                'count' => 0 
            ];
        }

        // --- 3. CÔNG VIỆC CẦN DUYỆT (URGENT) ---

        // A. Đề tài chờ duyệt
        $pendingTopics = Detai::whereIn('ID_KEHOACH', $activePlanIds)
            ->where('TRANGTHAI', 'Chờ duyệt')
            ->count();

        if ($pendingTopics > 0) {
            $reminders[] = [
                'id' => 'pending_topics',
                'type' => 'urgent',
                'title' => 'Đề tài chờ phê duyệt',
                'message' => "Tổng cộng có $pendingTopics đề tài đang chờ duyệt.",
                'action_label' => 'Duyệt ngay',
                'link' => '/admin/thesis-topics?status=Chờ duyệt',
                'count' => $pendingTopics
            ];
        }

        // B. Bài nộp chờ xác nhận
        $pendingSubmissions = NopSanpham::whereHas('phancong.nhom', fn($q) => $q->whereIn('ID_KEHOACH', $activePlanIds))
            ->where('TRANGTHAI', 'Chờ xác nhận')
            ->count();
        
        if ($pendingSubmissions > 0) {
            $reminders[] = [
                'id' => 'pending_submissions',
                'type' => 'urgent',
                'title' => 'Bài nộp chờ xác nhận',
                'message' => "Có $pendingSubmissions nhóm đã nộp sản phẩm cần kiểm tra.",
                'action_label' => 'Kiểm tra',
                'link' => '/admin/submissions',
                'count' => $pendingSubmissions
            ];
        }

        // --- 4. CẢNH BÁO TIẾN ĐỘ (WARNING) ---

        // A. Quota chưa phân xong
        $missingQuotaDepts = QuotaKhoaBomon::whereIn('ID_KEHOACH', $activePlanIds)
            ->where('TRANGTHAI', 'Đang phân công')
            ->count();
            
        if ($missingQuotaDepts > 0) {
            $reminders[] = [
                'id' => 'missing_quota',
                'type' => 'warning',
                'title' => 'Phân bổ Quota chưa xong',
                'message' => "Còn $missingQuotaDepts khoa/bộ môn chưa hoàn tất phân công.",
                'action_label' => 'Quản lý',
                'link' => '/admin/quota-management',
                'count' => $missingQuotaDepts
            ];
        }

        // B. Nhóm chưa có Hội đồng (Có đề tài + Đã nộp bài + Chưa có HĐ)
        $groupsMissingCouncil = Nhom::whereIn('ID_KEHOACH', $activePlanIds)
            ->has('phancongDetaiNhom') 
            ->whereHas('phancongDetaiNhom.submissions', function ($q) {
                $q->where('TRANGTHAI', 'Đã xác nhận');
            })
            ->doesntHave('hoidongs')
            ->count();

        if ($groupsMissingCouncil > 0) {
            $reminders[] = [
                'id' => 'missing_council',
                'type' => 'critical',
                'title' => 'Nhóm cần xếp Hội đồng',
                'message' => "Có $groupsMissingCouncil nhóm đủ điều kiện bảo vệ nhưng chưa có hội đồng.",
                'action_label' => 'Xếp lịch',
                'link' => '/admin/hoidong',
                'count' => $groupsMissingCouncil
            ];
        }

        // C. Nhóm chưa có đề tài (Khi đã qua ngày bắt đầu đăng ký)
        $plansStartedRegistration = [];
        foreach($activePlans as $plan) {
            $regPhase = $plan->mocThoigians->where('FEATURE_KEY', 'SV_DANGKY_DE')->first();
            if ($regPhase && $now->gte($regPhase->NGAY_BATDAU)) {
                $plansStartedRegistration[] = $plan->ID_KEHOACH;
            }
        }

        if (!empty($plansStartedRegistration)) {
            $groupsWithoutTopic = Nhom::whereIn('ID_KEHOACH', $plansStartedRegistration)
                ->doesntHave('phancongDetaiNhom')
                ->count();

            if ($groupsWithoutTopic > 0) {
                $reminders[] = [
                    'id' => 'groups_no_topic',
                    'type' => 'warning',
                    'title' => 'Nhóm chưa có đề tài',
                    'message' => "Hiện vẫn còn $groupsWithoutTopic nhóm chưa đăng ký đề tài nào.",
                    'action_label' => 'Xem DS',
                    'link' => '/admin/groups',
                    'count' => $groupsWithoutTopic
                ];
            }
        }

        // Sắp xếp: Critical > Urgent > Warning
        usort($reminders, function($a, $b) {
            $priority = ['critical' => 3, 'urgent' => 2, 'warning' => 1];
            return $priority[$b['type']] <=> $priority[$a['type']];
        });

        return response()->json([
            'reminders' => $reminders
        ]);
    }
}