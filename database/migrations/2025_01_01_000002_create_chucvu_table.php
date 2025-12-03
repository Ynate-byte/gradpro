<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        Schema::create('CHUCVU', function (Blueprint $table) {
            $table->id('ID_CHUCVU');
            $table->string('MA_CHUCVU', 50)->unique();
            $table->string('TEN_CHUCVU', 100);
            $table->text('MOTA')->nullable();
            $table->timestamp('NGAYTAO')->useCurrent();
        });
        DB::table('CHUCVU')->insert([
            ['MA_CHUCVU' => 'TRUONG_KHOA', 'TEN_CHUCVU' => 'Trưởng Khoa', 'MOTA' => ''],
            ['MA_CHUCVU' => 'PHO_KHOA', 'TEN_CHUCVU' => 'Phó Khoa', 'MOTA' => ''],
            ['MA_CHUCVU' => 'GIAO_VU', 'TEN_CHUCVU' => 'Giáo Vụ', 'MOTA' => ''],
            ['MA_CHUCVU' => 'TRUONG_BOMON', 'TEN_CHUCVU' => 'Trưởng Bộ Môn', 'MOTA' => ''],
        ]);
    }
    public function down(): void { Schema::dropIfExists('CHUCVU'); }
};