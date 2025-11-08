<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('PHANCONG_DETAI_NHOM', function (Blueprint $table) {
            $table->id('ID_PHANCONG');
            $table->unsignedBigInteger('ID_NHOM');
            $table->unsignedBigInteger('ID_DETAI');
            $table->unsignedBigInteger('ID_GVHD'); // ID_GIANGVIEN - GVHD
            $table->timestamp('NGAY_PHANCONG')->nullable()->useCurrent();
            $table->enum('TRANGTHAI', ['Đang thực hiện', 'Đã hoàn thành', 'Không đạt'])
                ->default('Đang thực hiện');

            $table->unique(['ID_NHOM'], 'UQ_PHANCONG_DETAI_NHOM_ID_NHOM');
            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->cascadeOnDelete();
            $table->foreign('ID_DETAI')->references('ID_DETAI')->on('DETAI');
            $table->foreign('ID_GVHD')->references('ID_GIANGVIEN')->on('GIANGVIEN');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('PHANCONG_DETAI_NHOM');
    }
};