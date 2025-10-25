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
        Schema::create('news', function (Blueprint $table) {
            $table->id(); // id auto-increment primary key
            $table->string('title');
            $table->longText('content'); // Sử dụng longText cho nội dung dài
            $table->string('category')->nullable(); // Thêm cột category, cho phép null
            $table->string('cover_image')->nullable(); // Ảnh bìa (tên file hoặc path)
            $table->string('pdf_file')->nullable(); // File PDF (tên file hoặc path)

            // Foreign keys đến bảng NGUOIDUNG, sử nullOnDelete để không xóa tin khi người dùng bị xóa
            $table->foreignId('created_by')->nullable()->constrained('NGUOIDUNG', 'ID_NGUOIDUNG')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('NGUOIDUNG', 'ID_NGUOIDUNG')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('NGUOIDUNG', 'ID_NGUOIDUNG')->nullOnDelete();

            $table->timestamps(); // Tự động thêm created_at và updated_at
            $table->softDeletes(); // Tự động thêm cột deleted_at (nullable timestamp)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('news');
    }
};