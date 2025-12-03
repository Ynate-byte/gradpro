<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('HOIDONG_GIANGVIEN', function (Blueprint $table) {
            $table->unsignedBigInteger('ID_HOIDONG');
            $table->unsignedBigInteger('ID_GIANGVIEN');
            $table->enum('VAITRO', ['chutich', 'thuky', 'thanhvien', 'phanbien'])->default('thanhvien');
            $table->timestamps();

            $table->foreign('ID_HOIDONG')->references('ID_HOIDONG')->on('HOIDONG')->onDelete('cascade');
            $table->foreign('ID_GIANGVIEN')->references('ID_GIANGVIEN')->on('GIANGVIEN')->onDelete('cascade');
            $table->unique(['ID_HOIDONG', 'ID_GIANGVIEN']);
        });
    }
    public function down(): void { Schema::dropIfExists('HOIDONG_GIANGVIEN'); }
};