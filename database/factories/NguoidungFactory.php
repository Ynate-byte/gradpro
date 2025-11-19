<?php

namespace Database\Factories;

use App\Models\Nguoidung;
use App\Models\Vaitro;
use App\Models\Chuyennganh;
use App\Models\KhoaBomon;
use App\Models\Sinhvien;
use App\Models\Giangvien;
use App\Models\ChucVu;
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

            Sinhvien::create([
                'ID_NGUOIDUNG' => $nguoidung->ID_NGUOIDUNG,
                'ID_CHUYENNGANH' => $chuyenNganhId,
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
                'ID_VAITRO' => $giangVienRole->ID_VAITRO ?? 2,
                'MA_DINHDANH' => 'GV' . $this->faker->unique()->numberBetween(100, 999),
                'NGAYSINH' => $this->faker->date('Y-m-d', '1995-12-31'),
            ];
        })->afterCreating(function (Nguoidung $nguoidung) {
            $khoaId = KhoaBomon::inRandomOrder()->value('ID_KHOA_BOMON') ?? 1;

            $gv = Giangvien::create([
                'ID_NGUOIDUNG' => $nguoidung->ID_NGUOIDUNG,
                'ID_KHOA_BOMON' => $khoaId,
                'HOCVI' => $this->faker->randomElement(['Thạc sĩ', 'Tiến sĩ']),
            ]);

            if ($this->faker->boolean(10)) {
                $chucVu = ChucVu::where('MA_CHUCVU', 'TRUONG_BOMON')->first();
                if ($chucVu) {
                    $gv->chucvus()->attach($chucVu->ID_CHUCVU);
                }
            }
        });
    }
}