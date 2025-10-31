<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('DETAI', function (Blueprint $table) {
            $table->id('ID_DETAI');
            $table->unsignedBigInteger('ID_KEHOACH');
            $table->string('MA_DETAI', 20)->nullable()->unique();
            $table->string('TEN_DETAI', 255);
            $table->text('MOTA');
            $table->unsignedBigInteger('ID_CHUYENNGANH')->nullable();
            $table->text('YEUCAU')->nullable();
            $table->text('MUCTIEU')->nullable();
            $table->text('KETQUA_MONGDOI')->nullable();
            $table->unsignedBigInteger('ID_NGUOI_DEXUAT'); // ID_GIANGVIEN
            $table->integer('SO_NHOM_TOIDA')->default(1); // Số nhóm tối đa có thể đăng ký
            $table->integer('SO_NHOM_HIENTAI')->default(0);
            $table->enum('TRANGTHAI', ['Nháp', 'Chờ duyệt', 'Yêu cầu chỉnh sửa', 'Đã duyệt', 'Đã đầy', 'Đã khóa'])
                ->default('Nháp');
            $table->unsignedBigInteger('ID_NGUOI_DUYET')->nullable(); // ID_NGUOIDUNG của người duyệt
            $table->timestamp('NGAY_DUYET')->nullable();
            $table->text('LYDO_TUCHOI')->nullable();
            $table->timestamp('NGAYTAO')->nullable()->useCurrent();
            $table->timestamp('NGAYCAPNHAT')->nullable()->useCurrentOnUpdate();

            $table->foreign('ID_KEHOACH')->references('ID_KEHOACH')->on('KEHOACH_KHOALUAN');
            $table->foreign('ID_NGUOI_DEXUAT')->references('ID_GIANGVIEN')->on('GIANGVIEN');
            $table->foreign('ID_NGUOI_DUYET')->references('ID_NGUOIDUNG')->on('NGUOIDUNG');
            $table->foreign('ID_CHUYENNGANH')->references('ID_CHUYENNGANH')->on('CHUYENNGANH');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('DETAI');
    }
};