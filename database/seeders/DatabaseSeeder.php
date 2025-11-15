<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            BachelorThesisTemplateSeeder::class, 
            VaitroSeeder::class,                  
            ChuyennganhSeeder::class,             
            KhoaBomonSeeder::class,               
            NguoidungSeeder::class,
            CotCongViecSeeder::class,
            
            // 2. Dữ liệu nghiệp vụ
            KehoachKhoaluanSeeder::class,
            SinhvienThamgiaSeeder::class,     
            DetaiSeeder::class,               
            GroupSeeder::class,               
            
            // 3. Dữ liệu liên kết
            PhancongDetaiNhomSeeder::class, 
            NopSanphamSeeder::class, 
        ]);
    }
}