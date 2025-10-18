<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\KehoachKhoaluan;
use App\Models\Sinhvien;
use App\Models\SinhvienThamgia;
use Illuminate\Support\Facades\DB;

class SinhvienThamgiaSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('SINHVIEN_THAMGIA')->delete();

        $inProgressPlans = KehoachKhoaluan::where('TRANGTHAI', 'Đang thực hiện')->get();
        if ($inProgressPlans->isEmpty()) {
            $this->command->warn("Không tìm thấy kế hoạch nào 'Đang thực hiện' để thêm sinh viên.");
            return;
        }

        $allActiveStudents = Sinhvien::whereHas('nguoidung', fn($q) => $q->where('TRANGTHAI_KICHHOAT', true))->get();

        if ($allActiveStudents->count() < 30) {
            $this->command->warn("Không đủ sinh viên để tạo dữ liệu mẫu. Cần ít nhất 30 sinh viên.");
            return;
        }

        $studentChunks = $allActiveStudents->shuffle()->chunk(ceil($allActiveStudents->count() / $inProgressPlans->count()));
        
        foreach ($inProgressPlans as $index => $plan) {
            $studentsForThisPlan = $studentChunks->get($index);
            if (!$studentsForThisPlan) continue;

            $dataToInsert = [];
            foreach ($studentsForThisPlan as $student) {
                $dataToInsert[] = [
                    'ID_KEHOACH' => $plan->ID_KEHOACH,
                    'ID_SINHVIEN' => $student->ID_SINHVIEN,
                    'DU_DIEUKIEN' => true,
                    'NGAY_DANGKY' => now(),
                ];
            }
            SinhvienThamgia::insert($dataToInsert);

            $this->command->info("Đã thêm " . count($dataToInsert) . " sinh viên vào kế hoạch: '{$plan->TEN_DOT}'.");
        }
    }
}