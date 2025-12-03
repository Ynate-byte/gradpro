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
            KhoaBoMonSeeder::class,
            ChuyenNganhSeeder::class,
            CotCongViecSeeder::class,
            TyTrongDiemSeeder::class,
            MauKehoachSeeder::class,

            AdminSeeder::class,
            GiangVienSeeder::class,
            SinhVienSeeder::class,
            
            KehoachKhoaluanSeeder::class,
            SinhVienThamGiaSeeder::class,
            DetaiSeeder::class,
            GopYPhanBienSeeder::class,
            NhomSeeder::class,
            PhanCongVaHoatDongSeeder::class,
            
            NopSanPhamSeeder::class,
            HoiDongSeeder::class,
            TinTucSeeder::class,
        ]);
    }
}