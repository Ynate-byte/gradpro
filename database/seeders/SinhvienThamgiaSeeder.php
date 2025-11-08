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

        // Lấy cả kế hoạch 'Đang thực hiện' và 'Chờ duyệt chỉnh sửa'
        $activePlans = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Chờ duyệt chỉnh sửa'])->get();
        if ($activePlans->isEmpty()) {
            $this->command->warn("Không tìm thấy kế hoạch nào 'Đang thực hiện' hoặc 'Chờ duyệt chỉnh sửa' để thêm sinh viên.");
            return;
        }

        $allActiveStudents = Sinhvien::whereHas('nguoidung', fn($q) => $q->where('TRANGTHAI_KICHHOAT', true))->get();

        if ($allActiveStudents->count() < 30) {
            $this->command->warn("Không đủ sinh viên để tạo dữ liệu mẫu. Cần ít nhất 30 sinh viên.");
            return;
        }

        $studentChunks = $allActiveStudents->shuffle()->chunk(ceil($allActiveStudents->count() / $activePlans->count()));
        
        foreach ($activePlans as $index => $plan) {
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