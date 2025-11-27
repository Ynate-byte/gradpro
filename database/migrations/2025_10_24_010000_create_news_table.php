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
            $table->id();
            $table->string('title');
            $table->longText('content');
            $table->string('category')->nullable();
            $table->string('cover_image')->nullable();
            $table->string('pdf_file')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('NGUOIDUNG', 'ID_NGUOIDUNG')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('NGUOIDUNG', 'ID_NGUOIDUNG')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('NGUOIDUNG', 'ID_NGUOIDUNG')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();
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