<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('YEUCAU_VAONHOM', function (Blueprint $table) {
            $table->id('ID_YEUCAU');
            $table->unsignedBigInteger('ID_NHOM');
            $table->unsignedBigInteger('ID_NGUOIDUNG');
            $table->string('LOINHAN', 150)->nullable();
            $table->enum('TRANGTHAI', ['Đang chờ', 'Chấp nhận', 'Từ chối', 'Đã hủy'])->default('Đang chờ');
            $table->timestamp('NGAYTAO')->useCurrent();
            $table->timestamp('NGAY_PHANHOI')->nullable();
            $table->unsignedBigInteger('ID_NGUOI_PHANHOI')->nullable();

            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->cascadeOnDelete();
            $table->foreign('ID_NGUOIDUNG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->cascadeOnDelete();
            $table->foreign('ID_NGUOI_PHANHOI')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('set null');
        });
    }
    public function down(): void { Schema::dropIfExists('YEUCAU_VAONHOM'); }
};