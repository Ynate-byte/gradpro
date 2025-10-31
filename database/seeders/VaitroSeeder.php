<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class VaitroSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('VAITRO')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        DB::table('VAITRO')->insert([
            ['ID_VAITRO' => 1, 'TEN_VAITRO' => 'Admin', 'MOTA' => 'Quản trị viên hệ thống'],
            ['ID_VAITRO' => 2, 'TEN_VAITRO' => 'Giảng viên', 'MOTA' => 'Giảng viên hướng dẫn'],
            ['ID_VAITRO' => 3, 'TEN_VAITRO' => 'Sinh viên', 'MOTA' => 'Sinh viên thực hiện đồ án'],
            ['ID_VAITRO' => 4, 'TEN_VAITRO' => 'Giáo vụ', 'MOTA' => 'Giáo vụ khoa, quản lý kế hoạch'],
            ['ID_VAITRO' => 5, 'TEN_VAITRO' => 'Trưởng khoa', 'MOTA' => 'Trưởng khoa, phê duyệt kế hoạch'],
        ]);
    }
}