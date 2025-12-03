<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class NopSanPhamSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('vi_VN');
        
        $assignments = DB::table('PHANCONG_DETAI_NHOM')
            ->join('NHOM', 'PHANCONG_DETAI_NHOM.ID_NHOM', '=', 'NHOM.ID_NHOM')
            ->where('PHANCONG_DETAI_NHOM.TRANGTHAI', 'Đang thực hiện')
            ->select('PHANCONG_DETAI_NHOM.*', 'NHOM.ID_NHOMTRUONG')
            ->get();

        foreach ($assignments as $assign) {
            if (rand(1, 100) > 70) continue;

            $status = $faker->randomElement(['Chờ xác nhận', 'Đã xác nhận', 'Yêu cầu nộp lại']);
            
            $submissionId = DB::table('NOP_SANPHAM')->insertGetId([
                'ID_PHANCONG' => $assign->ID_PHANCONG,
                'ID_NGUOI_NOP' => $assign->ID_NHOMTRUONG,
                'TRANGTHAI' => $status,
                'PHANHOI_ADMIN' => ($status === 'Yêu cầu nộp lại') ? 'File báo cáo bị lỗi font, vui lòng nộp lại.' : null,
                'ID_NGUOI_XACNHAN' => ($status !== 'Chờ xác nhận') ? $assign->ID_GVHD : null,
                'NGAY_XACNHAN' => ($status !== 'Chờ xác nhận') ? now() : null,
                'NGAY_NOP' => now()->subDays(rand(1, 5))
            ]);

            DB::table('FILE_NOP_SANPHAM')->insert([
                'ID_NOP_SANPHAM' => $submissionId,
                'LOAI_FILE' => 'BaoCaoPDF',
                'DUONG_DAN_HOAC_NOI_DUNG' => 'uploads/dummy_report.pdf',
                'TEN_FILE_GOC' => 'BaoCao_TongKet_Nhom.pdf',
                'KICH_THUOC_FILE' => rand(1024, 5000) * 1024,
                'IS_REJECTED' => false
            ]);

            DB::table('FILE_NOP_SANPHAM')->insert([
                'ID_NOP_SANPHAM' => $submissionId,
                'LOAI_FILE' => 'LinkRepository',
                'DUONG_DAN_HOAC_NOI_DUNG' => 'https://github.com/student/project-' . rand(100, 999),
                'TEN_FILE_GOC' => null,
                'KICH_THUOC_FILE' => null,
                'IS_REJECTED' => false
            ]);
        }
    }
}