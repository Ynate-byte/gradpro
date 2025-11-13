<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\CotCongViec;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema; // <-- [THÊM MỚI] Import Schema

class CotCongViecSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // ===== [SỬA LỖI TẠI ĐÂY] =====
        Schema::disableForeignKeyConstraints(); // Tạm thời vô hiệu hóa kiểm tra khóa ngoại
        
        DB::table('COT_CONGVIEC')->truncate(); // Bây giờ lệnh này sẽ chạy được
        
        Schema::enableForeignKeyConstraints(); // Bật lại kiểm tra
        // ============================
        
        CotCongViec::create([
            'TEN_COT' => 'Cần làm',
            'THUTU_HIENTHI' => 1,
        ]);
        
        CotCongViec::create([
            'TEN_COT' => 'Đang làm',
            'THUTU_HIENTHI' => 2,
        ]);
        
        CotCongViec::create([
            'TEN_COT' => 'Chờ Review',
            'THUTU_HIENTHI' => 3,
        ]);
        
        CotCongViec::create([
            'TEN_COT' => 'Hoàn thành',
            'THUTU_HIENTHI' => 4,
        ]);
    }
}