<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KhoaBomonSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Xóa dữ liệu cũ để tránh trùng lặp khi seed lại
        DB::table('KHOA_BOMON')->delete();

        DB::table('KHOA_BOMON')->insert([
            ['MA_KHOA_BOMON' => 'K.CNTT', 'TEN_KHOA_BOMON' => 'Khoa Công nghệ Thông tin'],
            ['MA_KHOA_BOMON' => 'BM.CNPM', 'TEN_KHOA_BOMON' => 'Bộ môn Công nghệ Phần mềm'],
            ['MA_KHOA_BOMON' => 'BM.HTTT', 'TEN_KHOA_BOMON' => 'Bộ môn Hệ thống Thông tin'],
            ['MA_KHOA_BOMON' => 'BM.KHMT', 'TEN_KHOA_BOMON' => 'Bộ môn Khoa học Máy tính'],
        ]);
    }
}