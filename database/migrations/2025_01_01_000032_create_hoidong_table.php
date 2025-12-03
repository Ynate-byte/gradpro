<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('HOIDONG', function (Blueprint $table) {
            $table->id('ID_HOIDONG');
            $table->string('TEN_HOIDONG', 100);
            $table->enum('LOAI', ['phanbien', 'hoidong', 'hoidong5']);
            $table->unsignedBigInteger('ID_KEHOACH')->nullable();
            $table->unsignedBigInteger('ID_KHOA_BOMON')->nullable();
            $table->date('NGAY_BAOCAO')->nullable();
            $table->time('GIO_BAOCAO')->nullable();
            $table->string('PHONG', 50)->nullable();
            $table->timestamps();

            $table->foreign('ID_KEHOACH')->references('ID_KEHOACH')->on('KEHOACH_KHOALUAN')->onDelete('set null');
            $table->foreign('ID_KHOA_BOMON')->references('ID_KHOA_BOMON')->on('KHOA_BOMON')->onDelete('set null');
        });
    }
    public function down(): void { Schema::dropIfExists('HOIDONG'); }
};