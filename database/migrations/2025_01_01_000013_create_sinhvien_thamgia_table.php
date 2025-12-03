<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('SINHVIEN_THAMGIA', function (Blueprint $table) {
            $table->id('ID_THAMGIA');
            $table->unsignedBigInteger('ID_KEHOACH');
            $table->unsignedBigInteger('ID_SINHVIEN');
            $table->boolean('DU_DIEUKIEN')->default(true);
            $table->timestamp('NGAY_DANGKY')->useCurrent();

            $table->foreign('ID_KEHOACH')->references('ID_KEHOACH')->on('KEHOACH_KHOALUAN')->onDelete('cascade');
            $table->foreign('ID_SINHVIEN')->references('ID_SINHVIEN')->on('SINHVIEN')->onDelete('cascade');
            $table->unique(['ID_KEHOACH', 'ID_SINHVIEN']);
        });
    }
    public function down(): void { Schema::dropIfExists('SINHVIEN_THAMGIA'); }
};