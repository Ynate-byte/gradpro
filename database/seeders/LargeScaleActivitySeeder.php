<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Nhom;
use App\Models\CongViec;
use App\Models\LichHop;
use App\Models\CotCongViec;
use App\Models\NopSanpham;
use App\Models\FileNopSanpham;
use App\Models\DiemHuongDan;
use App\Models\DiemTongKet;
use Faker\Factory as Faker;

class LargeScaleActivitySeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create('vi_VN');
        
        // Lấy các nhóm vừa tạo
        $groups = Nhom::where('TEN_NHOM', 'like', 'Nhóm % - %')
                      ->with('phancongDetaiNhom')
                      ->get();
        
        $cols = CotCongViec::all();

        foreach ($groups as $nhom) {
            $leaderId = $nhom->ID_NHOMTRUONG;

            // 1. TẠO 10-15 TASKS CHO MỖI NHÓM (~1000 - 1500 tasks tổng)
            $numTasks = rand(10, 15);
            for ($t = 0; $t < $numTasks; $t++) {
                $col = $cols->random();
                $status = ($col->TEN_COT == 'Hoàn thành') ? 'Hoàn thành' : 'Hoạt động';
                
                $task = CongViec::create([
                    'ID_NHOM' => $nhom->ID_NHOM,
                    'ID_COT' => $col->ID_COT,
                    'ID_NGUOITAO' => $leaderId,
                    'TEN_CONGVIEC' => $faker->words(5, true),
                    'MOTA' => $faker->sentence,
                    'TRANGTHAI' => $status,
                    'DO_UUTIEN' => $faker->randomElement(['Thấp', 'Trung bình', 'Cao']),
                    'NGAY_BATDAU' => now()->subDays(rand(0, 10)),
                    'NGAY_HETHAN' => now()->addDays(rand(1, 20)),
                    'THUTU_HIENTHI' => $t
                ]);

                // Random checklist
                if (rand(0,1)) {
                    $task->checklistItems()->create([
                        'NOIDUNG_MUC' => 'Viết báo cáo chương ' . rand(1,3),
                        'DA_HOANTHANH' => rand(0,1)
                    ]);
                }
            }

            // 2. TẠO 3-5 LỊCH HỌP CHO MỖI NHÓM (~300-500 cuộc họp)
            $numMeetings = rand(3, 5);
            for ($m = 0; $m < $numMeetings; $m++) {
                LichHop::create([
                    'ID_NHOM' => $nhom->ID_NHOM,
                    'ID_NGUOITAO' => $leaderId,
                    'TIEUDE_LICHHOP' => 'Họp tuần ' . ($m + 1),
                    'THOIGIAN_BATDAU' => now()->subWeeks(5 - $m),
                    'THOIGIAN_KETTHUC' => now()->subWeeks(5 - $m)->addHour(),
                    'HINHTHUC_HOP' => 'Trực tuyến',
                    'LINK_TRUCTUYEN' => 'https://meet.google.com/abc-xyz-' . $m,
                    'TRANGTHAI' => 'Đã diễn ra',
                    'NOIDUNG_HOP' => $faker->sentence
                ]);
            }

            // 3. TẠO BÀI NỘP (80% nhóm nộp bài)
            if (rand(1, 100) <= 80 && $nhom->phancongDetaiNhom) {
                $submission = NopSanpham::create([
                    'ID_PHANCONG' => $nhom->phancongDetaiNhom->ID_PHANCONG,
                    'ID_NGUOI_NOP' => $leaderId,
                    'TRANGTHAI' => 'Đã xác nhận',
                    'ID_NGUOI_XACNHAN' => $nhom->phancongDetaiNhom->ID_GVHD,
                    'NGAY_XACNHAN' => now(),
                    'NGAY_NOP' => now()->subDays(1)
                ]);

                FileNopSanpham::create([
                    'ID_NOP_SANPHAM' => $submission->ID_NOP_SANPHAM,
                    'LOAI_FILE' => 'BaoCaoPDF',
                    'DUONG_DAN_HOAC_NOI_DUNG' => 'dummy_path.pdf',
                    'TEN_FILE_GOC' => 'BaoCao_CuoiKy.pdf',
                    'KICH_THUOC_FILE' => 2048000
                ]);

                // 4. CHẤM ĐIỂM (Cho những nhóm đã nộp)
                $score = $faker->randomFloat(2, 5, 10);
                DiemHuongDan::updateOrCreate(
                    ['ID_NHOM' => $nhom->ID_NHOM, 'ID_GIANGVIEN' => $nhom->phancongDetaiNhom->ID_GVHD],
                    ['DIEM' => $score, 'NHANXET' => 'Làm tốt, cần cố gắng thêm phần code.']
                );
                
                // Cập nhật điểm tổng kết tạm thời
                DiemTongKet::updateOrCreate(
                    ['ID_NHOM' => $nhom->ID_NHOM],
                    ['DIEM_HD' => $score]
                );
            }
        }
    }
}