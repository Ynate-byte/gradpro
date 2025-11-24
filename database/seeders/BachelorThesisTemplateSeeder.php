<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\MauKehoach;

class BachelorThesisTemplateSeeder extends Seeder
{
    public function run(): void
    {
        // Dựa trên Thông báo Số: 25/TB-KCNTT
        $template = MauKehoach::updateOrCreate(
            ['TEN_MAU' => 'Kế hoạch KLTN Khóa 13ĐH - HK1 2025-2026'],
            [
                'HEDAOTAO_MACDINH' => 'Cử nhân',
                'SO_TUAN_MACDINH' => 12, // 12 tuần thực hiện (08/09 - 30/11)
                'MO_TA' => 'Dựa trên thông báo số 25/TB-KCNTT về việc triển khai Khóa luận cử nhân cho các ngành CNTT và ATTT.',
            ]
        );

        // Giả định ngày bắt đầu kế hoạch (Day 0) là 05/09/2025
        $milestones = [
            [
                'TEN_SUKIEN' => 'Sinh viên đăng ký nhóm đề tài (03 SV/nhóm)',
                'OFFSET_BATDAU' => 0, // Ngày 05/09/2025
                'THOI_LUONG' => 1,
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên',
                'MOTA' => 'Sinh viên điền đầy đủ thông tin thành viên (MSSV, Họ tên, Nhóm trưởng) qua Google Form.'
            ],
            [
                'TEN_SUKIEN' => 'Kiểm tra danh sách đề tài',
                'OFFSET_BATDAU' => 1, // Sáng 06/09/2025
                'THOI_LUONG' => 1,
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên',
                'MOTA' => 'Các nhóm trưởng đăng nhập và kiểm tra hệ thống danh sách đề tài Khoa cung cấp.'
            ],
            [
                'TEN_SUKIEN' => 'Đăng ký đề tài trên hệ thống website',
                'OFFSET_BATDAU' => 1, // Chiều 06/09/2025
                'THOI_LUONG' => 1,
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên', // Cụ thể là Nhóm trưởng
                'MOTA' => 'Nhóm trưởng đại diện đăng ký 01 đề tài duy nhất tại http://fit.icourse.edu.vn.'
            ],
            [
                'TEN_SUKIEN' => 'Nộp phiếu đăng ký & Khoa công bố danh sách',
                'OFFSET_BATDAU' => 2, // Ngày 07/09/2025
                'THOI_LUONG' => 1,
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên,Giáo vụ',
                'MOTA' => 'SV nộp phiếu có chữ ký. Khoa tổng hợp và thông báo danh sách SV & GVHD chính thức.'
            ],
            [
                'TEN_SUKIEN' => 'Liên hệ Giảng viên hướng dẫn (GVHD)',
                'OFFSET_BATDAU' => 3, // 08/09/2025
                'THOI_LUONG' => 2,    // Đến 09/09/2025
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên',
                'MOTA' => 'Nhóm SV chủ động liên hệ GVHD qua email. Nếu không liên hệ xem như không thực hiện.'
            ],
            [
                'TEN_SUKIEN' => 'Thực hiện đề tài khóa luận',
                'OFFSET_BATDAU' => 3, // Bắt đầu 08/09/2025
                'THOI_LUONG' => 84,   // 12 tuần (đến 30/11/2025)
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên,Giảng viên',
                'MOTA' => 'Thời gian thực hiện chính thức trong 12 tuần.'
            ],
            [
                'TEN_SUKIEN' => 'Nộp báo cáo Khóa luận cử nhân',
                'OFFSET_BATDAU' => 89, // 03/12/2025 (Tính từ 05/09 là khoảng 89 ngày)
                'THOI_LUONG' => 2,     // Đến 04/12/2025
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên',
                'MOTA' => 'Nộp quyển báo cáo có chữ ký xác nhận của GVHD. Hình thức nộp sẽ được thông báo sau.'
            ],
            [
                'TEN_SUKIEN' => 'Công bố lịch Hội đồng bảo vệ',
                'OFFSET_BATDAU' => 91, // 05/12/2025
                'THOI_LUONG' => 1,
                'VAITRO_THUCHIEN_MACDINH' => 'Giáo vụ',
                'MOTA' => 'Khoa thông báo lịch làm việc của các hội đồng bảo vệ trên website Khoa.'
            ],
        ];

        $template->mauMocThoigians()->delete();
        foreach ($milestones as $index => $moc) {
            $template->mauMocThoigians()->create(array_merge($moc, ['THU_TU' => $index]));
        }
    }
}