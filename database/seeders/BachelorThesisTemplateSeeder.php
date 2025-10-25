<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\MauKehoach;

class BachelorThesisTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $template = MauKehoach::updateOrCreate(
            ['TEN_MAU' => 'Cử nhân'],
            [
                'HEDAOTAO_MACDINH' => 'Cử nhân',
                'SO_TUAN_MACDINH' => 12,
                'MO_TA' => 'Bản mẫu kế hoạch Khóa luận Tốt nghiệp hệ Cử nhân.',
            ]
        );

        $milestones = [
            [
                'TEN_SUKIEN' => 'Sinh viên đăng ký nhóm',
                'MOTA' => "Sinh viên tự tìm nhóm và đăng ký trên hệ thống.",
                'OFFSET_BATDAU' => 0, 
                'THOI_LUONG' => 7,
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', // <-- THÊM MỚI
            ],
             [
                'TEN_SUKIEN' => 'Nhóm trưởng đăng ký đề tài',
                'MOTA' => "Nhóm trưởng chọn đề tài từ danh sách hoặc tự đề xuất.",
                'OFFSET_BATDAU' => 7,
                'THOI_LUONG' => 7,
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', // <-- THÊM MỚI
            ],
            [
                'TEN_SUKIEN' => 'Giáo vụ phân công GVHD',
                'MOTA' => "Giáo vụ dựa trên đề tài và nguyện vọng để phân công.",
                'OFFSET_BATDAU' => 14,
                'THOI_LUONG' => 3,
                'VAITRO_THUCHIEN_MACDINH' => 'Giáo vụ', // <-- THÊM MỚI
            ],
            [
                'TEN_SUKIEN' => 'Sinh viên liên hệ GVHD và làm đề cương',
                'MOTA' => "Các nhóm chủ động liên hệ GVHD để thống nhất đề cương chi tiết.",
                'OFFSET_BATDAU' => 17,
                'THOI_LUONG' => 7,
                'VAITRO_THUCHIEN_MACDINH' => 'Giảng viên,Sinh viên', // <-- THÊM MỚI
            ],
            [
                'TEN_SUKIEN' => 'Thực hiện khóa luận (Giai đoạn 1)',
                'MOTA' => "Thực hiện 50% nội dung.",
                'OFFSET_BATDAU' => 24,
                'THOI_LUONG' => 28,
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', // <-- THÊM MỚI
            ],
             [
                'TEN_SUKIEN' => 'Báo cáo giữa kỳ',
                'MOTA' => "Nộp báo cáo tiến độ và demo cho GVHD.",
                'OFFSET_BATDAU' => 52, // 24 + 28
                'THOI_LUONG' => 5,
                'VAITRO_THUCHIEN_MACDINH' => 'Giảng viên,Sinh viên', // <-- THÊM MỚI
            ],
            [
                'TEN_SUKIEN' => 'Thực hiện khóa luận (Giai đoạn 2)',
                'MOTA' => "Hoàn thiện 50% nội dung còn lại.",
                'OFFSET_BATDAU' => 57,
                'THOI_LUONG' => 28,
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', // <-- THÊM MỚI
            ],
             [
                'TEN_SUKIEN' => 'Nộp báo cáo hoàn chỉnh (lần 1)',
                'MOTA' => "Nộp bản thảo cho GVHD duyệt.",
                'OFFSET_BATDAU' => 85, // 57 + 28
                'THOI_LUONG' => 2,
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', // <-- THÊM MỚI
            ],
            [
                'TEN_SUKIEN' => 'Bảo vệ cấp Bộ môn',
                'MOTA' => "Hội đồng bộ môn tổ chức bảo vệ.",
                'OFFSET_BATDAU' => 90,
                'THOI_LUONG' => 5,
                'VAITRO_THUCHIEN_MACDINH' => 'Trưởng bộ môn,Giảng viên', // <-- THÊM MỚI
            ],
        ];

        // Xóa các mốc cũ trước khi thêm mới
        $template->mauMocThoigians()->delete();

        foreach ($milestones as $index => $moc) {
            $template->mauMocThoigians()->create(array_merge($moc, ['THU_TU' => $index]));
        }
    }
}