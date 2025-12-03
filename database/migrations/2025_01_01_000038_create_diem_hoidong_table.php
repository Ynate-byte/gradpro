<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('DIEM_HOIDONG', function (Blueprint $table) {
            $table->id('ID_DIEM_HDONG');
            $table->unsignedBigInteger('ID_NHOM');
            $table->unsignedBigInteger('ID_GIANGVIEN');
            $table->decimal('DIEM', 5, 2)->nullable();
            $table->text('NHANXET')->nullable();
            $table->json('DIEM_CHI_TIET')->nullable();
            $table->timestamps();

            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->onDelete('cascade');
            $table->foreign('ID_GIANGVIEN')->references('ID_GIANGVIEN')->on('GIANGVIEN')->onDelete('cascade');
            $table->unique(['ID_NHOM', 'ID_GIANGVIEN']);
        });
    }
    public function down(): void { Schema::dropIfExists('DIEM_HOIDONG'); }
};