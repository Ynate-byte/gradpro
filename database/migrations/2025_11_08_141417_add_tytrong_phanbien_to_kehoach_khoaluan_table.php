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
        Schema::table('KEHOACH_KHOALUAN', function (Blueprint $table) {
            // Thêm cột tỷ trọng điểm phản biện, đặt sau cột điểm hội đồng cho dễ nhìn
            if (!Schema::hasColumn('KEHOACH_KHOALUAN', 'TYTRONG_DIEM_PHANBIEN')) {
                $table->decimal('TYTRONG_DIEM_PHANBIEN', 5, 2)
                    ->nullable()
                    ->after('TYTRONG_DIEM_HOIDONG')
                    ->comment('Tỷ trọng điểm giảng viên phản biện (ví dụ: 0.3)');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('KEHOACH_KHOALUAN', function (Blueprint $table) {
            if (Schema::hasColumn('KEHOACH_KHOALUAN', 'TYTRONG_DIEM_PHANBIEN')) {
                $table->dropColumn('TYTRONG_DIEM_PHANBIEN');
            }
        });
    }
};