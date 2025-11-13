<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('DANHSACH_KIEMTRA_CONGVIEC', function (Blueprint $table) {
            $table->id('ID_MUCON');
            $table->unsignedBigInteger('ID_CONGVIEC');
            $table->string('NOIDUNG_MUC', 255);
            $table->boolean('DA_HOANTHANH')->default(false);
            $table->integer('THUTU_HIENTHI')->default(0);
            $table->timestamp('NGAYTAO')->nullable()->useCurrent();
            
            $table->foreign('ID_CONGVIEC')->references('ID_CONGVIEC')->on('CONGVIEC')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('DANHSACH_KIEMTRA_CONGVIEC');
    }
};