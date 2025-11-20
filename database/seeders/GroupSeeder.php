<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Nhom;
use App\Models\ThanhvienNhom;
use App\Models\KehoachKhoaluan;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class GroupSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Nhom::truncate();
        ThanhvienNhom::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $faker = Faker::create('vi_VN');
        $activePlans = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Chờ duyệt chỉnh sửa'])->get();

        if ($activePlans->isEmpty()) {
            return;
        }

        foreach ($activePlans as $plan) {
            $studentUserIdsInPlan = $plan->sinhvienThamgias()
                ->with('sinhvien')
                ->get()
                ->pluck('sinhvien.ID_NGUOIDUNG')
                ->shuffle();

            if ($studentUserIdsInPlan->count() < 2) continue;

            $studentsToGroup = $studentUserIdsInPlan->splice(0, floor($studentUserIdsInPlan->count() * 0.8));

            while ($studentsToGroup->count() >= 2) {
                $size = rand(2, 4);
                if ($studentsToGroup->count() < $size) $size = $studentsToGroup->count();
                
                $members = $studentsToGroup->splice(0, $size);
                $leaderId = $members->pop();
                
                $group = Nhom::create([
                    'ID_KEHOACH' => $plan->ID_KEHOACH,
                    'TEN_NHOM' => 'Nhóm ' . $faker->unique()->regexify('[A-Z]{2}[0-9]{3}') . ' - ' . $faker->colorName,
                    'MOTA' => $faker->sentence(),
                    'ID_NHOMTRUONG' => $leaderId,
                    'SO_THANHVIEN_HIENTAI' => $size,
                    'TRANGTHAI' => ($size >= 4) ? 'Đã đủ thành viên' : 'Đang mở',
                ]);
                
                ThanhvienNhom::create(['ID_NHOM' => $group->ID_NHOM, 'ID_NGUOIDUNG' => $leaderId, 'NGAY_VAONHOM' => now()]);
                
                foreach ($members as $memId) {
                    ThanhvienNhom::create(['ID_NHOM' => $group->ID_NHOM, 'ID_NGUOIDUNG' => $memId, 'NGAY_VAONHOM' => now()]);
                }
            }
        }
    }
}