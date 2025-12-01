<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Nhom;
use App\Models\ThanhvienNhom;
use App\Models\KehoachKhoaluan;
use App\Models\Sinhvien;
use App\Models\SinhvienThamgia;
use App\Models\Detai;
use App\Models\PhancongDetaiNhom;
use Faker\Factory as Faker;

class LargeScaleGroupSeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create('vi_VN');
        $plan = KehoachKhoaluan::where('TRANGTHAI', 'Đang thực hiện')->first();
        if (!$plan) return;

        // --- [SỬA LỖI TẠI ĐÂY] ---
        // Query qua quan hệ 'nguoidung' để tìm MA_DINHDANH
        $allStudents = Sinhvien::whereHas('nguoidung', function($q) {
            $q->where('MA_DINHDANH', 'like', 'SV_TEST_%');
        })->get();
        // -------------------------

        // Thêm SV vào bảng tham gia kế hoạch
        foreach ($allStudents as $sv) {
            SinhvienThamgia::firstOrCreate([
                'ID_KEHOACH' => $plan->ID_KEHOACH,
                'ID_SINHVIEN' => $sv->ID_SINHVIEN
            ], ['DU_DIEUKIEN' => true, 'NGAY_DANGKY' => now()]);
        }

        $studentIds = $allStudents->pluck('ID_NGUOIDUNG')->shuffle();
        $topics = Detai::where('ID_KEHOACH', $plan->ID_KEHOACH)->get();

        // Tạo 100 nhóm
        for ($i = 1; $i <= 100; $i++) {
            if ($studentIds->count() < 3) break;

            // Lấy 3 sinh viên
            $members = $studentIds->splice(0, 3);
            $leaderId = $members->first();

            $nhom = Nhom::create([
                'ID_KEHOACH' => $plan->ID_KEHOACH,
                'TEN_NHOM' => "Nhóm $i - " . $faker->colorName,
                'MOTA' => "Nhóm tự động số $i",
                'ID_NHOMTRUONG' => $leaderId,
                'SO_THANHVIEN_HIENTAI' => 3,
                'TRANGTHAI' => 'Đang thực hiện' // Đã có đề tài
            ]);

            // Gán thành viên
            foreach ($members as $memId) {
                ThanhvienNhom::create([
                    'ID_NHOM' => $nhom->ID_NHOM,
                    'ID_NGUOIDUNG' => $memId,
                    'NGAY_VAONHOM' => now()
                ]);
            }

            // Gán đề tài ngẫu nhiên
            if ($topics->isNotEmpty()) {
                $topic = $topics->random();
                PhancongDetaiNhom::create([
                    'ID_NHOM' => $nhom->ID_NHOM,
                    'ID_DETAI' => $topic->ID_DETAI,
                    'ID_GVHD' => $topic->ID_NGUOI_DEXUAT,
                    'TRANGTHAI' => 'Đang thực hiện'
                ]);
                // Cập nhật số lượng nhóm
                $topic->increment('SO_NHOM_HIENTAI');
            }
        }
    }
}