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

        // 1. Số nhóm đang hướng dẫn (Trong các kế hoạch đang chạy)
        $nhomHuongDanCount = PhancongDetaiNhom::where('ID_GVHD', $giangvienId)
            ->where('TRANGTHAI', 'Đang thực hiện')
            ->whereHas('nhom.kehoach', function($q) {
                $q->whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm']);
            })
            ->count();

        // 2. Số hội đồng tham gia (Sắp tới hoặc chưa diễn ra)
        $hoiDongCount = $user->giangvien->hoidongs()
            ->whereHas('kehoach', function($q) {
                $q->whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm']);
            })
            ->count();

        // 3. Lịch họp sắp tới (7 ngày)
        $lichHopCount = LichHop::where('THOIGIAN_BATDAU', '>=', Carbon::now())
            ->where('THOIGIAN_BATDAU', '<=', Carbon::now()->addDays(7))
            ->where('TRANGTHAI', 'Đã lên lịch')
            ->whereHas('nhom.phancongDetaiNhom', function ($q) use ($giangvienId) {
                $q->where('ID_GVHD', $giangvienId);
            })
            ->count();

        // 4. Công việc cần Review (Task Kanban)
        $taskReviewCount = CongViec::where('TRANGTHAI', 'Hoạt động')
            ->whereHas('cot', fn($q) => $q->where('TEN_COT', 'Chờ Review'))
            ->whereHas('nhom.phancongDetaiNhom', function ($q) use ($giangvienId) {
                $q->where('ID_GVHD', $giangvienId);
            })
            ->count();

        // --- [BỔ SUNG] CÁC CHỈ SỐ MỚI ---

        // 5. Bài nộp chờ duyệt (Pending Submissions)
        // Chỉ đếm các bài nộp thuộc nhóm mà giảng viên này hướng dẫn
        $pendingSubmissionsCount = NopSanpham::where('TRANGTHAI', 'Chờ xác nhận')
            ->whereHas('phancong', function($q) use ($giangvienId) {
                $q->where('ID_GVHD', $giangvienId);
            })
            ->count();

        // 6. Quota đề tài còn thiếu (Missing Quota)
        // Lấy kế hoạch đang "Đang thực hiện" hoặc "Chờ duyệt chỉnh sửa" gần nhất
        $currentPlan = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Chờ duyệt chỉnh sửa'])
            ->orderBy('NGAYTAO', 'desc')
            ->first();

        $missingQuotaCount = 0;
        if ($currentPlan) {
            $quota = QuotaGiangvien::where('ID_KEHOACH', $currentPlan->ID_KEHOACH)
                ->where('ID_GIANGVIEN', $giangvienId)
                ->first();
            
            if ($quota) {
                // Đếm số đề tài đã tạo (tính cả Nháp, Chờ duyệt, Đã duyệt để trừ dần)
                $createdTopics = Detai::where('ID_KEHOACH', $currentPlan->ID_KEHOACH)
                    ->where('ID_NGUOI_DEXUAT', $giangvienId)
                    ->count();
                
                $missingQuotaCount = max(0, $quota->SO_DETAI_QUOTA - $createdTopics);
            }
        }

        // 7. Đề tài cần góp ý (Pending Reviews)
        // Đếm số lượng phân công góp ý mà trạng thái vẫn là "Đang phân công" (chưa hoàn thành/phản hồi xong)
        // Hoặc kiểm tra logic phức tạp hơn: Đã được phân công NHƯNG chưa có bản ghi trong bảng GOIY_DETAI của user này
        $pendingReviewsCount = PhancongNguoiGopY::where('ID_GIANGVIEN', $giangvienId)
            ->where('TRANGTHAI', 'Đang phân công')
            ->whereDoesntHave('detai.goiyDetai', function($q) use ($giangvienId) {
                 $q->where('ID_NGUOI_GOIY', $giangvienId);
            })
            ->count();

        return response()->json([
            'nhomHuongDanCount' => $nhomHuongDanCount,
            'hoiDongCount' => $hoiDongCount,
            'lichHopCount' => $lichHopCount,
            'taskReviewCount' => $taskReviewCount,
            // Các trường mới
            'pendingSubmissionsCount' => $pendingSubmissionsCount,
            'missingQuotaCount' => $missingQuotaCount,
            'pendingReviewsCount' => $pendingReviewsCount,
        ]);
    }
}