<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Chạy các seeder theo thứ tự phụ thuộc
        $this->call([
            // 1. Dữ liệu cơ bản
            BachelorThesisTemplateSeeder::class, 
            VaitroSeeder::class,                  
            ChuyennganhSeeder::class,             
            KhoaBomonSeeder::class,               
            NguoidungSeeder::class, // (Đã bao gồm Admin, GV, SV)
            
            // 2. Dữ liệu nghiệp vụ
            KehoachKhoaluanSeeder::class,      // (Cần Nguoidung)
            SinhvienThamgiaSeeder::class,     // (Cần KehoachKhoaluan, Sinhvien)
            DetaiSeeder::class,               // (Cần KehoachKhoaluan, Giangvien)
            GroupSeeder::class,               // (Cần KehoachKhoaluan, SinhvienThamgia)
            
            // 3. Dữ liệu liên kết
            PhancongDetaiNhomSeeder::class,   // (Cần GroupSeeder, DetaiSeeder)
            NopSanphamSeeder::class,          // (Cần PhancongDetaiNhomSeeder)
        ]);
    }
}