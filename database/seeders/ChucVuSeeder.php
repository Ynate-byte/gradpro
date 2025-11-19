<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\ChucVu;

class ChucVuSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        ChucVu::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $positions = [
            ['MA_CHUCVU' => 'TRUONG_KHOA', 'TEN_CHUCVU' => 'Trưởng khoa'],
            ['MA_CHUCVU' => 'PHO_KHOA', 'TEN_CHUCVU' => 'Phó khoa'],
            ['MA_CHUCVU' => 'GIAO_VU', 'TEN_CHUCVU' => 'Giáo vụ'],
            ['MA_CHUCVU' => 'TRUONG_BOMON', 'TEN_CHUCVU' => 'Trưởng bộ môn'],
        ];

        foreach ($positions as $pos) {
            ChucVu::create($pos);
        }
    }
}