<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('FILE_NOP_SANPHAM', function (Blueprint $table) {
            $table->id('ID_FILE');
            $table->unsignedBigInteger('ID_NOP_SANPHAM');
            $table->string('LOAI_FILE', 50);
            $table->text('DUONG_DAN_HOAC_NOI_DUNG');
            $table->string('TEN_FILE_GOC', 255)->nullable();
            $table->unsignedBigInteger('KICH_THUOC_FILE')->nullable();
            $table->boolean('IS_REJECTED')->default(false);

            $table->foreign('ID_NOP_SANPHAM')->references('ID_NOP_SANPHAM')->on('NOP_SANPHAM')->onDelete('cascade');
        });
    }
    public function down(): void { Schema::dropIfExists('FILE_NOP_SANPHAM'); }
};