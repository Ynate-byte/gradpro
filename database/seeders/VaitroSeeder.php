<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class VaitroSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('VAITRO')->insert([
            ['TEN_VAITRO' => 'Admin', 'MOTA' => 'Quản trị viên hệ thống'],
            ['TEN_VAITRO' => 'Giảng viên', 'MOTA' => 'Giảng viên hướng dẫn'],
            ['TEN_VAITRO' => 'Sinh viên', 'MOTA' => 'Sinh viên thực hiện đồ án'],
        ]);
    }
}