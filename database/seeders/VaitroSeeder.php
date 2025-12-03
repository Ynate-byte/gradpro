<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class VaitroSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('VAITRO')->delete();

        DB::table('VAITRO')->insert([
            [
                'ID_VAITRO' => 1,
                'TEN_VAITRO' => 'Admin',
                'MOTA' => 'Quản trị viên hệ thống, có toàn quyền truy cập và cấu hình.',
                'NGAYTAO' => now(),
            ],
            [
                'ID_VAITRO' => 2,
                'TEN_VAITRO' => 'Giảng viên',
                'MOTA' => 'Giảng viên tham gia hướng dẫn, phản biện và chấm hội đồng.',
                'NGAYTAO' => now(),
            ],
            [
                'ID_VAITRO' => 3,
                'TEN_VAITRO' => 'Sinh viên',
                'MOTA' => 'Sinh viên thực hiện khóa luận tốt nghiệp.',
                'NGAYTAO' => now(),
            ],
        ]);
    }
}