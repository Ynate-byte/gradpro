<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\KehoachKhoaluan;
use App\Models\MocThoigian;
use App\Models\Nguoidung;
use Illuminate\Support\Facades\DB;

class KehoachKhoaluanSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        MocThoigian::truncate();
        KehoachKhoaluan::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $giaoVu = Nguoidung::where('EMAIL', 'giao.vu@gradpro.test')->first();
        
        if (!$giaoVu) return;

        $featureSettings = [
            'SV_TAO_NHOM' => ['active' => true, 'start' => now()->subDays(10), 'end' => now()->addDays(5)],
            'SV_DANGKY_DE' => ['active' => true, 'start' => now()->subDays(5), 'end' => now()->addDays(10)],
            'SV_NOP_BAI' => ['active' => true, 'start' => now(), 'end' => now()->addMonths(2)],
        ];

        $plan1 = KehoachKhoaluan::create([
            'TEN_DOT' => 'KLTN Học kỳ 1, 2025-2026',
            'NAMHOC' => '2025-2026', 'HOCKY' => '1', 'KHOAHOC' => 'K13', 'HEDAOTAO' => 'Cử nhân',
            'TRANGTHAI' => 'Đang thực hiện',
            'ID_NGUOITAO' => $giaoVu->ID_NGUOIDUNG,
            'ID_NGUOIPHEDUYET' => $giaoVu->ID_NGUOIDUNG,
            'NGAY_BATDAU' => now()->subDays(20), 'NGAY_KETHUC' => now()->addMonths(3),
            'SETTINGS' => json_encode($featureSettings)
        ]);

        $plan2 = KehoachKhoaluan::create([
            'TEN_DOT' => 'Đồ án Chuyên ngành 2025',
            'NAMHOC' => '2025-2026', 'HOCKY' => '1', 'KHOAHOC' => 'K14', 'HEDAOTAO' => 'Cử nhân',
            'TRANGTHAI' => 'Đang thực hiện',
            'ID_NGUOITAO' => $giaoVu->ID_NGUOIDUNG,
            'ID_NGUOIPHEDUYET' => $giaoVu->ID_NGUOIDUNG,
            'NGAY_BATDAU' => now()->subDays(15), 'NGAY_KETHUC' => now()->addMonths(3),
            'SETTINGS' => json_encode($featureSettings)
        ]);

        KehoachKhoaluan::create([
            'TEN_DOT' => 'Dự kiến HK2 2025-2026',
            'NAMHOC' => '2025-2026', 'HOCKY' => '2', 'KHOAHOC' => 'K13', 'HEDAOTAO' => 'Cử nhân',
            'TRANGTHAI' => 'Chờ phê duyệt',
            'ID_NGUOITAO' => $giaoVu->ID_NGUOIDUNG,
            'NGAY_BATDAU' => now()->addMonths(4), 'NGAY_KETHUC' => now()->addMonths(7),
        ]);
    }
}