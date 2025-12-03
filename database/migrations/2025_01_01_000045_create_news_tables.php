<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('news', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->longText('content');
            $table->string('category')->nullable();
            $table->string('cover_image')->nullable();
            $table->string('pdf_file')->nullable();
            $table->boolean('is_pinned')->default(false);
            $table->json('target_roles')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('NGUOIDUNG', 'ID_NGUOIDUNG')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('NGUOIDUNG', 'ID_NGUOIDUNG')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('NGUOIDUNG', 'ID_NGUOIDUNG')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
        Schema::create('news_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('news_id')->constrained('news')->cascadeOnDelete();
            $table->string('filename');
            $table->timestamps();
        });
        Schema::create('news_user_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('news_id')->constrained('news')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('NGUOIDUNG', 'ID_NGUOIDUNG')->cascadeOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->unique(['news_id', 'user_id']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('news_user_reads');
        Schema::dropIfExists('news_images');
        Schema::dropIfExists('news');
    }
};