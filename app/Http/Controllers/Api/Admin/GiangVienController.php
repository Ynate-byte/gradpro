<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Giangvien;
use App\Models\Hoidong;

class GiangVienController extends Controller
{
    public function index(Request $request)
    {
        // ----- SỬA ĐỔI: Thay đổi cách tải hội đồng -----
        $planId = $request->input('plan_id');

        $query = Giangvien::with([
            'nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN,MA_DINHDANH',
            'khoabomon:ID_KHOA_BOMON,TEN_KHOA_BOMON',
            
            // Chỉ tải các hội đồng thuộc KẾ HOẠCH đang chọn
            'hoidongs' => function ($q) use ($planId) {
                if ($planId) {
                    $q->where('HOIDONG.ID_KEHOACH', $planId)
                      ->select('HOIDONG.ID_HOIDONG', 'HOIDONG.TEN_HOIDONG', 'HOIDONG.ID_KEHOACH');
                } else {
                    // Nếu không có plan_id, không tải hội đồng nào
                    $q->whereRaw('1 = 0');
                }
            }
        ])
        ->select('ID_GIANGVIEN', 'ID_NGUOIDUNG', 'ID_KHOA_BOMON', 'HOCVI', 'CHUCVU');

        $giangvien = $query->orderBy('ID_GIANGVIEN', 'asc')
            ->get()
            ->map(function ($gv) {
                return [
                    'ID_GIANGVIEN' => $gv->ID_GIANGVIEN,
                    'MA_GIANGVIEN' => $gv->nguoidung->MA_DINHDANH ?? 'GV' . str_pad($gv->ID_GIANGVIEN, 3, '0', STR_PAD_LEFT),
                    'HOCVI' => $gv->HOCVI,
                    'CHUCVU' => $gv->CHUCVU,
                    'KHOA' => $gv->khoabomon->TEN_KHOA_BOMON ?? null,
                    'HO_TEN' => $gv->nguoidung->HODEM_VA_TEN ?? '(Không rõ tên)',
                    
                    // 'hoidongs' bây giờ đã được lọc ở trên
                    'HOIDONGS' => $gv->hoidongs->map(function ($hd) {
                        return [
                            'ID_HOIDONG' => $hd->ID_HOIDONG,
                            'TEN_HOIDONG' => $hd->TEN_HOIDONG,
                            'VAITRO' => $hd->pivot->VAITRO ?? null,
                        ];
                    })->values(),
                ];
            });

        return response()->json($giangvien);
    }
}