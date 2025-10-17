<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\KehoachKhoaluan;
use App\Models\MocThoigian;
use App\Models\Nguoidung;

class KehoachKhoaluanSeeder extends Seeder
{
    public function run(): void
    {
        KehoachKhoaluan::query()->delete();

        $admin = Nguoidung::where('EMAIL', 'admin@gradpro.test')->first();

        // Kế hoạch 1: Đang thực hiện (để sinh viên có thể đăng ký nhóm)
        $planInProgress = KehoachKhoaluan::create([
            'TEN_DOT' => 'Khóa luận tốt nghiệp HK1, 2025-2026',
            'NAMHOC' => '2025-2026',
            'HOCKY' => '1',
            'KHOAHOC' => 'K13',
            'HEDAOTAO' => 'Cử nhân',
            'TRANGTHAI' => 'Đang thực hiện',
            'ID_NGUOITAO' => $admin->ID_NGUOIDUNG,
        ]);
        MocThoigian::insert([
            ['ID_KEHOACH' => $planInProgress->ID_KEHOACH, 'TEN_SUKIEN' => 'Sinh viên đăng ký nhóm', 'NGAY_BATDAU' => now()->subDays(10), 'NGAY_KETTHUC' => now()->subDays(5)],
            ['ID_KEHOACH' => $planInProgress->ID_KEHOACH, 'TEN_SUKIEN' => 'Nhóm đăng ký đề tài', 'NGAY_BATDAU' => now()->subDays(4), 'NGAY_KETTHUC' => now()->addDays(2)],
            ['ID_KEHOACH' => $planInProgress->ID_KEHOACH, 'TEN_SUKIEN' => 'Nhóm sinh viên thực hiện đề tài', 'NGAY_BATDAU' => now(), 'NGAY_KETTHUC' => now()->addWeeks(12)],
            ['ID_KEHOACH' => $planInProgress->ID_KEHOACH, 'TEN_SUKIEN' => 'Nộp báo cáo cuối kỳ', 'NGAY_BATDAU' => now()->addWeeks(12), 'NGAY_KETTHUC' => now()->addWeeks(12)->addDays(3)],
        ]);

        // Kế hoạch 2: Đã hoàn thành
        KehoachKhoaluan::create([
            'TEN_DOT' => 'Khóa luận tốt nghiệp HK2, 2024-2025',
            'NAMHOC' => '2024-2025',
            'HOCKY' => '2',
            'KHOAHOC' => 'K12',
            'HEDAOTAO' => 'Kỹ sư',
            'TRANGTHAI' => 'Đã hoàn thành',
            'ID_NGUOITAO' => $admin->ID_NGUOIDUNG,
        ]);

        // Kế hoạch 3: Bản nháp
        KehoachKhoaluan::create([
            'TEN_DOT' => 'Dự kiến khóa luận tốt nghiệp HK2, 2025-2026',
            'NAMHOC' => '2025-2026',
            'HOCKY' => '2',
            'KHOAHOC' => 'K13',
            'HEDAOTAO' => 'Cử nhân',
            'TRANGTHAI' => 'Bản nháp',
            'ID_NGUOITAO' => $admin->ID_NGUOIDUNG,
        ]);
        
        $this->command->info('Đã tạo dữ liệu mẫu cho các kế hoạch khóa luận!');
    }
}