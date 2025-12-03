<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KhoaBoMonSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('KHOA_BOMON')->delete();

        DB::table('KHOA_BOMON')->insert([
            [
                'MA_KHOA_BOMON' => 'CNS',
                'TEN_KHOA_BOMON' => 'Công nghệ số',
                'MOTA' => 'Bộ môn chuyên về quy trình phát triển số hóa nghiệp vụ phần mềm, kiểm thử và quản lý dự án.',
                'TRANGTHAI_KICHHOAT' => true,
                'NGAYTAO' => now(),
            ],
            [
                'MA_KHOA_BOMON' => 'CNPM',
                'TEN_KHOA_BOMON' => 'Công nghệ Phần mềm',
                'MOTA' => 'Bộ môn chuyên về quy trình phát triển phần mềm, kiểm thử và quản lý dự án.',
                'TRANGTHAI_KICHHOAT' => true,
                'NGAYTAO' => now(),
            ],
            [
                'MA_KHOA_BOMON' => 'HTTT',
                'TEN_KHOA_BOMON' => 'Hệ thống Thông tin',
                'MOTA' => 'Bộ môn chuyên về phân tích dữ liệu, cơ sở dữ liệu và thương mại điện tử.',
                'TRANGTHAI_KICHHOAT' => true,
                'NGAYTAO' => now(),
            ],
            [
                'MA_KHOA_BOMON' => 'MMT',
                'TEN_KHOA_BOMON' => 'Mạng máy tính và Truyền thông',
                'MOTA' => 'Bộ môn chuyên về hạ tầng mạng, bảo mật thông tin và IoT.',
                'TRANGTHAI_KICHHOAT' => true,
                'NGAYTAO' => now(),
            ],
            [
                'MA_KHOA_BOMON' => 'KHMT',
                'TEN_KHOA_BOMON' => 'Khoa học Máy tính',
                'MOTA' => 'Bộ môn chuyên về trí tuệ nhân tạo (AI), học máy và thuật toán.',
                'TRANGTHAI_KICHHOAT' => true,
                'NGAYTAO' => now(),
            ],
        ]);
    }
}