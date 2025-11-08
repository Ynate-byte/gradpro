<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tạo bảng mới để chứa các phản hồi
        Schema::create('PHANHOI_GOIY', function (Blueprint $table) {
            $table->id('ID_PHANHOI');
            $table->unsignedBigInteger('ID_GOIY'); // Khóa ngoại đến bảng GOIY_DETAI
            $table->unsignedBigInteger('ID_GIANGVIEN'); // Khóa ngoại đến bảng GIANGVIEN
            $table->text('NOIDUNG');
            $table->timestamps(); // Thêm created_at và updated_at

            // Thiết lập khóa ngoại
            $table->foreign('ID_GOIY')->references('ID_GOIY')->on('GOIY_DETAI')->onDelete('cascade');
            $table->foreign('ID_GIANGVIEN')->references('ID_GIANGVIEN')->on('GIANGVIEN')->onDelete('cascade');
        });

        // 2. Xóa các cột phản hồi cũ khỏi bảng GOIY_DETAI
        Schema::table('GOIY_DETAI', function (Blueprint $table) {
            $table->dropColumn(['PHAN_HOI', 'NGAY_PHAN_HOI']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Thêm lại các cột cũ vào GOIY_DETAI
        Schema::table('GOIY_DETAI', function (Blueprint $table) {
            $table->text('PHAN_HOI')->nullable()->after('NGAYTAO');
            $table->timestamp('NGAY_PHAN_HOI')->nullable()->after('PHAN_HOI');
        });

        // 2. Xóa bảng mới
        Schema::dropIfExists('PHANHOI_GOIY');
    }
};