<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\PhancongDetaiNhom;
use App\Models\Nhom;
use App\Models\Detai;
use App\Models\KehoachKhoaluan;

class PhancongDetaiNhomSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        PhancongDetaiNhom::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $plans = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Chờ duyệt chỉnh sửa'])->get();

        foreach ($plans as $plan) {
            $groups = Nhom::where('ID_KEHOACH', $plan->ID_KEHOACH)->get();
            $topics = Detai::where('ID_KEHOACH', $plan->ID_KEHOACH)->where('TRANGTHAI', 'Đã duyệt')->get();

            foreach ($groups as $group) {
                if (rand(1, 100) <= 70 && $topics->isNotEmpty()) {
                    $topic = $topics->random();
                    
                    if ($topic->SO_NHOM_HIENTAI < $topic->SO_NHOM_TOIDA) {
                        PhancongDetaiNhom::create([
                            'ID_NHOM' => $group->ID_NHOM,
                            'ID_DETAI' => $topic->ID_DETAI,
                            'ID_GVHD' => $topic->ID_NGUOI_DEXUAT,
                            'TRANGTHAI' => 'Đang thực hiện'
                        ]);
                        
                        $topic->increment('SO_NHOM_HIENTAI');
                        if ($topic->SO_NHOM_HIENTAI >= $topic->SO_NHOM_TOIDA) {
                            $topic->update(['TRANGTHAI' => 'Đã đầy']);
                        }
                        $group->update(['TRANGTHAI' => 'Đang thực hiện']);
                    }
                }
            }
        }
    }
}