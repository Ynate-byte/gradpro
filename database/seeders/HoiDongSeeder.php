<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class HoiDongSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('vi_VN');
        
        $planId = DB::table('KEHOACH_KHOALUAN')->where('TRANGTHAI', 'Đang thực hiện')->value('ID_KEHOACH');
        if (!$planId) return;

        $departments = DB::table('KHOA_BOMON')->get();

        foreach ($departments as $dept) {
            for ($i = 1; $i <= 2; $i++) {
                $councilId = DB::table('HOIDONG')->insertGetId([
                    'TEN_HOIDONG' => "Hội đồng Bảo vệ {$dept->MA_KHOA_BOMON} - Nhóm 0{$i}",
                    'LOAI' => 'hoidong',
                    'ID_KEHOACH' => $planId,
                    'ID_KHOA_BOMON' => $dept->ID_KHOA_BOMON,
                    'NGAY_BAOCAO' => now()->addDays(rand(5, 15)),
                    'GIO_BAOCAO' => $faker->time('H:i:00'),
                    'PHONG' => 'C.' . rand(200, 500),
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                $lecturers = DB::table('GIANGVIEN')
                    ->where('ID_KHOA_BOMON', $dept->ID_KHOA_BOMON)
                    ->inRandomOrder()
                    ->limit(3)
                    ->get();

                $roles = ['chutich', 'thuky', 'thanhvien'];
                
                foreach ($lecturers as $index => $gv) {
                    if (isset($roles[$index])) {
                        DB::table('HOIDONG_GIANGVIEN')->insert([
                            'ID_HOIDONG' => $councilId,
                            'ID_GIANGVIEN' => $gv->ID_GIANGVIEN,
                            'VAITRO' => $roles[$index],
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);
                    }
                }

                $groups = DB::table('NHOM')
                    ->join('PHANCONG_DETAI_NHOM', 'NHOM.ID_NHOM', '=', 'PHANCONG_DETAI_NHOM.ID_NHOM')
                    ->join('DETAI', 'PHANCONG_DETAI_NHOM.ID_DETAI', '=', 'DETAI.ID_DETAI')
                    ->where('DETAI.ID_KHOA_BOMON', $dept->ID_KHOA_BOMON)
                    ->where('NHOM.ID_KEHOACH', $planId)
                    ->whereNotExists(function ($query) {
                        $query->select(DB::raw(1))
                              ->from('HOIDONG_NHOM')
                              ->whereColumn('HOIDONG_NHOM.ID_NHOM', 'NHOM.ID_NHOM');
                    })
                    ->select('NHOM.ID_NHOM')
                    ->limit(5)
                    ->get();

                foreach ($groups as $g) {
                    DB::table('HOIDONG_NHOM')->insert([
                        'ID_HOIDONG' => $councilId,
                        'ID_NHOM' => $g->ID_NHOM,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);

                    foreach ($lecturers as $gv) {
                        DB::table('DIEM_HOIDONG')->insert([
                            'ID_NHOM' => $g->ID_NHOM,
                            'ID_GIANGVIEN' => $gv->ID_GIANGVIEN,
                            'DIEM' => $faker->randomFloat(2, 6, 9.5),
                            'NHANXET' => 'Đạt yêu cầu, trả lời tốt.',
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);
                    }
                }
            }
        }
    }
}