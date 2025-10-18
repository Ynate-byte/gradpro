<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Vaitro;
use App\Models\Nguoidung;
use App\Models\Sinhvien;
use App\Models\Giangvien;

class NguoidungSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Nguoidung::truncate();
        Sinhvien::truncate();
        Giangvien::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $adminRole = Vaitro::where('TEN_VAITRO', 'Admin')->first();
        if ($adminRole) {
            Nguoidung::create([
                'MA_DINHDANH' => 'ADMIN01',
                'EMAIL' => 'admin@gradpro.test',
                'MATKHAU_BAM' => Hash::make('123'),
                'HODEM_VA_TEN' => 'GradPro Admin',
                'ID_VAITRO' => $adminRole->ID_VAITRO,
                'TRANGTHAI_KICHHOAT' => true,
                'LA_DANGNHAP_LANDAU' => false,
                'DANGNHAP_CUOI' => now(), 
            ]);
        }

        Nguoidung::factory()->count(40)->asSinhVien()->create();
        Nguoidung::factory()->count(10)->asGiangVien()->create();

        Nguoidung::whereHas('vaitro', fn($q) => $q->where('TEN_VAITRO', 'Sinh viên'))
            ->inRandomOrder()
            ->limit(3)
            ->update(['DANGNHAP_CUOI' => null]);
            
        Nguoidung::whereHas('vaitro', fn($q) => $q->where('TEN_VAITRO', 'Sinh viên'))
            ->inRandomOrder()
            ->limit(2)
            ->update(['TRANGTHAI_KICHHOAT' => false]);
            
        $this->command->info('Đã tạo dữ liệu mẫu cho người dùng thành công!');
    }
}