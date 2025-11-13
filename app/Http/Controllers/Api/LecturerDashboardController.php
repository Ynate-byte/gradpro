<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\PhancongDetaiNhom;
use App\Models\CongViec;
use App\Models\Hoidong;
use App\Models\LichHop;
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

        // 1. Đếm số nhóm đang hướng dẫn (Đang thực hiện)
        $nhomHuongDanCount = PhancongDetaiNhom::where('ID_GVHD', $giangvienId)
            ->where('TRANGTHAI', 'Đang thực hiện')
            ->count();

        // 2. Đếm số hội đồng tham gia (Chưa diễn ra)
        $hoiDongCount = $user->giangvien->hoidongs()
            ->where(function ($query) {
                $query->where('NGAY_BAOCAO', '>', Carbon::today())
                      ->orWhereNull('NGAY_BAOCAO');
            })
            ->count();

        // 3. Đếm lịch họp sắp tới (Trong 7 ngày tới)
        $lichHopCount = LichHop::where('THOIGIAN_BATDAU', '>=', Carbon::now())
            ->where('THOIGIAN_BATDAU', '<=', Carbon::now()->addDays(7))
            ->where('TRANGTHAI', 'Đã lên lịch')
            ->whereHas('nhom.phancongDetaiNhom', function ($q) use ($giangvienId) {
                $q->where('ID_GVHD', $giangvienId);
            })
            ->count();

        // 4. Đếm công việc cần review (Cột "Chờ Review")
        $taskReviewCount = CongViec::where('TRANGTHAI', 'Hoạt động')
            ->whereHas('cot', fn($q) => $q->where('TEN_COT', 'Chờ Review'))
            ->whereHas('nhom.phancongDetaiNhom', function ($q) use ($giangvienId) {
                $q->where('ID_GVHD', $giangvienId);
            })
            ->count();

        return response()->json([
            'nhomHuongDanCount' => $nhomHuongDanCount,
            'hoiDongCount' => $hoiDongCount,
            'lichHopCount' => $lichHopCount,
            'taskReviewCount' => $taskReviewCount,
        ]);
    }
}