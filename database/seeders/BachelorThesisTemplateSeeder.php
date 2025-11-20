<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\MauKehoach;

class BachelorThesisTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $template = MauKehoach::updateOrCreate(
            ['TEN_MAU' => 'Cử nhân 13ĐH - HKI 2025-2026'],
            [
                'HEDAOTAO_MACDINH' => 'Cử nhân',
                'SO_TUAN_MACDINH' => 12,
                'MO_TA' => 'Bản mẫu kế hoạch Khóa luận Tốt nghiệp hệ Cử nhân.',
            ]
        );

        $milestones = [
            ['TEN_SUKIEN' => 'Sinh viên đăng ký nhóm đề tài', 'OFFSET_BATDAU' => 0, 'THOI_LUONG' => 1, 'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên'],
            ['TEN_SUKIEN' => 'Kiểm tra danh sách nhóm', 'OFFSET_BATDAU' => 1, 'THOI_LUONG' => 1, 'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên,Giáo vụ'],
            ['TEN_SUKIEN' => 'Nhóm trưởng đăng ký đề tài', 'OFFSET_BATDAU' => 1, 'THOI_LUONG' => 1, 'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên'],
            ['TEN_SUKIEN' => 'Công bố danh sách đề tài', 'OFFSET_BATDAU' => 2, 'THOI_LUONG' => 1, 'VAITRO_THUCHIEN_MACDINH' => 'Giáo vụ'],
            ['TEN_SUKIEN' => 'Thực hiện khóa luận', 'OFFSET_BATDAU' => 3, 'THOI_LUONG' => 84, 'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên'],
            ['TEN_SUKIEN' => 'Nộp báo cáo hoàn chỉnh', 'OFFSET_BATDAU' => 88, 'THOI_LUONG' => 2, 'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên'],
            ['TEN_SUKIEN' => 'Bảo vệ khóa luận', 'OFFSET_BATDAU' => 91, 'THOI_LUONG' => 1, 'VAITRO_THUCHIEN_MACDINH' => 'Trưởng bộ môn,Giảng viên'],
        ];

        $template->mauMocThoigians()->delete();
        foreach ($milestones as $index => $moc) {
            $template->mauMocThoigians()->create(array_merge($moc, ['THU_TU' => $index]));
        }
    }
}