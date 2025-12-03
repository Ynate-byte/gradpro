<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('GIANGVIEN_CHUCVU', function (Blueprint $table) {
            $table->unsignedBigInteger('ID_GIANGVIEN');
            $table->unsignedBigInteger('ID_CHUCVU');
            $table->timestamp('NGAYTAO')->useCurrent();
            $table->primary(['ID_GIANGVIEN', 'ID_CHUCVU']);

            $table->foreign('ID_GIANGVIEN')->references('ID_GIANGVIEN')->on('GIANGVIEN')->onDelete('cascade');
            $table->foreign('ID_CHUCVU')->references('ID_CHUCVU')->on('CHUCVU')->onDelete('cascade');
        });
    }
    public function down(): void { Schema::dropIfExists('GIANGVIEN_CHUCVU'); }
};