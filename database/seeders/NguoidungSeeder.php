<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Vaitro;
use App\Models\Nguoidung; // Import Nguoidung model

class NguoidungSeeder extends Seeder
{
    public function run(): void
    {
        // Xóa người dùng cũ để tránh trùng lặp khi seed lại
        DB::table('NGUOIDUNG')->where('EMAIL', '!=', 'admin@gradpro.test')->delete();

        // Tạo tài khoản Admin mặc định
        $adminRole = Vaitro::where('TEN_VAITRO', 'Admin')->first();
        if (!Nguoidung::where('EMAIL', 'admin@gradpro.test')->exists()) {
            DB::table('NGUOIDUNG')->insert([
                'MA_DINHDANH' => 'ADMIN01',
                'EMAIL' => 'admin@gradpro.test',
                'MATKHAU_BAM' => Hash::make('123'),
                'HODEM_VA_TEN' => 'GradPro Admin',
                'ID_VAITRO' => $adminRole->ID_VAITRO,
            ]);
        }

        // Tạo dữ liệu mẫu bằng Factory
        Nguoidung::factory()->count(20)->asSinhVien()->create();
        Nguoidung::factory()->count(5)->asGiangVien()->create();
    }
}