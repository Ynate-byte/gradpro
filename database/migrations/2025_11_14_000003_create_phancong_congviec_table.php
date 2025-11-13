<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('PHANCONG_CONGVIEC', function (Blueprint $table) {
            $table->id('ID_PHANCONG');
            $table->unsignedBigInteger('ID_CONGVIEC');
            $table->unsignedBigInteger('ID_NGUOIDUNG')->comment('ID Sinh vien duoc gan');
            $table->timestamp('NGAY_PHANCONG')->nullable()->useCurrent();

            // Đảm bảo 1 sinh viên chỉ được gán 1 lần cho 1 công việc
            $table->unique(['ID_CONGVIEC', 'ID_NGUOIDUNG'], 'UQ_CONGVIEC_NGUOIDUNG');

            $table->foreign('ID_CONGVIEC')->references('ID_CONGVIEC')->on('CONGVIEC')->onDelete('cascade');
            $table->foreign('ID_NGUOIDUNG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('PHANCONG_CONGVIEC');
    }
};