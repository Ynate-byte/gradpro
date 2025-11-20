<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

use App\Models\KehoachKhoaluan;
use App\Models\Nhom;
use App\Models\CongViec;
use App\Models\LichHop;
use App\Models\News;
use App\Models\Thongbao;
use App\Models\SinhvienThamgia;

class StudentDashboardController extends Controller
{
    /**
     * API 1: Lấy dữ liệu Tổng quan (Overview) - Màn hình "The Hub"
     * Trả về danh sách kế hoạch đang tham gia, sự kiện sắp tới và tin tức.
     */
    public function getOverview(Request $request)
    {
        try {
            $user = Auth::user();
            $user->load('sinhvien');
            if (!$user->sinhvien) return response()->json([]);

            $sinhvienId = $user->sinhvien->ID_SINHVIEN;
            $userId = $user->ID_NGUOIDUNG;

            // 1. Lấy danh sách các nhóm SV đang tham gia (trong các kế hoạch Active)
            $activeGroups = Nhom::whereHas('kehoach', function ($q) {
                    $q->whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm']);
                })
                ->whereHas('thanhviens', function ($q) use ($userId) {
                    $q->where('ID_NGUOIDUNG', $userId);
                })
                ->with([
                    'kehoach:ID_KEHOACH,TEN_DOT',
                    'phancongDetaiNhom.detai:ID_DETAI,TEN_DETAI',
                    'phancongDetaiNhom.gvhd.nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN'
                ])
                ->get();

            $groupIds = $activeGroups->pluck('ID_NHOM');

            // 2. Thống kê chỉ số (Stats)
            // Task cần làm (Chưa xong + Được gán cho user)
            $pendingTasksCount = CongViec::whereIn('ID_NHOM', $groupIds)
                ->whereHas('nguoiDuocPhanCong', fn($q) => $q->where('PHANCONG_CONGVIEC.ID_NGUOIDUNG', $userId))
                ->whereNotIn('TRANGTHAI', ['Hoàn thành', 'Đã hủy'])
                ->count();

            // Lịch họp HÔM NAY
            $meetingsToday = LichHop::whereIn('ID_NHOM', $groupIds)
                ->whereDate('THOIGIAN_BATDAU', Carbon::today())
                ->where('TRANGTHAI', '!=', 'Đã hủy')
                ->count();

            // Feedback mới (Thông báo chưa đọc)
            $newFeedbackCount = Thongbao::where('ID_NGUOINHAN', $userId)
                ->where('DA_DOC', false)
                ->count();

            // Tiến độ trung bình (của tất cả nhóm)
            $avgProgress = 0;
            if ($activeGroups->count() > 0) {
                $totalPercent = 0;
                foreach ($activeGroups as $g) {
                    $totalT = CongViec::where('ID_NHOM', $g->ID_NHOM)->where('TRANGTHAI', '!=', 'Đã hủy')->count();
                    $doneT = CongViec::where('ID_NHOM', $g->ID_NHOM)->where('TRANGTHAI', 'Hoàn thành')->count();
                    if ($totalT > 0) $totalPercent += ($doneT / $totalT);
                }
                $avgProgress = round(($totalPercent / $activeGroups->count()) * 100);
            }

            // 3. Danh sách Công việc cần làm (Unified Task List)
            // Lấy tất cả task chưa xong của user, sắp xếp theo Deadline
            $tasks = CongViec::whereIn('ID_NHOM', $groupIds)
                ->whereHas('nguoiDuocPhanCong', fn($q) => $q->where('PHANCONG_CONGVIEC.ID_NGUOIDUNG', $userId))
                ->whereNotIn('TRANGTHAI', ['Hoàn thành', 'Đã hủy'])
                ->with('nhom:ID_NHOM,TEN_NHOM') // Để biết task thuộc nhóm nào
                ->orderByRaw('ISNULL(NGAY_HETHAN), NGAY_HETHAN ASC') // Deadline gần nhất lên đầu, null xuống cuối
                ->take(10) // Lấy 10 cái quan trọng nhất
                ->get()
                ->map(function ($t) {
                    $deadline = $t->NGAY_HETHAN ? Carbon::parse($t->NGAY_HETHAN) : null;
                    $isOverdue = $deadline && $deadline->isPast();
                    $isToday = $deadline && $deadline->isToday();
                    
                    return [
                        'id' => $t->ID_CONGVIEC,
                        'title' => $t->TEN_CONGVIEC,
                        'group_name' => $t->nhom->TEN_NHOM,
                        'plan_id' => $t->nhom->ID_KEHOACH, // Để redirect
                        'priority' => $t->DO_UUTIEN,
                        'deadline' => $t->NGAY_HETHAN,
                        'status_label' => $isOverdue ? 'Quá hạn' : ($isToday ? 'Hôm nay' : 'Sắp tới'),
                        'status_color' => $isOverdue ? 'red' : ($isToday ? 'orange' : 'blue')
                    ];
                });

            // 4. Format danh sách nhóm (Context Switchers)
            $myGroups = $activeGroups->map(function ($g) {
                return [
                    'id' => $g->ID_NHOM,
                    'name' => $g->TEN_NHOM,
                    'plan_name' => $g->kehoach->TEN_DOT,
                    'plan_id' => $g->ID_KEHOACH,
                    'members_count' => $g->SO_THANHVIEN_HIENTAI, // Cần đảm bảo model Nhom có cột này hoặc count relation
                    'topic_name' => $g->phancongDetaiNhom?->detai?->TEN_DETAI ?? 'Chưa đăng ký đề tài',
                    'supervisor_name' => $g->phancongDetaiNhom?->gvhd?->nguoidung?->HODEM_VA_TEN ?? 'Chưa phân công'
                ];
            });

            return response()->json([
                'stats' => [
                    'pending_tasks' => $pendingTasksCount,
                    'meetings_today' => $meetingsToday,
                    'new_feedback' => $newFeedbackCount,
                    'avg_progress' => $avgProgress
                ],
                'tasks' => $tasks,
                'groups' => $myGroups
            ]);

        } catch (\Exception $e) {
            Log::error("Student Dashboard Error: " . $e->getMessage());
            return response()->json(['message' => 'Server Error'], 500);
        }
    }

