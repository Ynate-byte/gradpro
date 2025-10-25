<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\KehoachKhoaluan;
use App\Models\MocThoigian;
use App\Models\Nguoidung;
use Illuminate\Support\Facades\DB;

class KehoachKhoaluanSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        MocThoigian::truncate();
        KehoachKhoaluan::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $giaoVu = Nguoidung::where('EMAIL', 'giao.vu@gradpro.test')->first();
        $truongKhoa = Nguoidung::where('EMAIL', 'truong.khoa@gradpro.test')->first();

        if (!$giaoVu || !$truongKhoa) {
             $this->command->error('Tài khoản Giáo vụ hoặc Trưởng khoa không tồn tại. Vui lòng chạy NguoidungSeeder trước.');
             return;
        }

        // Kế hoạch 1: Đang thực hiện (Do Trưởng khoa tạo và tự duyệt)
        $planInProgress = KehoachKhoaluan::create([
            'TEN_DOT' => 'KLTN Học kỳ 1, năm học 2025-2026',
            'NAMHOC' => '2025-2026', 'HOCKY' => '1', 'KHOAHOC' => 'K13', 'HEDAOTAO' => 'Cử nhân',
            'TRANGTHAI' => 'Đang thực hiện', // Đã kích hoạt
            'ID_NGUOITAO' => $truongKhoa->ID_NGUOIDUNG,
            'ID_NGUOIPHEDUYET' => $truongKhoa->ID_NGUOIDUNG, // Tự duyệt
            'NGAY_BATDAU' => now()->subDays(20), 'NGAY_KETHUC' => now()->addDays(60),
        ]);
        MocThoigian::insert([
            ['ID_KEHOACH' => $planInProgress->ID_KEHOACH, 'TEN_SUKIEN' => 'Sinh viên đăng ký nhóm', 'NGAY_BATDAU' => now()->subDays(10), 'NGAY_KETTHUC' => now()->subDays(5), 'VAITRO_THUCHIEN' => 'Sinh viên'],
            ['ID_KEHOACH' => $planInProgress->ID_KEHOACH, 'TEN_SUKIEN' => 'Nhóm đăng ký đề tài', 'NGAY_BATDAU' => now()->subDays(4), 'NGAY_KETTHUC' => now()->addDays(2), 'VAITRO_THUCHIEN' => 'Sinh viên'],
            ['ID_KEHOACH' => $planInProgress->ID_KEHOACH, 'TEN_SUKIEN' => 'Thực hiện đề tài', 'NGAY_BATDAU' => now(), 'NGAY_KETTHUC' => now()->addWeeks(12), 'VAITRO_THUCHIEN' => 'Sinh viên,Giảng viên'],
        ]);

        // Kế hoạch 2: Chờ phê duyệt (Do Giáo vụ tạo)
        KehoachKhoaluan::create([
            'TEN_DOT' => 'Dự kiến KLTN Học kỳ 2, 2025-2026',
            'NAMHOC' => '2025-2026', 'HOCKY' => '2', 'KHOAHOC' => 'K13', 'HEDAOTAO' => 'Cử nhân',
            'TRANGTHAI' => 'Chờ phê duyệt',
            'ID_NGUOITAO' => $giaoVu->ID_NGUOIDUNG,
            'NGAY_BATDAU' => now()->addDays(60), 'NGAY_KETHUC' => now()->addDays(150),
        ]);

        // Kế hoạch 3: Yêu cầu chỉnh sửa (Do Giáo vụ tạo, Trưởng khoa yêu cầu)
        KehoachKhoaluan::create([
            'TEN_DOT' => 'Kế hoạch bổ sung hè 2025',
            'NAMHOC' => '2024-2025', 'HOCKY' => '3', 'KHOAHOC' => 'K12', 'HEDAOTAO' => 'Cử nhân',
            'TRANGTHAI' => 'Yêu cầu chỉnh sửa',
            'ID_NGUOITAO' => $giaoVu->ID_NGUOIDUNG,
            'ID_NGUOIPHEDUYET' => $truongKhoa->ID_NGUOIDUNG,
            'BINHLUAN_PHEDUYET' => 'Thời gian các mốc quá gần nhau, cần giãn ra thêm.'
        ]);
        
        // Kế hoạch 4: Chờ duyệt chỉnh sửa (Giáo vụ sửa khi đang thực hiện)
        $planReApprove = KehoachKhoaluan::create([
            'TEN_DOT' => 'KLTN Học kỳ 1 (Đợt 2), năm học 2025-2026',
            'NAMHOC' => '2025-2026', 'HOCKY' => '1', 'KHOAHOC' => 'K13-CLC', 'HEDAOTAO' => 'Kỹ sư',
            'TRANGTHAI' => 'Chờ duyệt chỉnh sửa', // Giáo vụ vừa sửa
            'ID_NGUOITAO' => $giaoVu->ID_NGUOIDUNG,
            'ID_NGUOIPHEDUYET' => $truongKhoa->ID_NGUOIDUNG,
            'NGAY_BATDAU' => now()->subDays(10), 'NGAY_KETHUC' => now()->addDays(70),
        ]);
         MocThoigian::insert([
            ['ID_KEHOACH' => $planReApprove->ID_KEHOACH, 'TEN_SUKIEN' => 'Thực hiện', 'NGAY_BATDAU' => now(), 'NGAY_KETTHUC' => now()->addWeeks(10), 'VAITRO_THUCHIEN' => 'Sinh viên'],
            ['ID_KEHOACH' => $planReApprove->ID_KEHOACH, 'TEN_SUKIEN' => 'Báo cáo (ĐÃ SỬA)', 'NGAY_BATDAU' => now()->addWeeks(11), 'NGAY_KETTHUC' => now()->addWeeks(12), 'VAITRO_THUCHIEN' => 'Sinh viên'],
        ]);


        // Kế hoạch 5: Đã hoàn thành
        KehoachKhoaluan::create([
            'TEN_DOT' => 'KLTN Học kỳ 2, năm học 2024-2025',
            'NAMHOC' => '2024-2025', 'HOCKY' => '2', 'KHOAHOC' => 'K12', 'HEDAOTAO' => 'Kỹ sư',
            'TRANGTHAI' => 'Đã hoàn thành',
            'ID_NGUOITAO' => $giaoVu->ID_NGUOIDUNG,
            'ID_NGUOIPHEDUYET' => $truongKhoa->ID_NGUOIDUNG,
        ]);
        
        $this->command->info('Đã tạo dữ liệu mẫu cho các kế hoạch khóa luận!');
    }
}