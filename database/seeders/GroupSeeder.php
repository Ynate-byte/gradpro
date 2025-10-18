<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Nhom;
use App\Models\ThanhvienNhom;
use App\Models\KehoachKhoaluan;
use Illuminate\Support\Facades\DB;

class GroupSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Nhom::truncate();
        ThanhvienNhom::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $inProgressPlans = KehoachKhoaluan::where('TRANGTHAI', 'Đang thực hiện')->get();

        if ($inProgressPlans->isEmpty()) {
            $this->command->info('Không có kế hoạch nào đang hoạt động để tạo nhóm.');
            return;
        }

        foreach ($inProgressPlans as $plan) {
            $this->command->info("Đang tạo nhóm cho kế hoạch: '{$plan->TEN_DOT}'...");

            $studentUserIdsInPlan = $plan->sinhvienThamgias()
                ->with('sinhvien')
                ->get()
                ->pluck('sinhvien.ID_NGUOIDUNG')
                ->shuffle();

            if ($studentUserIdsInPlan->count() < 8) {
                $this->command->warn("  -> Không đủ sinh viên trong kế hoạch '{$plan->TEN_DOT}' để tạo nhóm mẫu (cần ít nhất 8). Bỏ qua.");
                continue;
            }
            
            $studentsToGroup = $studentUserIdsInPlan->splice(0, floor($studentUserIdsInPlan->count() / 2));

            if ($studentsToGroup->count() >= 2) {
                $group1_leader_id = $studentsToGroup->pop();
                $group1 = Nhom::create([
                    'ID_KEHOACH' => $plan->ID_KEHOACH,
                    'TEN_NHOM' => "Nhóm Tên Lửa - {$plan->KHOAHOC}",
                    'MOTA' => 'Nhóm còn thiếu thành viên, sẵn sàng kết nạp.',
                    'ID_NHOMTRUONG' => $group1_leader_id,
                    'SO_THANHVIEN_HIENTAI' => 2,
                ]);
                ThanhvienNhom::insert([
                    ['ID_NHOM' => $group1->ID_NHOM, 'ID_NGUOIDUNG' => $group1_leader_id, 'NGAY_VAONHOM' => now()],
                    ['ID_NHOM' => $group1->ID_NHOM, 'ID_NGUOIDUNG' => $studentsToGroup->pop(), 'NGAY_VAONHOM' => now()],
                ]);
            }

            if ($studentsToGroup->count() >= 4) {
                $group2_leader_id = $studentsToGroup->pop();
                $group2 = Nhom::create([
                    'ID_KEHOACH' => $plan->ID_KEHOACH,
                    'TEN_NHOM' => "Nhóm Siêu Nhân - {$plan->KHOAHOC}",
                    'MOTA' => 'Nhóm đã đủ thành viên.',
                    'ID_NHOMTRUONG' => $group2_leader_id,
                    'SO_THANHVIEN_HIENTAI' => 4,
                    'TRANGTHAI' => 'Đã đủ thành viên',
                ]);
                ThanhvienNhom::insert([
                    ['ID_NHOM' => $group2->ID_NHOM, 'ID_NGUOIDUNG' => $group2_leader_id, 'NGAY_VAONHOM' => now()],
                    ['ID_NHOM' => $group2->ID_NHOM, 'ID_NGUOIDUNG' => $studentsToGroup->pop(), 'NGAY_VAONHOM' => now()],
                    ['ID_NHOM' => $group2->ID_NHOM, 'ID_NGUOIDUNG' => $studentsToGroup->pop(), 'NGAY_VAONHOM' => now()],
                    ['ID_NHOM' => $group2->ID_NHOM, 'ID_NGUOIDUNG' => $studentsToGroup->pop(), 'NGAY_VAONHOM' => now()],
                ]);
            }

            if ($studentsToGroup->count() >= 3) {
                 $group3_leader_id = $studentsToGroup->pop();
                 $group3 = Nhom::create([
                    'ID_KEHOACH' => $plan->ID_KEHOACH,
                    'TEN_NHOM' => "Nhóm Olympiad - {$plan->KHOAHOC}",
                    'MOTA' => 'Nhóm đặc biệt được giáo vụ tạo sẵn.',
                    'ID_NHOMTRUONG' => $group3_leader_id,
                    'SO_THANHVIEN_HIENTAI' => 3,
                    'LA_NHOM_DACBIET' => true,
                ]);
                ThanhvienNhom::insert([
                    ['ID_NHOM' => $group3->ID_NHOM, 'ID_NGUOIDUNG' => $group3_leader_id, 'NGAY_VAONHOM' => now()],
                    ['ID_NHOM' => $group3->ID_NHOM, 'ID_NGUOIDUNG' => $studentsToGroup->pop(), 'NGAY_VAONHOM' => now()],
                    ['ID_NHOM' => $group3->ID_NHOM, 'ID_NGUOIDUNG' => $studentsToGroup->pop(), 'NGAY_VAONHOM' => now()],
                ]);
            }
            $this->command->info("  -> Đã tạo xong các nhóm mẫu.");
        }
        $this->command->info('Hoàn tất tạo dữ liệu mẫu cho nhóm!');
    }
}