<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('LICH_SU_HOAT_DONG', function (Blueprint $table) {
            $table->id('ID_LICHSU');
            $table->unsignedBigInteger('ID_NGUOIDUNG');
            $table->unsignedBigInteger('ID_NHOM')->nullable();
            $table->string('LOAI_HANH_DONG', 50);
            $table->string('TIEU_DE', 255);
            $table->json('CHI_TIET')->nullable();
            $table->string('ICON', 50)->nullable();
            $table->timestamp('NGAY_TAO')->useCurrent();

            $table->foreign('ID_NGUOIDUNG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->onDelete('cascade');
        });
    }
    public function down(): void { Schema::dropIfExists('LICH_SU_HOAT_DONG'); }
};