<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('GOIY_DETAI', function (Blueprint $table) {
            $table->text('PHAN_HOI')->nullable()->after('NOIDUNG_GOIY');
            $table->timestamp('NGAY_PHAN_HOI')->nullable()->after('PHAN_HOI');
        });
    }

    public function down(): void
    {
        Schema::table('GOIY_DETAI', function (Blueprint $table) {
            $table->dropColumn(['PHAN_HOI', 'NGAY_PHAN_HOI']);
        });
    }
};
