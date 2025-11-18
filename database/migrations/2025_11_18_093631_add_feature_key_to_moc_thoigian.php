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
    Schema::table('MOC_THOIGIAN', function (Blueprint $table) {
        $table->string('FEATURE_KEY')->nullable()->after('VAITRO_THUCHIEN'); 
    });
}

    public function down(): void
    {
        Schema::table('MOC_THOIGIAN', function (Blueprint $table) {
            $table->dropColumn('FEATURE_KEY');
        });
    }
};
