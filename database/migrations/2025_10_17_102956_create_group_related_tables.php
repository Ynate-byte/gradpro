<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('NHOM', function (Blueprint $table) {
            $table->id('ID_NHOM');
            $table->unsignedBigInteger('ID_KEHOACH');
            $table->string('TEN_NHOM', 100);
            $table->text('MOTA')->nullable()->comment('Ghi chú hoặc mô tả về nhóm');
            $table->string('MA_NHOM', 20)->unique()->nullable();
            $table->unsignedBigInteger('ID_NHOMTRUONG')->comment('ID_NGUOIDUNG của nhóm trưởng');
            $table->unsignedBigInteger('ID_CHUYENNGANH')->nullable()->comment('FK đến CHUYENNGANH, nhóm này ưu tiên cho chuyên ngành nào');
            $table->unsignedBigInteger('ID_KHOA_BOMON')->nullable()->comment('FK đến KHOA_BOMON, nhóm này ưu tiên cho khoa/bộ môn nào');
            $table->boolean('LA_NHOM_DACBIET')->default(false)->comment('Nhóm đặc biệt do giáo vụ tạo');
            $table->integer('SO_THANHVIEN_HIENTAI')->default(1);
            $table->enum('TRANGTHAI', ['Đang mở', 'Đã đủ thành viên', 'Đã có đề tài', 'Đang thực hiện', 'Đã hoàn thành'])->default('Đang mở');
            $table->timestamp('NGAYTAO')->useCurrent();
            $table->timestamp('NGAYCAPNHAT')->nullable()->useCurrentOnUpdate();

            $table->foreign('ID_KEHOACH')->references('ID_KEHOACH')->on('KEHOACH_KHOALUAN')->onDelete('cascade');
            $table->foreign('ID_NHOMTRUONG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG');
            $table->foreign('ID_CHUYENNGANH')->references('ID_CHUYENNGANH')->on('CHUYENNGANH')->onDelete('set null');
            $table->foreign('ID_KHOA_BOMON')->references('ID_KHOA_BOMON')->on('KHOA_BOMON')->onDelete('set null');
        });

        Schema::create('THANHVIEN_NHOM', function (Blueprint $table) {
            $table->id('ID_THANHVIEN');
            $table->unsignedBigInteger('ID_NHOM');
            $table->unsignedBigInteger('ID_NGUOIDUNG')->comment('ID_NGUOIDUNG của sinh viên');
            $table->timestamp('NGAY_VAONHOM')->useCurrent();

            $table->unique('ID_NGUOIDUNG', 'UQ_THANHVIEN_NGUOIDUNG');
            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->onDelete('cascade');
            $table->foreign('ID_NGUOIDUNG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
        });

        Schema::create('LOIMOI_NHOM', function (Blueprint $table) {
            $table->id('ID_LOIMOI');
            $table->unsignedBigInteger('ID_NHOM');
            $table->unsignedBigInteger('ID_NGUOI_DUOCMOI');
            $table->unsignedBigInteger('ID_NGUOIMOI')->comment('ID_NGUOIDUNG của người mời');
            $table->string('LOINHAN', 150)->nullable();
            $table->enum('TRANGTHAI', ['Đang chờ', 'Chấp nhận', 'Từ chối', 'Hết hạn', 'Đã hủy'])->default('Đang chờ');
            $table->timestamp('NGAYTAO')->useCurrent();
            $table->timestamp('NGAY_HETHAN')->comment('Hết hạn sau 4 ngày');
            $table->timestamp('NGAY_PHANHOI')->nullable();

            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->onDelete('cascade');
            $table->foreign('ID_NGUOI_DUOCMOI')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
            $table->foreign('ID_NGUOIMOI')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
        });

        Schema::create('YEUCAU_VAONHOM', function (Blueprint $table) {
            $table->id('ID_YEUCAU');
            $table->unsignedBigInteger('ID_NHOM');
            $table->unsignedBigInteger('ID_NGUOIDUNG')->comment('ID_NGUOIDUNG của sinh viên xin vào');
            $table->string('LOINHAN', 150)->nullable();
            $table->enum('TRANGTHAI', ['Đang chờ', 'Chấp nhận', 'Từ chối', 'Đã hủy'])->default('Đang chờ');
            $table->timestamp('NGAYTAO')->useCurrent();
            $table->timestamp('NGAY_PHANHOI')->nullable();
            $table->unsignedBigInteger('ID_NGUOI_PHANHOI')->nullable()->comment('ID_NGUOIDUNG của nhóm trưởng phản hồi');

            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->onDelete('cascade');
            $table->foreign('ID_NGUOIDUNG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
            $table->foreign('ID_NGUOI_PHANHOI')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('YEUCAU_VAONHOM');
        Schema::dropIfExists('LOIMOI_NHOM');
        Schema::dropIfExists('THANHVIEN_NHOM');
        Schema::dropIfExists('NHOM');
    }
};