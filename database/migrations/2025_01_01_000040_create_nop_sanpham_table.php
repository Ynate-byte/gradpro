<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('NOP_SANPHAM', function (Blueprint $table) {
            $table->id('ID_NOP_SANPHAM');
            $table->unsignedBigInteger('ID_PHANCONG');
            $table->unsignedBigInteger('ID_NGUOI_NOP');
            $table->enum('TRANGTHAI', ['Chờ xác nhận', 'Đã xác nhận', 'Yêu cầu nộp lại'])->default('Chờ xác nhận');
            $table->text('PHANHOI_ADMIN')->nullable();
            $table->unsignedBigInteger('ID_NGUOI_XACNHAN')->nullable();
            $table->timestamp('NGAY_XACNHAN')->nullable();
            $table->timestamp('NGAY_NOP')->useCurrent();

            $table->foreign('ID_PHANCONG')->references('ID_PHANCONG')->on('PHANCONG_DETAI_NHOM')->onDelete('cascade');
            $table->foreign('ID_NGUOI_NOP')->references('ID_NGUOIDUNG')->on('NGUOIDUNG');
            $table->foreign('ID_NGUOI_XACNHAN')->references('ID_NGUOIDUNG')->on('NGUOIDUNG');
        });
    }
    public function down(): void { Schema::dropIfExists('NOP_SANPHAM'); }
};