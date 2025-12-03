<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Nguoidung;

class KehoachKhoaluanSeeder extends Seeder
{
    public function run(): void
    {
        $giaoVu = DB::table('NGUOIDUNG')->where('MA_DINHDANH', 'GVU.CNTT')->first();
        $idNguoiTao = $giaoVu ? $giaoVu->ID_NGUOIDUNG : 1;

        $settings = [
            'SV_TAO_NHOM' => ['active' => true, 'start' => now()->subDays(30), 'end' => now()->addDays(30)],
            'SV_DANGKY_DE' => ['active' => true, 'start' => now()->subDays(15), 'end' => now()->addDays(15)],
            'SV_NOP_BAI' => ['active' => true, 'start' => now(), 'end' => now()->addMonths(2)],
        ];

        DB::table('KEHOACH_KHOALUAN')->insert([
            'TEN_DOT' => 'Khóa luận Tốt nghiệp HK1 (2025-2026)',
            'NAMHOC' => '2025-2026',
            'HOCKY' => '1',
            'KHOAHOC' => 'K13',
            'HEDAOTAO' => 'Cử nhân',
            'SO_TUAN_THUCHIEN' => 15,
            'TRANGTHAI' => 'Đang thực hiện',
            'TRANGTHAI_KICHHOAT' => true,
            'NGAY_BATDAU' => now()->subMonth(),
            'NGAY_KETHUC' => now()->addMonths(3),
            'ID_NGUOITAO' => $idNguoiTao,
            'SETTINGS' => json_encode($settings),
            'TYTRONG_DIEM_QUATRINH' => 0.4,
            'TYTRONG_DIEM_PHANBIEN' => 0.3,
            'TYTRONG_DIEM_HOIDONG' => 0.3,
            'NGAYTAO' => now()
        ]);

        // 2. Kế hoạch dự kiến (HK2)
        DB::table('KEHOACH_KHOALUAN')->insert([
            'TEN_DOT' => 'Khóa luận Tốt nghiệp HK2 (2025-2026)',
            'NAMHOC' => '2025-2026',
            'HOCKY' => '2',
            'KHOAHOC' => 'K13',
            'HEDAOTAO' => 'Cử nhân',
            'SO_TUAN_THUCHIEN' => 15,
            'TRANGTHAI' => 'Bản nháp',
            'TRANGTHAI_KICHHOAT' => false,
            'NGAY_BATDAU' => now()->addMonths(5),
            'NGAY_KETHUC' => now()->addMonths(9),
            'ID_NGUOITAO' => $idNguoiTao,
            'SETTINGS' => null,
            'NGAYTAO' => now()
        ]);
    }
}