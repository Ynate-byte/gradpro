<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Nguoidung;
use App\Models\Sinhvien;
use App\Models\Giangvien;
use App\Models\KhoaBomon;
use App\Models\Chuyennganh;
use Illuminate\Support\Facades\Hash;
use Faker\Factory as Faker;

class LargeScaleUserSeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create('vi_VN');
        $password = Hash::make('123456');
        $khoaIds = KhoaBomon::pluck('ID_KHOA_BOMON')->toArray();
        $cnIds = Chuyennganh::pluck('ID_CHUYENNGANH')->toArray();

        // 1. Tạo 50 Giảng viên
        $gvData = [];
        for ($i = 0; $i < 50; $i++) {
            $user = Nguoidung::create([
                'MA_DINHDANH' => 'GV_TEST_' . str_pad($i, 3, '0', STR_PAD_LEFT),
                'EMAIL' => "gv.test.{$i}@gradpro.edu.vn",
                'MATKHAU_BAM' => $password,
                'HODEM_VA_TEN' => $faker->lastName . ' ' . $faker->middleName . ' ' . $faker->firstName,
                'NGAYSINH' => $faker->date('Y-m-d', '1990-01-01'),
                'ID_VAITRO' => 2, // Giảng viên
                'TRANGTHAI_KICHHOAT' => true,
            ]);

            Giangvien::create([
                'ID_NGUOIDUNG' => $user->ID_NGUOIDUNG,
                'ID_KHOA_BOMON' => $faker->randomElement($khoaIds),
                'HOCVI' => $faker->randomElement(['Thạc sĩ', 'Tiến sĩ']),
                'SO_NHOM_TOIDA' => 10 // Cho phép hướng dẫn nhiều để test
            ]);
        }

        // 2. Tạo 350 Sinh viên (Để đủ cho 100 nhóm x 3 người + dư)
        for ($i = 0; $i < 350; $i++) {
            $user = Nguoidung::create([
                'MA_DINHDANH' => 'SV_TEST_' . str_pad($i, 4, '0', STR_PAD_LEFT),
                'EMAIL' => "sv.test.{$i}@gradpro.edu.vn",
                'MATKHAU_BAM' => $password,
                'HODEM_VA_TEN' => $faker->lastName . ' ' . $faker->middleName . ' ' . $faker->firstName,
                'NGAYSINH' => $faker->date('Y-m-d', '2003-01-01'),
                'ID_VAITRO' => 3, // Sinh viên
                'TRANGTHAI_KICHHOAT' => true,
            ]);

            Sinhvien::create([
                'ID_NGUOIDUNG' => $user->ID_NGUOIDUNG,
                'ID_CHUYENNGANH' => $faker->randomElement($cnIds),
                'TEN_LOP' => '13DHTH_TEST',
                'NIENKHOA' => '2021-2025',
                'HEDAOTAO' => 'Cử nhân'
            ]);
        }
    }
}