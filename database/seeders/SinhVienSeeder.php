<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Faker\Factory as Faker;

class SinhVienSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('vi_VN');
        $password = Hash::make('123');

        $chuyenNganhs = DB::table('CHUYENNGANH')->get();

        $count = 1;
        foreach ($chuyenNganhs as $cn) {
            for ($i = 1; $i <= 50; $i++) {
                $name = $faker->lastName . ' ' . $faker->middleName . ' ' . $faker->firstName;
                $mssv = '2001' . str_pad($count++, 5, '0', STR_PAD_LEFT);
                $email = $mssv . '@st.gradpro.edu.vn';

                $userId = DB::table('NGUOIDUNG')->insertGetId([
                    'MA_DINHDANH' => $mssv,
                    'EMAIL' => $email,
                    'MATKHAU_BAM' => $password,
                    'HODEM_VA_TEN' => $name,
                    'NGAYSINH' => $faker->date('Y-m-d', '2003-12-31'),
                    'SO_DIENTHOAI' => $faker->numerify('09########'),
                    'ID_VAITRO' => 3,
                    'TRANGTHAI_KICHHOAT' => true,
                    'LA_DANGNHAP_LANDAU' => true,
                    'NGAYTAO' => now()
                ]);

                DB::table('SINHVIEN')->insert([
                    'ID_NGUOIDUNG' => $userId,
                    'ID_CHUYENNGANH' => $cn->ID_CHUYENNGANH,
                    'TEN_LOP' => 'DH13' . substr($cn->MA_CHUYENNGANH, 3),
                    'NIENKHOA' => '2021-2025',
                    'HEDAOTAO' => 'Cử nhân'
                ]);
            }
        }
    }
}