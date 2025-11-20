<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\NopSanpham;
use App\Models\FileNopSanpham;
use App\Models\PhancongDetaiNhom;
use Faker\Factory as Faker;

class NopSanphamSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        NopSanpham::truncate();
        FileNopSanpham::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $assignments = PhancongDetaiNhom::all();
        $faker = Faker::create();

        foreach ($assignments as $assignment) {
            if (rand(1, 100) <= 60) {
                $status = $faker->randomElement(['Chờ xác nhận', 'Đã xác nhận', 'Yêu cầu nộp lại']);
                $submission = NopSanpham::create([
                    'ID_PHANCONG' => $assignment->ID_PHANCONG,
                    'ID_NGUOI_NOP' => $assignment->nhom->ID_NHOMTRUONG,
                    'TRANGTHAI' => $status,
                    'PHANHOI_ADMIN' => $status == 'Yêu cầu nộp lại' ? $faker->sentence() : null,
                    'NGAY_NOP' => now()->subDays(rand(1, 10)),
                ]);

                FileNopSanpham::create([
                    'ID_NOP_SANPHAM' => $submission->ID_NOP_SANPHAM,
                    'LOAI_FILE' => 'BaoCaoPDF',
                    'DUONG_DAN_HOAC_NOI_DUNG' => 'submissions/dummy.pdf',
                    'TEN_FILE_GOC' => 'BaoCao_DoAn.pdf',
                    'KICH_THUOC_FILE' => 1024000,
                ]);
                
                if (rand(0, 1)) {
                    FileNopSanpham::create([
                        'ID_NOP_SANPHAM' => $submission->ID_NOP_SANPHAM,
                        'LOAI_FILE' => 'SourceCodeZIP',
                        'DUONG_DAN_HOAC_NOI_DUNG' => 'submissions/source.zip',
                        'TEN_FILE_GOC' => 'SourceCode.zip',
                        'KICH_THUOC_FILE' => 5000000,
                    ]);
                }
            }
        }
    }
}