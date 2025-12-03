<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class GiangVienSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('123');
        
        $bmMap = DB::table('KHOA_BOMON')->pluck('ID_KHOA_BOMON', 'TEN_KHOA_BOMON');
        $cvMap = DB::table('CHUCVU')->pluck('ID_CHUCVU', 'MA_CHUCVU');

        $lecturers = [
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
            ['bm' => 'Khoa học dữ liệu', 'ten' => 'Nguyễn Thị Huyền Trang', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'trangnthuyen@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Nguyễn Văn Lễ', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Phó trưởng bộ môn', 'email' => 'lenv@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Trần Thị Vân Anh', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'anhttv@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Nguyễn Thị Định', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'dinhnt@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Nguyễn Thế Hữu', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên - Bí thư Liên chi đoàn', 'email' => 'huunv@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Lê Thị Thùy Lan', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'lanltt@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Đinh Thị Mận', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'mandt@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Nguyễn Thị Thu Tâm', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'tamntt@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Nguyễn Thị Thanh Thủy', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'thuyntt@huit.edu.vn'],
            ['bm' => 'Hệ thống thông tin', 'ten' => 'Trần Như Ý', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên - Tổ trưởng công đoàn', 'email' => 'ytn@huit.edu.vn'],
            ['bm' => 'Kỹ thuật phần mềm', 'ten' => 'Vũ Văn Vinh', 'hocvi' => 'Thạc sĩ, NCS', 'chucvu' => 'Trưởng Bộ môn', 'email' => 'vinhvv@huit.edu.vn'],
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
            ['bm' => 'Mạng máy tính và An ninh thông tin', 'ten' => 'Nguyễn Hồng Vũ', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Trưởng Khoa - Trưởng Bộ môn', 'email' => 'vunh@huit.edu.vn'],
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
            ['bm' => 'Công nghệ số', 'ten' => 'Trần Khải Thiện', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Trưởng Bộ môn', 'email' => 'thientk@huit.edu.vn'],
            ['bm' => 'Công nghệ số', 'ten' => 'Huỳnh Thái Học', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'hocht@huit.edu.vn'],
            ['bm' => 'Công nghệ số', 'ten' => 'Nguyễn Thành Ngô', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'ngont@gradpro.test'],
            ['bm' => 'Công nghệ số', 'ten' => 'Lê Trần Minh Đạt', 'hocvi' => 'Tiến sĩ', 'chucvu' => 'Giảng viên', 'email' => 'datltm@huit.edu.vn'],
            ['bm' => 'Công nghệ số', 'ten' => 'Vũ Phú Lộc', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'locvp@huit.edu.vn'],
            ['bm' => 'Công nghệ số', 'ten' => 'Lữ Thị Cẩm Tú', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'tultc@huit.edu.vn'],
            ['bm' => 'Công nghệ số', 'ten' => 'Võ Hoàng Hải', 'hocvi' => 'Thạc sĩ', 'chucvu' => 'Giảng viên', 'email' => 'haivh@huit.edu.vn'],
        ];

        $stt = 1;

        foreach ($lecturers as $data) {
            $boMonId = $bmMap[$data['bm']] ?? null;
            if (!$boMonId) continue;

            $username = explode('@', $data['email'])[0];
            
            $userId = DB::table('NGUOIDUNG')->insertGetId([
                'MA_DINHDANH' => 'GV' . str_pad($stt++, 3, '0', STR_PAD_LEFT),
                'EMAIL' => $data['email'],
                'MATKHAU_BAM' => $password,
                'HODEM_VA_TEN' => $data['ten'],
                'NGAYSINH' => '1985-01-01',
                'ID_VAITRO' => 2,
                'TRANGTHAI_KICHHOAT' => true,
                'LA_DANGNHAP_LANDAU' => false,
                'NGAYTAO' => now()
            ]);

            $hocViClean = 'Thạc sĩ';
            if (Str::contains($data['hocvi'], 'Tiến sĩ')) $hocViClean = 'Tiến sĩ';
            if (Str::contains($data['hocvi'], 'Phó Giáo sư') || Str::contains($data['hocvi'], 'PGS')) $hocViClean = 'Phó Giáo sư';
            if (Str::contains($data['hocvi'], 'Giáo sư') && !Str::contains($data['hocvi'], 'Phó')) $hocViClean = 'Giáo sư';

            $gvId = DB::table('GIANGVIEN')->insertGetId([
                'ID_NGUOIDUNG' => $userId,
                'ID_KHOA_BOMON' => $boMonId,
                'HOCVI' => $hocViClean,
                'CHUYENMON' => $data['bm'],
                'SO_NHOM_TOIDA' => 5
            ]);

            $chucVuText = $data['chucvu'];
            
            if (Str::contains($chucVuText, 'Trưởng Khoa') && !Str::contains($chucVuText, 'Phó Trưởng Khoa')) {
                DB::table('GIANGVIEN_CHUCVU')->insert(['ID_GIANGVIEN' => $gvId, 'ID_CHUCVU' => $cvMap['TRUONG_KHOA']]);
            }
            if (Str::contains($chucVuText, 'Phó Trưởng Khoa')) {
                DB::table('GIANGVIEN_CHUCVU')->insert(['ID_GIANGVIEN' => $gvId, 'ID_CHUCVU' => $cvMap['PHO_KHOA']]);
            }
            if (Str::contains($chucVuText, 'Trưởng Bộ môn') || Str::contains($chucVuText, 'Trưởng bộ môn')) {
                DB::table('GIANGVIEN_CHUCVU')->insert(['ID_GIANGVIEN' => $gvId, 'ID_CHUCVU' => $cvMap['TRUONG_BOMON']]);
            }
        }
    }
}