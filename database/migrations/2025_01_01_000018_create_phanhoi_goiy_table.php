<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('PHANHOI_GOIY', function (Blueprint $table) {
            $table->id('ID_PHANHOI');
            $table->unsignedBigInteger('ID_GOIY');
            $table->unsignedBigInteger('ID_GIANGVIEN');
            $table->text('NOIDUNG');
            $table->timestamps();

            $table->foreign('ID_GOIY')->references('ID_GOIY')->on('GOIY_DETAI')->onDelete('cascade');
            $table->foreign('ID_GIANGVIEN')->references('ID_GIANGVIEN')->on('GIANGVIEN')->onDelete('cascade');
        });
    }
    public function down(): void { Schema::dropIfExists('PHANHOI_GOIY'); }
};