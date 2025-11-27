<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Detai;
use App\Models\KehoachKhoaluan;
use App\Models\Giangvien;
use App\Models\Nguoidung;
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
        
        // Load giảng viên kèm thông tin Khoa/Bộ môn để lấy ID và Mã bộ môn
        $lecturers = Giangvien::with('khoabomon')->get(); 
        
        $admin = Nguoidung::where('EMAIL', 'admin@gradpro.test')->first();

        if ($plans->isEmpty() || $lecturers->isEmpty()) {
            return;
        }

        foreach ($plans as $plan) {
            $shortYear = substr($plan->NAMHOC, 2, 2); 
            $counters = []; // Đếm số đề tài theo từng bộ môn trong mỗi kế hoạch

            for ($i = 1; $i <= 40; $i++) { // Tạo khoảng 40 đề tài cho mỗi kế hoạch
                $lecturer = $lecturers->random();
                $department = $lecturer->khoabomon;

                if (!$department) continue;

                // Tạo bộ đếm cho từng bộ môn để sinh mã đề tài
                if (!isset($counters[$department->ID_KHOA_BOMON])) {
                    $counters[$department->ID_KHOA_BOMON] = 0;
                }
                $counters[$department->ID_KHOA_BOMON]++;
                $stt = $counters[$department->ID_KHOA_BOMON];

                // Mã đề tài: [MÃ_BỘ_MÔN].[NĂM].[ID_KẾ_HOẠCH].[STT]
                // Ví dụ: KHDT.25.1.001
                $maDeTai = $department->MA_KHOA_BOMON . '.' . $shortYear . '.' . $plan->ID_KEHOACH . '.' . str_pad($stt, 3, '0', STR_PAD_LEFT);

                if (Detai::where('MA_DETAI', $maDeTai)->exists()) {
                    $maDeTai = $maDeTai . '.' . Str::random(3);
                }

                $desc = $faker->paragraphs(3, true);
                $req = "- Nắm vững kiến thức về " . $department->TEN_KHOA_BOMON . "\n- " . $faker->sentence(10) . "\n- " . $faker->sentence(15);
                $outcome = "- Báo cáo tổng kết\n- Ứng dụng demo chạy được trên môi trường " . $faker->randomElement(['Web', 'Mobile', 'Cloud']) . "\n- " . $faker->sentence(8);

                Detai::create([
                    'ID_KEHOACH' => $plan->ID_KEHOACH,
                    'MA_DETAI' => $maDeTai,
                    'TEN_DETAI' => $this->generateTopicName($faker, $department->TEN_KHOA_BOMON),
                    'MOTA' => $desc,
                    'YEUCAU' => $req,
                    'KETQUA_MONGDOI' => $outcome,
                    
                    // [SỬA ĐỔI QUAN TRỌNG]: Dùng ID_KHOA_BOMON thay vì ID_CHUYENNGANH
                    'ID_KHOA_BOMON' => $department->ID_KHOA_BOMON,
                    
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

    private function generateTopicName($faker, $deptName) {
        $prefixes = ['Xây dựng', 'Nghiên cứu', 'Phát triển', 'Triển khai', 'Tối ưu hóa', 'Phân tích và thiết kế'];
        $systems = ['Hệ thống quản lý', 'Website thương mại điện tử', 'Ứng dụng Mobile', 'Hệ thống IoT', 'Mô hình AI', 'Blockchain', 'Big Data Platform'];
        $topics = ['cho doanh nghiệp SME', 'sử dụng React & Laravel', 'dựa trên nền tảng Cloud', 'ứng dụng Machine Learning', 'phục vụ cộng đồng', 'hỗ trợ đào tạo trực tuyến'];
        
        return $faker->randomElement($prefixes) . ' ' . $faker->randomElement($systems) . ' ' . $faker->randomElement($topics);
    }
}