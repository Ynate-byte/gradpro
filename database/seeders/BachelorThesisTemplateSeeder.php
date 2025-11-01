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
            ['TEN_MAU' => 'Cử nhân 13ĐH - HKI 2025-2026'],
            [
                'HEDAOTAO_MACDINH' => 'Cử nhân',
                'SO_TUAN_MACDINH' => 12,
                'MO_TA' => 'Bản mẫu kế hoạch Khóa luận Tốt nghiệp hệ Cử nhân khóa 13ĐH, học kỳ I năm học 2025–2026.',
            ]
        );

        $milestones = [
            [
                'TEN_SUKIEN' => 'Sinh viên đăng ký nhóm đề tài',
                'MOTA' => "Sinh viên lập nhóm (03 sinh viên/nhóm) và đăng ký theo form: https://forms.gle/6Pr8MPwgqZPlpvrr5. Nhóm trưởng là người đại diện duy nhất, phải điền đầy đủ thông tin nhóm (MSSV, họ tên, vai trò).",
                'OFFSET_BATDAU' => 0,
                'THOI_LUONG' => 1,
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên',
            ],
            [
                'TEN_SUKIEN' => 'Kiểm tra danh sách nhóm trên hệ thống',
                'MOTA' => "Khoa cung cấp tài khoản và danh sách sinh viên đã đăng ký. Các nhóm trưởng đăng nhập để kiểm tra thông tin nhóm trên hệ thống.",
                'OFFSET_BATDAU' => 1, 
                'THOI_LUONG' => 1,
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên,Giáo vụ',
            ],
            [
                'TEN_SUKIEN' => 'Nhóm trưởng đăng ký đề tài khóa luận',
                'MOTA' => "Nhóm trưởng thực hiện đăng ký đề tài khóa luận trên website: https://fit.huit.edu.vn hoặc hệ thống iCourse. Mỗi nhóm chỉ được đăng ký 01 đề tài. Sau 06/09/2025 hệ thống sẽ khóa.",
                'OFFSET_BATDAU' => 1,
                'THOI_LUONG' => 1,
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên',
            ],
            [
                'TEN_SUKIEN' => 'Sinh viên nộp phiếu đăng ký đề tài',
                'MOTA' => "Sinh viên nộp phiếu đăng ký (theo mẫu đính kèm), điền đầy đủ thông tin, có đủ chữ ký xác nhận và nội dung trùng khớp với thông tin đã đăng ký trên phần mềm.",
                'OFFSET_BATDAU' => 2, 
                'THOI_LUONG' => 1,
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên',
            ],
            [
                'TEN_SUKIEN' => 'Khoa công bố danh sách đề tài và GVHD',
                'MOTA' => "Khoa tổng hợp danh sách sinh viên, đề tài và giảng viên hướng dẫn, thông báo chính thức trên website cùng các biểu mẫu liên quan.",
                'OFFSET_BATDAU' => 2, 
                'THOI_LUONG' => 1,
                'VAITRO_THUCHIEN_MACDINH' => 'Giáo vụ',
            ],
            [
                'TEN_SUKIEN' => 'Sinh viên liên hệ GVHD để triển khai đề tài',
                'MOTA' => "Sinh viên liên hệ với giảng viên hướng dẫn qua email để bắt đầu thực hiện đề tài. Thời gian từ 08/09 đến 09/09/2025. Nếu không liên hệ được xem như không tham gia thực hiện đề tài.",
                'OFFSET_BATDAU' => 3,
                'THOI_LUONG' => 2,
                'VAITRO_THUCHIEN_MACDINH' => 'Giảng viên,Sinh viên',
            ],
            [
                'TEN_SUKIEN' => 'Thực hiện khóa luận',
                'MOTA' => "Các nhóm sinh viên thực hiện đề tài dưới sự hướng dẫn của giảng viên. Thời gian từ 08/09/2025 đến 30/11/2025 (12 tuần).",
                'OFFSET_BATDAU' => 3,
                'THOI_LUONG' => 84,
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên',
            ],
            [
                'TEN_SUKIEN' => 'Nộp báo cáo hoàn chỉnh khóa luận',
                'MOTA' => "Nhóm sinh viên nộp quyển báo cáo có chữ ký xác nhận của GVHD. Hình thức và nơi nộp sẽ được Khoa thông báo sau.",
                'OFFSET_BATDAU' => 88,
                'THOI_LUONG' => 2, 
                'VAITRO_THUCHIEN_MACDINH' => 'Sinh viên',
            ],
            [
                'TEN_SUKIEN' => 'Bảo vệ khóa luận tốt nghiệp',
                'MOTA' => "Khoa thông báo lịch làm việc của Hội đồng bảo vệ khóa luận. Sinh viên theo dõi trên website của Khoa. Dự kiến tổ chức ngày 05/12/2025.",
                'OFFSET_BATDAU' => 91,
                'THOI_LUONG' => 1,
                'VAITRO_THUCHIEN_MACDINH' => 'Trưởng bộ môn,Giảng viên',
            ],
        ];

        $template->mauMocThoigians()->delete();

        foreach ($milestones as $index => $moc) {
            $template->mauMocThoigians()->create(array_merge($moc, ['THU_TU' => $index]));
        }
    }
}
