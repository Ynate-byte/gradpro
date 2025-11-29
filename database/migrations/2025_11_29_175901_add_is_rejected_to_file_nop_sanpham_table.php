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
        Schema::table('FILE_NOP_SANPHAM', function (Blueprint $table) {
            $table->boolean('IS_REJECTED')->default(false)->after('KICH_THUOC_FILE');
        });
    }

    public function down(): void
    {
        Schema::table('FILE_NOP_SANPHAM', function (Blueprint $table) {
            $table->dropColumn('IS_REJECTED');
        });
    }
};
