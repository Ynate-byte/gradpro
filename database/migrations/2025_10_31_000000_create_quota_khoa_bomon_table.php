<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('QUOTA_KHOA_BOMON', function (Blueprint $table) {
            $table->id('ID_QUOTA');
            $table->unsignedBigInteger('ID_KEHOACH');
            $table->unsignedBigInteger('ID_KHOA_BOMON');
            $table->unsignedBigInteger('ID_NGUOI_PHANCONG'); // Admin phân công
            $table->integer('SO_DETAI_QUOTA')->default(0); // Số đề tài được phép đề xuất cho khoa/bộ môn
            $table->timestamp('NGAY_PHANCONG')->useCurrent();
            $table->text('GHICHU')->nullable();
            $table->enum('TRANGTHAI', ['Đang phân công', 'Hoàn thành', 'Ngừng phân công'])
                ->default('Đang phân công');

            $table->unique(['ID_KEHOACH', 'ID_KHOA_BOMON'], 'UQ_KEHOACH_KHOA_QUOTA');

            $table->foreign('ID_KEHOACH')->references('ID_KEHOACH')->on('KEHOACH_KHOALUAN')->cascadeOnDelete();
            $table->foreign('ID_KHOA_BOMON')->references('ID_KHOA_BOMON')->on('KHOA_BOMON')->cascadeOnDelete();
            $table->foreign('ID_NGUOI_PHANCONG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('QUOTA_KHOA_BOMON');
    }
};
