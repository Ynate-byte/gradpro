<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('123456');
        
        DB::table('NGUOIDUNG')->insert([
            'MA_DINHDANH' => 'ADMIN',
            'EMAIL' => 'admin@gradpro.edu.vn',
            'MATKHAU_BAM' => $password,
            'HODEM_VA_TEN' => 'Quản Trị Viên',
            'ID_VAITRO' => 1,
            'TRANGTHAI_KICHHOAT' => true,
            'LA_DANGNHAP_LANDAU' => false,
            'NGAYTAO' => now()
        ]);

        $tkId = DB::table('NGUOIDUNG')->insertGetId([
            'MA_DINHDANH' => 'TRUONGKHOA',
            'EMAIL' => 'truongkhoa@gradpro.edu.vn',
            'MATKHAU_BAM' => $password,
            'HODEM_VA_TEN' => 'TS. Nguyễn Văn Trưởng Khoa',
            'ID_VAITRO' => 2,
            'TRANGTHAI_KICHHOAT' => true,
            'LA_DANGNHAP_LANDAU' => false,
            'NGAYTAO' => now()
        ]);
        
        // Gắn profile Giảng viên
        // Lấy ID khoa đầu tiên để gán (tạm)
        $khoaId = DB::table('KHOA_BOMON')->first()->ID_KHOA_BOMON ?? 1;
        $tkProfileId = DB::table('GIANGVIEN')->insertGetId([
            'ID_NGUOIDUNG' => $tkId,
            'ID_KHOA_BOMON' => $khoaId,
            'HOCVI' => 'Tiến sĩ'
        ]);
        
        // Gắn chức vụ TRUONG_KHOA
        $chucVuTK = DB::table('CHUCVU')->where('MA_CHUCVU', 'TRUONG_KHOA')->value('ID_CHUCVU');
        DB::table('GIANGVIEN_CHUCVU')->insert(['ID_GIANGVIEN' => $tkProfileId, 'ID_CHUCVU' => $chucVuTK]);


        // 3. Tạo Giáo Vụ (Vai trò là GV + Chức vụ Giáo vụ)
        $gvId = DB::table('NGUOIDUNG')->insertGetId([
            'MA_DINHDANH' => 'GIAOVU',
            'EMAIL' => 'giaovu@gradpro.edu.vn',
            'MATKHAU_BAM' => $password,
            'HODEM_VA_TEN' => 'Cô Lê Thị Giáo Vụ',
            'ID_VAITRO' => 2, // Giảng viên
            'TRANGTHAI_KICHHOAT' => true,
            'LA_DANGNHAP_LANDAU' => false,
            'NGAYTAO' => now()
        ]);

        $gvProfileId = DB::table('GIANGVIEN')->insertGetId([
            'ID_NGUOIDUNG' => $gvId,
            'ID_KHOA_BOMON' => $khoaId,
            'HOCVI' => 'Thạc sĩ'
        ]);

        $chucVuGV = DB::table('CHUCVU')->where('MA_CHUCVU', 'GIAO_VU')->value('ID_CHUCVU');
        DB::table('GIANGVIEN_CHUCVU')->insert(['ID_GIANGVIEN' => $gvProfileId, 'ID_CHUCVU' => $chucVuGV]);
    }
}