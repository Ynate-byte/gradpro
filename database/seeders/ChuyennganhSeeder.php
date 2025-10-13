<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChuyennganhSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Xóa dữ liệu cũ để tránh trùng lặp khi seed lại
        DB::table('CHUYENNGANH')->delete();

        DB::table('CHUYENNGANH')->insert([
            ['MA_CHUYENNGANH' => 'CNPM', 'TEN_CHUYENNGANH' => 'Công nghệ Phần mềm'],
            ['MA_CHUYENNGANH' => 'HTTT', 'TEN_CHUYENNGANH' => 'Hệ thống Thông tin'],
            ['MA_CHUYENNGANH' => 'KHMT', 'TEN_CHUYENNGANH' => 'Khoa học Máy tính'],
            ['MA_CHUYENNGANH' => 'ATTT', 'TEN_CHUYENNGANH' => 'An toàn Thông tin'],
            ['MA_CHUYENNGANH' => 'MMT', 'TEN_CHUYENNGANH' => 'Mạng máy tính và Truyền thông'],
        ]);
    }
}