<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('PHANCONG_GV_DETAI', function (Blueprint $table) {
            $table->id('ID_PHANCONG_GV');
            $table->unsignedBigInteger('ID_GIANGVIEN');
            $table->unsignedBigInteger('ID_DETAI')->nullable(); // Null for quota assignments, not null for specific topic assignments
            $table->integer('SO_DETAI_PHANCONG')->default(1); // Number of topics assigned (for quota) or 1 for specific assignment
            $table->unsignedBigInteger('ID_NGUOI_PHANCONG'); // Who assigned this
            $table->timestamp('NGAY_PHANCONG')->useCurrent();
            $table->text('GHICHU')->nullable();
            $table->enum('TRANGTHAI', ['Đang phân công', 'Hoàn thành', 'Hủy bỏ'])
                ->default('Đang phân công');

            $table->unique(['ID_GIANGVIEN', 'ID_DETAI'], 'UQ_PHANCONG_GV_DETAI');

            $table->foreign('ID_GIANGVIEN')->references('ID_GIANGVIEN')->on('GIANGVIEN')->cascadeOnDelete();
            $table->foreign('ID_DETAI')->references('ID_DETAI')->on('DETAI')->nullOnDelete();
            $table->foreign('ID_NGUOI_PHANCONG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('PHANCONG_GV_DETAI');
    }
};
