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
        // Bảng 1: Phiếu Nộp Sản Phẩm (Lịch sử các lần nộp)
        Schema::create('NOP_SANPHAM', function (Blueprint $table) {
            $table->id('ID_NOP_SANPHAM');

            // Khóa ngoại đến bảng PHANCONG_DETAI_NHOM
            $table->unsignedBigInteger('ID_PHANCONG');
            $table->foreign('ID_PHANCONG')->references('ID_PHANCONG')->on('PHANCONG_DETAI_NHOM')->onDelete('cascade');

            // Người nộp (Sinh viên)
            $table->unsignedBigInteger('ID_NGUOI_NOP');
            $table->foreign('ID_NGUOI_NOP')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('restrict');

            $table->enum('TRANGTHAI', ['Chờ xác nhận', 'Đã xác nhận', 'Yêu cầu nộp lại'])->default('Chờ xác nhận');
            $table->text('PHANHOI_ADMIN')->nullable()->comment('Lý do yêu cầu nộp lại');

            // Người duyệt (Admin, Giáo vụ, Trưởng khoa)
            $table->unsignedBigInteger('ID_NGUOI_XACNHAN')->nullable();
            $table->foreign('ID_NGUOI_XACNHAN')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('set null');

            $table->timestamp('NGAY_XACNHAN')->nullable();
            $table->timestamp('NGAY_NOP')->useCurrent();
        });

        // Bảng 2: Chi tiết các file của mỗi lần nộp
        Schema::create('FILE_NOP_SANPHAM', function (Blueprint $table) {
            $table->id('ID_FILE');

            // Khóa ngoại đến phiếu nộp
            $table->unsignedBigInteger('ID_NOP_SANPHAM');
            $table->foreign('ID_NOP_SANPHAM')->references('ID_NOP_SANPHAM')->on('NOP_SANPHAM')->onDelete('cascade');

            $table->string('LOAI_FILE', 50)->comment('BaoCaoPDF, SourceCodeZIP, LinkDemo, LinkRepository');
            $table->text('DUONG_DAN_HOAC_NOI_DUNG')->comment('Path file trên storage hoặc URL');
            $table->string('TEN_FILE_GOC', 255)->nullable();
            $table->unsignedBigInteger('KICH_THUOC_FILE')->nullable()->comment('Tính bằng bytes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('FILE_NOP_SANPHAM');
        Schema::dropIfExists('NOP_SANPHAM');
    }
};