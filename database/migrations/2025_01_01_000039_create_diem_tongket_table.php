<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('DIEM_TONGKET', function (Blueprint $table) {
            $table->id('ID_DIEMTK');
            $table->unsignedBigInteger('ID_NHOM');
            $table->decimal('DIEM_HD', 5, 2)->nullable();
            $table->decimal('DIEM_PB', 5, 2)->nullable();
            $table->decimal('DIEM_HDONG', 5, 2)->nullable();
            $table->decimal('DIEM_TONG', 5, 2)->nullable();
            $table->timestamps();

            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->onDelete('cascade');
            $table->unique('ID_NHOM');
        });
    }
    public function down(): void { Schema::dropIfExists('DIEM_TONGKET'); }
};