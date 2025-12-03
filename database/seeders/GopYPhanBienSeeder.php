<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class GopYPhanBienSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('vi_VN');
        
        $planId = DB::table('KEHOACH_KHOALUAN')->where('TRANGTHAI', 'Đang thực hiện')->value('ID_KEHOACH');
        if (!$planId) return;

        $topics = DB::table('DETAI')->where('ID_KEHOACH', $planId)->get();
        
        $lecturers = DB::table('GIANGVIEN')->get();

        foreach ($topics as $topic) {
            if (rand(1, 100) > 30) continue;

            $reviewer = $lecturers->where('ID_GIANGVIEN', '!=', $topic->ID_NGUOI_DEXUAT)->random();

            DB::table('phancong_nguoi_gop_y')->insert([
                'ID_DETAI' => $topic->ID_DETAI,
                'ID_GIANGVIEN' => $reviewer->ID_GIANGVIEN,
                'ID_NGUOI_PHANCONG' => 1, // Admin
                'GHICHU' => 'Nhờ thầy/cô xem giúp tính khả thi.',
                'TRANGTHAI' => 'Hoàn thành',
                'created_at' => now()->subDays(5),
                'updated_at' => now()->subDays(5)
            ]);

            $goiyId = DB::table('GOIY_DETAI')->insertGetId([
                'ID_DETAI' => $topic->ID_DETAI,
                'ID_NGUOI_GOIY' => $reviewer->ID_GIANGVIEN,
                'ID_GIANGVIEN' => $reviewer->ID_GIANGVIEN,
                'NOIDUNG_GOIY' => $faker->randomElement([
                    'Đề tài có tính thực tiễn cao, tuy nhiên cần làm rõ phạm vi công nghệ.',
                    'Cần bổ sung thêm các chức năng quản trị hệ thống.',
                    'Mục tiêu đề tài hơi rộng so với thời gian thực hiện, nên thu hẹp lại.',
                    'Đồng ý với hướng tiếp cận, nhưng cần chú ý phần bảo mật dữ liệu.'
                ]),
                'NGAYTAO' => now()->subDays(4)
            ]);

            if (rand(0, 1)) {
                DB::table('PHANHOI_GOIY')->insert([
                    'ID_GOIY' => $goiyId,
                    'ID_GIANGVIEN' => $topic->ID_NGUOI_DEXUAT,
                    'NOIDUNG' => 'Cảm ơn đóng góp của thầy/cô. Tôi sẽ điều chỉnh lại phạm vi.',
                    'created_at' => now()->subDays(3),
                    'updated_at' => now()->subDays(3)
                ]);
            }
        }
    }
}