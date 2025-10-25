<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('SINHVIEN', function (Blueprint $table) {
            $table->id('ID_SINHVIEN');
            $table->unsignedBigInteger('ID_NGUOIDUNG');
            $table->unsignedBigInteger('ID_CHUYENNGANH');
            $table->string('TEN_LOP', 50)->nullable();
            $table->string('NIENKHOA', 10)->comment('Ví dụ: K13');
            $table->enum('HEDAOTAO', ['Cử nhân', 'Kỹ sư', 'Thạc sỹ']);

            $table->foreign('ID_NGUOIDUNG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
            $table->foreign('ID_CHUYENNGANH')->references('ID_CHUYENNGANH')->on('CHUYENNGANH');
            $table->unique('ID_NGUOIDUNG');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('SINHVIEN');
    }
};