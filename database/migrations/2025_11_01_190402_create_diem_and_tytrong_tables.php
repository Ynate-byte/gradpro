<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /**
         * ===========================
         * 1️⃣ BẢNG TỶ TRỌNG ĐIỂM
         * ===========================
         */
        Schema::create('TYTRONG_DIEM', function (Blueprint $table) {
            $table->id('ID_TYTRONG');
            $table->decimal('HUONGDAN', 5, 2)->default(0.4)->comment('Tỷ trọng điểm giảng viên hướng dẫn');
            $table->decimal('PHANBIEN', 5, 2)->default(0.3)->comment('Tỷ trọng điểm giảng viên phản biện');
            $table->decimal('HOIDONG', 5, 2)->default(0.3)->comment('Tỷ trọng điểm hội đồng');
            $table->timestamps();
        });

        /**
         * ===========================
         * 2️⃣ BẢNG ĐIỂM HƯỚNG DẪN
         * ===========================
         */
        Schema::create('DIEM_HUONGDAN', function (Blueprint $table) {
            $table->id('ID_DIEM_HD');
            $table->unsignedBigInteger('ID_NHOM');
            $table->unsignedBigInteger('ID_GIANGVIEN');
            $table->decimal('DIEM', 5, 2)->nullable();
            $table->text('NHANXET')->nullable();
            $table->timestamps();

            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->onDelete('cascade');
            $table->foreign('ID_GIANGVIEN')->references('ID_GIANGVIEN')->on('GIANGVIEN')->onDelete('cascade');
            $table->unique(['ID_NHOM', 'ID_GIANGVIEN']); // Đảm bảo GV chỉ chấm 1 lần
        });

        /**
         * ===========================
         * 3️⃣ BẢNG ĐIỂM PHẢN BIỆN
         * ===========================
         */
        Schema::create('DIEM_PHANBIEN', function (Blueprint $table) {
            $table->id('ID_DIEM_PB');
            $table->unsignedBigInteger('ID_NHOM');
            $table->unsignedBigInteger('ID_GIANGVIEN');
            $table->decimal('DIEM', 5, 2)->nullable();
            $table->text('NHANXET')->nullable();
            $table->timestamps();

            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->onDelete('cascade');
            $table->foreign('ID_GIANGVIEN')->references('ID_GIANGVIEN')->on('GIANGVIEN')->onDelete('cascade');
            $table->unique(['ID_NHOM', 'ID_GIANGVIEN']); // Đảm bảo GV chỉ chấm 1 lần
        });

        /**
         * ===========================
         * 4️⃣ BẢNG ĐIỂM HỘI ĐỒNG
         * ===========================
         */
        Schema::create('DIEM_HOIDONG', function (Blueprint $table) {
            $table->id('ID_DIEM_HDONG');
            $table->unsignedBigInteger('ID_NHOM');
            $table->unsignedBigInteger('ID_GIANGVIEN');
            $table->decimal('DIEM', 5, 2)->nullable();
            $table->text('NHANXET')->nullable();
            $table->timestamps();

            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->onDelete('cascade');
            $table->foreign('ID_GIANGVIEN')->references('ID_GIANGVIEN')->on('GIANGVIEN')->onDelete('cascade');
            $table->unique(['ID_NHOM', 'ID_GIANGVIEN']); // Đảm bảo GV chỉ chấm 1 lần
        });

        /**
         * ===========================
         * 5️⃣ BẢNG ĐIỂM TỔNG KẾT
         * ===========================
         */
        Schema::create('DIEM_TONGKET', function (Blueprint $table) {
            $table->id('ID_DIEMTK');
            $table->unsignedBigInteger('ID_NHOM');
            $table->decimal('DIEM_HD', 5, 2)->nullable()->comment('Điểm trung bình hướng dẫn');
            $table->decimal('DIEM_PB', 5, 2)->nullable()->comment('Điểm trung bình phản biện');
            $table->decimal('DIEM_HDONG', 5, 2)->nullable()->comment('Điểm trung bình hội đồng');
            $table->decimal('DIEM_TONG', 5, 2)->nullable()->comment('Điểm tổng kết sau tỷ trọng');
            $table->timestamps();

            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->onDelete('cascade');
            $table->unique('ID_NHOM'); // Mỗi nhóm chỉ có 1 điểm tổng kết
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('DIEM_TONGKET');
        Schema::dropIfExists('DIEM_HOIDONG');
        Schema::dropIfExists('DIEM_PHANBIEN');
        Schema::dropIfExists('DIEM_HUONGDAN');
        Schema::dropIfExists('TYTRONG_DIEM');
    }
};