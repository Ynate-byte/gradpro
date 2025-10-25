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
        Schema::create('NGUOIDUNG', function (Blueprint $table) {
            $table->id('ID_NGUOIDUNG');
            $table->string('MA_DINHDANH', 20)->unique()->comment('MSSV hoặc MSGV');
            $table->string('EMAIL', 100)->unique();
            $table->string('MATKHAU_BAM', 255);
            $table->string('HODEM_VA_TEN', 100);
            $table->string('SO_DIENTHOAI', 15)->nullable();
            $table->unsignedBigInteger('ID_VAITRO');
            $table->boolean('LA_DANGNHAP_LANDAU')->default(true);
            $table->boolean('TRANGTHAI_KICHHOAT')->default(true);
            $table->timestamp('NGAYTAO')->useCurrent();
            $table->timestamp('NGAYCAPNHAT')->nullable()->useCurrentOnUpdate();
            $table->timestamp('DANGNHAP_CUOI')->nullable();

            $table->foreign('ID_VAITRO')->references('ID_VAITRO')->on('VAITRO')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nguoidung');
    }
};
