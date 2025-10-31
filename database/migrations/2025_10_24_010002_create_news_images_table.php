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
        Schema::create('news_images', function (Blueprint $table) {
            $table->id(); // id auto-increment primary key
            // Foreign key đến bảng news, cascadeOnDelete để xóa ảnh này nếu tin tức bị xóa
            $table->foreignId('news_id')->constrained('news')->cascadeOnDelete();
            $table->string('filename'); // Đường dẫn lưu file ảnh
            $table->timestamps(); // created_at, updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('news_images');
    }
};