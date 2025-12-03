<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('123');

        DB::table('NGUOIDUNG')->insert([
            'MA_DINHDANH' => 'ADMIN01',
            'EMAIL' => 'admin@gradpro.test',
            'MATKHAU_BAM' => $password,
            'HODEM_VA_TEN' => 'Quản Trị Viên',
            'NGAYSINH' => '1990-01-01',
            'ID_VAITRO' => 1,
            'TRANGTHAI_KICHHOAT' => true,
            'LA_DANGNHAP_LANDAU' => false,
            'NGAYTAO' => now()
        ]);

        $gvId = DB::table('NGUOIDUNG')->insertGetId([
            'MA_DINHDANH' => 'GVU.CNTT',
            'EMAIL' => 'giao.vu@gradpro.test',
            'MATKHAU_BAM' => $password,
            'HODEM_VA_TEN' => 'Trần Thị Thu Hà (Giáo vụ)',
            'NGAYSINH' => '1995-05-10',
            'ID_VAITRO' => 2,
            'TRANGTHAI_KICHHOAT' => true,
            'LA_DANGNHAP_LANDAU' => false,
            'NGAYTAO' => now()
        ]);

        $boMonId = DB::table('KHOA_BOMON')->first()->ID_KHOA_BOMON;
        
        $gvProfileId = DB::table('GIANGVIEN')->insertGetId([
            'ID_NGUOIDUNG' => $gvId,
            'ID_KHOA_BOMON' => $boMonId,
            'HOCVI' => 'Thạc sĩ',
            'SO_NHOM_TOIDA' => 0
        ]);

        $chucVuId = DB::table('CHUCVU')->where('MA_CHUCVU', 'GIAO_VU')->value('ID_CHUCVU');
        DB::table('GIANGVIEN_CHUCVU')->insert([
            'ID_GIANGVIEN' => $gvProfileId,
            'ID_CHUCVU' => $chucVuId
        ]);
    }
}