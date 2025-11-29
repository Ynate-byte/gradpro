<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Thêm tỷ lệ tái sử dụng vào bảng Kế hoạch
        Schema::table('KEHOACH_KHOALUAN', function (Blueprint $table) {
            $table->integer('TYLE_TAISUDUNG_TOIDA')->default(20)->after('TRANGTHAI_KICHHOAT')->comment('Tỷ lệ % tối đa giảng viên được phép tái sử dụng đề tài');
        });

        // 2. Thêm cờ đánh dấu tái sử dụng vào bảng Đề tài
        Schema::table('DETAI', function (Blueprint $table) {
            $table->boolean('LA_TAISUDUNG')->default(false)->after('TRANGTHAI')->comment('Đánh dấu đề tài được tái sử dụng từ khóa trước');
        });
    }

    public function down(): void
    {
        Schema::table('KEHOACH_KHOALUAN', function (Blueprint $table) {
            $table->dropColumn('TYLE_TAISUDUNG_TOIDA');
        });

        Schema::table('DETAI', function (Blueprint $table) {
            $table->dropColumn('LA_TAISUDUNG');
        });
    }
};