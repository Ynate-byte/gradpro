<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('HOIDONG_NHOM', function (Blueprint $table) {
            $table->unsignedBigInteger('ID_HOIDONG');
            $table->unsignedBigInteger('ID_NHOM');
            $table->timestamps();

            // 🔹 Ràng buộc khóa ngoại
            $table->foreign('ID_HOIDONG')
                ->references('ID_HOIDONG')
                ->on('HOIDONG')
                ->onDelete('cascade');

            $table->foreign('ID_NHOM')
                ->references('ID_NHOM')
                ->on('NHOM')
                ->onDelete('cascade');

            // 🔹 Đảm bảo mỗi nhóm chỉ có 1 hội đồng
            $table->unique('ID_NHOM');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('HOIDONG_NHOM');
    }
};