<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\NopSanpham;
use App\Models\FileNopSanpham;
use App\Models\PhancongDetaiNhom;
use App\Models\Nguoidung;

class NopSanphamSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        NopSanpham::truncate();
        FileNopSanpham::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Lấy phân công của Nhóm 1 (GradPro)
        $phancong = PhancongDetaiNhom::whereHas('nhom', fn($q) => $q->where('TEN_NHOM', 'like', 'Nhóm Tên Lửa%'))->first();
        
        if (!$phancong) {
            $this->command->warn("Không tìm thấy phân công cho 'Nhóm Tên Lửa' để tạo lịch sử nộp bài.");
            return;
        }

        $nhomTruong = $phancong->nhom->nhomtruong;
        $admin = Nguoidung::where('EMAIL', 'admin@gradpro.test')->first();

        // Lần nộp 1: Bị từ chối
        $submission1 = NopSanpham::create([
            'ID_PHANCONG' => $phancong->ID_PHANCONG,
            'ID_NGUOI_NOP' => $nhomTruong->ID_NGUOIDUNG,
            'TRANGTHAI' => 'Yêu cầu nộp lại',
            'PHANHOI_ADMIN' => 'File báo cáo sai định dạng. Yêu cầu nộp lại file PDF.',
            'ID_NGUOI_XACNHAN' => $admin->ID_NGUOIDUNG,
            'NGAY_XACNHAN' => now()->subDays(2),
            'NGAY_NOP' => now()->subDays(3),
        ]);
        FileNopSanpham::create([
            'ID_NOP_SANPHAM' => $submission1->ID_NOP_SANPHAM,
            'LOAI_FILE' => 'BaoCaoPDF',
            'DUONG_DAN_HOAC_NOI_DUNG' => 'submissions/samples/BaoCao_Lan1_SAI.docx',
            'TEN_FILE_GOC' => 'BaoCao_Lan1_SAI.docx',
            'KICH_THUOC_FILE' => 1024,
        ]);

        // Lần nộp 2: Đang chờ xác nhận
        $submission2 = NopSanpham::create([
            'ID_PHANCONG' => $phancong->ID_PHANCONG,
            'ID_NGUOI_NOP' => $nhomTruong->ID_NGUOIDUNG,
            'TRANGTHAI' => 'Chờ xác nhận',
            'NGAY_NOP' => now()->subDay(),
        ]);
        FileNopSanpham::insert([
            [
                'ID_NOP_SANPHAM' => $submission2->ID_NOP_SANPHAM,
                'LOAI_FILE' => 'BaoCaoPDF',
                'DUONG_DAN_HOAC_NOI_DUNG' => 'submissions/samples/BaoCao_Lan2_FINAL.pdf',
                'TEN_FILE_GOC' => 'BaoCao_Lan2_FINAL.pdf',
                'KICH_THUOC_FILE' => 204800,
            ],
            [
                'ID_NOP_SANPHAM' => $submission2->ID_NOP_SANPHAM,
                'LOAI_FILE' => 'SourceCodeZIP',
                'DUONG_DAN_HOAC_NOI_DUNG' => 'submissions/samples/SourceCode_GradPro.zip',
                'TEN_FILE_GOC' => 'SourceCode_GradPro.zip',
                'KICH_THUOC_FILE' => 5120000,
            ],
            [
                'ID_NOP_SANPHAM' => $submission2->ID_NOP_SANPHAM,
                'LOAI_FILE' => 'LinkRepository',
                'DUONG_DAN_HOAC_NOI_DUNG' => 'https://github.com/example/gradpro',
                'TEN_FILE_GOC' => null, 'KICH_THUOC_FILE' => null,
            ]
        ]);
        
        $this->command->info('Đã tạo dữ liệu mẫu cho Lịch sử Nộp bài!');
    }
}