<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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

            $table->foreign('ID_KEHOACH')
                ->references('ID_KEHOACH')
                ->on('KEHOACH_KHOALUAN')
                ->onDelete('set null');

            $table->foreign('ID_KHOA_BOMON')
                ->references('ID_KHOA_BOMON')
                ->on('KHOA_BOMON')
                ->onDelete('set null');
        });

        Schema::create('HOIDONG_GIANGVIEN', function (Blueprint $table) {
            $table->unsignedBigInteger('ID_HOIDONG');
            $table->unsignedBigInteger('ID_GIANGVIEN');
            $table->enum('VAITRO', ['chutich', 'thuky', 'thanhvien', 'phanbien'])->default('thanhvien');
            $table->timestamps();

            $table->foreign('ID_HOIDONG')
                ->references('ID_HOIDONG')
                ->on('HOIDONG')
                ->onDelete('cascade');

            $table->foreign('ID_GIANGVIEN')
                ->references('ID_GIANGVIEN')
                ->on('GIANGVIEN')
                ->onDelete('cascade');
            $table->unique(['ID_HOIDONG', 'ID_GIANGVIEN']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('HOIDONG_GIANGVIEN');
        Schema::dropIfExists('HOIDONG');
    }
};