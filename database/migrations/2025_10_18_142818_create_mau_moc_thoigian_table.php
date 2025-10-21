<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('MAU_MOC_THOIGIAN', function (Blueprint $table) {
            $table->id('ID_MAU_MOC');
            $table->foreignId('ID_MAU')->constrained('MAU_KEHOACH', 'ID_MAU')->onDelete('cascade');
            $table->string('TEN_SUKIEN', 255);
            $table->text('MOTA')->nullable();
            $table->integer('OFFSET_BATDAU')->comment('Số ngày bắt đầu kể từ ngày bắt đầu kế hoạch (đã điều chỉnh)');
            $table->integer('THOI_LUONG')->comment('Số ngày diễn ra sự kiện (bao gồm ngày bắt đầu)');
            $table->integer('THU_TU')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('MAU_MOC_THOIGIAN');
    }
};