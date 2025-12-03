<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('GIANGVIEN', function (Blueprint $table) {
            $table->id('ID_GIANGVIEN');
            $table->unsignedBigInteger('ID_NGUOIDUNG')->unique();
            $table->unsignedBigInteger('ID_KHOA_BOMON');
            $table->enum('HOCVI', ['Tiến sĩ', 'Thạc sĩ', 'Giáo sư', 'Phó Giáo sư']);
            $table->text('CHUYENMON')->nullable();
            $table->integer('SO_NHOM_TOIDA')->default(5);

            $table->foreign('ID_NGUOIDUNG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
            $table->foreign('ID_KHOA_BOMON')->references('ID_KHOA_BOMON')->on('KHOA_BOMON');
        });
    }
    public function down(): void { Schema::dropIfExists('GIANGVIEN'); }
};