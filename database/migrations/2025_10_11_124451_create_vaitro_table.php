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
        Schema::create('VAITRO', function (Blueprint $table) {
            $table->id('ID_VAITRO');
            $table->string('TEN_VAITRO', 50)->unique();
            $table->text('MOTA')->nullable();
            $table->timestamp('NGAYTAO')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vaitro');
    }
};
