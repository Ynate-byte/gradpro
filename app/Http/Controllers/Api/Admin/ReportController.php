<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\KehoachKhoaluan;
use App\Models\Nguoidung;
use App\Services\NotificationService;
use App\Exports\ThesisResultExport;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller
{
    /**
     * Lấy toàn bộ số liệu thống kê tổng quan cho một kế hoạch
     */
    public function getPlanReport(Request $request)
    {
        $planId = $request->plan_id;
        if (!$planId) return response()->json(['message' => 'Missing Plan ID'], 400);

        // --- 1. LẤY TỶ TRỌNG ĐIỂM ---
        // Ưu tiên lấy từ Kế hoạch, nếu không có thì lấy từ Cấu hình chung
        $plan = KehoachKhoaluan::find($planId);
        $globalSetting = \App\Models\TyTrongDiem::getCurrent();
        
        $wHD = (float)($plan->TYTRONG_DIEM_QUATRINH ?? $globalSetting->HUONGDAN ?? 0.4) * 100;
        $wPB = (float)($plan->TYTRONG_DIEM_PHANBIEN ?? $globalSetting->PHANBIEN ?? 0.3) * 100;
        $wHDong = (float)($plan->TYTRONG_DIEM_HOIDONG ?? $globalSetting->HOIDONG ?? 0.3) * 100;
        
        $weights = [
            'hd' => $wHD,
            'pb' => $wPB,
            'hdong' => $wHDong
        ];

        // --- 2. Overview KPIs (Tổng quan) ---
        $overview = DB::table('SINHVIEN_THAMGIA')
            ->where('ID_KEHOACH', $planId)
            ->selectRaw('count(*) as total_students')
            ->first();

        $groupStats = DB::table('NHOM')
            ->where('ID_KEHOACH', $planId)
            ->selectRaw('
                count(*) as total_groups,
                sum(case when TRANGTHAI = "Đã hoàn thành" then 1 else 0 end) as completed_groups,
                sum(case when TRANGTHAI = "Đang thực hiện" then 1 else 0 end) as active_groups
            ')
            ->first();
            
        $topicStats = DB::table('DETAI')
            ->where('ID_KEHOACH', $planId)
            ->selectRaw('
                count(*) as total_topics,
                sum(SO_NHOM_HIENTAI) as assigned_slots
            ')
            ->first();

        // --- 3. Biểu đồ phân bổ đề tài theo Bộ môn ---
        $topicsByDept = DB::table('DETAI')
            ->join('KHOA_BOMON', 'DETAI.ID_KHOA_BOMON', '=', 'KHOA_BOMON.ID_KHOA_BOMON')
            ->where('DETAI.ID_KEHOACH', $planId)
            ->select('KHOA_BOMON.TEN_KHOA_BOMON as name', DB::raw('count(*) as value'))
            ->groupBy('KHOA_BOMON.ID_KHOA_BOMON', 'KHOA_BOMON.TEN_KHOA_BOMON')
            ->get();

        // --- 4. Phổ điểm & Tỷ lệ Đậu/Rớt ---
        // Logic: < 4.0 là Rớt (F), 4.0-5.4 (D), 5.5-6.9 (C), 7.0-8.4 (B), 8.5-10 (A)
        $scores = DB::table('DIEM_TONGKET')
            ->join('NHOM', 'DIEM_TONGKET.ID_NHOM', '=', 'NHOM.ID_NHOM')
            ->where('NHOM.ID_KEHOACH', $planId)
            ->whereNotNull('DIEM_TONGKET.DIEM_TONG')
            ->select('DIEM_TONGKET.DIEM_TONG')
            ->get();

        $scoreDist = [
            'F (<4.0)' => 0,
            'D (4.0-5.4)' => 0,
            'C (5.5-6.9)' => 0,
            'B (7.0-8.4)' => 0,
            'A (8.5-10)' => 0,
        ];
        
        $passCount = 0;
        $failCount = 0;

        foreach ($scores as $s) {
            $score = $s->DIEM_TONG;
            if ($score < 4.0) {
                $scoreDist['F (<4.0)']++;
                $failCount++;
            } elseif ($score < 5.5) {
                $scoreDist['D (4.0-5.4)']++;
                $passCount++;
            } elseif ($score < 7.0) {
                $scoreDist['C (5.5-6.9)']++;
                $passCount++;
            } elseif ($score < 8.5) {
                $scoreDist['B (7.0-8.4)']++;
                $passCount++;
            } else {
                $scoreDist['A (8.5-10)']++;
                $passCount++;
            }
        }

        // --- 5. Danh sách cảnh báo (Alerts) ---
        
        // A. Sinh viên chưa có nhóm
        $studentsNoGroup = DB::table('SINHVIEN_THAMGIA')
            ->join('SINHVIEN', 'SINHVIEN_THAMGIA.ID_SINHVIEN', '=', 'SINHVIEN.ID_SINHVIEN')
            ->join('NGUOIDUNG', 'SINHVIEN.ID_NGUOIDUNG', '=', 'NGUOIDUNG.ID_NGUOIDUNG')
            ->leftJoin('THANHVIEN_NHOM', function($join) use ($planId) {
                $join->on('NGUOIDUNG.ID_NGUOIDUNG', '=', 'THANHVIEN_NHOM.ID_NGUOIDUNG')
                     ->whereExists(function($q) use ($planId) {
                         $q->select(DB::raw(1))
                           ->from('NHOM')
                           ->whereColumn('NHOM.ID_NHOM', 'THANHVIEN_NHOM.ID_NHOM')
                           ->where('NHOM.ID_KEHOACH', $planId);
                     });
            })
            ->where('SINHVIEN_THAMGIA.ID_KEHOACH', $planId)
            ->whereNull('THANHVIEN_NHOM.ID_NHOM')
            ->select('NGUOIDUNG.ID_NGUOIDUNG', 'NGUOIDUNG.HODEM_VA_TEN', 'NGUOIDUNG.MA_DINHDANH')
            ->limit(50) // Limit để tránh quá tải UI
            ->get();

        // B. Nhóm chưa có đề tài
        $groupsNoTopic = DB::table('NHOM')
            ->leftJoin('PHANCONG_DETAI_NHOM', 'NHOM.ID_NHOM', '=', 'PHANCONG_DETAI_NHOM.ID_NHOM')
            ->join('NGUOIDUNG', 'NHOM.ID_NHOMTRUONG', '=', 'NGUOIDUNG.ID_NGUOIDUNG')
            ->where('NHOM.ID_KEHOACH', $planId)
            ->whereNull('PHANCONG_DETAI_NHOM.ID_DETAI')
            ->select('NHOM.ID_NHOM', 'NHOM.TEN_NHOM', 'NGUOIDUNG.ID_NGUOIDUNG as LEADER_ID', 'NGUOIDUNG.HODEM_VA_TEN as LEADER_NAME')
            ->get();

        // C. Giảng viên chưa chấm điểm (Đã bảo vệ xong nhưng chưa nhập điểm Hội đồng)
        $lecturersMissingGrades = DB::table('HOIDONG_GIANGVIEN')
            ->join('HOIDONG', 'HOIDONG_GIANGVIEN.ID_HOIDONG', '=', 'HOIDONG.ID_HOIDONG')
            ->join('HOIDONG_NHOM', 'HOIDONG.ID_HOIDONG', '=', 'HOIDONG_NHOM.ID_HOIDONG')
            ->join('GIANGVIEN', 'HOIDONG_GIANGVIEN.ID_GIANGVIEN', '=', 'GIANGVIEN.ID_GIANGVIEN')
            ->join('NGUOIDUNG', 'GIANGVIEN.ID_NGUOIDUNG', '=', 'NGUOIDUNG.ID_NGUOIDUNG')
            ->leftJoin('DIEM_HOIDONG', function($join) {
                $join->on('HOIDONG_NHOM.ID_NHOM', '=', 'DIEM_HOIDONG.ID_NHOM')
                     ->on('HOIDONG_GIANGVIEN.ID_GIANGVIEN', '=', 'DIEM_HOIDONG.ID_GIANGVIEN');
            })
            ->where('HOIDONG.ID_KEHOACH', $planId)
            ->where('HOIDONG.LOAI', '!=', 'phanbien')
            ->where('HOIDONG.NGAY_BAOCAO', '<', now()) // Đã diễn ra
            ->whereNull('DIEM_HOIDONG.DIEM') // Chưa có điểm
            ->select(
                'NGUOIDUNG.ID_NGUOIDUNG', 
                'NGUOIDUNG.HODEM_VA_TEN', 
                'HOIDONG.TEN_HOIDONG',
                DB::raw('count(HOIDONG_NHOM.ID_NHOM) as missing_count')
            )
            ->groupBy('NGUOIDUNG.ID_NGUOIDUNG', 'NGUOIDUNG.HODEM_VA_TEN', 'HOIDONG.TEN_HOIDONG')
            ->get();

        return response()->json([
            'overview' => [
                'students' => $overview->total_students,
                'groups' => $groupStats->total_groups,
                'active_groups' => $groupStats->active_groups,
                'topics' => $topicStats->total_topics,
                'assigned_topics' => $topicStats->assigned_slots
            ],
            'charts' => [
                'topics_by_dept' => $topicsByDept,
                'score_dist' => $scoreDist,
                'pass_fail' => ['pass' => $passCount, 'fail' => $failCount]
            ],
            'alerts' => [
                'students_no_group' => $studentsNoGroup,
                'groups_no_topic' => $groupsNoTopic,
                'lecturers_missing_grades' => $lecturersMissingGrades
            ],
            'weights' => $weights
        ]);
    }

    /**
     * Lấy danh sách kết quả chi tiết của sinh viên trong kế hoạch (Phân trang)
     */
    public function getStudentResults(Request $request)
    {
        $planId = $request->plan_id;
        $filter = $request->filter;
        $search = $request->search;

        if (!$planId) return response()->json(['data' => []]);

        // [MỚI] Lấy thông tin kế hoạch để kiểm tra trạng thái
        $plan = \App\Models\KehoachKhoaluan::find($planId);
        $isPlanEnded = $plan && $plan->TRANGTHAI === 'Đã hoàn thành';

        $query = DB::table('NGUOIDUNG')
            ->join('SINHVIEN', 'NGUOIDUNG.ID_NGUOIDUNG', '=', 'SINHVIEN.ID_NGUOIDUNG')
            ->join('THANHVIEN_NHOM', 'NGUOIDUNG.ID_NGUOIDUNG', '=', 'THANHVIEN_NHOM.ID_NGUOIDUNG')
            ->join('NHOM', 'THANHVIEN_NHOM.ID_NHOM', '=', 'NHOM.ID_NHOM')
            ->leftJoin('PHANCONG_DETAI_NHOM', 'NHOM.ID_NHOM', '=', 'PHANCONG_DETAI_NHOM.ID_NHOM')
            ->leftJoin('DETAI', 'PHANCONG_DETAI_NHOM.ID_DETAI', '=', 'DETAI.ID_DETAI')
            ->leftJoin('DIEM_TONGKET', 'NHOM.ID_NHOM', '=', 'DIEM_TONGKET.ID_NHOM')
            ->leftJoin('DIEM_PHANBIEN', 'NHOM.ID_NHOM', '=', 'DIEM_PHANBIEN.ID_NHOM')
            ->leftJoin('HOIDONG_NHOM', 'NHOM.ID_NHOM', '=', 'HOIDONG_NHOM.ID_NHOM')
            ->where('NHOM.ID_KEHOACH', $planId)
            ->select(
                'NGUOIDUNG.ID_NGUOIDUNG',
                'NGUOIDUNG.MA_DINHDANH',
                'NGUOIDUNG.HODEM_VA_TEN',
                'NHOM.TEN_NHOM',
                'DETAI.TEN_DETAI',
                'DIEM_TONGKET.DIEM_HD',
                'DIEM_TONGKET.DIEM_PB',
                'DIEM_TONGKET.DIEM_HDONG',
                'DIEM_TONGKET.DIEM_TONG',
                'DIEM_PHANBIEN.DIEM as DIEM_PB_RAW',
                'HOIDONG_NHOM.ID_HOIDONG'
            );

        // Filter: Đậu / Rớt
        if ($filter === 'pass') {
            $query->where('DIEM_TONGKET.DIEM_TONG', '>=', 4.0);
        } elseif ($filter === 'fail') {
            $query->where(function($q) use ($isPlanEnded) {
                // Rớt nếu điểm tổng kết < 4.0
                $q->where('DIEM_TONGKET.DIEM_TONG', '<', 4.0);
                
                if ($isPlanEnded) {
                    $q->orWhereNull('HOIDONG_NHOM.ID_HOIDONG');
                } else {
                    $q->orWhereNull('DIEM_TONGKET.DIEM_TONG'); 
                }
            });
        }

        // Search
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('NGUOIDUNG.HODEM_VA_TEN', 'like', "%{$search}%")
                  ->orWhere('NGUOIDUNG.MA_DINHDANH', 'like', "%{$search}%");
            });
        }
        
        $query->orderBy('NGUOIDUNG.MA_DINHDANH', 'asc');

        $results = $query->paginate($request->per_page ?? 20);

        return response()->json($results);
    }

    /**
     * Gửi cảnh báo nhanh (Nudge)
     */
    public function nudgeUser(Request $request)
    {
        $userId = $request->user_id;
        $type = $request->type; // 'student_no_group', 'group_no_topic', 'missing_grade'
        $message = $request->message;

        NotificationService::send(
            $userId,
            "Nhắc nhở từ Quản trị viên",
            $message,
            'URGENT',
            null, // Link
            null, // Meta
            'URGENT'
        );

        return response()->json(['message' => 'Đã gửi thông báo.']);
    }

    /**
     * Gửi cảnh báo hàng loạt cho một loại
     */
    public function nudgeBulk(Request $request)
    {
        $userIds = $request->user_ids; // Array ID
        $message = $request->message;
        
        if (empty($userIds)) return response()->json(['message' => 'Không có người dùng nào được chọn.'], 400);

        foreach($userIds as $uid) {
            NotificationService::send(
                $uid,
                "Nhắc nhở chung (Quan trọng)",
                $message,
                'URGENT',
                null,
                null,
                'HIGH'
            );
        }

        return response()->json(['message' => 'Đã gửi thông báo hàng loạt.']);
    }

    public function exportResults(Request $request)
    {
        $planId = $request->plan_id;
        if (!$planId) return response()->json(['message' => 'Missing Plan ID'], 400);
        
        $plan = KehoachKhoaluan::find($planId);
        // Tạo tên file: Ket-qua-KLTN-K19.xlsx
        $fileName = 'Ket-qua-KLTN-' . ($plan ? $plan->KHOAHOC : 'export') . '.xlsx';

        return Excel::download(new ThesisResultExport($planId), $fileName);
    }
}