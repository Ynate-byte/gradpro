<?php

namespace Database\Factories;

use App\Models\Nguoidung;
use App\Models\Vaitro;
use App\Models\Chuyennganh;
use App\Models\Sinhvien;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

class NguoidungFactory extends Factory
{
    protected $model = Nguoidung::class;

    public function definition(): array
    {
        $faker = \Faker\Factory::create('vi_VN');

        return [
            'HODEM_VA_TEN' => $faker->name(),
            'EMAIL' => $this->faker->unique()->safeEmail(),
            'MATKHAU_BAM' => Hash::make('123'),
            'NGAYSINH' => $this->faker->date('Y-m-d', '2004-12-31'),
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
                'ID_VAITRO' => $sinhVienRole->ID_VAITRO ?? 3,
                'MA_DINHDANH' => '2001' . $this->faker->unique()->numberBetween(200000, 229999),
            ];
        })->afterCreating(function (Nguoidung $nguoidung) {
            $chuyenNganhId = Chuyennganh::inRandomOrder()->value('ID_CHUYENNGANH') ?? 
                             Chuyennganh::factory()->create()->ID_CHUYENNGANH;

            $faker = \Faker\Factory::create('vi_VN');

            Sinhvien::create([
                'ID_NGUOIDUNG' => $nguoidung->ID_NGUOIDUNG,
                'ID_CHUYENNGANH' => $chuyenNganhId,
                'TEN_LOP' => 'DH' . $faker->numberBetween(20, 22) . 'CNTT' . $faker->numberBetween(1, 5),
                'NIENKHOA' => 'K' . $faker->numberBetween(12, 14),
                'HEDAOTAO' => $faker->randomElement(['Cử nhân', 'Kỹ sư']),
            ]);
        });
    }
}