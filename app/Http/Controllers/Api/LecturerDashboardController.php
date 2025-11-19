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

        $nhomHuongDanCount = PhancongDetaiNhom::where('ID_GVHD', $giangvienId)
            ->where('TRANGTHAI', 'Đang thực hiện')
            ->count();

        $hoiDongCount = $user->giangvien->hoidongs()
            ->where(function ($query) {
                $query->where('NGAY_BAOCAO', '>', Carbon::today())
                      ->orWhereNull('NGAY_BAOCAO');
            })
            ->count();

        $lichHopCount = LichHop::where('THOIGIAN_BATDAU', '>=', Carbon::now())
            ->where('THOIGIAN_BATDAU', '<=', Carbon::now()->addDays(7))
            ->where('TRANGTHAI', 'Đã lên lịch')
            ->whereHas('nhom.phancongDetaiNhom', function ($q) use ($giangvienId) {
                $q->where('ID_GVHD', $giangvienId);
            })
            ->count();

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