<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('LOIMOI_NHOM', function (Blueprint $table) {
            $table->id('ID_LOIMOI');
            $table->unsignedBigInteger('ID_NHOM');
            $table->unsignedBigInteger('ID_NGUOI_DUOCMOI');
            $table->unsignedBigInteger('ID_NGUOIMOI');
            $table->string('LOINHAN', 150)->nullable();
            $table->enum('TRANGTHAI', ['Đang chờ', 'Chấp nhận', 'Từ chối', 'Hết hạn', 'Đã hủy'])->default('Đang chờ');
            $table->timestamp('NGAYTAO')->useCurrent();
            $table->timestamp('NGAY_HETHAN');
            $table->timestamp('NGAY_PHANHOI')->nullable();

            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->cascadeOnDelete();
            $table->foreign('ID_NGUOI_DUOCMOI')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->cascadeOnDelete();
            $table->foreign('ID_NGUOIMOI')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->cascadeOnDelete();
        });
    }
    public function down(): void { Schema::dropIfExists('LOIMOI_NHOM'); }
};