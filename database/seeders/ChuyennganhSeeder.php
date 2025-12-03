<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChuyenNganhSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('CHUYENNGANH')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $khdt = DB::table('KHOA_BOMON')->where('MA_KHOA_BOMON', 'KHDT')->value('ID_KHOA_BOMON');
        $httt = DB::table('KHOA_BOMON')->where('MA_KHOA_BOMON', 'HTTT')->value('ID_KHOA_BOMON');
        $ktpm = DB::table('KHOA_BOMON')->where('MA_KHOA_BOMON', 'KTPM')->value('ID_KHOA_BOMON');
        $mmt  = DB::table('KHOA_BOMON')->where('MA_KHOA_BOMON', 'MMT&ATTT')->value('ID_KHOA_BOMON');
        $cns  = DB::table('KHOA_BOMON')->where('MA_KHOA_BOMON', 'CNS')->value('ID_KHOA_BOMON');

        $dsChuyenNganh = [
            ['MA' => 'CN.ATTT', 'TEN' => 'An toàn thông tin', 'ID_BM' => null],
            ['MA' => 'CN.CNS',  'TEN' => 'Công nghệ Thông tin', 'ID_BM' => null],
        ];

        foreach ($dsChuyenNganh as $cn) {
            DB::table('CHUYENNGANH')->insert([
                'MA_CHUYENNGANH' => $cn['MA'],
                'TEN_CHUYENNGANH' => $cn['TEN'],
                'ID_KHOA_BOMON' => $cn['ID_BM'],
                'TRANGTHAI_KICHHOAT' => true,
                'NGAYTAO' => now()
            ]);
        }
    }
}