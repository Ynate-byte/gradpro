<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            VaitroSeeder::class,
            ChuyennganhSeeder::class, // <-- THÊM DÒNG NÀY
            KhoaBomonSeeder::class,   // <-- THÊM DÒNG NÀY
            NguoidungSeeder::class,   // Đảm bảo NguoidungSeeder được gọi cuối cùng
        ]);
    }
}