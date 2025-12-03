<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChucVuSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('CHUCVU')->delete();

        DB::table('CHUCVU')->insert([
            [
                'MA_CHUCVU' => 'TRUONG_KHOA',
                'TEN_CHUCVU' => 'Trưởng Khoa',
                'MOTA' => 'Lãnh đạo cao nhất của Khoa, chịu trách nhiệm phê duyệt kế hoạch.',
                'NGAYTAO' => now(),
            ],
            [
                'MA_CHUCVU' => 'PHO_KHOA',
                'TEN_CHUCVU' => 'Phó Khoa',
                'MOTA' => 'Ban chủ nhiệm khoa, hỗ trợ quản lý đào tạo và công tác sinh viên.',
                'NGAYTAO' => now(),
            ],
            [
                'MA_CHUCVU' => 'GIAO_VU',
                'TEN_CHUCVU' => 'Giáo Vụ',
                'MOTA' => 'Phụ trách các công tác hành chính, quản lý danh sách và điểm số.',
                'NGAYTAO' => now(),
            ],
            [
                'MA_CHUCVU' => 'TRUONG_BOMON',
                'TEN_CHUCVU' => 'Trưởng Bộ Môn',
                'MOTA' => 'Quản lý chuyên môn cấp bộ môn, phân công giảng viên hướng dẫn.',
                'NGAYTAO' => now(),
            ],
        ]);
    }
}