    /**
     * API 2: Lấy dữ liệu Chi tiết (Detail Context)
     * Khi user chọn 1 Plan cụ thể để xem Dashboard chi tiết
     */
    public function getDetail(Request $request, $planId)
    {
        try {
            $user = Auth::user();
            
            // Lấy thông tin kế hoạch kèm mốc thời gian
            $plan = KehoachKhoaluan::with(['mocThoigians' => function($q) {
                $q->orderBy('NGAY_BATDAU', 'asc');
            }])->findOrFail($planId);
    
            // Lấy thông tin nhóm của SV trong kế hoạch này (nếu có)
            $group = Nhom::where('ID_KEHOACH', $planId)
                ->whereHas('thanhviens', fn($q) => $q->where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG))
                ->with([
                    'nhomtruong', 
                    'thanhviens.nguoidung',
                    'phancongDetaiNhom.gvhd.nguoidung',
                    'phancongDetaiNhom.detai'
                ])
                ->first();
    
            // Xác định giai đoạn hiện tại của kế hoạch (Current Phase)
            $currentPhase = null;
            $now = Carbon::now();
            
            if ($plan->mocThoigians && $plan->mocThoigians->isNotEmpty()) {
                // Ưu tiên tìm mốc đang diễn ra
                foreach ($plan->mocThoigians as $moc) {
                    if ($now->between($moc->NGAY_BATDAU, $moc->NGAY_KETTHUC)) {
                        $currentPhase = $moc;
                        break;
                    }
                }
                // Nếu không có mốc nào đang diễn ra, tìm mốc sắp tới gần nhất
                if (!$currentPhase) {
                    $currentPhase = $plan->mocThoigians
                        ->where('NGAY_BATDAU', '>', $now)
                        ->first();
                }
            }
    
            // Thống kê Task cá nhân trong nhóm này
            $myTasksStats = [
                'total' => 0,
                'overdue' => 0,
                'today' => 0
            ];
    
            if ($group) {
                // Query cơ sở cho các task của tôi
                $myTasksQuery = CongViec::where('ID_NHOM', $group->ID_NHOM)
                    ->whereHas('nguoiDuocPhanCong', fn($q) => $q->where('PHANCONG_CONGVIEC.ID_NGUOIDUNG', $user->ID_NGUOIDUNG))
                    ->whereNotIn('TRANGTHAI', ['Hoàn thành', 'Đã hủy']);
    
                $myTasksStats['total'] = (clone $myTasksQuery)->count();
                $myTasksStats['overdue'] = (clone $myTasksQuery)->where('NGAY_HETHAN', '<', $now)->count();
                $myTasksStats['today'] = (clone $myTasksQuery)->whereDate('NGAY_HETHAN', Carbon::today())->count();
            }
    
            return response()->json([
                'plan' => [
                    'id' => $plan->ID_KEHOACH,
                    'name' => $plan->TEN_DOT,
                    'timeline' => $plan->mocThoigians,
                    'current_phase' => $currentPhase
                ],
                'group' => $group, // Trả về null nếu chưa có nhóm, frontend sẽ xử lý hiển thị
                'my_stats' => $myTasksStats
            ]);

        } catch (\Exception $e) {
            Log::error("Student Dashboard Detail Error: " . $e->getMessage());
            return response()->json(['message' => 'Server Error: ' . $e->getMessage()], 500);
        }
    }
}