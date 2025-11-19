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
        Schema::create('LICH_SU_HOAT_DONG', function (Blueprint $table) {
            $table->id('ID_LICHSU');
            
            // Người thực hiện hành động
            $table->unsignedBigInteger('ID_NGUOIDUNG');
            
            // Nhóm bị tác động (Null nếu là hành động cá nhân)
            $table->unsignedBigInteger('ID_NHOM')->nullable();
            
            // Mã loại hành động (VD: LOGIN, TASK_CREATE, SUBMIT,...)
            $table->string('LOAI_HANH_DONG', 50);
            
            // Tiêu đề ngắn gọn hiển thị trên UI
            $table->string('TIEU_DE', 255);
            
            // Chi tiết (Lưu JSON để flexible: giá trị cũ/mới, tên file, lý do...)
            $table->json('CHI_TIET')->nullable();
            
            // Tên icon gợi ý cho Frontend (VD: 'User', 'File', 'Check', 'LogOut')
            $table->string('ICON', 50)->nullable();
            
            // Thời điểm diễn ra
            $table->timestamp('NGAY_TAO')->useCurrent();

            // Khóa ngoại
            $table->foreign('ID_NGUOIDUNG')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('LICH_SU_HOAT_DONG');
    }
};