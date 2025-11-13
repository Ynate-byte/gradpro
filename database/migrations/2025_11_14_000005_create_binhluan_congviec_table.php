<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('BINHLUAN_CONGVIEC', function (Blueprint $table) {
            $table->id('ID_BINHLUAN');
            $table->unsignedBigInteger('ID_CONGVIEC');
            $table->unsignedBigInteger('ID_NGUOIDUNG');
            
            // Cột tự tham chiếu (nested comments)
            $table->unsignedBigInteger('ID_BINHLUAN_CHA')->nullable();
            
            $table->text('NOIDUNG_BINHLUAN');
            $table->timestamp('NGAYTAO')->nullable()->useCurrent();
            $table->timestamp('NGAYCAPNHAT')->nullable()->useCurrentOnUpdate();

            $table->foreign('ID_CONGVIEC')->references('ID_CONGVIEC')->on('CONGVIEC')->onDelete('cascade');
            $table->foreign('ID_NGUOIDUNG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
            
            // Khóa ngoại tự tham chiếu
            $table->foreign('ID_BINHLUAN_CHA')->references('ID_BINHLUAN')->on('BINHLUAN_CONGVIEC')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('BINHLUAN_CONGVIEC');
    }
};