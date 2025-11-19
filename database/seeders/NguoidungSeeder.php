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
use App\Models\ChucVu;
use Illuminate\Support\Str;

class NguoidungSeeder extends Seeder
{
    /**
     * Chạy seeder cho cơ sở dữ liệu.
     */
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        // Xóa dữ liệu cũ
        DB::table('GIANGVIEN_CHUCVU')->truncate();
        DB::table('CHUCVU')->truncate();
        Giangvien::truncate();
        Sinhvien::truncate();
        Nguoidung::truncate();
        DB::table('VAITRO')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 1. Tạo Vai trò (Role hệ thống)
        DB::table('VAITRO')->insert([
            ['ID_VAITRO' => 1, 'TEN_VAITRO' => 'Admin', 'MOTA' => 'Quản trị viên hệ thống'],
            ['ID_VAITRO' => 2, 'TEN_VAITRO' => 'Giảng viên', 'MOTA' => 'Nhân sự thuộc khoa (bao gồm cả Lãnh đạo, Giáo vụ)'],
            ['ID_VAITRO' => 3, 'TEN_VAITRO' => 'Sinh viên', 'MOTA' => 'Sinh viên thực hiện đồ án'],
        ]);

        $adminRoleId = 1;
        $gvRoleId = 2;
        $svRoleId = 3;

        // 2. Tạo Chức vụ (Position chuyên môn)
        $chucvus = [
            ['MA_CHUCVU' => 'TRUONG_KHOA', 'TEN_CHUCVU' => 'Trưởng khoa'],
            ['MA_CHUCVU' => 'PHO_KHOA', 'TEN_CHUCVU' => 'Phó khoa'],
            ['MA_CHUCVU' => 'GIAO_VU', 'TEN_CHUCVU' => 'Giáo vụ'],
            ['MA_CHUCVU' => 'TRUONG_BOMON', 'TEN_CHUCVU' => 'Trưởng bộ môn'],
        ];
        
        foreach ($chucvus as $cv) {
            ChucVu::create($cv);
        }

        // Map ID chức vụ để dùng cho việc gán
        $cvMap = ChucVu::pluck('ID_CHUCVU', 'MA_CHUCVU');

        // 3. Tạo Admin
        Nguoidung::create([
            'MA_DINHDANH' => 'ADMIN01',
            'EMAIL' => 'admin@gradpro.test',
            'MATKHAU_BAM' => Hash::make('123'), // Mật khẩu mặc định
            'HODEM_VA_TEN' => 'Quản Trị Viên',
            'NGAYSINH' => '1990-01-01',
            'ID_VAITRO' => $adminRoleId,
            'TRANGTHAI_KICHHOAT' => true,
            'LA_DANGNHAP_LANDAU' => false,
            'DANGNHAP_CUOI' => now(),
        ]);

        // 4. Tạo Giáo vụ (Là Giảng viên + Chức vụ Giáo vụ)
        $this->command->info('Đang tạo tài khoản Giáo vụ...');
        $khoaCntt = KhoaBomon::where('TEN_KHOA_BOMON', 'Mạng máy tính và An ninh thông tin')->first();
        if (!$khoaCntt) {
            $khoaCntt = KhoaBomon::first();
        }

        if ($khoaCntt) {
            $giaoVuUser = Nguoidung::create([
                'MA_DINHDANH' => 'GVU.CNTT',
                'EMAIL' => 'giao.vu@gradpro.test',
                'MATKHAU_BAM' => Hash::make('123'),
                'HODEM_VA_TEN' => 'Trần Thị Thu Hà (Giáo vụ)',
                'NGAYSINH' => '1995-05-10',
                'ID_VAITRO' => $gvRoleId, // Role là Giảng viên
                'TRANGTHAI_KICHHOAT' => true,
                'LA_DANGNHAP_LANDAU' => false,
            ]);
            
            $gvGiaoVu = Giangvien::create([
                'ID_NGUOIDUNG' => $giaoVuUser->ID_NGUOIDUNG,
                'ID_KHOA_BOMON' => $khoaCntt->ID_KHOA_BOMON,
                'HOCVI' => 'Thạc sĩ',
            ]);
            
            // Gán chức vụ GIAO_VU
            if (isset($cvMap['GIAO_VU'])) {
                $gvGiaoVu->chucvus()->attach($cvMap['GIAO_VU']);
            }
        }

        // 5. TẠO GIẢNG VIÊN MỚI THEO DANH SÁCH CHÍNH XÁC
        $this->command->info('Đang tạo dữ liệu cho Giảng viên...');
        
