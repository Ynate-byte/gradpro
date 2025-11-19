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
        $planId = $request->input('plan_id');

        $query = Giangvien::with([
            'nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN,MA_DINHDANH',
            'khoabomon:ID_KHOA_BOMON,TEN_KHOA_BOMON',
            'chucvus',
            
            'hoidongs' => function ($q) use ($planId) {
                if ($planId) {
                    $q->where('HOIDONG.ID_KEHOACH', $planId)
                      ->select('HOIDONG.ID_HOIDONG', 'HOIDONG.TEN_HOIDONG', 'HOIDONG.ID_KEHOACH');
                } else {
                    $q->whereRaw('1 = 0');
                }
            }
        ])
        ->select('ID_GIANGVIEN', 'ID_NGUOIDUNG', 'ID_KHOA_BOMON', 'HOCVI'); 

        $giangvien = $query->orderBy('ID_GIANGVIEN', 'asc')
            ->get()
            ->map(function ($gv) {
                $chucVuString = $gv->chucvus->pluck('TEN_CHUCVU')->join(', ');

                return [
                    'ID_GIANGVIEN' => $gv->ID_GIANGVIEN,
                    'MA_GIANGVIEN' => $gv->nguoidung->MA_DINHDANH ?? 'GV' . str_pad($gv->ID_GIANGVIEN, 3, '0', STR_PAD_LEFT),
                    'HOCVI' => $gv->HOCVI,
                    'CHUCVU' => $chucVuString,
                    'CHUCVU_IDS' => $gv->chucvus->pluck('ID_CHUCVU'),
                    'KHOA' => $gv->khoabomon->TEN_KHOA_BOMON ?? null,
                    'HO_TEN' => $gv->nguoidung->HODEM_VA_TEN ?? '(Không rõ tên)',
                    
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