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
                'TEN_SUKIEN' => 'Sinh viên đăng ký nhóm đề tài (03 sinh viên/nhóm) qua form trực tuyến',
                'MOTA' => "https://forms.gle/6Pr8MPwgqZPlpvrr5\nSinh viên điền đầy đủ thông tin của các thành viên trong nhóm (Mã số sinh viên, họ tên, nhóm trưởng...).\nNhóm trưởng là người đại diện đăng ký và chỉ được đăng ký một lần duy nhất.\nCác nhóm trưởng hoặc sinh viên trùng tên trong nhiều nhóm sẽ bị loại khỏi danh sách.",
                'OFFSET_BATDAU' => 0, // Bắt đầu ngay ngày đầu tiên
                'THOI_LUONG' => 1,    // Diễn ra trong 1 ngày
            ],
             [
                'TEN_SUKIEN' => 'Các nhóm nhận tài khoản hệ thống (AC) do Khoa cung cấp để đăng nhập và kiểm tra',
                'MOTA' => "Danh sách tài khoản sẽ được gửi kèm theo thông báo của Khoa.",
                'OFFSET_BATDAU' => 1, // Bắt đầu ngày thứ 2 (0+1)
                'THOI_LUONG' => 1,
            ],
            [
                'TEN_SUKIEN' => 'Nhóm trưởng đăng ký đề tài khóa luận trên hệ thống',
                'MOTA' => "👉 https://ft.icourse.edu.vn\nSau khi thống nhất đề tài trong nhóm, nhóm trưởng là người thực hiện đăng ký.\nMỗi nhóm chỉ được đăng ký 01 đề tài duy nhất.\nSau ngày [Hạn chót], hệ thống sẽ đóng lại, không thể đăng ký thêm.", // Lưu ý: Hạn chót cần xử lý ở frontend hoặc mô tả
                'OFFSET_BATDAU' => 1, // Bắt đầu ngày thứ 2
                'THOI_LUONG' => 1,
            ],
            [
                'TEN_SUKIEN' => 'Sinh viên nộp phiếu đăng ký (bản giấy) theo mẫu',
                'MOTA' => "Phiếu phải được điền đầy đủ thông tin, có chữ ký xác nhận.\nNội dung trong phiếu phải trùng khớp với thông tin đã đăng ký trên hệ thống.",
                'OFFSET_BATDAU' => 2, // Bắt đầu ngày thứ 3
                'THOI_LUONG' => 1,
            ],
            [
                'TEN_SUKIEN' => 'Khoa tổng hợp danh sách, phân công GVHD và công bố chính thức',
                'MOTA' => "Danh sách và các biểu mẫu liên quan sẽ được đăng tải trên website Khoa:\n👉 https://fit.huit.edu.vn",
                'OFFSET_BATDAU' => 2, // Bắt đầu ngày thứ 3
                'THOI_LUONG' => 1,
            ],
            [
                'TEN_SUKIEN' => 'Các nhóm SV liên hệ GVHD qua email để bắt đầu thực hiện đề tài',
                'MOTA' => "Sinh viên phải chủ động gửi email và trao đổi với GVHD trong thời gian quy định.\nNếu sinh viên không liên hệ với GVHD trong thời gian này, sẽ bị xem là không thực hiện đề tài.",
                'OFFSET_BATDAU' => 3, // Bắt đầu ngày thứ 4
                'THOI_LUONG' => 2,    // Diễn ra trong 2 ngày
            ],
            [
                'TEN_SUKIEN' => 'Các nhóm SV thực hiện đề tài KLTN dưới sự hướng dẫn của GVHD',
                'MOTA' => "Sinh viên cần làm việc thường xuyên với GVHD trong suốt quá trình thực hiện.\nGiai đoạn thực hiện kéo dài tổng cộng 12 tuần.",
                'OFFSET_BATDAU' => 3, // Bắt đầu ngày thứ 4
                'THOI_LUONG' => 84,   // 12 tuần * 7 ngày
            ],
             [
                'TEN_SUKIEN' => 'Sinh viên nộp báo cáo khóa luận (bản giấy) cho Khoa',
                'MOTA' => "Báo cáo phải có chữ ký xác nhận của giảng viên hướng dẫn.\nHình thức và địa điểm nộp sẽ được Khoa thông báo sau.",
                'OFFSET_BATDAU' => 87, // Ngày 88 (sau 12 tuần = 84 ngày, bắt đầu từ ngày 4 => 3 + 84)
                'THOI_LUONG' => 2,
            ],
            [
                'TEN_SUKIEN' => 'Khoa thông báo lịch làm việc của Hội đồng bảo vệ khóa luận',
                'MOTA' => "Sinh viên theo dõi thông tin trên bảng tin và website Khoa để biết thời gian cụ thể.",
                'OFFSET_BATDAU' => 89, // Ngày 90
                'THOI_LUONG' => 1,
            ],
            // Thêm các mốc khác nếu cần
        ];

        // Xóa các mốc cũ trước khi thêm mới để tránh trùng lặp nếu chạy lại seeder
        $template->mauMocThoigians()->delete();

        foreach ($milestones as $index => $moc) {
            $template->mauMocThoigians()->create(array_merge($moc, ['THU_TU' => $index]));
        }
    }
}