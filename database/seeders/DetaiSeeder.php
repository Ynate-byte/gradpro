<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Detai;
use App\Models\KehoachKhoaluan;
use App\Models\Giangvien;
use App\Models\Nguoidung;
use App\Models\Chuyennganh;
use Faker\Factory as Faker;
use Illuminate\Support\Str;

class DetaiSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Detai::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $faker = Faker::create('vi_VN');
        $plans = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Chờ duyệt chỉnh sửa'])->get();
        $lecturers = Giangvien::all();
        $majors = Chuyennganh::all();
        $admin = Nguoidung::where('EMAIL', 'admin@gradpro.test')->first();

        if ($plans->isEmpty() || $lecturers->isEmpty() || $majors->isEmpty()) {
            return;
        }

        foreach ($plans as $plan) {
            $shortYear = substr($plan->NAMHOC, 2, 2); 
            $counters = [];

            for ($i = 1; $i <= 25; $i++) {
                $major = $majors->random();
                $lecturer = $lecturers->random();
                
                if (!isset($counters[$major->ID_CHUYENNGANH])) {
                    $counters[$major->ID_CHUYENNGANH] = 0;
                }
                $counters[$major->ID_CHUYENNGANH]++;
                $stt = $counters[$major->ID_CHUYENNGANH];

                // FIX: Thêm ID_KEHOACH vào mã để đảm bảo duy nhất giữa các kế hoạch cùng năm.
                $maDeTai = $major->MA_CHUYENNGANH . '.' . $shortYear . '.' . $plan->ID_KEHOACH . '.' . str_pad($stt, 3, '0', STR_PAD_LEFT);

                if (Detai::where('MA_DETAI', $maDeTai)->exists()) {
                    $maDeTai = Str::random(10);
                }

                $desc = $faker->paragraphs(3, true);
                $req = "- Nắm vững kiến thức về " . $major->TEN_CHUYENNGANH . "\n- " . $faker->sentence(10) . "\n- " . $faker->sentence(15);
                $outcome = "- Báo cáo tổng kết 50 trang\n- Ứng dụng demo chạy được trên môi trường " . $faker->randomElement(['Web', 'Mobile', 'Cloud']) . "\n- " . $faker->sentence(8);

                Detai::create([
                    'ID_KEHOACH' => $plan->ID_KEHOACH,
                    'MA_DETAI' => $maDeTai,
                    'TEN_DETAI' => $this->generateTopicName($faker, $major->TEN_CHUYENNGANH),
                    'MOTA' => $desc,
                    'YEUCAU' => $req,
                    'KETQUA_MONGDOI' => $outcome,
                    'ID_CHUYENNGANH' => $major->ID_CHUYENNGANH,
                    'ID_NGUOI_DEXUAT' => $lecturer->ID_GIANGVIEN,
                    'SO_NHOM_TOIDA' => $faker->numberBetween(1, 3),
                    'TRANGTHAI' => $faker->randomElement(['Đã duyệt', 'Đã duyệt', 'Chờ duyệt', 'Yêu cầu chỉnh sửa']),
                    'ID_NGUOI_DUYET' => $admin ? $admin->ID_NGUOIDUNG : null,
                    'NGAY_DUYET' => now(),
                    'NGAYTAO' => now()->subDays(rand(1, 30)),
                ]);
            }
        }
    }

    private function generateTopicName($faker, $majorName) {
        $prefixes = ['Xây dựng', 'Nghiên cứu', 'Phát triển', 'Triển khai', 'Tối ưu hóa', 'Phân tích và thiết kế'];
        $systems = ['Hệ thống quản lý', 'Website thương mại điện tử', 'Ứng dụng Mobile', 'Hệ thống IoT', 'Mô hình AI', 'Mạng nơ-ron tích chập', 'Blockchain', 'Big Data'];
        $topics = ['cho doanh nghiệp', 'sử dụng React', 'dựa trên nền tảng Cloud', 'ứng dụng Machine Learning', 'phục vụ cộng đồng', 'hỗ trợ người khuyết tật', 'quản lý nhân sự', 'đặt vé xem phim'];
        
        return $faker->randomElement($prefixes) . ' ' . $faker->randomElement($systems) . ' ' . $faker->randomElement($topics);
    }
}