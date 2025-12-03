<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Faker\Factory as Faker;
use Illuminate\Support\Str;

class SinhVienSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('vi_VN');
        $password = Hash::make('123456');

        $chuyenNganhs = DB::table('CHUYENNGANH')->get();

        foreach ($chuyenNganhs as $cn) {
            for ($i = 1; $i <= 10; $i++) {
                $name = $faker->firstName . ' ' . $faker->middleName . ' ' . $faker->lastName;
                
                $mssv = 'SV' . $cn->MA_CHUYENNGANH . str_pad($i, 3, '0', STR_PAD_LEFT); 
                
                $email = strtolower($mssv) . '@st.gradpro.edu.vn';

                $userId = DB::table('NGUOIDUNG')->insertGetId([
                    'MA_DINHDANH' => $mssv,
                    'EMAIL' => $email,
                    'MATKHAU_BAM' => $password,
                    'HODEM_VA_TEN' => $name,
                    'NGAYSINH' => $faker->date('Y-m-d', '2003-12-31'),
                    'SO_DIENTHOAI' => $faker->numerify('09########'),
                    'ID_VAITRO' => 3, // Sinh viên
                    'LA_DANGNHAP_LANDAU' => true,
                    'TRANGTHAI_KICHHOAT' => true,
                    'NGAYTAO' => now()
                ]);

                DB::table('SINHVIEN')->insert([
                    'ID_NGUOIDUNG' => $userId,
                    'ID_CHUYENNGANH' => $cn->ID_CHUYENNGANH,
                    'TEN_LOP' => 'D21_' . $cn->MA_CHUYENNGANH . '_01',
                    'NIENKHOA' => '2021-2025',
                    'HEDAOTAO' => 'Cử nhân'
                ]);
            }
        }
    }
}