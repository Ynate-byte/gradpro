<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('CONGVIEC', function (Blueprint $table) {
            $table->id('ID_CONGVIEC');
            
            $table->unsignedBigInteger('ID_NHOM');
            $table->unsignedBigInteger('ID_COT');
            $table->unsignedBigInteger('ID_NGUOITAO');
            
            $table->string('TEN_CONGVIEC', 255);
            $table->text('MOTA')->nullable();
            
            // [ĐÃ THÊM] Thêm "Tạm dừng" theo yêu cầu của bạn
            $table->enum('TRANGTHAI', ['Hoạt động', 'Đã hủy', 'Tạm dừng', 'Hoàn thành'])->default('Hoạt động');
            
            $table->dateTime('NGAY_BATDAU')->nullable();
            $table->dateTime('NGAY_HETHAN')->nullable()->comment('Deadline');
            $table->enum('DO_UUTIEN', ['Thấp', 'Trung bình', 'Cao'])->default('Trung bình');
            $table->integer('THUTU_HIENTHI')->default(0)->comment('Thứ tự task trong 1 cột');
            
            $table->timestamp('NGAY_HOANTHANH')->nullable();
            $table->timestamp('NGAYTAO')->nullable()->useCurrent();
            $table->timestamp('NGAYCAPNHAT')->nullable()->useCurrentOnUpdate();

            // Khóa ngoại
            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->onDelete('cascade');
            $table->foreign('ID_COT')->references('ID_COT')->on('COT_CONGVIEC')->onDelete('cascade'); // Sửa thành cascade
            $table->foreign('ID_NGUOITAO')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade'); // Sửa thành cascade
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('CONGVIEC');
    }
};