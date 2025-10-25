<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('KHOA_BOMON', function (Blueprint $table) {
            $table->id('ID_KHOA_BOMON');
            $table->string('MA_KHOA_BOMON', 20)->unique();
            $table->string('TEN_KHOA_BOMON', 100);
            $table->text('MOTA')->nullable();
            $table->boolean('TRANGTHAI_KICHHOAT')->default(true);
            $table->timestamp('NGAYTAO')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('KHOA_BOMON');
    }
};