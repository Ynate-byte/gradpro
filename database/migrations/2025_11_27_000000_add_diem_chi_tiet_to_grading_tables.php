<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = ['DIEM_HUONGDAN', 'DIEM_PHANBIEN', 'DIEM_HOIDONG'];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->json('DIEM_CHI_TIET')->nullable()->after('DIEM');
            });
        }
    }

    public function down(): void
    {
        $tables = ['DIEM_HUONGDAN', 'DIEM_PHANBIEN', 'DIEM_HOIDONG'];
        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn('DIEM_CHI_TIET');
            });
        }
    }
};