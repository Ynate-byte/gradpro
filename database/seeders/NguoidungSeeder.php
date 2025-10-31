<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Vaitro;
use App\Models\Nguoidung;
use App\Models\Sinhvien;
use App\Models\Giangvien;
use App\Models\KhoaBomon;
use App\Models\Chuyennganh; // <-- Thêm Chuyennganh

class NguoidungSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        // Truncate theo thứ tự phụ thuộc ngược
        Giangvien::truncate();
        Sinhvien::truncate();
        Nguoidung::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Lấy ID vai trò
        $adminRole = Vaitro::where('TEN_VAITRO', 'Admin')->first();
        $gvRole = Vaitro::where('TEN_VAITRO', 'Giảng viên')->first();
        $svRole = Vaitro::where('TEN_VAITRO', 'Sinh viên')->first();
        $giaoVuRole = Vaitro::where('TEN_VAITRO', 'Giáo vụ')->first();
        $truongKhoaRole = Vaitro::where('TEN_VAITRO', 'Trưởng khoa')->first();
        
        // Lấy ID Khoa/BM
        $khoaCntt = KhoaBomon::where('MA_KHOA_BOMON', 'K.CNTT')->first();
        $bmCnpm = KhoaBomon::where('MA_KHOA_BOMON', 'BM.CNPM')->first();
        $bmHttt = KhoaBomon::where('MA_KHOA_BOMON', 'BM.HTTT')->first();

        // 1. Tạo Admin
        if ($adminRole) {
            Nguoidung::create([
                'MA_DINHDANH' => 'ADMIN01',
                'EMAIL' => 'admin@gradpro.test',
                'MATKHAU_BAM' => Hash::make('123'),
                'HODEM_VA_TEN' => 'Quản Trị Viên',
                'ID_VAITRO' => $adminRole->ID_VAITRO,
                'TRANGTHAI_KICHHOAT' => true,
                'LA_DANGNHAP_LANDAU' => false,
                'DANGNHAP_CUOI' => now(),
            ]);
        }

        // 2. Tạo Trưởng khoa (Giả sử Trưởng khoa cũng là Giảng viên)
        if ($truongKhoaRole && $khoaCntt) {
            $truongKhoaUser = Nguoidung::create([
                'MA_DINHDANH' => 'TK.CNTT',
                'EMAIL' => 'truong.khoa@gradpro.test',
                'MATKHAU_BAM' => Hash::make('123'),
                'HODEM_VA_TEN' => 'Phạm Văn Hiếu',
                'ID_VAITRO' => $truongKhoaRole->ID_VAITRO, // Vai trò chính
                'TRANGTHAI_KICHHOAT' => true,
                'LA_DANGNHAP_LANDAU' => false,
            ]);
            Giangvien::create([
                'ID_NGUOIDUNG' => $truongKhoaUser->ID_NGUOIDUNG,
                'ID_KHOA_BOMON' => $khoaCntt->ID_KHOA_BOMON,
                'HOCVI' => 'Tiến sĩ',
                'CHUCVU' => 'Trưởng khoa' // Chức vụ
            ]);
        }

        // 3. Tạo Giáo vụ (Giả sử Giáo vụ cũng là Giảng viên)
        if ($giaoVuRole && $khoaCntt) {
            $giaoVuUser = Nguoidung::create([
                'MA_DINHDANH' => 'GVU.CNTT',
                'EMAIL' => 'giao.vu@gradpro.test',
                'MATKHAU_BAM' => Hash::make('123'),
                'HODEM_VA_TEN' => 'Trần Thị Thu Hà',
                'ID_VAITRO' => $giaoVuRole->ID_VAITRO, // Vai trò chính
                'TRANGTHAI_KICHHOAT' => true,
                'LA_DANGNHAP_LANDAU' => false,
            ]);
            Giangvien::create([
                'ID_NGUOIDUNG' => $giaoVuUser->ID_NGUOIDUNG,
                'ID_KHOA_BOMON' => $khoaCntt->ID_KHOA_BOMON,
                'HOCVI' => 'Thạc sĩ',
                'CHUCVU' => 'Giáo vụ' // Chức vụ
            ]);
        }
        
        // 4. Tạo Giảng viên thường
        
        // ----- SỬA LỖI: Sử dụng asGiangVien() và update() -----
        if ($gvRole && $bmCnpm) {
             $gv1 = Nguoidung::factory()->asGiangVien()->create([ // Tạo Nguoidung + Giangvien (ngẫu nhiên)
                'HODEM_VA_TEN' => 'Nguyễn Văn Hùng',
                'EMAIL' => 'gv.hungnv@gradpro.test',
                'ID_VAITRO' => $gvRole->ID_VAITRO,
                'MA_DINHDANH' => 'GV001',
             ]);
             // Cập nhật lại record Giangvien vừa tạo ngẫu nhiên
             $gv1->giangvien()->update([
                'ID_KHOA_BOMON' => $bmCnpm->ID_KHOA_BOMON,
                'HOCVI' => 'Thạc sĩ'
             ]);
        }
        
        if ($gvRole && $bmHttt) {
             $gv2 = Nguoidung::factory()->asGiangVien()->create([ // Tạo Nguoidung + Giangvien (ngẫu nhiên)
                'HODEM_VA_TEN' => 'Lê Thị Bích',
                'EMAIL' => 'gv.bichlt@gradpro.test',
                'ID_VAITRO' => $gvRole->ID_VAITRO,
                'MA_DINHDANH' => 'GV002',
             ]);
             // Cập nhật lại record Giangvien vừa tạo ngẫu nhiên
             $gv2->giangvien()->update([
                'ID_KHOA_BOMON' => $bmHttt->ID_KHOA_BOMON,
                'HOCVI' => 'Tiến sĩ'
             ]);
        }
        // ----- KẾT THÚC SỬA LỖI -----
        
        // Tạo thêm 8 Giảng viên ngẫu nhiên
        Nguoidung::factory()->count(8)->asGiangVien()->create();

        // 5. Tạo Sinh viên
        Nguoidung::factory()->count(40)->asSinhVien()->create();
        
        // Tạo một số SV cụ thể
         if ($svRole) {
             Nguoidung::factory()->asSinhVien()->create([
                 'HODEM_VA_TEN' => 'Trần Văn An',
                 'EMAIL' => 'sv.antv@gradpro.test',
                 'MA_DINHDANH' => '200120001',
             ]);
             Nguoidung::factory()->asSinhVien()->create([
                 'HODEM_VA_TEN' => 'Nguyễn Thị Bình',
                 'EMAIL' => 'sv.binhnt@gradpro.test',
                 'MA_DINHDANH' => '200120002',
             ]);
             Nguoidung::factory()->asSinhVien()->create([
                 'HODEM_VA_TEN' => 'Lê Minh Cường',
                 'EMAIL' => 'sv.cuonglm@gradpro.test',
                 'MA_DINHDANH' => '200120003',
             ]);
         }


        // Cập nhật trạng thái cho một số SV
        Nguoidung::whereHas('vaitro', fn($q) => $q->where('TEN_VAITRO', 'Sinh viên'))
            ->inRandomOrder()
            ->limit(3)
            ->update(['DANGNHAP_CUOI' => null]);
            
        Nguoidung::whereHas('vaitro', fn($q) => $q->where('TEN_VAITRO', 'Sinh viên'))
            ->inRandomOrder()
            ->limit(2)
            ->update(['TRANGTHAI_KICHHOAT' => false]);
            
        $this->command->info('Đã tạo dữ liệu mẫu cho người dùng (Admin, Trưởng khoa, Giáo vụ, GV, SV)!');
    }
}