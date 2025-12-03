<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MauKehoachSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('MAU_KEHOACH')->truncate();
        DB::table('MAU_MOC_THOIGIAN')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $idMau = DB::table('MAU_KEHOACH')->insertGetId([
            'TEN_MAU' => 'Kế hoạch KLTN Khóa 13ĐH (Chuẩn)',
            'HEDAOTAO_MACDINH' => 'Cử nhân',
            'SO_TUAN_MACDINH' => 12,
            'MO_TA' => 'Dựa trên thông báo số 25/TB-KCNTT.',
            'NGAYTAO' => now()
        ]);

        $milestones = [
            ['TEN_SUKIEN' => 'Sinh viên đăng ký nhóm đề tài', 'OFFSET_BATDAU' => 0, 'THOI_LUONG' => 1, 'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', 'MOTA' => 'Điền thông tin thành viên qua Google Form.'],
            ['TEN_SUKIEN' => 'Kiểm tra danh sách đề tài', 'OFFSET_BATDAU' => 1, 'THOI_LUONG' => 1, 'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', 'MOTA' => 'Kiểm tra danh sách đề tài Khoa cung cấp.'],
            ['TEN_SUKIEN' => 'Đăng ký đề tài trên hệ thống', 'OFFSET_BATDAU' => 1, 'THOI_LUONG' => 1, 'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', 'MOTA' => 'Nhóm trưởng đăng ký 01 đề tài duy nhất.'],
            ['TEN_SUKIEN' => 'Nộp phiếu đăng ký', 'OFFSET_BATDAU' => 2, 'THOI_LUONG' => 1, 'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', 'MOTA' => 'Nộp phiếu có chữ ký. Khoa công bố danh sách chính thức.'],
            ['TEN_SUKIEN' => 'Thực hiện đề tài khóa luận', 'OFFSET_BATDAU' => 3, 'THOI_LUONG' => 84, 'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', 'MOTA' => 'Thực hiện trong 12 tuần.'],
            ['TEN_SUKIEN' => 'Nộp báo cáo Khóa luận', 'OFFSET_BATDAU' => 89, 'THOI_LUONG' => 2, 'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', 'MOTA' => 'Nộp quyển báo cáo có chữ ký GVHD.'],
            ['TEN_SUKIEN' => 'Bảo vệ trước Hội đồng', 'OFFSET_BATDAU' => 95, 'THOI_LUONG' => 3, 'VAITRO_THUCHIEN_MACDINH' => 'Hội đồng', 'MOTA' => 'Tổ chức bảo vệ.'],
        ];

        foreach ($milestones as $idx => $m) {
            DB::table('MAU_MOC_THOIGIAN')->insert(array_merge($m, ['ID_MAU' => $idMau, 'THU_TU' => $idx + 1]));
        }
    }
}