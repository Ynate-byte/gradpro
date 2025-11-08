<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('news_user_reads', function (Blueprint $table) {
            $table->id();

            // Foreign key đến bảng news, cascadeOnDelete để xóa bản ghi này nếu tin tức bị xóa
            $table->foreignId('news_id')->constrained('news')->cascadeOnDelete();

            // Foreign key đến bảng NGUOIDUNG, cascadeOnDelete để xóa bản ghi này nếu người dùng bị xóa
            $table->foreignId('user_id')->constrained('NGUOIDUNG', 'ID_NGUOIDUNG')->cascadeOnDelete();

            $table->timestamp('read_at')->nullable(); // Thời điểm đọc
            $table->timestamps(); // created_at, updated_at

            // Đảm bảo cặp news_id và user_id là duy nhất
            $table->unique(['news_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('news_user_reads');
    }
};