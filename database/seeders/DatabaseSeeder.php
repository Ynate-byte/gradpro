<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        // Truncate để tránh duplicate nếu chạy nhiều lần
        // DB::table('...')->truncate(); 
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->call([
            // Dữ liệu nền
            VaitroSeeder::class,
            ChucVuSeeder::class,
            KhoaBomonSeeder::class,
            ChuyennganhSeeder::class,
            CotCongViecSeeder::class,
            BachelorThesisTemplateSeeder::class,
            
            // Dữ liệu Admin/Demo cơ bản (nếu muốn giữ lại)
            NguoidungSeeder::class,
            KehoachKhoaluanSeeder::class,

            // --- SEEDER SỐ LƯỢNG LỚN (100+ ITEMS) ---
            LargeScaleUserSeeder::class,   // Tạo 350 SV + 50 GV
            LargeScaleTopicSeeder::class,  // Tạo 150 Đề tài
            LargeScaleGroupSeeder::class,  // Tạo 100 Nhóm
            LargeScaleActivitySeeder::class, // Tạo 1000+ Tasks, 300+ Lịch họp, 80+ Bài nộp, Điểm
        ]);
    }
}