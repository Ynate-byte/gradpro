<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            VaitroSeeder::class,
            ChucVuSeeder::class,
            ChuyennganhSeeder::class,
            KhoaBomonSeeder::class,
            CotCongViecSeeder::class,
            BachelorThesisTemplateSeeder::class,
            NguoidungSeeder::class,
            KehoachKhoaluanSeeder::class,
            SinhvienThamgiaSeeder::class,
            DetaiSeeder::class,
            GroupSeeder::class,
            PhancongDetaiNhomSeeder::class,
            NopSanphamSeeder::class,
        ]);
    }
}