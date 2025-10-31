<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Detai;
use App\Models\KehoachKhoaluan;
use App\Models\Giangvien;
use App\Models\Nguoidung;
use App\Models\Chuyennganh;

class DetaiSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Detai::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $plan = KehoachKhoaluan::where('TRANGTHAI', 'Đang thực hiện')->first();
        if (!$plan) {
            $this->command->warn("Không có kế hoạch 'Đang thực hiện' để tạo đề tài.");
            return;
        }

        // Lấy giảng viên và admin
        $gv1 = Giangvien::whereHas('nguoidung', fn($q) => $q->where('EMAIL', 'vinhvv@huit.edu.vn'))->first(); // Vũ Văn Vinh
        $gv2 = Giangvien::whereHas('nguoidung', fn($q) => $q->where('EMAIL', 'thinhvd@huit.edu.vn'))->first(); // Vũ Đức Thịnh
        $admin = Nguoidung::where('EMAIL', 'admin@gradpro.test')->first();
        
        // Lấy chuyên ngành
        $cnKTPM = Chuyennganh::where('MA_CHUYENNGANH', 'CN.KTPM')->first();
        $cnMMT = Chuyennganh::where('MA_CHUYENNGANH', 'CN.MMT')->first();

        if (!$gv1 || !$gv2 || !$admin || !$cnKTPM || !$cnMMT) {
            $this->command->error('Không tìm đủ GV (Vinh, Thịnh), Admin hoặc Chuyên ngành (KTPM, MMT) để tạo đề tài.');
            return;
        }

        Detai::create([
            'ID_KEHOACH' => $plan->ID_KEHOACH,
            'MA_DETAI' => 'KTPM25.001',
            'TEN_DETAI' => 'Xây dựng hệ thống quản lý KLTN (GradPro)',
            'MOTA' => 'Xây dựng hệ thống backend (Laravel) và frontend (Vue) để quản lý quy trình KLTN.',
            'ID_CHUYENNGANH' => $cnKTPM->ID_CHUYENNGANH,
            'ID_NGUOI_DEXUAT' => $gv1->ID_GIANGVIEN,
            'SO_NHOM_TOIDA' => 2,
            'TRANGTHAI' => 'Đã duyệt', // Đã duyệt
            'ID_NGUOI_DUYET' => $admin->ID_NGUOIDUNG,
            'NGAY_DUYET' => now(),
        ]);

        Detai::create([
            'ID_KEHOACH' => $plan->ID_KEHOACH,
            'MA_DETAI' => 'MMT25.001',
            'TEN_DETAI' => 'Nghiên cứu và triển khai hệ thống phát hiện xâm nhập (IDS) sử dụng Snort',
            'MOTA' => 'Tìm hiểu về IDS và cấu hình Snort để phát hiện các mẫu tấn công phổ biến.',
            'ID_CHUYENNGANH' => $cnMMT->ID_CHUYENNGANH,
            'ID_NGUOI_DEXUAT' => $gv2->ID_GIANGVIEN,
            'SO_NHOM_TOIDA' => 1,
            'TRANGTHAI' => 'Đã duyệt', // Đã duyệt
            'ID_NGUOI_DUYET' => $admin->ID_NGUOIDUNG,
            'NGAY_DUYET' => now(),
        ]);
        
        Detai::create([
            'ID_KEHOACH' => $plan->ID_KEHOACH,
            'MA_DETAI' => 'KTPM25.002',
            'TEN_DETAI' => 'Ứng dụng thương mại điện tử bán nông sản',
            'MOTA' => 'Xây dựng website bán nông sản sạch, hỗ trợ thanh toán trực tuyến.',
            'ID_CHUYENNGANH' => $cnKTPM->ID_CHUYENNGANH,
            'ID_NGUOI_DEXUAT' => $gv1->ID_GIANGVIEN,
            'SO_NHOM_TOIDA' => 1,
            'TRANGTHAI' => 'Chờ duyệt', // Chờ duyệt
        ]);
        
        Detai::create([
            'ID_KEHOACH' => $plan->ID_KEHOACH,
            'MA_DETAI' => 'MMT25.002',
            'TEN_DETAI' => 'Phân tích mã độc trên thiết bị Android',
            'MOTA' => 'Sử dụng các công cụ sandbox để phân tích hành vi mã độc.',
            'ID_CHUYENNGANH' => $cnMMT->ID_CHUYENNGANH,
            'ID_NGUOI_DEXUAT' => $gv2->ID_GIANGVIEN,
            'SO_NHOM_TOIDA' => 1,
            'TRANGTHAI' => 'Yêu cầu chỉnh sửa', // Yêu cầu sửa
            'LYDO_TUCHOI' => 'Mô tả quá chung chung, cần chi tiết hơn về phạm vi.',
        ]);

        $this->command->info('Đã tạo dữ liệu mẫu cho Đề tài!');
    }
}