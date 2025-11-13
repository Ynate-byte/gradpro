<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('COT_CONGVIEC', function (Blueprint $table) {
            $table->id('ID_COT'); // Tương đương BIGINT UNSIGNED AUTO_INCREMENT
            $table->string('TEN_COT', 50);
            $table->integer('THUTU_HIENTHI')->default(0);
            $table->timestamp('NGAYTAO')->nullable()->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('COT_CONGVIEC');
    }
};