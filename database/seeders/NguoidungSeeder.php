<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Vaitro;
use App\Models\Nguoidung;
use App\Models\Sinhvien;
use App\Models\Giangvien;
use App\Models\KhoaBomon;
use App\Models\Chuyennganh;
use Illuminate\Support\Str;

class NguoidungSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        // Truncate theo thứ tự phụ thuộc ngược
        Giangvien::truncate();
        Sinhvien::truncate();
        Nguoidung::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Lấy ID vai trò
        $adminRole = Vaitro::where('TEN_VAITRO', 'Admin')->first();
        $gvRole = Vaitro::where('TEN_VAITRO', 'Giảng viên')->first();
        $svRole = Vaitro::where('TEN_VAITRO', 'Sinh viên')->first();
        $giaoVuRole = Vaitro::where('TEN_VAITRO', 'Giáo vụ')->first();
        $truongKhoaRole = Vaitro::where('TEN_VAITRO', 'Trưởng khoa')->first();
        
        // 1. Tạo Admin
        if ($adminRole) {
            Nguoidung::create([
                'MA_DINHDANH' => 'ADMIN01',
                'EMAIL' => 'admin@gradpro.test',
                'MATKHAU_BAM' => Hash::make('123'),
                'HODEM_VA_TEN' => 'Quản Trị Viên',
                'ID_VAITRO' => $adminRole->ID_VAITRO,
                'TRANGTHAI_KICHHOAT' => true,
                'LA_DANGNHAP_LANDAU' => false,
                'DANGNHAP_CUOI' => now(),
            ]);
        }
        
        // *** BỔ SUNG LẠI GIÁO VỤ ***
        $this->command->info('Đang tạo tài khoản Giáo vụ...');
        $khoaCntt = KhoaBomon::where('TEN_KHOA_BOMON', 'Mạng máy tính và An ninh thông tin')->first(); 
        if (!$khoaCntt) {
             // Fallback nếu tên khoa không khớp
             $khoaCntt = KhoaBomon::first();
        }

        if ($giaoVuRole && $khoaCntt) {
             $giaoVuUser = Nguoidung::create([
                'MA_DINHDANH' => 'GVU.CNTT',
                'EMAIL' => 'giao.vu@gradpro.test', // Email mà KehoachKhoaluanSeeder tìm kiếm
                'MATKHAU_BAM' => Hash::make('123'),
                'HODEM_VA_TEN' => 'Trần Thị Thu Hà (Giáo vụ)',
                'ID_VAITRO' => $giaoVuRole->ID_VAITRO,
                'TRANGTHAI_KICHHOAT' => true,
                'LA_DANGNHAP_LANDAU' => false,
             ]);
             Giangvien::create([
                'ID_NGUOIDUNG' => $giaoVuUser->ID_NGUOIDUNG,
                'ID_KHOA_BOMON' => $khoaCntt->ID_KHOA_BOMON,
                'HOCVI' => 'Thạc sĩ',
                'CHUCVU' => 'Giáo vụ'
             ]);
        } else {
            $this->command->error('Không thể tạo Giáo vụ do không tìm thấy vai trò hoặc khoa/bộ môn.');
        }
        // *** KẾT THÚC BỔ SUNG ***


        // 2. TẠO GIẢNG VIÊN MỚI THEO DANH SÁCH
        $this->command->info('Đang tạo dữ liệu cho Giảng viên...');

        $roleMap = [
            'Admin' => $adminRole->ID_VAITRO,
            'Giảng viên' => $gvRole->ID_VAITRO,
            'Sinh viên' => $svRole->ID_VAITRO,
            'Giáo vụ' => $giaoVuRole->ID_VAITRO,
            'Trưởng khoa' => $truongKhoaRole->ID_VAITRO,
        ];

        $boMonSeederMap = [
            'BỘ MÔN KHOA HỌC DỮ LIỆU' => 'Khoa học dữ liệu',
            'BỘ MÔN HỆ THỐNG THÔNG TIN' => 'Hệ thống thông tin',
            'BỘ MÔN KỸ THUẬT PHẦN MỀM' => 'Kỹ thuật phần mềm',
            'BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN' => 'Mạng máy tính và An ninh thông tin',
            'BỘ MÔN CÔNG NGHỆ SỐ' => 'Công nghệ số',
        ];
        
        $khoaBomonDbMap = KhoaBomon::whereIn('TEN_KHOA_BOMON', array_values($boMonSeederMap))
                                 ->pluck('ID_KHOA_BOMON', 'TEN_KHOA_BOMON');

        $lecturersData = [
            // KHDT
            ['bm' => 'BỘ MÔN KHOA HỌC DỮ LIỆU', 'ten' => 'Phùng Thế Bảo', 'hocvi' => 'Tiến sĩ, GVC', 'chucvu' => 'Trưởng Bộ môn', 'email' => 'baopt@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KHOA HỌC DỮ LIỆU', 'ten' => 'Nguyễn Thanh Long', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Phó Trưởng Khoa', 'email' => 'longnt@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KHOA HỌC DỮ LIỆU', 'ten' => 'Ngô Dương Hà', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Giảng viên', 'email' => 'hand@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KHOA HỌC DỮ LIỆU', 'ten' => 'Trần Việt Hùng', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'hungtv@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KHOA HỌC DỮ LIỆU', 'ten' => 'Huỳnh Thị Châu Lan', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'lanhtc@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KHOA HỌC DỮ LIỆU', 'ten' => 'Phan Thị Ngọc Mai', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'maiptn@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KHOA HỌC DỮ LIỆU', 'ten' => 'Đinh Nguyễn Trọng Nghĩa', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'nghiadnt@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KHOA HỌC DỮ LIỆU', 'ten' => 'Nguyễn Thị Thùy Trang', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'trangntt@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KHOA HỌC DỮ LIỆU', 'ten' => 'Trần Văn Thọ', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'thotv@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KHOA HỌC DỮ LIỆU', 'ten' => 'Trần Đinh Toàn', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên - CN CLB Học thuật', 'email' => 'toantd@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KHOA HỌC DỮ LIỆU', 'ten' => 'Nguyễn Hải Yến', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'yennh@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KHOA HỌC DỮ LIỆU', 'ten' => 'Nguyễn Thị Huyền Trang', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'trangnthuyen@huit.edu.vn'],
            // HTTT
            ['bm' => 'BỘ MÔN HỆ THỐNG THÔNG TIN', 'ten' => 'Nguyễn Văn Lễ', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Phó trưởng bộ môn', 'email' => 'lenv@huit.edu.vn'],
            ['bm' => 'BỘ MÔN HỆ THỐNG THÔNG TIN', 'ten' => 'Trần Thị Vân Anh', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'anhttv@huit.edu.vn'],
            ['bm' => 'BỘ MÔN HỆ THỐNG THÔNG TIN', 'ten' => 'Nguyễn Thị Định', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'dinhnt@huit.edu.vn'],
            ['bm' => 'BỘ MÔN HỆ THỐNG THÔNG TIN', 'ten' => 'Nguyễn Thế Hữu', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên - Bí thư Liên chi đoàn', 'email' => 'huunv@huit.edu.vn'],
            ['bm' => 'BỘ MÔN HỆ THỐNG THÔNG TIN', 'ten' => 'Lê Thị Thùy Lan', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'lanltt@huit.edu.vn'],
            ['bm' => 'BỘ MÔN HỆ THỐNG THÔNG TIN', 'ten' => 'Đinh Thị Mận', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'mandt@huit.edu.vn'],
            ['bm' => 'BỘ MÔN HỆ THỐNG THÔNG TIN', 'ten' => 'Nguyễn Thị Thu Tâm', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'tamntt@huit.edu.vn'],
            ['bm' => 'BỘ MÔN HỆ THỐNG THÔNG TIN', 'ten' => 'Nguyễn Thị Thanh Thủy', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'thuyntt@huit.edu.vn'],
            ['bm' => 'BỘ MÔN HỆ THỐNG THÔNG TIN', 'ten' => 'Trần Như Ý', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên - Tổ trưởng công đoàn', 'email' => 'ytn@huit.edu.vn'],
            // KTPM
            ['bm' => 'BỘ MÔN KỸ THUẬT PHẦN MỀM', 'ten' => 'Vũ Văn Vinh', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Phụ trách Bộ môn', 'email' => 'vinhvv@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KỸ THUẬT PHẦN MỀM', 'ten' => 'Nguyễn Thị Bích Ngân', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Trưởng ngành sau đại học', 'email' => 'nganntb@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KỸ THUẬT PHẦN MỀM', 'ten' => 'Vũ Thanh Nguyên', 'hocvi' => 'PGS, Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'nguyenvt@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KỸ THUẬT PHẦN MỀM', 'ten' => 'Đào Minh Châu', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'chaudm@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KỸ THUẬT PHẦN MỀM', 'ten' => 'Bùi Công Danh', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Giảng viên', 'email' => 'danhbc@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KỸ THUẬT PHẦN MỀM', 'ten' => 'Đinh Thị Tâm', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'tamdt@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KỸ THUẬT PHẦN MỀM', 'ten' => 'Mạnh Thiên Lý', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'lymt@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KỸ THUẬT PHẦN MỀM', 'ten' => 'Lâm Thị Họa Mi', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'milth@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KỸ THUẬT PHẦN MỀM', 'ten' => 'Dương Thị Mộng Thùy', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'thuydtm@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KỸ THUẬT PHẦN MỀM', 'ten' => 'Huỳnh Thị Cẩm Dung', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'dunghtc@huit.edu.vn'],
            ['bm' => 'BỘ MÔN KỸ THUẬT PHẦN MỀM', 'ten' => 'Nguyễn Tuấn Anh', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'anhngt@huit.edu.vn'],
            // MMT&ATTT
            ['bm' => 'BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN', 'ten' => 'Nguyễn Hồng Vũ', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Trưởng Khoa - Phụ trách bộ môn', 'email' => 'vunh@huit.edu.vn'],
            ['bm' => 'BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN', 'ten' => 'Vũ Đức Thịnh', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'thinhvd@huit.edu.vn'],
            ['bm' => 'BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN', 'ten' => 'Đinh Huy Hoàng', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'hoangdh@huit.edu.vn'],
            ['bm' => 'BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN', 'ten' => 'Phạm Tuấn Khiêm', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'khiempt@huit.edu.vn'],
            ['bm' => 'BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN', 'ten' => 'Nguyễn Thị Hồng Thảo', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'thaonth@huit.edu.vn'],
            ['bm' => 'BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN', 'ten' => 'Trần Đắc Tốt', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Giảng viên', 'email' => 'tottd@huit.edu.vn'],
            ['bm' => 'BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN', 'ten' => 'Nguyễn Văn Tùng', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Giảng viên', 'email' => 'tungnv@huit.edu.vn'],
            ['bm' => 'BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN', 'ten' => 'Nguyễn Quốc Sử', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Giảng viên', 'email' => 'sunq@huit.edu.vn'],
            ['bm' => 'BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN', 'ten' => 'Trần Thị Bích Vân', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'vanttb@huit.edu.vn'],
            ['bm' => 'BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN', 'ten' => 'Lê Anh Tuấn', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'tuanla@huit.edu.vn'],
            ['bm' => 'BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN', 'ten' => 'Lê Tỷ Khánh', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'khanhlt@huit.edu.vn'],
            ['bm' => 'BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN', 'ten' => 'Nguyễn Phương Hạc', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'hacnp@huit.edu.vn'],
            ['bm' => 'BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN', 'ten' => 'Phạm Nguyễn Huy Phương', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'phuongpnh@huit.edu.vn'],
            ['bm' => 'BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN', 'ten' => 'Hồ Hải Quân', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Giảng viên', 'email' => 'quanhh@huit.edu.vn'],
            // CNS
            ['bm' => 'BỘ MÔN CÔNG NGHỆ SỐ', 'ten' => 'Trần Khải Thiện', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Phụ trách bộ môn', 'email' => 'thientk@huit.edu.vn'],
            ['bm' => 'BỘ MÔN CÔNG NGHỆ SỐ', 'ten' => 'Huỳnh Thái Học', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'hocht@huit.edu.vn'],
            ['bm' => 'BỘ MÔN CÔNG NGHỆ SỐ', 'ten' => 'Nguyễn Thành Ngô', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => null], // Sẽ generate
            ['bm' => 'BỘ MÔN CÔNG NGHỆ SỐ', 'ten' => 'Lê Trần Minh Đạt', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'datltm@huit.edu.vn'],
            ['bm' => 'BỘ MÔN CÔNG NGHỆ SỐ', 'ten' => 'Vũ Phú Lộc', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'locvp@huit.edu.vn'],
            ['bm' => 'BỘ MÔN CÔNG NGHỆ SỐ', 'ten' => 'Lữ Thị Cẩm Tú', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'tultc@huit.edu.vn'],
            ['bm' => 'BỘ MÔN CÔNG NGHỆ SỐ', 'ten' => 'Võ Hoàng Hải', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'haivh@huit.edu.vn'],
        ];

        $gvCounter = 1;

        foreach ($lecturersData as $data) {
            $hocvi = $this->parseHocVi($data['hocvi']);
            $chucvu = $this->parseChucVu($data['chucvu']);
            $vaitroId = $this->parseVaitro($data['chucvu'], $roleMap);
            
            // Lấy ID bộ môn
            $tenBoMonTrongDb = $boMonSeederMap[$data['bm']];
            $boMonId = $khoaBomonDbMap->get($tenBoMonTrongDb);

            if (!$boMonId) {
                $this->command->error("Không tìm thấy ID cho bộ môn: '{$tenBoMonTrongDb}'. Bỏ qua GV: {$data['ten']}");
                continue;
            }

            // Xử lý email
            $email = $data['email'];
            if (empty($email)) {
                $email = $this->generateEmailFromName($data['ten']);
            }
            
            // Sửa lỗi email .eu.vn
            if ($email === 'trangnthuyen@huit.eu.vn') {
                $email = 'trangnthuyen@huit.edu.vn';
            }

            // Tạo Nguoidung
            $user = Nguoidung::create([
                'MA_DINHDANH' => 'GV' . str_pad($gvCounter++, 3, '0', STR_PAD_LEFT),
                'EMAIL' => $email,
                'MATKHAU_BAM' => Hash::make('123'),
                'HODEM_VA_TEN' => $data['ten'],
                'ID_VAITRO' => $vaitroId,
                'TRANGTHAI_KICHHOAT' => true,
                'LA_DANGNHAP_LANDAU' => false,
            ]);

            // Tạo Giangvien
            Giangvien::create([
                'ID_NGUOIDUNG' => $user->ID_NGUOIDUNG,
                'ID_KHOA_BOMON' => $boMonId,
                'HOCVI' => $hocvi,
                'CHUCVU' => $chucvu,
            ]);
        }

        $this->command->info("Đã tạo thành công " . ($gvCounter - 1) . " giảng viên.");

        // 3. TẠO SINH VIÊN
        $this->command->info('Đang tạo dữ liệu cho 3 SV cụ thể...');
        
        if ($svRole) {
            Nguoidung::factory()->asSinhVien()->create([
                'HODEM_VA_TEN' => 'Trần Văn An',
                'EMAIL' => 'sv.antv@gradpro.test',
                'MA_DINHDANH' => '200120001',
            ]);
            Nguoidung::factory()->asSinhVien()->create([
                'HODEM_VA_TEN' => 'Nguyễn Thị Bình',
                'EMAIL' => 'sv.binhnt@gradpro.test',
                'MA_DINHDANH' => '200120002',
            ]);
            Nguoidung::factory()->asSinhVien()->create([
                'HODEM_VA_TEN' => 'Lê Minh Cường',
                'EMAIL' => 'sv.cuonglm@gradpro.test',
                'MA_DINHDANH' => '200120003',
            ]);
        }

        // *** TẠO 50 SV TÊN TIẾNG VIỆT ***
        $this->command->info('Đang tạo dữ liệu cho 50 SV Tiếng Việt...');
        
        $vietnameseNames = [
            'Nguyễn Hoàng Anh', 'Trần Đức Bình', 'Lê Thị Cẩm', 'Phạm Văn Dũng', 'Võ Hoàng Giang',
            'Đặng Minh Hiếu', 'Hoàng Thị Thu Hương', 'Lý Văn Khang', 'Mai Thị Lan', 'Ngô Gia Long',
            'Bùi Minh Mẫn', 'Chu Thị Nguyệt', 'Đỗ Gia Hân', 'Dương Văn Tùng', 'Giang Thanh Phong',
            'Hồ Văn Thái', 'Huỳnh Ngọc Sương', 'Kiều Thị Diễm', 'Lương Văn Can', 'Nguyễn Tấn Phát',
            'Phan Thị Thảo', 'Quách Tuấn Du', 'Thái Văn Toản', 'Tô Hoài Nam', 'Trịnh Công Sơn',
            'Vương Thị Lệ', 'Vũ Đức Huy', 'Âu Dương Chấn', 'Đàm Vĩnh Hưng', 'Đinh Bộ Lĩnh',
            'Nguyễn Khoa Điềm', 'Hà Thị My', 'Lê Quốc Tuấn', 'Trần Hoàng Yến', 'Phạm Nhật Vượng',
            'Võ Nguyên Giáp', 'Phan Bội Châu', 'Trần Hưng Đạo', 'Lý Thường Kiệt', 'Ngô Quyền',
            'Bùi Thị Xuân', 'Đoàn Thị Điểm', 'Hồ Xuân Hương', 'Nguyễn Du', 'Nguyễn Trãi',
            'Tô Hiến Thành', 'Phạm Ngũ Lão', 'Lê Lợi', 'Quang Trung', 'Nguyễn Huệ'
        ];

        if ($svRole) {
            foreach ($vietnameseNames as $index => $name) {
                $email = $this->generateStudentEmailFromName($name, $index);
                $mssv = '200121' . str_pad($index + 1, 3, '0', STR_PAD_LEFT); 
                
                Nguoidung::factory()
                    ->asSinhVien() 
                    ->create([
                        'HODEM_VA_TEN' => $name,
                        'EMAIL' => $email,
                        'MA_DINHDANH' => $mssv,
                        'ID_VAITRO' => $svRole->ID_VAITRO,
                    ]);
            }
        }
        $this->command->info('Đã tạo 50 SV Tiếng Việt.');
        // *** KẾT THÚC THAY ĐỔI ***


        // Cập nhật trạng thái cho một số SV
        Nguoidung::whereHas('vaitro', fn($q) => $q->where('TEN_VAITRO', 'Sinh viên'))
            ->inRandomOrder()
            ->limit(3)
            ->update(['DANGNHAP_CUOI' => null]);
            
        Nguoidung::whereHas('vaitro', fn($q) => $q->where('TEN_VAITRO', 'Sinh viên'))
            ->inRandomOrder()
            ->limit(2)
            ->update(['TRANGTHAI_KICHHOAT' => false]);
            
        $this->command->info('Đã tạo dữ liệu mẫu cho người dùng (Admin, GV, SV)!');
    }

    /**
     * Phân tích chuỗi học vị
     */
    private function parseHocVi(string $text): string
    {
        if (Str::contains($text, 'PGS')) return 'Phó Giáo sư';
        if (Str::contains($text, 'Tiến sĩ')) return 'Tiến sĩ';
        if (Str::contains($text, 'Giáo sư')) return 'Giáo sư';
        if (Str::contains($text, 'Thạc sĩ')) return 'Thạc sĩ';
        return 'Thạc sĩ'; // Mặc định
    }

    /**
     * Phân tích chuỗi chức vụ
     * Chỉ trả về các giá trị có trong ENUM
     * *** ĐÃ SỬA LỖI LOGIC ***
     */
    private function parseChucVu(?string $text): ?string
    {
        if (!$text) return null;
        
        // Phải kiểm tra trường hợp 'Phó' TRƯỚC
        if (Str::contains($text, 'Phó Trưởng Khoa')) return 'Phó khoa';
        if (Str::contains($text, 'Trưởng Khoa')) return 'Trưởng khoa';
        
        if (Str::contains($text, 'Trưởng Bộ môn') || Str::contains($text, 'Phụ trách Bộ môn')) return 'Trưởng bộ môn';
        if (Str::contains($text, 'Giáo vụ')) return 'Giáo vụ';
        
        // Các chức vụ khác (Phó trưởng bộ môn, Giảng viên, Bí thư...) không có trong ENUM
        return null;
    }

    /**
     * Xác định ID_VAITRO dựa trên chức vụ
     * *** ĐÃ SỬA LỖI LOGIC ***
     */
    private function parseVaitro(?string $text, array $roleMap): int
    {
        if (!$text) return $roleMap['Giảng viên'];

        // Phải kiểm tra trường hợp 'Giáo vụ' và 'Trưởng Khoa' (chính xác) TRƯỚC
        if (Str::contains($text, 'Giáo vụ')) return $roleMap['Giáo vụ'];
        
        // Kiểm tra chính xác "Trưởng Khoa" (không phải "Phó")
        if (Str::contains($text, 'Trưởng Khoa') && !Str::contains($text, 'Phó')) {
            return $roleMap['Trưởng khoa'];
        }
        
        // Mặc định là Giảng viên
        return $roleMap['Giảng viên'];
    }

    /**
     * Tạo email giả cho GV
     */
    private function generateEmailFromName(string $name): string
    {
        $parts = explode(' ', $name);
        $lastName = array_pop($parts);
        $initials = '';
        foreach ($parts as $part) {
            $initials .= mb_substr($part, 0, 1);
        }
        $username = Str::slug($lastName . $initials, '');
        return strtolower($username) . '@gradpro.test';
    }
    
    /**
     * Tạo email giả cho SV
     */
    private function generateStudentEmailFromName(string $name, int $index): string
    {
        $parts = explode(' ', $name);
        $lastName = array_pop($parts);
        $initials = '';
        foreach ($parts as $part) {
            $initials .= mb_substr($part, 0, 1);
        }
        $username = Str::slug($lastName . $initials, '');
        // Thêm index để đảm bảo duy nhất
        return 'sv.' . strtolower($username) . $index . '@gradpro.test';
    }
}