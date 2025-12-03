<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('QUOTA_GIANGVIEN', function (Blueprint $table) {
            $table->id('ID_QUOTA');
            $table->unsignedBigInteger('ID_KEHOACH');
            $table->unsignedBigInteger('ID_GIANGVIEN');
            $table->unsignedBigInteger('ID_NGUOI_PHANCONG');
            $table->integer('SO_DETAI_QUOTA')->default(0);
            $table->timestamp('NGAY_PHANCONG')->useCurrent();
            $table->text('GHICHU')->nullable();
            $table->enum('TRANGTHAI', ['Đang phân công', 'Hoàn thành', 'Ngừng phân công'])->default('Đang phân công');

            $table->unique(['ID_KEHOACH', 'ID_GIANGVIEN']);
            $table->foreign('ID_KEHOACH')->references('ID_KEHOACH')->on('KEHOACH_KHOALUAN')->onDelete('cascade');
            $table->foreign('ID_GIANGVIEN')->references('ID_GIANGVIEN')->on('GIANGVIEN')->onDelete('cascade');
            $table->foreign('ID_NGUOI_PHANCONG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG');
        });
    }
    public function down(): void { Schema::dropIfExists('QUOTA_GIANGVIEN'); }
};