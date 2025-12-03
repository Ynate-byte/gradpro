<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class PhanCongVaHoatDongSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('vi_VN');
        $planId = DB::table('KEHOACH_KHOALUAN')->where('TRANGTHAI', 'Đang thực hiện')->value('ID_KEHOACH');
        
        if (!$planId) return;

        $groups = DB::table('NHOM')->where('ID_KEHOACH', $planId)->get();
        $topics = DB::table('DETAI')
            ->where('ID_KEHOACH', $planId)
            ->where('TRANGTHAI', 'Đã duyệt')
            ->get();

        if ($topics->isEmpty()) return;

        foreach ($groups as $index => $group) {
            if ($index % 5 == 0) continue; 

            $topic = $topics->random();

            $assignId = DB::table('PHANCONG_DETAI_NHOM')->insertGetId([
                'ID_NHOM' => $group->ID_NHOM,
                'ID_DETAI' => $topic->ID_DETAI,
                'ID_GVHD' => $topic->ID_NGUOI_DEXUAT,
                'NGAY_PHANCONG' => now(),
                'TRANGTHAI' => 'Đang thực hiện'
            ]);

            DB::table('NHOM')->where('ID_NHOM', $group->ID_NHOM)->update([
                'TRANGTHAI' => 'Đang thực hiện',
                'TEN_NHOM' => $topic->TEN_DETAI
            ]);

            DB::table('DETAI')->where('ID_DETAI', $topic->ID_DETAI)->increment('SO_NHOM_HIENTAI');

            $this->createTasksForGroup($group, $faker);

            $this->createMeetingsForGroup($group, $topic->ID_NGUOI_DEXUAT, $faker);
        }
    }

    private function createTasksForGroup($group, $faker)
    {
        $colTodo = 1;
        $colDoing = 2;
        $colDone = 4;

        $tasks = [
            ['Tìm hiểu công nghệ', $colDone],
            ['Phân tích yêu cầu hệ thống', $colDone],
            ['Thiết kế cơ sở dữ liệu', $colDoing],
            ['Viết API đăng nhập/đăng ký', $colDoing],
            ['Thiết kế giao diện trang chủ', $colTodo],
            ['Viết báo cáo chương 1', $colTodo],
        ];

        foreach ($tasks as $idx => $t) {
            DB::table('CONGVIEC')->insert([
                'ID_NHOM' => $group->ID_NHOM,
                'ID_COT' => $t[1],
                'ID_NGUOITAO' => $group->ID_NHOMTRUONG,
                'TEN_CONGVIEC' => $t[0],
                'MOTA' => $faker->sentence,
                'TRANGTHAI' => ($t[1] == 4) ? 'Hoàn thành' : 'Hoạt động',
                'DO_UUTIEN' => $faker->randomElement(['Thấp', 'Trung bình', 'Cao']),
                'NGAY_HETHAN' => now()->addDays(rand(3, 14)),
                'THUTU_HIENTHI' => $idx,
                'NGAYTAO' => now()
            ]);
        }
    }

    private function createMeetingsForGroup($group, $gvhdId, $faker)
    {
        $gvUser = DB::table('GIANGVIEN')->where('ID_GIANGVIEN', $gvhdId)->value('ID_NGUOIDUNG');

        DB::table('LICHHOP')->insert([
            'ID_NHOM' => $group->ID_NHOM,
            'ID_NGUOITAO' => $gvUser,
            'TIEUDE_LICHHOP' => 'Gặp mặt lần đầu - Thống nhất đề tài',
            'THOIGIAN_BATDAU' => now()->subDays(5),
            'THOIGIAN_KETTHUC' => now()->subDays(5)->addHour(),
            'HINHTHUC_HOP' => 'Trực tiếp',
            'DIADIEM' => 'Phòng C.201',
            'NOIDUNG_HOP' => 'Thống nhất phạm vi đề tài và công nghệ sử dụng.',
            'TRANGTHAI' => 'Đã diễn ra',
            'DANHGIA' => 'Tot',
            'NGAYTAO' => now()->subDays(6)
        ]);

        DB::table('LICHHOP')->insert([
            'ID_NHOM' => $group->ID_NHOM,
            'ID_NGUOITAO' => $gvUser,
            'TIEUDE_LICHHOP' => 'Báo cáo tiến độ phân tích thiết kế',
            'THOIGIAN_BATDAU' => now()->addDays(2),
            'THOIGIAN_KETTHUC' => now()->addDays(2)->addHour(),
            'HINHTHUC_HOP' => 'Trực tuyến',
            'LINK_TRUCTUYEN' => 'https://meet.google.com/abc-xyz',
            'TRANGTHAI' => 'Đã lên lịch',
            'NGAYTAO' => now()
        ]);
    }
}