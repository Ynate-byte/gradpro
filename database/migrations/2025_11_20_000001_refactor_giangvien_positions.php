<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tạo bảng CHUCVU
        Schema::create('CHUCVU', function (Blueprint $table) {
            $table->id('ID_CHUCVU');
            $table->string('MA_CHUCVU', 50)->unique()->comment('VD: TRUONG_KHOA, GIAO_VU, PHO_KHOA');
            $table->string('TEN_CHUCVU', 100);
            $table->text('MOTA')->nullable();
            $table->timestamp('NGAYTAO')->useCurrent();
        });

        // 2. Chèn dữ liệu các chức vụ mặc định (Bao gồm Phó Khoa)
        DB::table('CHUCVU')->insert([
            [
                'MA_CHUCVU' => 'TRUONG_KHOA', 
                'TEN_CHUCVU' => 'Trưởng Khoa', 
                'MOTA' => 'Lãnh đạo cao nhất của Khoa, có quyền phê duyệt kế hoạch.'
            ],
            [
                'MA_CHUCVU' => 'PHO_KHOA', 
                'TEN_CHUCVU' => 'Phó Khoa', 
                'MOTA' => 'Ban lãnh đạo khoa, phụ trách chuyên môn (Quyền hạn hệ thống tương đương Giáo vụ).'
            ],
            [
                'MA_CHUCVU' => 'GIAO_VU', 
                'TEN_CHUCVU' => 'Giáo Vụ', 
                'MOTA' => 'Phụ trách quản lý đào tạo, quản lý hệ thống.'
            ],
            [
                'MA_CHUCVU' => 'TRUONG_BOMON', 
                'TEN_CHUCVU' => 'Trưởng Bộ Môn', 
                'MOTA' => 'Quản lý chuyên môn cấp Bộ môn, phân công giảng viên.'
            ],
        ]);

        // 3. Tạo bảng trung gian GIANGVIEN_CHUCVU (Quan hệ N-N)
        Schema::create('GIANGVIEN_CHUCVU', function (Blueprint $table) {
            $table->unsignedBigInteger('ID_GIANGVIEN');
            $table->unsignedBigInteger('ID_CHUCVU');
            $table->timestamp('NGAYTAO')->useCurrent();

            $table->primary(['ID_GIANGVIEN', 'ID_CHUCVU']);
            
            $table->foreign('ID_GIANGVIEN')->references('ID_GIANGVIEN')->on('GIANGVIEN')->onDelete('cascade');
            $table->foreign('ID_CHUCVU')->references('ID_CHUCVU')->on('CHUCVU')->onDelete('cascade');
        });

        // 4. Xóa cột CHUCVU cũ (Enum) ở bảng GIANGVIEN
        Schema::table('GIANGVIEN', function (Blueprint $table) {
            if (Schema::hasColumn('GIANGVIEN', 'CHUCVU')) {
                $table->dropColumn('CHUCVU');
            }
        });

        // 5. Dọn dẹp bảng VAITRO (Xóa các vai trò cũ không còn dùng vì đã chuyển sang chức vụ)
        DB::table('VAITRO')->whereIn('TEN_VAITRO', ['Giáo vụ', 'Trưởng khoa'])->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('GIANGVIEN_CHUCVU');
        Schema::dropIfExists('CHUCVU');

        Schema::table('GIANGVIEN', function (Blueprint $table) {
            $table->enum('CHUCVU', ['Trưởng khoa', 'Phó khoa', 'Giáo vụ', 'Trưởng bộ môn'])->nullable();
        });
    }
};