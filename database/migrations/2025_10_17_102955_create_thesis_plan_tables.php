<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Bảng 1: KEHOACH_KHOALUAN
        Schema::create('KEHOACH_KHOALUAN', function (Blueprint $table) {
            $table->id('ID_KEHOACH');
            $table->string('TEN_DOT', 100);
            $table->string('NAMHOC', 20);
            $table->enum('HOCKY', ['1', '2', '3']);
            $table->string('KHOAHOC', 10);
            $table->enum('HEDAOTAO', ['Cử nhân', 'Kỹ sư', 'Thạc sỹ']);
            $table->unsignedTinyInteger('SO_TUAN_THUCHIEN')->default(12)->comment('Số tuần thực tế thực hiện kế hoạch');

            $table->unsignedTinyInteger('SO_THANHVIEN_TOITHIEU')->default(1);
            $table->unsignedTinyInteger('SO_THANHVIEN_TOIDA')->default(4);
            
            $table->enum('TRANGTHAI', [
                'Bản nháp', 'Chờ phê duyệt', 'Yêu cầu chỉnh sửa', 'Đã phê duyệt',
                'Đã hủy', 'Đang thực hiện', 'Đang chấm điểm', 'Đã hoàn thành',
                'Chờ duyệt chỉnh sửa'
            ])->default('Bản nháp');

            $table->boolean('TRANGTHAI_KICHHOAT')->default(true);
            $table->timestamp('NGAY_BATDAU')->nullable();
            $table->timestamp('NGAY_KETHUC')->nullable();
            $table->unsignedBigInteger('ID_NGUOITAO')->nullable();
            $table->unsignedBigInteger('ID_NGUOIPHEDUYET')->nullable()->comment('ID của Trưởng khoa đã phê duyệt');
            $table->text('BINHLUAN_PHEDUYET')->nullable();
            $table->decimal('TYTRONG_DIEM_QUATRINH', 5, 2)->nullable();
            $table->decimal('TYTRONG_DIEM_HOIDONG', 5, 2)->nullable();
            $table->timestamp('NGAYTAO')->nullable()->useCurrent();
            $table->timestamp('NGAYCAPNHAT')->nullable()->useCurrentOnUpdate();
            
            $table->foreign('ID_NGUOITAO')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('set null');
            $table->foreign('ID_NGUOIPHEDUYET')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('set null');
        });

        // Bảng 2: MOC_THOIGIAN
        Schema::create('MOC_THOIGIAN', function (Blueprint $table) {
            $table->id('ID');
            $table->unsignedBigInteger('ID_KEHOACH');
            $table->string('TEN_SUKIEN');
            $table->timestamp('NGAY_BATDAU')->nullable();
            $table->timestamp('NGAY_KETTHUC')->nullable();
            $table->text('MOTA')->nullable();
            $table->string('VAITRO_THUCHIEN', 255)->nullable()->comment('Vai trò thực hiện, vd: "Giảng viên,Sinh viên"');
            $table->timestamps();
            $table->foreign('ID_KEHOACH')->references('ID_KEHOACH')->on('KEHOACH_KHOALUAN')->onDelete('cascade');
        });

        // Bảng 3: SINHVIEN_THAMGIA
        Schema::create('SINHVIEN_THAMGIA', function (Blueprint $table) {
            $table->id('ID_THAMGIA');
            $table->unsignedBigInteger('ID_KEHOACH');
            $table->unsignedBigInteger('ID_SINHVIEN');
            $table->boolean('DU_DIEUKIEN')->default(true)->comment('Đánh dấu sinh viên đủ điều kiện tham gia');
            $table->timestamp('NGAY_DANGKY')->useCurrent();

            $table->foreign('ID_KEHOACH')->references('ID_KEHOACH')->on('KEHOACH_KHOALUAN')->onDelete('cascade');
            $table->foreign('ID_SINHVIEN')->references('ID_SINHVIEN')->on('SINHVIEN')->onDelete('cascade');

            $table->unique(['ID_KEHOACH', 'ID_SINHVIEN'], 'UQ_SINHVIEN_TRONG_DOT');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('SINHVIEN_THAMGIA');
        Schema::dropIfExists('MOC_THOIGIAN');
        Schema::dropIfExists('KEHOACH_KHOALUAN');
    }
};