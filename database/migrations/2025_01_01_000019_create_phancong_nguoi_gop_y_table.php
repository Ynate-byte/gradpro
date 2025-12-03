<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('phancong_nguoi_gop_y', function (Blueprint $table) {
            $table->id('ID_PHANCONG_NGUOI_GOP_Y');
            $table->unsignedBigInteger('ID_DETAI');
            $table->unsignedBigInteger('ID_GIANGVIEN');
            $table->unsignedBigInteger('ID_NGUOI_PHANCONG');
            $table->text('GHICHU')->nullable();
            $table->enum('TRANGTHAI', ['Đang phân công', 'Hoàn thành', 'Hủy'])->default('Đang phân công');
            $table->timestamps();

            $table->foreign('ID_DETAI')->references('ID_DETAI')->on('DETAI')->onDelete('cascade');
            $table->foreign('ID_GIANGVIEN')->references('ID_GIANGVIEN')->on('GIANGVIEN')->onDelete('cascade');
            $table->foreign('ID_NGUOI_PHANCONG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG');
            $table->unique(['ID_DETAI', 'ID_GIANGVIEN']);
        });
    }
    public function down(): void { Schema::dropIfExists('phancong_nguoi_gop_y'); }
};