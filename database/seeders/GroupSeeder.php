<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Nhom;
use App\Models\Nguoidung;
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

        // Lấy kế hoạch đang hoạt động
        $planInProgress = KehoachKhoaluan::where('TRANGTHAI', 'Đang thực hiện')->first();

        if (!$planInProgress) {
            $this->command->info('Không có kế hoạch nào đang hoạt động để tạo nhóm.');
            return;
        }

        // Lấy ID_NGUOIDUNG của các sinh viên tham gia kế hoạch này
        $studentUserIdsInPlan = $planInProgress->sinhvienThamgias()
            ->with('sinhvien')
            ->get()
            ->pluck('sinhvien.ID_NGUOIDUNG')
            ->shuffle();

        if ($studentUserIdsInPlan->count() < 10) {
            $this->command->info('Không đủ sinh viên trong kế hoạch để tạo dữ liệu mẫu cho nhóm.');
            return;
        }

        // --- Kịch bản 1: Tạo một nhóm chưa đủ thành viên ---
        $group1_leader = Nguoidung::find($studentUserIdsInPlan->pop());
        $group1 = Nhom::create([
            'ID_KEHOACH' => $planInProgress->ID_KEHOACH,
            'TEN_NHOM' => 'Nhóm Tên Lửa',
            'MOTA' => 'Nhóm còn thiếu thành viên, sẵn sàng kết nạp.',
            'ID_NHOMTRUONG' => $group1_leader->ID_NGUOIDUNG,
            'SO_THANHVIEN_HIENTAI' => 2,
        ]);
        ThanhvienNhom::create(['ID_NHOM' => $group1->ID_NHOM, 'ID_NGUOIDUNG' => $group1_leader->ID_NGUOIDUNG]);
        ThanhvienNhom::create(['ID_NHOM' => $group1->ID_NHOM, 'ID_NGUOIDUNG' => $studentUserIdsInPlan->pop()]);

        // --- Kịch bản 2: Tạo một nhóm đã đủ 4 thành viên ---
        $group2_leader = Nguoidung::find($studentUserIdsInPlan->pop());
        $group2 = Nhom::create([
            'ID_KEHOACH' => $planInProgress->ID_KEHOACH,
            'TEN_NHOM' => 'Nhóm Siêu Nhân',
            'MOTA' => 'Nhóm đã đủ thành viên.',
            'ID_NHOMTRUONG' => $group2_leader->ID_NGUOIDUNG,
            'SO_THANHVIEN_HIENTAI' => 4,
            'TRANGTHAI' => 'Đã đủ thành viên',
        ]);
        ThanhvienNhom::create(['ID_NHOM' => $group2->ID_NHOM, 'ID_NGUOIDUNG' => $group2_leader->ID_NGUOIDUNG]);
        ThanhvienNhom::create(['ID_NHOM' => $group2->ID_NHOM, 'ID_NGUOIDUNG' => $studentUserIdsInPlan->pop()]);
        ThanhvienNhom::create(['ID_NHOM' => $group2->ID_NHOM, 'ID_NGUOIDUNG' => $studentUserIdsInPlan->pop()]);
        ThanhvienNhom::create(['ID_NHOM' => $group2->ID_NHOM, 'ID_NGUOIDUNG' => $studentUserIdsInPlan->pop()]);

        // --- Kịch bản 3: Tạo một nhóm đặc biệt (chưa đủ thành viên) ---
        $group3_leader = Nguoidung::find($studentUserIdsInPlan->pop());
        $group3 = Nhom::create([
            'ID_KEHOACH' => $planInProgress->ID_KEHOACH,
            'TEN_NHOM' => 'Nhóm Olympiad',
            'MOTA' => 'Nhóm đặc biệt được giáo vụ tạo sẵn.',
            'ID_NHOMTRUONG' => $group3_leader->ID_NGUOIDUNG,
            'SO_THANHVIEN_HIENTAI' => 2,
            'LA_NHOM_DACBIET' => true,
        ]);
        ThanhvienNhom::create(['ID_NHOM' => $group3->ID_NHOM, 'ID_NGUOIDUNG' => $group3_leader->ID_NGUOIDUNG]);
        ThanhvienNhom::create(['ID_NHOM' => $group3->ID_NHOM, 'ID_NGUOIDUNG' => $studentUserIdsInPlan->pop()]);
        
        $this->command->info('Đã tạo dữ liệu mẫu cho các nhóm thành công!');
    }
}