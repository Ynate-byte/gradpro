<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('KEHOACH_KHOALUAN', function (Blueprint $table) {
            $table->unsignedInteger('SO_NHOM_DUKIEN')->nullable()->after('SO_THANHVIEN_TOIDA')->comment('Số nhóm dự kiến cho kế hoạch');
        });
    }

    public function down(): void
    {
        Schema::table('KEHOACH_KHOALUAN', function (Blueprint $table) {
            $table->dropColumn('SO_NHOM_DUKIEN');
        });
    }
};
