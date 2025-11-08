<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Chuyennganh; // <-- Thêm use Model

class ChuyennganhSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Chuyennganh::truncate(); // <-- Dùng Model truncate
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Danh sách 5 chuyên ngành mới, tương ứng 5 bộ môn
        $chuyenNganhs = [
            ['MA_CHUYENNGANH' => 'CN.KHDT', 'TEN_CHUYENNGANH' => 'Khoa học dữ liệu'],
            ['MA_CHUYENNGANH' => 'CN.HTTT', 'TEN_CHUYENNGANH' => 'Hệ thống thông tin'],
            ['MA_CHUYENNGANH' => 'CN.KTPM', 'TEN_CHUYENNGANH' => 'Kỹ thuật phần mềm'], // <-- DetaiSeeder cần
            ['MA_CHUYENNGANH' => 'CN.MMT', 'TEN_CHUYENNGANH' => 'Mạng máy tính và An ninh thông tin'], // <-- DetaiSeeder cần
            ['MA_CHUYENNGANH' => 'CN.CNS', 'TEN_CHUYENNGANH' => 'Công nghệ số'],
        ];
        
        foreach ($chuyenNganhs as $cn) {
            Chuyennganh::create($cn); // <-- Dùng Model create
        }
    }
}