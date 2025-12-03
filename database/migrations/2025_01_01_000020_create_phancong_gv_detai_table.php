<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('PHANCONG_GV_DETAI', function (Blueprint $table) {
            $table->id('ID_PHANCONG_GV');
            $table->unsignedBigInteger('ID_GIANGVIEN');
            $table->unsignedBigInteger('ID_DETAI')->nullable();
            $table->integer('SO_DETAI_PHANCONG')->default(1);
            $table->unsignedBigInteger('ID_NGUOI_PHANCONG');
            $table->text('GHICHU')->nullable();
            $table->enum('TRANGTHAI', ['Đang phân công', 'Hoàn thành', 'Ngừng phân công'])->default('Đang phân công');
            $table->timestamps();

            $table->foreign('ID_GIANGVIEN')->references('ID_GIANGVIEN')->on('GIANGVIEN')->onDelete('cascade');
            $table->foreign('ID_DETAI')->references('ID_DETAI')->on('DETAI')->onDelete('cascade');
        });
    }
    public function down(): void { Schema::dropIfExists('PHANCONG_GV_DETAI'); }
};