<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('NHOM', function (Blueprint $table) {
            $table->id('ID_NHOM');
            $table->unsignedBigInteger('ID_KEHOACH');
            $table->string('TEN_NHOM', 100);
            $table->text('MOTA')->nullable();
            $table->string('MA_NHOM', 20)->unique()->nullable();
            $table->unsignedBigInteger('ID_NHOMTRUONG')->nullable();
            $table->unsignedBigInteger('ID_CHUYENNGANH')->nullable();
            $table->unsignedBigInteger('ID_KHOA_BOMON')->nullable();
            $table->boolean('LA_NHOM_DACBIET')->default(false);
            $table->integer('SO_THANHVIEN_HIENTAI')->default(1);
            $table->enum('TRANGTHAI', ['Đang mở', 'Đã đủ thành viên', 'Đã có đề tài', 'Đang thực hiện', 'Đã hoàn thành'])->default('Đang mở');
            $table->timestamp('NGAYTAO')->useCurrent();
            $table->timestamp('NGAYCAPNHAT')->nullable()->useCurrentOnUpdate();

            $table->foreign('ID_KEHOACH')->references('ID_KEHOACH')->on('KEHOACH_KHOALUAN')->onDelete('cascade');
            $table->foreign('ID_NHOMTRUONG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->nullOnDelete();
            $table->foreign('ID_CHUYENNGANH')->references('ID_CHUYENNGANH')->on('CHUYENNGANH')->nullOnDelete();
            $table->foreign('ID_KHOA_BOMON')->references('ID_KHOA_BOMON')->on('KHOA_BOMON')->nullOnDelete();
        });
    }
    public function down(): void { Schema::dropIfExists('NHOM'); }
};