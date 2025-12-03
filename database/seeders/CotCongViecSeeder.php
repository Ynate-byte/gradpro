<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CotCongViecSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('COT_CONGVIEC')->delete();

        DB::table('COT_CONGVIEC')->insert([
            [
                'ID_COT' => 1,
                'TEN_COT' => 'Cần làm',
                'THUTU_HIENTHI' => 1,
                'NGAYTAO' => now(),
            ],
            [
                'ID_COT' => 2,
                'TEN_COT' => 'Đang thực hiện',
                'THUTU_HIENTHI' => 2,
                'NGAYTAO' => now(),
            ],
            [
                'ID_COT' => 3,
                'TEN_COT' => 'Chờ Giảng viên duyệt',
                'THUTU_HIENTHI' => 3,
                'NGAYTAO' => now(),
            ],
            [
                'ID_COT' => 4,
                'TEN_COT' => 'Hoàn thành',
                'THUTU_HIENTHI' => 4,
                'NGAYTAO' => now(),
            ],
        ]);
    }
}