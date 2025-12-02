<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\PhancongDetaiNhom;
use App\Models\CongViec;
use App\Models\Hoidong;
use App\Models\LichHop;
use App\Models\NopSanpham;
use App\Models\KehoachKhoaluan;
use App\Models\QuotaGiangvien;
use App\Models\Detai;
use App\Models\PhancongNguoiGopY;
use Carbon\Carbon;

class LecturerDashboardController extends Controller
{
    public function getDashboardStats(Request $request)
    {
        $user = Auth::user();
        if (!$user->giangvien) {
            return response()->json(['message' => 'Tài khoản không phải là giảng viên.'], 403);
        }
        $giangvienId = $user->giangvien->ID_GIANGVIEN;
        $now = Carbon::now();

        // --- 1. THỐNG KÊ CÁC CON SỐ ---

        // Đếm tất cả các nhóm mà GV này là GVHD, không quan tâm kế hoạch đang ở trạng thái nào,
        // miễn là phân công chưa bị hủy.
        $nhomHuongDanCount = PhancongDetaiNhom::where('ID_GVHD', $giangvienId)
            ->where('TRANGTHAI', '!=', 'Đã hủy') 
            ->count();

        // Số hội đồng tham gia
        $hoiDongCount = $user->giangvien->hoidongs()
            ->whereHas('kehoach', function($q) {
                $q->where('TRANGTHAI', '!=', 'Đã hủy');
            })
            ->count();

        // Lịch họp sắp tới (7 ngày tới)
        $lichHopCount = LichHop::where('THOIGIAN_BATDAU', '>=', $now)
            ->where('THOIGIAN_BATDAU', '<=', $now->copy()->addDays(7))
            ->where('TRANGTHAI', 'Đã lên lịch')
            ->whereHas('nhom.phancongDetaiNhom', function ($q) use ($giangvienId) {
                $q->where('ID_GVHD', $giangvienId);
            })
            ->count();

        // Task cần review (Kanban)
        $taskReviewCount = CongViec::where('TRANGTHAI', 'Hoạt động')
            ->whereHas('cot', fn($q) => $q->where('TEN_COT', 'Chờ Review'))
            ->whereHas('nhom.phancongDetaiNhom', function ($q) use ($giangvienId) {
                $q->where('ID_GVHD', $giangvienId);
            })
            ->count();

        // Bài nộp chờ duyệt
        $pendingSubmissionsCount = NopSanpham::where('TRANGTHAI', 'Chờ xác nhận')
            ->whereHas('phancong', function($q) use ($giangvienId) {
                $q->where('ID_GVHD', $giangvienId);
            })
            ->count();

        // Đề tài cần góp ý (Phản biện)
        // Đếm những phân công chưa chuyển sang trạng thái 'Hoàn thành'
        $pendingReviewsCount = PhancongNguoiGopY::where('ID_GIANGVIEN', $giangvienId)
            ->where('TRANGTHAI', 'Đang phân công')
            ->count();

        // --- 2. LẤY DANH SÁCH KẾ HOẠCH ACTIVE & MỐC THỜI GIAN ---
        $activePlans = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm', 'Chờ duyệt chỉnh sửa'])
            ->with(['mocThoigians' => function($q) {
                $q->orderBy('NGAY_BATDAU', 'asc');
            }])
            ->orderBy('NGAY_BATDAU', 'desc')
            ->get();

        $missingQuotaCount = 0;
        $plansStatus = [];

        foreach ($activePlans as $plan) {
            // A. Tính Quota thiếu (Cộng dồn qua các kế hoạch)
            $quota = QuotaGiangvien::where('ID_KEHOACH', $plan->ID_KEHOACH)
                ->where('ID_GIANGVIEN', $giangvienId)
                ->first();
            
            if ($quota) {
                $createdTopics = Detai::where('ID_KEHOACH', $plan->ID_KEHOACH)
                    ->where('ID_NGUOI_DEXUAT', $giangvienId)
                    ->whereIn('TRANGTHAI', ['Đã duyệt', 'Chờ duyệt', 'Yêu cầu chỉnh sửa', 'Đang chỉnh sửa']) // Tính cả các trạng thái đang xử lý
                    ->count();
                
                $missing = max(0, $quota->SO_DETAI_QUOTA - $createdTopics);
                $missingQuotaCount += $missing;
            }

            // B. Xác định giai đoạn hiện tại của Plan cho Timeline
            $currentPhase = null;
            $nextPhase = null;

            foreach ($plan->mocThoigians as $index => $moc) {
                if ($now->between($moc->NGAY_BATDAU, $moc->NGAY_KETTHUC)) {
                    $currentPhase = $moc;
                    $nextPhase = $plan->mocThoigians[$index + 1] ?? null;
                    break;
                }
            }
            
            if (!$currentPhase) {
                $nextPhase = $plan->mocThoigians->where('NGAY_BATDAU', '>', $now)->first();
            }

            $plansStatus[] = [
                'id' => $plan->ID_KEHOACH,
                'name' => $plan->TEN_DOT,
                'term' => $plan->NAMHOC . ' - HK' . $plan->HOCKY,
                'current_phase' => $currentPhase ? [
                    'name' => $currentPhase->TEN_SUKIEN,
                    'end_date' => $currentPhase->NGAY_KETTHUC,
                    'is_active' => true
                ] : null,
                'next_phase' => $nextPhase ? [
                    'name' => $nextPhase->TEN_SUKIEN,
                    'start_date' => $nextPhase->NGAY_BATDAU
                ] : null,
                'status' => $plan->TRANGTHAI
            ];
        }

        return response()->json([
            'nhomHuongDanCount' => $nhomHuongDanCount,
            'hoiDongCount' => $hoiDongCount,
            'lichHopCount' => $lichHopCount,
            'taskReviewCount' => $taskReviewCount,
            'pendingSubmissionsCount' => $pendingSubmissionsCount,
            'missingQuotaCount' => $missingQuotaCount,
            'pendingReviewsCount' => $pendingReviewsCount,
            'activePlansStatus' => $plansStatus,
        ]);
    }
}