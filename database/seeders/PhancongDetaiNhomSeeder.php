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

        $plan = KehoachKhoaluan::where('TRANGTHAI', 'Đang thực hiện')->first();
        if (!$plan) {
            $this->command->warn("Không có kế hoạch 'Đang thực hiện' để phân công đề tài.");
            return;
        }

        // Nhóm 1 (Tên Lửa) đăng ký đề tài 1 (GradPro)
        $nhom1 = Nhom::where('TEN_NHOM', 'like', 'Nhóm Tên Lửa%')->first();
        $detai1 = Detai::where('MA_DETAI', 'KTPM25.001')->first();

        if ($nhom1 && $detai1 && $detai1->isAvailableForRegistration()) {
            PhancongDetaiNhom::create([
                'ID_NHOM' => $nhom1->ID_NHOM,
                'ID_DETAI' => $detai1->ID_DETAI,
                'ID_GVHD' => $detai1->ID_NGUOI_DEXUAT,
                'TRANGTHAI' => 'Đang thực hiện',
            ]);
            // Cập nhật trạng thái nhóm và số lượng của đề tài
            $nhom1->update(['TRANGTHAI' => 'Đang thực hiện']);
            $detai1->increment('SO_NHOM_HIENTAI');
        }

        // Nhóm 2 (Siêu Nhân) đăng ký đề tài 2 (IDS Snort)
        $nhom2 = Nhom::where('TEN_NHOM', 'like', 'Nhóm Siêu Nhân%')->first();
        $detai2 = Detai::where('MA_DETAI', 'MMT25.001')->first();

        if ($nhom2 && $detai2 && $detai2->isAvailableForRegistration()) {
            PhancongDetaiNhom::create([
                'ID_NHOM' => $nhom2->ID_NHOM,
                'ID_DETAI' => $detai2->ID_DETAI,
                'ID_GVHD' => $detai2->ID_NGUOI_DEXUAT,
                'TRANGTHAI' => 'Đang thực hiện',
            ]);
            // Cập nhật trạng thái nhóm và số lượng của đề tài
            $nhom2->update(['TRANGTHAI' => 'Đang thực hiện']);
            $detai2->increment('SO_NHOM_HIENTAI');
            // Đề tài này đã đủ 1/1, cập nhật trạng thái
            $detai2->update(['TRANGTHAI' => 'Đã đầy']);
        }
        
        // Nhóm 3 (Olympiad) sẽ không đăng ký đề tài để kiểm tra

        $this->command->info('Đã phân công đề tài cho các nhóm mẫu!');
    }
}