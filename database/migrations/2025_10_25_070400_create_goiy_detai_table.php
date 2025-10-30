<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('GOIY_DETAI', function (Blueprint $table) {
            $table->id('ID_GOIY');
            $table->unsignedBigInteger('ID_DETAI');
            $table->unsignedBigInteger('ID_NGUOI_GOIY'); // ID_GIANGVIEN
            $table->text('NOIDUNG_GOIY');
            $table->timestamp('NGAYTAO')->nullable()->useCurrent();

            $table->foreign('ID_DETAI')->references('ID_DETAI')->on('DETAI')->cascadeOnDelete();
            $table->foreign('ID_NGUOI_GOIY')->references('ID_GIANGVIEN')->on('GIANGVIEN');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('GOIY_DETAI');
    }
};
