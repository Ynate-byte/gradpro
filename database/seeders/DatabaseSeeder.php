<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Chạy các seeder theo thứ tự phụ thuộc
        $this->call([
            VaitroSeeder::class,          // 1. Tạo các vai trò
            ChuyennganhSeeder::class,     // 2. Tạo các chuyên ngành
            KhoaBomonSeeder::class,       // 3. Tạo các khoa/bộ môn
            NguoidungSeeder::class,       // 4. Tạo người dùng (Admin, GV, SV)
            KehoachKhoaluanSeeder::class, // 5. Tạo các đợt khóa luận
            SinhvienThamgiaSeeder::class,  // 6. Cho sinh viên tham gia vào các đợt
            GroupSeeder::class,           // 7. Tạo nhóm cho sinh viên trong các đợt đó
        ]);
    }
}