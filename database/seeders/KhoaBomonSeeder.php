<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KhoaBomonSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('KHOA_BOMON')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        DB::table('KHOA_BOMON')->insert([
            [
                'MA_KHOA_BOMON' => 'KHDT', 
                'TEN_KHOA_BOMON' => 'Khoa học dữ liệu', 
                'MOTA' => 'Bộ môn Khoa học dữ liệu', 
                'TRANGTHAI_KICHHOAT' => true
            ],
            [
                'MA_KHOA_BOMON' => 'HTTT', 
                'TEN_KHOA_BOMON' => 'Hệ thống thông tin', 
                'MOTA' => 'Bộ môn Hệ thống thông tin', 
                'TRANGTHAI_KICHHOAT' => true
            ],
            [
                'MA_KHOA_BOMON' => 'KTPM', 
                'TEN_KHOA_BOMON' => 'Kỹ thuật phần mềm', 
                'MOTA' => 'Bộ môn Kỹ thuật phần mềm', 
                'TRANGTHAI_KICHHOAT' => true
            ],
            [
                'MA_KHOA_BOMON' => 'MMT&ATTT', 
                'TEN_KHOA_BOMON' => 'Mạng máy tính và An ninh thông tin', 
                'MOTA' => 'Bộ môn Mạng & ATTT', 
                'TRANGTHAI_KICHHOAT' => true
            ],
            [
                'MA_KHOA_BOMON' => 'CNS', 
                'TEN_KHOA_BOMON' => 'Công nghệ số', 
                'MOTA' => 'Bộ môn Công nghệ số', 
                'TRANGTHAI_KICHHOAT' => true
            ],
        ]);
    }
}