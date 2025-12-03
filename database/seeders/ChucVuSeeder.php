<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChucVuSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('CHUCVU')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        DB::table('CHUCVU')->insert([
            ['MA_CHUCVU' => 'TRUONG_KHOA', 'TEN_CHUCVU' => 'Trưởng Khoa', 'MOTA' => 'Lãnh đạo cao nhất của Khoa'],
            ['MA_CHUCVU' => 'PHO_KHOA', 'TEN_CHUCVU' => 'Phó Khoa', 'MOTA' => 'Ban lãnh đạo Khoa'],
            ['MA_CHUCVU' => 'GIAO_VU', 'TEN_CHUCVU' => 'Giáo Vụ', 'MOTA' => 'Quản lý giáo vụ và đào tạo'],
            ['MA_CHUCVU' => 'TRUONG_BOMON', 'TEN_CHUCVU' => 'Trưởng Bộ Môn', 'MOTA' => 'Quản lý chuyên môn cấp Bộ môn'],
        ]);
    }
}