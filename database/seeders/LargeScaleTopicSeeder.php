<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Detai;
use App\Models\KehoachKhoaluan;
use App\Models\Giangvien;
use App\Models\QuotaGiangvien;
use Faker\Factory as Faker;

class LargeScaleTopicSeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create('vi_VN');
        // Lấy kế hoạch đang chạy (được tạo từ seeder trước)
        $plan = KehoachKhoaluan::where('TRANGTHAI', 'Đang thực hiện')->first();
        
        if (!$plan) return;

        $lecturers = Giangvien::all();
        $adminId = 1; // Giả định ID 1 là admin duyệt bài

        foreach ($lecturers as $gv) {
            // Gán Quota lớn để GV có thể tạo nhiều đề tài
            QuotaGiangvien::updateOrCreate(
                ['ID_KEHOACH' => $plan->ID_KEHOACH, 'ID_GIANGVIEN' => $gv->ID_GIANGVIEN],
                [
                    'ID_NGUOI_PHANCONG' => $adminId,
                    'SO_DETAI_QUOTA' => 10,
                    'TRANGTHAI' => 'Hoàn thành'
                ]
            );

            // Mỗi GV tạo 3-5 đề tài
            $topicCount = rand(3, 5);
            for ($i = 0; $i < $topicCount; $i++) {
                Detai::create([
                    'ID_KEHOACH' => $plan->ID_KEHOACH,
                    'MA_DETAI' => 'DT_AUTO_' . $gv->ID_GIANGVIEN . '_' . $i . rand(1000,9999),
                    'TEN_DETAI' => $faker->catchPhrase . ' (' . $faker->jobTitle . ')',
                    'MOTA' => $faker->paragraph(3),
                    'YEUCAU' => $faker->paragraph(2),
                    'MUCTIEU' => $faker->sentence(5),
                    'KETQUA_MONGDOI' => $faker->sentence(5),
                    'ID_KHOA_BOMON' => $gv->ID_KHOA_BOMON,
                    'ID_NGUOI_DEXUAT' => $gv->ID_GIANGVIEN,
                    'SO_NHOM_TOIDA' => 3,
                    'TRANGTHAI' => 'Đã duyệt',
                    'ID_NGUOI_DUYET' => $adminId,
                    'NGAY_DUYET' => now(),
                    'NGAYTAO' => now()->subDays(rand(1, 30))
                ]);
            }
        }
    }
}