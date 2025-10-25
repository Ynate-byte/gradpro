<?php

namespace Database\Factories;

use App\Models\Nguoidung;
use App\Models\Vaitro;
use App\Models\Chuyennganh;
use App\Models\KhoaBomon;
use App\Models\Sinhvien;
use App\Models\Giangvien;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

class NguoidungFactory extends Factory
{
    protected $model = Nguoidung::class;

    public function definition(): array
    {
        return [
            'HODEM_VA_TEN' => $this->faker->name(),
            'EMAIL' => $this->faker->unique()->safeEmail(),
            'MATKHAU_BAM' => Hash::make('123'), // Mật khẩu mặc định
            'LA_DANGNHAP_LANDAU' => true,
            'TRANGTHAI_KICHHOAT' => true,
        ];
    }

    /**
     * Cấu hình state cho Sinh viên
     */
    public function asSinhVien(): Factory
    {
        return $this->state(function (array $attributes) {
            $sinhVienRole = Vaitro::where('TEN_VAITRO', 'Sinh viên')->first();
            return [
                'ID_VAITRO' => $sinhVienRole->ID_VAITRO,
                'MA_DINHDANH' => '2001' . $this->faker->unique()->numberBetween(200000, 229999),
            ];
        })->afterCreating(function (Nguoidung $nguoidung) {
            Sinhvien::create([
                'ID_NGUOIDUNG' => $nguoidung->ID_NGUOIDUNG,
                'ID_CHUYENNGANH' => Chuyennganh::query()->inRandomOrder()->first()->ID_CHUYENNGANH,
                'TEN_LOP' => 'DH' . $this->faker->numberBetween(20, 22) . 'CNTT' . $this->faker->numberBetween(1, 5),
                'NIENKHOA' => 'K' . $this->faker->numberBetween(12, 14),
                'HEDAOTAO' => $this->faker->randomElement(['Cử nhân', 'Kỹ sư']),
            ]);
        });
    }

    /**
     * Cấu hình state cho Giảng viên
     */
    public function asGiangVien(): Factory
    {
        return $this->state(function (array $attributes) {
            $giangVienRole = Vaitro::where('TEN_VAITRO', 'Giảng viên')->first();
            return [
                'ID_VAITRO' => $giangVienRole->ID_VAITRO,
                'MA_DINHDANH' => 'GV' . $this->faker->unique()->numberBetween(100, 999),
            ];
        })->afterCreating(function (Nguoidung $nguoidung) {
            Giangvien::create([
                'ID_NGUOIDUNG' => $nguoidung->ID_NGUOIDUNG,
                'ID_KHOA_BOMON' => KhoaBomon::query()->inRandomOrder()->first()->ID_KHOA_BOMON,
                'HOCVI' => $this->faker->randomElement(['Thạc sĩ', 'Tiến sĩ']),
            ]);
        });
    }
}