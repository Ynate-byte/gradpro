<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('GOIY_DETAI', function (Blueprint $table) {
            $table->unsignedBigInteger('ID_GIANGVIEN')->nullable()->after('ID_NGUOI_GOIY');
            $table->foreign('ID_GIANGVIEN')->references('ID_GIANGVIEN')->on('GIANGVIEN');
        });
    }

    public function down(): void
    {
        Schema::table('GOIY_DETAI', function (Blueprint $table) {
            $table->dropForeign(['ID_GIANGVIEN']);
            $table->dropColumn('ID_GIANGVIEN');
        });
    }
};
