<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Vaitro;
use App\Models\Nguoidung;

class NguoidungSeeder extends Seeder
{
    public function run(): void
    {
        // Tắt kiểm tra khóa ngoại để xóa dữ liệu sạch sẽ
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('NGUOIDUNG')->where('EMAIL', '!=', 'admin@gradpro.test')->delete();
        Nguoidung::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Tạo tài khoản Admin mặc định
        $adminRole = Vaitro::where('TEN_VAITRO', 'Admin')->first();
        if ($adminRole && !Nguoidung::where('EMAIL', 'admin@gradpro.test')->exists()) {
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

        // Tạo 40 sinh viên và 10 giảng viên bằng Factory
        Nguoidung::factory()->count(40)->asSinhVien()->create();
        Nguoidung::factory()->count(10)->asGiangVien()->create();

        // Cập nhật một vài sinh viên để thử nghiệm các trường hợp đặc biệt
        // 3 sinh viên chưa từng đăng nhập
        Nguoidung::whereHas('vaitro', fn($q) => $q->where('TEN_VAITRO', 'Sinh viên'))
            ->inRandomOrder()
            ->limit(3)
            ->update(['DANGNHAP_CUOI' => null]);
            
        // 2 sinh viên bị vô hiệu hóa
        Nguoidung::whereHas('vaitro', fn($q) => $q->where('TEN_VAITRO', 'Sinh viên'))
            ->inRandomOrder()
            ->limit(2)
            ->update(['TRANGTHAI_KICHHOAT' => false]);
            
        $this->command->info('Đã tạo dữ liệu mẫu cho người dùng thành công!');
    }
}