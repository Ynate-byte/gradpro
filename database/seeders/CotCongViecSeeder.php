<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CotCongViecSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('COT_CONGVIEC')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        DB::table('COT_CONGVIEC')->insert([
            ['ID_COT' => 1, 'TEN_COT' => 'Cần làm', 'THUTU_HIENTHI' => 1],
            ['ID_COT' => 2, 'TEN_COT' => 'Đang thực hiện', 'THUTU_HIENTHI' => 2],
            ['ID_COT' => 3, 'TEN_COT' => 'Chờ Review', 'THUTU_HIENTHI' => 3],
            ['ID_COT' => 4, 'TEN_COT' => 'Hoàn thành', 'THUTU_HIENTHI' => 4],
        ]);
    }
}