<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;
use Illuminate\Support\Str;

class DetaiSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('DETAI')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $faker = Faker::create('vi_VN');
        
        $planId = DB::table('KEHOACH_KHOALUAN')->where('TRANGTHAI', 'Đang thực hiện')->value('ID_KEHOACH');
        
        $lecturers = DB::table('GIANGVIEN')
            ->join('NGUOIDUNG', 'GIANGVIEN.ID_NGUOIDUNG', '=', 'NGUOIDUNG.ID_NGUOIDUNG')
            ->where('NGUOIDUNG.MA_DINHDANH', '!=', 'GIAOVU')
            ->select('GIANGVIEN.ID_GIANGVIEN', 'GIANGVIEN.ID_KHOA_BOMON')
            ->get();

        $adminId = DB::table('NGUOIDUNG')->where('ID_VAITRO', 1)->value('ID_NGUOIDUNG') ?? 1;

        if (!$planId || $lecturers->isEmpty()) return;

        foreach ($lecturers as $gv) {
            $count = rand(3, 5);
            
            for ($i = 0; $i < $count; $i++) {
                $prefix = $faker->randomElement(['Xây dựng', 'Phát triển', 'Nghiên cứu', 'Tìm hiểu', 'Ứng dụng', 'Tối ưu hóa']);
                $tech = $faker->randomElement(['AI', 'Blockchain', 'IoT', 'Big Data', 'ReactJS', 'Laravel', 'Flutter', 'Machine Learning']);
                $context = $faker->randomElement(['quản lý nhân sự', 'bán hàng', 'nhà thông minh', 'điểm danh', 'quản lý kho', 'E-learning']);
                
                $tenDetai = "$prefix hệ thống $context sử dụng công nghệ $tech";

                $statusPool = [
                    'Nháp', 
                    'Chờ duyệt', 'Chờ duyệt', 
                    'Yêu cầu chỉnh sửa', 
                    'Đã duyệt', 'Đã duyệt', 'Đã duyệt', 'Đã duyệt', 'Đã duyệt',
                    'Từ chối'
                ];
                $trangThai = $faker->randomElement($statusPool);

                $nguoiDuyet = null;
                $ngayDuyet = null;
                $lyDoTuChoi = null;

                if (in_array($trangThai, ['Đã duyệt', 'Từ chối', 'Yêu cầu chỉnh sửa'])) {
                    $nguoiDuyet = $adminId;
                    $ngayDuyet = now()->subDays(rand(1, 10));

                    if ($trangThai === 'Từ chối') {
                        $lyDoTuChoi = "Đề tài trùng lặp hoặc phạm vi không phù hợp với trình độ sinh viên.";
                    } elseif ($trangThai === 'Yêu cầu chỉnh sửa') {
                        $lyDoTuChoi = "Cần bổ sung thêm các chức năng nghiệp vụ phức tạp hơn.";
                    }
                }

                DB::table('DETAI')->insert([
                    'ID_KEHOACH' => $planId,
                    'MA_DETAI' => 'DT' . $gv->ID_GIANGVIEN . date('y') . str_pad($i, 3, '0', STR_PAD_LEFT),
                    'TEN_DETAI' => $tenDetai,
                    'MOTA' => "Đề tài nhằm mục đích $context, áp dụng $tech để giải quyết vấn đề thực tế.",
                    'ID_KHOA_BOMON' => $gv->ID_KHOA_BOMON,
                    'YEUCAU' => "- Nắm vững $tech\n- Có kiến thức về $context\n- Chăm chỉ, chịu khó.",
                    'MUCTIEU' => "- Hoàn thiện ứng dụng demo.\n- Viết báo cáo khoa học.",
                    'KETQUA_MONGDOI' => "Sản phẩm chạy ổn định, báo cáo đầy đủ.",
                    
                    'ID_NGUOI_DEXUAT' => $gv->ID_GIANGVIEN,
                    'SO_NHOM_TOIDA' => rand(1, 3),
                    'SO_NHOM_HIENTAI' => 0,
                    
                    'TRANGTHAI' => $trangThai,
                    'ID_NGUOI_DUYET' => $nguoiDuyet,
                    'NGAY_DUYET' => $ngayDuyet,
                    'LYDO_TUCHOI' => $lyDoTuChoi,
                    
                    'NGAYTAO' => now()->subDays(rand(15, 30)),
                    'NGAYCAPNHAT' => now()
                ]);
            }
        }
    }
}