        $khoaBomonDbMap = KhoaBomon::pluck('ID_KHOA_BOMON', 'TEN_KHOA_BOMON');

        $lecturersData = [
            // --- BỘ MÔN KHOA HỌC DỮ LIỆU ---
            ['bm' => 'Khoa học dữ liệu', 'ten' => 'Phùng Thế Bảo', 'hocvi' => 'Tiến sĩ, GVC', 'chucvu' => 'Trưởng Bộ môn', 'email' => 'baopt@huit.edu.vn'],
            ['bm' => 'Khoa học dữ liệu', 'ten' => 'Nguyễn Thanh Long', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Phó Trưởng Khoa', 'email' => 'longnt@huit.edu.vn'],
            ['bm' => 'Khoa học dữ liệu', 'ten' => 'Ngô Dương Hà', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Giảng viên', 'email' => 'hand@huit.edu.vn'],
            ['bm' => 'Khoa học dữ liệu', 'ten' => 'Trần Việt Hùng', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'hungtv@huit.edu.vn'],
            ['bm' => 'Khoa học dữ liệu', 'ten' => 'Huỳnh Thị Châu Lan', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'lanhtc@huit.edu.vn'],
            ['bm' => 'Khoa học dữ liệu', 'ten' => 'Phan Thị Ngọc Mai', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'maiptn@huit.edu.vn'],
            ['bm' => 'Khoa học dữ liệu', 'ten' => 'Đinh Nguyễn Trọng Nghĩa', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'nghiadnt@huit.edu.vn'],
            ['bm' => 'Khoa học dữ liệu', 'ten' => 'Nguyễn Thị Thùy Trang', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'trangntt@huit.edu.vn'],
            ['bm' => 'Khoa học dữ liệu', 'ten' => 'Trần Văn Thọ', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'thotv@huit.edu.vn'],
            ['bm' => 'Khoa học dữ liệu', 'ten' => 'Trần Đinh Toàn', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên - CN CLB Học thuật', 'email' => 'toantd@huit.edu.vn'],
            ['bm' => 'Khoa học dữ liệu', 'ten' => 'Nguyễn Hải Yến', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'yennh@huit.edu.vn'],
            ['bm' => 'Khoa học dữ liệu', 'ten' => 'Nguyễn Thị Huyền Trang', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'trangnthuyen@huit.edu.vn'], // Đã sửa lỗi .eu.vn thành .edu.vn

            // --- BỘ MÔN HỆ THỐNG THÔNG TIN ---
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Nguyễn Văn Lễ', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Phó trưởng bộ môn', 'email' => 'lenv@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Trần Thị Vân Anh', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'anhttv@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Nguyễn Thị Định', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'dinhnt@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Nguyễn Thế Hữu', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên - Bí thư Liên chi đoàn', 'email' => 'huunv@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Lê Thị Thùy Lan', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'lanltt@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Đinh Thị Mận', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'mandt@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Nguyễn Thị Thu Tâm', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'tamntt@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Nguyễn Thị Thanh Thủy', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'thuyntt@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Trần Như Ý', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên - Tổ trưởng công đoàn', 'email' => 'ytn@huit.edu.vn'],

            // --- BỘ MÔN KỸ THUẬT PHẦN MỀM ---
            ['bm' => 'Kỹ thuật phần mềm', 'ten' => 'Vũ Văn Vinh', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Phụ trách Bộ môn', 'email' => 'vinhvv@huit.edu.vn'],
            ['bm' => 'Kỹ thuật phần mềm', 'ten' => 'Nguyễn Thị Bích Ngân', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Trưởng ngành sau đại học', 'email' => 'nganntb@huit.edu.vn'],
            ['bm' => 'Kỹ thuật phần mềm', 'ten' => 'Vũ Thanh Nguyên', 'hocvi' => 'PGS, Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'nguyenvt@huit.edu.vn'],
            ['bm' => 'Kỹ thuật phần mềm', 'ten' => 'Đào Minh Châu', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'chaudm@huit.edu.vn'],
            ['bm' => 'Kỹ thuật phần mềm', 'ten' => 'Bùi Công Danh', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Giảng viên', 'email' => 'danhbc@huit.edu.vn'],
            ['bm' => 'Kỹ thuật phần mềm', 'ten' => 'Đinh Thị Tâm', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'tamdt@huit.edu.vn'],
            ['bm' => 'Kỹ thuật phần mềm', 'ten' => 'Mạnh Thiên Lý', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'lymt@huit.edu.vn'],
            ['bm' => 'Kỹ thuật phần mềm', 'ten' => 'Lâm Thị Họa Mi', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'milth@huit.edu.vn'],
            ['bm' => 'Kỹ thuật phần mềm', 'ten' => 'Dương Thị Mộng Thùy', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'thuydtm@huit.edu.vn'],
            ['bm' => 'Kỹ thuật phần mềm', 'ten' => 'Huỳnh Thị Cẩm Dung', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'dunghtc@huit.edu.vn'],
            ['bm' => 'Kỹ thuật phần mềm', 'ten' => 'Nguyễn Tuấn Anh', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'anhngt@huit.edu.vn'],

            // --- BỘ MÔN MẠNG MÁY TÍNH VÀ AN TOÀN THÔNG TIN ---
            ['bm' => 'Mạng máy tính và An ninh thông tin', 'ten' => 'Nguyễn Hồng Vũ', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Trưởng Khoa - Phụ trách bộ môn', 'email' => 'vunh@huit.edu.vn'],
            ['bm' => 'Mạng máy tính và An ninh thông tin', 'ten' => 'Vũ Đức Thịnh', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'thinhvd@huit.edu.vn'],
            ['bm' => 'Mạng máy tính và An ninh thông tin', 'ten' => 'Đinh Huy Hoàng', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'hoangdh@huit.edu.vn'],
            ['bm' => 'Mạng máy tính và An ninh thông tin', 'ten' => 'Phạm Tuấn Khiêm', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'khiempt@huit.edu.vn'],
            ['bm' => 'Mạng máy tính và An ninh thông tin', 'ten' => 'Nguyễn Thị Hồng Thảo', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'thaonth@huit.edu.vn'],
            ['bm' => 'Mạng máy tính và An ninh thông tin', 'ten' => 'Trần Đắc Tốt', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Giảng viên', 'email' => 'tottd@huit.edu.vn'],
            ['bm' => 'Mạng máy tính và An ninh thông tin', 'ten' => 'Nguyễn Văn Tùng', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Giảng viên', 'email' => 'tungnv@huit.edu.vn'],
            ['bm' => 'Mạng máy tính và An ninh thông tin', 'ten' => 'Nguyễn Quốc Sử', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Giảng viên', 'email' => 'sunq@huit.edu.vn'],
            ['bm' => 'Mạng máy tính và An ninh thông tin', 'ten' => 'Trần Thị Bích Vân', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'vanttb@huit.edu.vn'],
            ['bm' => 'Mạng máy tính và An ninh thông tin', 'ten' => 'Lê Anh Tuấn', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'tuanla@huit.edu.vn'],
            ['bm' => 'Mạng máy tính và An ninh thông tin', 'ten' => 'Lê Tỷ Khánh', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'khanhlt@huit.edu.vn'],
            ['bm' => 'Mạng máy tính và An ninh thông tin', 'ten' => 'Nguyễn Phương Hạc', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'hacnp@huit.edu.vn'],
            ['bm' => 'Mạng máy tính và An ninh thông tin', 'ten' => 'Phạm Nguyễn Huy Phương', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'phuongpnh@huit.edu.vn'],
            ['bm' => 'Mạng máy tính và An ninh thông tin', 'ten' => 'Hồ Hải Quân', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Giảng viên', 'email' => 'quanhh@huit.edu.vn'],

            // --- BỘ MÔN CÔNG NGHỆ SỐ ---
            ['bm' => 'Công nghệ số', 'ten' => 'Trần Khải Thiện', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Phụ trách bộ môn', 'email' => 'thientk@huit.edu.vn'],
            ['bm' => 'Công nghệ số', 'ten' => 'Huỳnh Thái Học', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'hocht@huit.edu.vn'],
            ['bm' => 'Công nghệ số', 'ten' => 'Nguyễn Thành Ngô', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'ngont@gradpro.test'], // Tự động tạo email nếu thiếu
            ['bm' => 'Công nghệ số', 'ten' => 'Lê Trần Minh Đạt', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'datltm@huit.edu.vn'],
            ['bm' => 'Công nghệ số', 'ten' => 'Vũ Phú Lộc', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'locvp@huit.edu.vn'],
            ['bm' => 'Công nghệ số', 'ten' => 'Lữ Thị Cẩm Tú', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'tultc@huit.edu.vn'],
            ['bm' => 'Công nghệ số', 'ten' => 'Võ Hoàng Hải', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'haivh@huit.edu.vn'],
        ];

        $gvCounter = 1;
        $faker = \Faker\Factory::create();

        foreach ($lecturersData as $data) {
            // Lấy ID bộ môn từ Map.
            $boMonId = $khoaBomonDbMap->get($data['bm']);

            if (!$boMonId) {
                $this->command->error("Không tìm thấy ID cho bộ môn: '{$data['bm']}'. Bỏ qua GV: {$data['ten']}");
                continue;
            }

            $email = $data['email'];
            if (empty($email)) {
                $email = $this->generateEmailFromName($data['ten']);
            }
            
            // Tạo Nguoidung
            $user = Nguoidung::create([
                'MA_DINHDANH' => 'GV' . str_pad($gvCounter++, 3, '0', STR_PAD_LEFT),
                'EMAIL' => $email,
                'MATKHAU_BAM' => Hash::make('123'),
                'HODEM_VA_TEN' => $data['ten'],
                'NGAYSINH' => $faker->date('Y-m-d', '1995-12-31'),
                'ID_VAITRO' => $gvRoleId,
                'TRANGTHAI_KICHHOAT' => true,
                'LA_DANGNHAP_LANDAU' => false,
            ]);

            // Tạo Giangvien
            $gv = Giangvien::create([
                'ID_NGUOIDUNG' => $user->ID_NGUOIDUNG,
                'ID_KHOA_BOMON' => $boMonId,
                'HOCVI' => $this->parseHocVi($data['hocvi']),
            ]);

            // Gán Chức vụ dựa trên text chức vụ trong mảng dữ liệu
            $chucVuText = $data['chucvu'];
            
            // Logic gán chức vụ (kiểm tra chuỗi)
            if (Str::contains($chucVuText, 'Trưởng Khoa') && !Str::contains($chucVuText, 'Phó')) {
                $gv->chucvus()->attach($cvMap['TRUONG_KHOA']);
            }
            if (Str::contains($chucVuText, 'Phó Trưởng Khoa') || Str::contains($chucVuText, 'Phó Khoa')) {
                $gv->chucvus()->attach($cvMap['PHO_KHOA']);
            }
            if (Str::contains($chucVuText, 'Trưởng Bộ môn') || Str::contains($chucVuText, 'Phụ trách bộ môn') || Str::contains($chucVuText, 'Trưởng bộ môn')) {
                $gv->chucvus()->attach($cvMap['TRUONG_BOMON']);
            }
            // Nếu có "Giáo vụ" trong danh sách (hiện tại trong ảnh không có, nhưng logic này dự phòng)
            if (Str::contains($chucVuText, 'Giáo vụ')) {
                 $gv->chucvus()->attach($cvMap['GIAO_VU']);
            }
        }

        $this->command->info("Đã tạo thành công " . ($gvCounter - 1) . " giảng viên.");

        // 6. TẠO SINH VIÊN CỤ THỂ
        $this->command->info('Đang tạo dữ liệu cho 3 SV cụ thể...');
        if ($svRoleId) {
            Nguoidung::factory()->asSinhVien()->create([
                'HODEM_VA_TEN' => 'Trần Văn An',
                'EMAIL' => 'sv.antv@gradpro.test',
                'MA_DINHDANH' => '200120001',
                'NGAYSINH' => '2000-01-01',
            ]);
            Nguoidung::factory()->asSinhVien()->create([
                'HODEM_VA_TEN' => 'Nguyễn Thị Bình',
                'EMAIL' => 'sv.binhnt@gradpro.test',
                'MA_DINHDANH' => '200120002',
                'NGAYSINH' => '2000-02-02',
            ]);
            Nguoidung::factory()->asSinhVien()->create([
                'HODEM_VA_TEN' => 'Lê Minh Cường',
                'EMAIL' => 'sv.cuonglm@gradpro.test',
                'MA_DINHDANH' => '200120003',
                'NGAYSINH' => '2000-03-03',
            ]);
        }

        // 7. TẠO 50 SV TÊN TIẾNG VIỆT
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

        if ($svRoleId) {
            foreach ($vietnameseNames as $index => $name) {
                $email = $this->generateStudentEmailFromName($name, $index);
                $mssv = '200121' . str_pad($index + 1, 3, '0', STR_PAD_LEFT); 
                
                Nguoidung::factory()
                    ->asSinhVien() 
                    ->create([
                        'HODEM_VA_TEN' => $name,
                        'EMAIL' => $email,
                        'MA_DINHDANH' => $mssv,
                        'ID_VAITRO' => $svRoleId,
                        'NGAYSINH' => $faker->date('Y-m-d', '2000-01-01'),
                    ]);
            }
        }
        $this->command->info('Đã tạo 50 SV Tiếng Việt.');

        // 8. Cập nhật trạng thái cho một số SV
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