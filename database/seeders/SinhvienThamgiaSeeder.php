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

        $activePlans = KehoachKhoaluan::where('TRANGTHAI', 'Đang thực hiện')->get();
        if ($activePlans->isEmpty()) return;

        $students = Sinhvien::all();
        if ($students->count() < 10) return;

        $chunks = $students->chunk(ceil($students->count() / $activePlans->count()));

        foreach ($activePlans as $index => $plan) {
            $planStudents = $chunks->get($index);
            if (!$planStudents) continue;

            $data = [];
            foreach ($planStudents as $sv) {
                $data[] = [
                    'ID_KEHOACH' => $plan->ID_KEHOACH,
                    'ID_SINHVIEN' => $sv->ID_SINHVIEN,
                    'DU_DIEUKIEN' => true,
                    'NGAY_DANGKY' => now(),
                ];
            }
            SinhvienThamgia::insert($data);
        }
    }
}