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
        Schema::create('LICHHOP', function (Blueprint $table) {
            $table->id('ID_LICHHOP');
            
            $table->unsignedBigInteger('ID_NHOM');
            $table->unsignedBigInteger('ID_NGUOITAO')->comment('ID Nguoidung (có thể là GVHD hoặc Nhóm trưởng)');
            
            $table->string('TIEUDE_LICHHOP', 255);
            $table->dateTime('THOIGIAN_BATDAU');
            $table->dateTime('THOIGIAN_KETTHUC')->nullable();
            
            $table->enum('HINHTHUC_HOP', ['Trực tiếp', 'Trực tuyến'])->default('Trực tiếp');
            $table->string('DIADIEM', 255)->nullable()->comment('Dùng khi HINHTHUC_HOP = Trực tiếp');
            $table->string('LINK_TRUCTUYEN', 500)->nullable()->comment('Dùng khi HINHTHUC_HOP = Trực tuyến');
            
            $table->text('GHICHU')->nullable();
            
            // ===== [THÊM MỚI] =====
            $table->text('NOIDUNG_HOP')->nullable()->comment('Nội dung, kết luận, hoặc biên bản họp');
            // ======================
            
            $table->enum('TRANGTHAI', ['Đã lên lịch', 'Đã diễn ra', 'Đã hủy'])->default('Đã lên lịch');

            $table->timestamp('NGAYTAO')->nullable()->useCurrent();
            $table->timestamp('CAPNHAT_LANCUOI')->nullable()->useCurrentOnUpdate();

            // Ràng buộc khóa ngoại
            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->onDelete('cascade');
            $table->foreign('ID_NGUOITAO')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('LICHHOP');
    }
};