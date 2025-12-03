<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        Schema::create('COT_CONGVIEC', function (Blueprint $table) {
            $table->id('ID_COT');
            $table->string('TEN_COT', 50);
            $table->integer('THUTU_HIENTHI')->default(0);
            $table->timestamp('NGAYTAO')->nullable()->useCurrent();
        });
        DB::table('COT_CONGVIEC')->insert([
            ['TEN_COT' => 'Cần làm', 'THUTU_HIENTHI' => 1],
            ['TEN_COT' => 'Đang làm', 'THUTU_HIENTHI' => 2],
            ['TEN_COT' => 'Chờ Review', 'THUTU_HIENTHI' => 3],
            ['TEN_COT' => 'Hoàn thành', 'THUTU_HIENTHI' => 4],
        ]);
    }
    public function down(): void { Schema::dropIfExists('COT_CONGVIEC'); }
};