<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MauKehoachSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('MAU_KEHOACH')->delete();
        DB::table('MAU_MOC_THOIGIAN')->delete();

        $idMau = DB::table('MAU_KEHOACH')->insertGetId([
            'TEN_MAU' => 'Quy trình Khóa luận Tốt nghiệp (Tiêu chuẩn)',
            'HEDAOTAO_MACDINH' => 'Cử nhân',
            'SO_TUAN_MACDINH' => 15,
            'MO_TA' => 'Quy trình chuẩn 15 tuần dành cho sinh viên đại học chính quy, bao gồm đầy đủ các bước từ đăng ký đến bảo vệ.',
            'NGAYTAO' => now()
        ]);

        $milestones = [
            [
                'TEN_SUKIEN' => 'Công bố danh sách đề tài', 
                'OFFSET_BATDAU' => 0, 
                'THOI_LUONG' => 7, 
                'VAITRO_THUCHIEN_MACDINH' => 'Giảng viên', 
                'MOTA' => 'Giảng viên đăng ký đề tài lên hệ thống.'
            ],
            [
                'TEN_SUKIEN' => 'Sinh viên đăng ký nhóm & đề tài', 
                'OFFSET_BATDAU' => 7, 
                'THOI_LUONG' => 7, 
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', 
                'MOTA' => 'Sinh viên lập nhóm và chọn đề tài.'
            ],
            [
                'TEN_SUKIEN' => 'Phê duyệt đề tài chính thức', 
                'OFFSET_BATDAU' => 14, 
                'THOI_LUONG' => 3, 
                'VAITRO_THUCHIEN_MACDINH' => 'Trưởng bộ môn', 
                'MOTA' => 'Trưởng bộ môn duyệt danh sách đề tài và phân công GVHD.'
            ],
            [
                'TEN_SUKIEN' => 'Thực hiện khóa luận', 
                'OFFSET_BATDAU' => 17, 
                'THOI_LUONG' => 70, 
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', 
                'MOTA' => 'Sinh viên triển khai đề tài dưới sự hướng dẫn của GVHD.'
            ],
            [
                'TEN_SUKIEN' => 'Nộp báo cáo tiến độ (Lần 1)', 
                'OFFSET_BATDAU' => 40, 
                'THOI_LUONG' => 3, 
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', 
                'MOTA' => 'Nộp báo cáo tiến độ giữa kỳ lên hệ thống.'
            ],
            [
                'TEN_SUKIEN' => 'Nộp khóa luận hoàn chỉnh', 
                'OFFSET_BATDAU' => 87, 
                'THOI_LUONG' => 5, 
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', 
                'MOTA' => 'Nộp toàn văn báo cáo và source code (Link Git/Drive).'
            ],
            [
                'TEN_SUKIEN' => 'Phản biện đề tài', 
                'OFFSET_BATDAU' => 92, 
                'THOI_LUONG' => 7, 
                'VAITRO_THUCHIEN_MACDINH' => 'Giảng viên', 
                'MOTA' => 'Giảng viên phản biện chấm điểm và nhận xét.'
            ],
            [
                'TEN_SUKIEN' => 'Bảo vệ trước Hội đồng', 
                'OFFSET_BATDAU' => 100, 
                'THOI_LUONG' => 3, 
                'VAITRO_THUCHIEN_MACDINH' => 'Hội đồng', 
                'MOTA' => 'Tổ chức bảo vệ tập trung tại trường.'
            ],
        ];

        foreach ($milestones as $index => $m) {
            DB::table('MAU_MOC_THOIGIAN')->insert(array_merge($m, [
                'ID_MAU' => $idMau,
                'THU_TU' => $index + 1
            ]));
        }
    }
}