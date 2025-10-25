<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('CHUYENNGANH', function (Blueprint $table) {
            $table->id('ID_CHUYENNGANH');
            $table->string('MA_CHUYENNGANH', 20)->unique();
            $table->string('TEN_CHUYENNGANH', 100);
            $table->text('MOTA')->nullable();
            $table->boolean('TRANGTHAI_KICHHOAT')->default(true);
            $table->timestamp('NGAYTAO')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('CHUYENNGANH');
    }
};