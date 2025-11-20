<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Xóa bảng notifications mặc định của Laravel nếu có để tránh rác
        Schema::dropIfExists('notifications');

        Schema::create('THONGBAO', function (Blueprint $table) {
            $table->id('ID_THONGBAO');
            
            // Người nhận
            $table->unsignedBigInteger('ID_NGUOINHAN');
            
            $table->string('TIEU_DE', 255);
            $table->text('NOI_DUNG');
            
            // Phân loại để hiển thị Icon/Màu sắc
            // SYSTEM: Hệ thống, GROUP: Nhóm, TASK: Công việc/Kanban, ACADEMIC: Học tập/Nộp bài/Điểm
            $table->enum('LOAI_THONGBAO', ['SYSTEM', 'GROUP', 'TASK', 'ACADEMIC'])->default('SYSTEM');
            
            // Đường dẫn để redirect khi click vào (VD: /projects/my-group/kanban)
            $table->string('LIEN_KET', 500)->nullable();
            
            // Lưu ID gốc để xử lý logic nếu cần (VD: { "id_nhom": 10 })
            $table->json('DU_LIEU_GOC')->nullable();
            
            $table->boolean('DA_DOC')->default(false);
            $table->timestamp('NGAY_TAO')->useCurrent();

            // Khóa ngoại
            $table->foreign('ID_NGUOINHAN')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('THONGBAO');
    }
};