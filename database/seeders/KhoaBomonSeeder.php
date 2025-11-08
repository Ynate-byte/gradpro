<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\KhoaBomon; // <-- Thêm use Model

class KhoaBomonSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        KhoaBomon::truncate(); // <-- Dùng Model truncate
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Danh sách 5 bộ môn mới
        $boMons = [
            ['MA_KHOA_BOMON' => 'KHDT', 'TEN_KHOA_BOMON' => 'Khoa học dữ liệu'],
            ['MA_KHOA_BOMON' => 'HTTT', 'TEN_KHOA_BOMON' => 'Hệ thống thông tin'], // <-- Đã sửa lỗi typo
            ['MA_KHOA_BOMON' => 'KTPM', 'TEN_KHOA_BOMON' => 'Kỹ thuật phần mềm'],
            ['MA_KHOA_BOMON' => 'MMT&ATTT', 'TEN_KHOA_BOMON' => 'Mạng máy tính và An ninh thông tin'],
            ['MA_KHOA_BOMON' => 'CNS', 'TEN_KHOA_BOMON' => 'Công nghệ số'],
        ];
        
        foreach ($boMons as $bm) {
            KhoaBomon::create($bm); // <-- Dùng Model create
        }
    }
}