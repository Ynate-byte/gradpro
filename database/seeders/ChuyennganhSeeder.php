<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChuyenNganhSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('CHUYENNGANH')->delete();

        $cnpmId = DB::table('KHOA_BOMON')->where('MA_KHOA_BOMON', 'CNPM')->value('ID_KHOA_BOMON');
        $htttId = DB::table('KHOA_BOMON')->where('MA_KHOA_BOMON', 'HTTT')->value('ID_KHOA_BOMON');
        $mmtId  = DB::table('KHOA_BOMON')->where('MA_KHOA_BOMON', 'MMT')->value('ID_KHOA_BOMON');
        $khmtId = DB::table('KHOA_BOMON')->where('MA_KHOA_BOMON', 'KHMT')->value('ID_KHOA_BOMON');
        $cnstId = DB::table('KHOA_BOMON')->where('MA_KHOA_BOMON', 'CNS')->value('ID_KHOA_BOMON');

        DB::table('CHUYENNGANH')->insert([
            [
                'MA_CHUYENNGANH' => 'CNTT',
                'TEN_CHUYENNGANH' => 'Công nghệ Thông tin',
                'ID_KHOA_BOMON' => null,
                'MOTA' => 'Đào tạo kỹ sư phát triển ứng dụng web, mobile và hệ thống doanh nghiệp.',
                'TRANGTHAI_KICHHOAT' => true,
                'NGAYTAO' => now(),
            ],
            [
                'MA_CHUYENNGANH' => 'ATTT',
                'TEN_CHUYENNGANH' => 'An toàn Thông tin',
                'ID_KHOA_BOMON' => null,
                'MOTA' => 'Quản lý và thiết lập mạng.',
                'TRANGTHAI_KICHHOAT' => true,
                'NGAYTAO' => now(),
            ],
        ]);
    }
}