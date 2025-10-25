<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Chạy các seeder theo thứ tự phụ thuộc
        $this->call([
            BachelorThesisTemplateSeeder::class, // 1. Tạo mẫu (có VAITRO_THUCHIEN)
            VaitroSeeder::class,                 // 2. Tạo các vai trò (có Giáo vụ, Trưởng khoa)
            ChuyennganhSeeder::class,            // 3. Tạo các chuyên ngành
            KhoaBomonSeeder::class,              // 4. Tạo các khoa/bộ môn
            NguoidungSeeder::class,              // 5. Tạo người dùng (Admin, GV, SV, Giáo vụ, Trưởng khoa)
            KehoachKhoaluanSeeder::class,        // 6. Tạo các đợt khóa luận (dùng ID Giáo vụ, Trưởng khoa)
            SinhvienThamgiaSeeder::class,       // 7. Cho sinh viên tham gia vào các đợt
            GroupSeeder::class,                  // 8. Tạo nhóm cho sinh viên trong các đợt đó
        ]);
    }
}