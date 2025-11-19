<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('CHUCVU', function (Blueprint $table) {
            $table->id('ID_CHUCVU');
            $table->string('MA_CHUCVU', 50)->unique()->comment('VD: TRUONG_KHOA, GIAO_VU');
            $table->string('TEN_CHUCVU', 100);
            $table->text('MOTA')->nullable();
            $table->timestamp('NGAYTAO')->useCurrent();
        });

        Schema::create('GIANGVIEN_CHUCVU', function (Blueprint $table) {
            $table->unsignedBigInteger('ID_GIANGVIEN');
            $table->unsignedBigInteger('ID_CHUCVU');
            $table->timestamp('NGAYTAO')->useCurrent();

            $table->primary(['ID_GIANGVIEN', 'ID_CHUCVU']);
            
            $table->foreign('ID_GIANGVIEN')->references('ID_GIANGVIEN')->on('GIANGVIEN')->onDelete('cascade');
            $table->foreign('ID_CHUCVU')->references('ID_CHUCVU')->on('CHUCVU')->onDelete('cascade');
        });

        Schema::table('GIANGVIEN', function (Blueprint $table) {
            if (Schema::hasColumn('GIANGVIEN', 'CHUCVU')) {
                $table->dropColumn('CHUCVU');
            }
        });

        DB::table('VAITRO')->whereIn('TEN_VAITRO', ['Giáo vụ', 'Trưởng khoa'])->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('GIANGVIEN_CHUCVU');
        Schema::dropIfExists('CHUCVU');

        Schema::table('GIANGVIEN', function (Blueprint $table) {
            $table->enum('CHUCVU', ['Trưởng khoa', 'Phó khoa', 'Giáo vụ', 'Trưởng bộ môn'])->nullable();
        });
    }
};