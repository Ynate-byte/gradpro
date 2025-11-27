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
            $table->unsignedBigInteger('ID_KHOA_BOMON')->nullable(); 
            $table->text('YEUCAU')->nullable();
            $table->text('MUCTIEU')->nullable();
            $table->text('KETQUA_MONGDOI')->nullable();
            $table->unsignedBigInteger('ID_NGUOI_DEXUAT');
            $table->integer('SO_NHOM_TOIDA')->default(1);
            $table->integer('SO_NHOM_HIENTAI')->default(0);
            $table->enum('TRANGTHAI', ['Nháp', 'Chờ duyệt', 'Yêu cầu chỉnh sửa', 'Đã duyệt', 'Đã đầy', 'Đã khóa', 'Từ chối', 'Đang chỉnh sửa'])
                ->default('Nháp');
            $table->unsignedBigInteger('ID_NGUOI_DUYET')->nullable();
            $table->timestamp('NGAY_DUYET')->nullable();
            $table->text('LYDO_TUCHOI')->nullable();
            $table->timestamp('NGAYTAO')->nullable()->useCurrent();
            $table->timestamp('NGAYCAPNHAT')->nullable()->useCurrentOnUpdate();
            $table->foreign('ID_KEHOACH')->references('ID_KEHOACH')->on('KEHOACH_KHOALUAN');
            $table->foreign('ID_NGUOI_DEXUAT')->references('ID_GIANGVIEN')->on('GIANGVIEN');
            $table->foreign('ID_NGUOI_DUYET')->references('ID_NGUOIDUNG')->on('NGUOIDUNG');
            $table->foreign('ID_KHOA_BOMON')->references('ID_KHOA_BOMON')->on('KHOA_BOMON')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('DETAI');
    }
};