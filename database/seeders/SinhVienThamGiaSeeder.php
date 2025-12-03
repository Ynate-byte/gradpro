<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SinhVienThamGiaSeeder extends Seeder
{
    public function run(): void
    {
        $planId = DB::table('KEHOACH_KHOALUAN')->where('TRANGTHAI', 'Đang thực hiện')->value('ID_KEHOACH');
        
        if (!$planId) return;

        $studentIds = DB::table('SINHVIEN')->pluck('ID_SINHVIEN');

        $data = [];
        foreach ($studentIds as $svId) {
            $data[] = [
                'ID_KEHOACH' => $planId,
                'ID_SINHVIEN' => $svId,
                'DU_DIEUKIEN' => true,
                'NGAY_DANGKY' => now(),
            ];
        }

        foreach (array_chunk($data, 500) as $chunk) {
            DB::table('SINHVIEN_THAMGIA')->insert($chunk);
        }
    }
}