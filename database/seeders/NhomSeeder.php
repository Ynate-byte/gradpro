<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class NhomSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('vi_VN');
        $planId = DB::table('KEHOACH_KHOALUAN')->where('TRANGTHAI', 'Đang thực hiện')->value('ID_KEHOACH');
        
        if (!$planId) return;

        $students = DB::table('SINHVIEN_THAMGIA')
            ->join('SINHVIEN', 'SINHVIEN_THAMGIA.ID_SINHVIEN', '=', 'SINHVIEN.ID_SINHVIEN')
            ->join('NGUOIDUNG', 'SINHVIEN.ID_NGUOIDUNG', '=', 'NGUOIDUNG.ID_NGUOIDUNG')
            ->where('SINHVIEN_THAMGIA.ID_KEHOACH', $planId)
            ->select('NGUOIDUNG.ID_NGUOIDUNG', 'SINHVIEN.ID_CHUYENNGANH', 'SINHVIEN.ID_SINHVIEN')
            ->get();

        $groupedStudents = $students->groupBy('ID_CHUYENNGANH');

        foreach ($groupedStudents as $chuyenNganhId => $listSv) {
            // Shuffle để ngẫu nhiên
            $shuffled = $listSv->shuffle();
            
            $chunks = $shuffled->chunk(3);

            foreach ($chunks as $chunk) {
                if ($chunk->count() < 2) continue;

                $leader = $chunk->first();
                $maNhom = 'G' . $chuyenNganhId . '_' . strtoupper($faker->bothify('??###'));

                $nhomId = DB::table('NHOM')->insertGetId([
                    'ID_KEHOACH' => $planId,
                    'TEN_NHOM' => 'Nhóm ' . $maNhom,
                    'MA_NHOM' => $maNhom,
                    'MOTA' => 'Nhóm sinh viên chuyên ngành thực hiện khóa luận.',
                    'ID_NHOMTRUONG' => $leader->ID_NGUOIDUNG,
                    'ID_CHUYENNGANH' => $chuyenNganhId,
                    'ID_KHOA_BOMON' => 1,
                    'SO_THANHVIEN_HIENTAI' => $chunk->count(),
                    'TRANGTHAI' => 'Đang mở',
                    'NGAYTAO' => now()
                ]);

                foreach ($chunk as $sv) {
                    DB::table('THANHVIEN_NHOM')->insert([
                        'ID_NHOM' => $nhomId,
                        'ID_NGUOIDUNG' => $sv->ID_NGUOIDUNG,
                        'NGAY_VAONHOM' => now()
                    ]);
                }
            }
        }
    }
}