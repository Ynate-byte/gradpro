<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\KehoachKhoaluan;
use App\Models\Sinhvien;
use App\Models\SinhvienThamgia;

class SinhvienThamgiaSeeder extends Seeder
{
    public function run(): void
    {
        SinhvienThamgia::query()->delete();

        // Lấy kế hoạch đang thực hiện
        $planInProgress = KehoachKhoaluan::where('TRANGTHAI', 'Đang thực hiện')->first();

        if ($planInProgress) {
            // Lấy 30 sinh viên đang hoạt động để cho tham gia
            $students = Sinhvien::whereHas('nguoidung', function ($q) {
                $q->where('TRANGTHAI_KICHHOAT', true);
            })->inRandomOrder()->limit(30)->get();

            $dataToInsert = [];
            foreach ($students as $student) {
                $dataToInsert[] = [
                    'ID_KEHOACH' => $planInProgress->ID_KEHOACH,
                    'ID_SINHVIEN' => $student->ID_SINHVIEN,
                    'DU_DIEUKIEN' => true,
                    'NGAY_DANGKY' => now(),
                ];
            }
            SinhvienThamgia::insert($dataToInsert);

            $this->command->info("Đã thêm " . count($dataToInsert) . " sinh viên vào kế hoạch đang thực hiện.");
        } else {
            $this->command->warn("Không tìm thấy kế hoạch nào 'Đang thực hiện' để thêm sinh viên.");
        }
    }
}