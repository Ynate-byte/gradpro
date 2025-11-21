<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Chuyennganh;
use App\Models\KhoaBomon;

class ChuyennganhSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Chuyennganh::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $khdt = KhoaBomon::where('MA_KHOA_BOMON', 'KHDT')->value('ID_KHOA_BOMON');
        $httt = KhoaBomon::where('MA_KHOA_BOMON', 'HTTT')->value('ID_KHOA_BOMON');
        $ktpm = KhoaBomon::where('MA_KHOA_BOMON', 'KTPM')->value('ID_KHOA_BOMON');
        $mmt  = KhoaBomon::where('MA_KHOA_BOMON', 'MMT&ATTT')->value('ID_KHOA_BOMON');
        $cns  = KhoaBomon::where('MA_KHOA_BOMON', 'CNS')->value('ID_KHOA_BOMON');

        $chuyenNganhs = [
            [
                'MA_CHUYENNGANH' => 'CN.KHDT',
                'TEN_CHUYENNGANH' => 'Khoa học dữ liệu',
                'ID_KHOA_BOMON' => $khdt
            ],
            [
                'MA_CHUYENNGANH' => 'CN.HTTT',
                'TEN_CHUYENNGANH' => 'Hệ thống thông tin',
                'ID_KHOA_BOMON' => $httt
            ],
            [
                'MA_CHUYENNGANH' => 'CN.KTPM',
                'TEN_CHUYENNGANH' => 'Kỹ thuật phần mềm',
                'ID_KHOA_BOMON' => $ktpm
            ],
            [
                'MA_CHUYENNGANH' => 'CN.MMT',
                'TEN_CHUYENNGANH' => 'Mạng máy tính và An ninh thông tin',
                'ID_KHOA_BOMON' => $mmt
            ],
            [
                'MA_CHUYENNGANH' => 'CN.CNS',
                'TEN_CHUYENNGANH' => 'Công nghệ số',
                'ID_KHOA_BOMON' => $cns
            ],
        ];
        
        foreach ($chuyenNganhs as $cn) {
            if (!$cn['ID_KHOA_BOMON']) {
                $cn['ID_KHOA_BOMON'] = KhoaBomon::first()->ID_KHOA_BOMON;
            }
            
            Chuyennganh::create($cn);
        }
    }
}