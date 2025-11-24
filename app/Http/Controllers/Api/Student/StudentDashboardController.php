<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

use App\Models\KehoachKhoaluan;
use App\Models\Nhom;
use App\Models\CongViec;
use App\Models\LichHop;
use App\Models\News;

class StudentDashboardController extends Controller
{
    /**
     * Lấy dữ liệu tổng quan cho Dashboard Sinh viên
     * Bao gồm: Stats, Các đồ án đang tham gia (kèm thông tin nhóm/hội đồng), Việc gấp, Tin tức
     */
    public function getOverview(Request $request)
    {
        try {
            $user = Auth::user();
            $user->load('sinhvien');

            if (!$user || !$user->sinhvien) {
                return response()->json([
                    'stats' => ['active_plans' => 0, 'groups_joined' => 0, 'pending_tasks' => 0],
                    'plans' => [],
                    'urgent_items' => [],
                    'news' => []
                ]);
            }

            $sinhvienId = $user->sinhvien->ID_SINHVIEN;
            $userId = $user->ID_NGUOIDUNG;
            $now = Carbon::now();
            $limitDate = Carbon::today()->addDays(3); // Định nghĩa "gấp" là trong 3 ngày tới

            // 1. Lấy danh sách nhóm Active (Thuộc các kế hoạch đang chạy)
            // Kèm theo thông tin Kế hoạch, Đề tài, GVHD và HỘI ĐỒNG BẢO VỆ
            $activeGroups = Nhom::whereHas('kehoach', function ($q) {
                    $q->whereIn('KEHOACH_KHOALUAN.TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm']);
                })
                ->whereHas('thanhviens', function ($q) use ($userId) {
                    $q->where('THANHVIEN_NHOM.ID_NGUOIDUNG', $userId);
                })
                ->with([
                    'kehoach:ID_KEHOACH,TEN_DOT,NAMHOC,HOCKY,NGAY_KETHUC',
                    'phancongDetaiNhom.detai:ID_DETAI,TEN_DETAI',
                    'phancongDetaiNhom.gvhd.nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN',
                    // [CẬP NHẬT] Load thông tin Hội đồng (Chỉ lấy thông tin cơ bản, không lấy giảng viên)
                    'hoidongs' => function($q) {
                        $q->where('LOAI', 'hoidong')
                          ->select('HOIDONG.ID_HOIDONG', 'TEN_HOIDONG', 'NGAY_BAOCAO', 'GIO_BAOCAO', 'PHONG');
                    }
                ])
                ->get();

            $groupIds = $activeGroups->pluck('ID_NHOM')->toArray();

            // 2. Lấy Task Gấp (Priority Cao hoặc Deadline gần)
            $urgentTasks = collect();
            if (!empty($groupIds)) {
                $urgentTasks = CongViec::whereIn('CONGVIEC.ID_NHOM', $groupIds)
                    ->whereHas('nguoiDuocPhanCong', function($q) use ($userId) {
                        $q->where('PHANCONG_CONGVIEC.ID_NGUOIDUNG', $userId);
                    })
                    ->whereNotIn('CONGVIEC.TRANGTHAI', ['Hoàn thành', 'Đã hủy'])
                    ->where(function($q) use ($limitDate) {
                        $q->where('CONGVIEC.DO_UUTIEN', 'Cao')
                          ->orWhereDate('CONGVIEC.NGAY_HETHAN', '<=', $limitDate);
                    })
                    ->with('nhom:ID_NHOM,TEN_NHOM,ID_KEHOACH')
                    ->get()
                    ->map(function ($t) {
                        return [
                            'type' => 'task',
                            'id' => $t->ID_CONGVIEC,
                            'title' => $t->TEN_CONGVIEC,
                            'group_name' => $t->nhom ? $t->nhom->TEN_NHOM : '',
                            'group_id' => $t->ID_NHOM,
                            'plan_id' => $t->nhom ? $t->nhom->ID_KEHOACH : null,
                            'time' => $t->NGAY_HETHAN,
                            'priority' => $t->DO_UUTIEN,
                        ];
                    });
            }

            // 3. Lấy Lịch Họp sắp tới
            $upcomingMeetings = collect();
            if (!empty($groupIds)) {
                $upcomingMeetings = LichHop::whereIn('ID_NHOM', $groupIds)
                    ->where('TRANGTHAI', '!=', 'Đã hủy')
                    ->where('THOIGIAN_BATDAU', '>=', $now)
                    ->where('THOIGIAN_BATDAU', '<=', $limitDate)
                    ->with('nhom:ID_NHOM,TEN_NHOM,ID_KEHOACH')
                    ->get()
                    ->map(function ($m) {
                        return [
                            'type' => 'meeting',
                            'id' => $m->ID_LICHHOP,
                            'title' => $m->TIEUDE_LICHHOP,
                            'group_name' => $m->nhom ? $m->nhom->TEN_NHOM : '',
                            'group_id' => $m->ID_NHOM,
                            'plan_id' => $m->nhom ? $m->nhom->ID_KEHOACH : null,
                            'time' => $m->THOIGIAN_BATDAU,
                            'location' => $m->HINHTHUC_HOP == 'Trực tuyến' ? 'Online' : $m->DIADIEM,
                        ];
                    });
            }

            // Gộp Task và Meeting, sắp xếp theo thời gian
            $mergedItems = $urgentTasks->concat($upcomingMeetings)
                ->sortBy(function ($item) {
                    return $item['time'] ? Carbon::parse($item['time'])->timestamp : 9999999999;
                })
                ->take(6)
                ->values();

            // 4. Tin tức mới nhất (Dành cho sinh viên hoặc tất cả)
            $latestNews = News::where(function($q) {
                    $q->whereJsonContains('target_roles', 'ALL')
                      ->orWhereJsonContains('target_roles', 'SINH_VIEN')
                      ->orWhereNull('target_roles');
                })
                ->orderBy('is_pinned', 'desc')
                ->orderBy('created_at', 'desc')
                ->take(3)
                ->get()
                ->map(function($news) {
                    return [
                        'id' => $news->id,
                        'title' => $news->title,
                        'category' => $news->category,
                        'created_at' => $news->created_at,
                        'is_pinned' => (bool)$news->is_pinned
                    ];
                });

            // 5. Format dữ liệu Plans (Kèm thống kê task và thông tin hội đồng)
            $pendingTasksCount = 0;
            if (!empty($groupIds)) {
                $pendingTasksCount = CongViec::whereIn('CONGVIEC.ID_NHOM', $groupIds)
                    ->whereHas('nguoiDuocPhanCong', fn($q) => $q->where('PHANCONG_CONGVIEC.ID_NGUOIDUNG', $userId))
                    ->whereNotIn('CONGVIEC.TRANGTHAI', ['Hoàn thành', 'Đã hủy'])
                    ->count();
            }

            $myPlans = $activeGroups->map(function ($g) {
                // Thống kê task nhanh
                $total = CongViec::where('ID_NHOM', $g->ID_NHOM)->where('TRANGTHAI', '!=', 'Đã hủy')->count();
                $done = CongViec::where('ID_NHOM', $g->ID_NHOM)->where('TRANGTHAI', 'Hoàn thành')->count();
                $percent = $total > 0 ? round(($done / $total) * 100) : 0;

                return [
                    'plan_id' => $g->ID_KEHOACH,
                    'plan_name' => $g->kehoach ? $g->kehoach->TEN_DOT : 'Kế hoạch',
                    'term' => $g->kehoach ? ($g->kehoach->NAMHOC . ' - HK' . $g->kehoach->HOCKY) : '',
                    'end_date' => $g->kehoach ? $g->kehoach->NGAY_KETHUC : null,
                    'group' => [
                        'id' => $g->ID_NHOM,
                        'name' => $g->TEN_NHOM,
                        'topic_name' => $g->phancongDetaiNhom?->detai?->TEN_DETAI,
                        'supervisor_name' => $g->phancongDetaiNhom?->gvhd?->nguoidung?->HODEM_VA_TEN,
                        'members_count' => $g->SO_THANHVIEN_HIENTAI,
                        
                        // [MỚI] Thông tin hội đồng (Chỉ lấy cái đầu tiên nếu có nhiều)
                        'council' => $g->hoidongs->first() ? [
                            'name' => $g->hoidongs->first()->TEN_HOIDONG,
                            'date' => $g->hoidongs->first()->NGAY_BAOCAO,
                            'time' => $g->hoidongs->first()->GIO_BAOCAO,
                            'room' => $g->hoidongs->first()->PHONG,
                        ] : null
                    ],
                    'task_stats' => ['total' => $total, 'done' => $done, 'percent' => $percent]
                ];
            });

            return response()->json([
                'stats' => [
                    'active_plans' => $activeGroups->count(),
                    'groups_joined' => $activeGroups->count(), // Tạm thời giống nhau
                    'pending_tasks' => $pendingTasksCount,
                ],
                'plans' => $myPlans->values(),
                'urgent_items' => $mergedItems,
                'news' => $latestNews
            ]);

        } catch (\Throwable $e) {
            Log::error("Student Dashboard Overview Error: " . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Lấy dữ liệu chi tiết cho một kế hoạch cụ thể (Detail Context)
     */
    public function getDetail(Request $request, $planId)
    {
        try {
            $user = Auth::user();
            
            // 1. Lấy thông tin kế hoạch
            $plan = KehoachKhoaluan::with(['mocThoigians' => function($q) {
                $q->orderBy('NGAY_BATDAU', 'asc');
            }])->findOrFail($planId);
   
            // 2. Lấy thông tin nhóm
            $group = Nhom::where('ID_KEHOACH', $planId)
                ->whereHas('thanhviens', function($q) use ($user) {
                    $q->where('THANHVIEN_NHOM.ID_NGUOIDUNG', $user->ID_NGUOIDUNG);
                })
                ->with([
                    'nhomtruong', 
                    'thanhviens.nguoidung',
                    'phancongDetaiNhom.gvhd.nguoidung',
                    'phancongDetaiNhom.detai',
                    'diemHuongDan', 
                    'diemPhanBien',
                    'diemHoiDong',
                    'hoidongs.giangviens.nguoidung'
                ])
                ->first();
   
            $currentPhase = null;
            $now = Carbon::now();
            
            // Xác định giai đoạn hiện tại
            if ($plan->mocThoigians && $plan->mocThoigians->isNotEmpty()) {
                foreach ($plan->mocThoigians as $moc) {
                    if ($now->between($moc->NGAY_BATDAU, $moc->NGAY_KETTHUC)) {
                        $currentPhase = $moc;
                        break;
                    }
                }
                if (!$currentPhase) {
                    $currentPhase = $plan->mocThoigians->where('NGAY_BATDAU', '>', $now)->first();
                }
            }
   
            $memberContribution = [];
            $thesisHealth = null;
            $integratedTimeline = [];
            $myTasksStats = ['total' => 0, 'overdue' => 0, 'today' => 0];

            if ($group) {
                // A. Thống kê đóng góp
                $memberContribution = $group->thanhviens->map(function($tv) use ($group) {
                    $doneTasks = CongViec::where('ID_NHOM', $group->ID_NHOM)
                        ->whereHas('nguoiDuocPhanCong', fn($q) => $q->where('PHANCONG_CONGVIEC.ID_NGUOIDUNG', $tv->ID_NGUOIDUNG))
                        ->where('TRANGTHAI', 'Hoàn thành')
                        ->count();
                    
                    $totalTasks = CongViec::where('ID_NHOM', $group->ID_NHOM)
                         ->whereHas('nguoiDuocPhanCong', fn($q) => $q->where('PHANCONG_CONGVIEC.ID_NGUOIDUNG', $tv->ID_NGUOIDUNG))
                         ->count();

                    return [
                        'name' => $tv->nguoidung->HODEM_VA_TEN ?? 'N/A',
                        'value' => $doneTasks,
                        'total' => $totalTasks,
                    ];
                });

                // B. Sức khỏe đề tài
                $phanBien = $group->hoidongs->firstWhere('LOAI', 'phanbien');
                $gvPhanBien = $phanBien && $phanBien->giangviens->isNotEmpty() ? $phanBien->giangviens->first() : null;
                
                $thesisHealth = [
                    'has_topic' => !!$group->phancongDetaiNhom,
                    'topic_status' => $group->phancongDetaiNhom?->detai?->TRANGTHAI ?? 'Chưa đăng ký',
                    'supervisor' => $group->phancongDetaiNhom?->gvhd?->nguoidung?->HODEM_VA_TEN,
                    'reviewer' => $gvPhanBien?->nguoidung?->HODEM_VA_TEN,
                    'grades' => [
                        'guide' => $group->diemHuongDan->first()?->DIEM,
                        'review' => $group->diemPhanBien->first()?->DIEM,
                        'council' => $group->diemHoiDong->avg('DIEM')
                    ]
                ];

                // --- C. TIMELINE TÍCH HỢP ---

                // 1. Mốc kế hoạch
                foreach ($plan->mocThoigians as $moc) {
                    $integratedTimeline[] = [
                        'id' => 'moc_' . $moc->ID,
                        'title' => $moc->TEN_SUKIEN,
                        'date' => $moc->NGAY_KETTHUC, 
                        'type' => 'milestone',
                        'priority' => null,
                        'details' => $moc->MOTA 
                    ];
                }

                // 2. Công việc (Tasks)
                $tasks = CongViec::where('ID_NHOM', $group->ID_NHOM)
                    ->whereNotNull('NGAY_HETHAN')
                    ->where('TRANGTHAI', '!=', 'Hoàn thành')
                    ->where('TRANGTHAI', '!=', 'Đã hủy')
                    ->orderBy('NGAY_HETHAN', 'asc')
                    ->take(5)
                    ->get();

                foreach ($tasks as $task) {
                    $integratedTimeline[] = [
                        'id' => 'task_' . $task->ID_CONGVIEC,
                        'title' => $task->TEN_CONGVIEC,
                        'date' => $task->NGAY_HETHAN,
                        'type' => 'task',
                        'priority' => $task->DO_UUTIEN,
                        'details' => null
                    ];
                }

                // 3. Lịch họp
                $meetings = LichHop::where('ID_NHOM', $group->ID_NHOM)
                    ->where('TRANGTHAI', '!=', 'Đã hủy')
                    ->where('THOIGIAN_BATDAU', '>=', Carbon::now()->subDays(1))
                    ->orderBy('THOIGIAN_BATDAU', 'asc')
                    ->take(5)
                    ->get();

                foreach ($meetings as $meeting) {
                    $integratedTimeline[] = [
                        'id' => 'meeting_' . $meeting->ID_LICHHOP,
                        'title' => $meeting->TIEUDE_LICHHOP,
                        'date' => $meeting->THOIGIAN_BATDAU,
                        'type' => 'meeting',
                        'priority' => null,
                        'details' => $meeting->HINHTHUC_HOP == 'Trực tuyến' ? 'Online' : $meeting->DIADIEM
                    ];
                }

                // Sắp xếp timeline
                usort($integratedTimeline, function($a, $b) {
                    return strtotime($a['date']) - strtotime($b['date']);
                });
                
                // D. Stats cá nhân
                $myTasksQuery = CongViec::where('ID_NHOM', $group->ID_NHOM)
                    ->whereHas('nguoiDuocPhanCong', fn($q) => $q->where('PHANCONG_CONGVIEC.ID_NGUOIDUNG', $user->ID_NGUOIDUNG))
                    ->whereNotIn('CONGVIEC.TRANGTHAI', ['Hoàn thành', 'Đã hủy']);
   
                $myTasksStats['total'] = (clone $myTasksQuery)->count();
                $myTasksStats['overdue'] = (clone $myTasksQuery)->where('NGAY_HETHAN', '<', $now)->count();
                $myTasksStats['today'] = (clone $myTasksQuery)->whereDate('NGAY_HETHAN', Carbon::today())->count();
            }
   
            return response()->json([
                'plan' => [
                    'id' => $plan->ID_KEHOACH,
                    'name' => $plan->TEN_DOT,
                    'current_phase' => $currentPhase
                ],
                'group' => $group,
                'my_stats' => $myTasksStats,
                'member_contribution' => $memberContribution,
                'thesis_health' => $thesisHealth,
                'integrated_timeline' => $integratedTimeline
            ]);

        } catch (\Throwable $e) {
            Log::error("Student Dashboard Detail Error: " . $e->getMessage());
            return response()->json(['message' => 'Server Error: ' . $e->getMessage()], 500);
        }
    }
}