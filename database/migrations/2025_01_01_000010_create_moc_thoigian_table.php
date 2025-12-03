<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('MOC_THOIGIAN', function (Blueprint $table) {
            $table->id('ID');
            $table->unsignedBigInteger('ID_KEHOACH');
            $table->string('TEN_SUKIEN');
            $table->timestamp('NGAY_BATDAU')->nullable();
            $table->timestamp('NGAY_KETTHUC')->nullable();
            $table->text('MOTA')->nullable();
            $table->string('VAITRO_THUCHIEN', 255)->nullable();
            $table->string('FEATURE_KEY')->nullable();
            $table->timestamps();
            
            $table->foreign('ID_KEHOACH')->references('ID_KEHOACH')->on('KEHOACH_KHOALUAN')->onDelete('cascade');
        });
    }
    public function down(): void { Schema::dropIfExists('MOC_THOIGIAN'); }
};