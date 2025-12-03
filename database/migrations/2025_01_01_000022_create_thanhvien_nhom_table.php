<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('THANHVIEN_NHOM', function (Blueprint $table) {
            $table->id('ID_THANHVIEN');
            $table->unsignedBigInteger('ID_NHOM');
            $table->unsignedBigInteger('ID_NGUOIDUNG');
            $table->timestamp('NGAY_VAONHOM')->useCurrent();

            $table->unique(['ID_NHOM', 'ID_NGUOIDUNG']);
            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->onDelete('cascade');
            $table->foreign('ID_NGUOIDUNG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
        });
    }
    public function down(): void { Schema::dropIfExists('THANHVIEN_NHOM'); }
};