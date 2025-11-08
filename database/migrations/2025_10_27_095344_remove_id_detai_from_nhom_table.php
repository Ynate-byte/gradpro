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
        Schema::table('NHOM', function (Blueprint $table) {
            $table->dropForeign(['ID_DETAI']);
            $table->dropColumn('ID_DETAI');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('NHOM', function (Blueprint $table) {
            $table->unsignedBigInteger('ID_DETAI')->nullable()->after('ID_KHOA_BOMON');
            $table->foreign('ID_DETAI')->references('ID_DETAI')->on('DETAI')->nullOnDelete();
        });
    }
};