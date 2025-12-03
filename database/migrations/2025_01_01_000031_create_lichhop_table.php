<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('LICHHOP', function (Blueprint $table) {
            $table->id('ID_LICHHOP');
            $table->unsignedBigInteger('ID_NHOM');
            $table->unsignedBigInteger('ID_NGUOITAO');
            $table->string('TIEUDE_LICHHOP', 255);
            $table->dateTime('THOIGIAN_BATDAU');
            $table->dateTime('THOIGIAN_KETTHUC')->nullable();
            $table->enum('HINHTHUC_HOP', ['Trực tiếp', 'Trực tuyến'])->default('Trực tiếp');
            $table->string('DIADIEM', 255)->nullable();
            $table->string('LINK_TRUCTUYEN', 500)->nullable();
            $table->text('GHICHU')->nullable();
            $table->text('NOIDUNG_HOP')->nullable();
            $table->enum('TRANGTHAI', ['Đã lên lịch', 'Đã diễn ra', 'Đã hủy'])->default('Đã lên lịch');
            $table->enum('DANHGIA', ['Tot', 'BinhThuong', 'KhongTot'])->nullable();
            $table->timestamp('NGAYTAO')->nullable()->useCurrent();
            $table->timestamp('CAPNHAT_LANCUOI')->nullable()->useCurrentOnUpdate();

            $table->foreign('ID_NHOM')->references('ID_NHOM')->on('NHOM')->onDelete('cascade');
            $table->foreign('ID_NGUOITAO')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
        });
    }
    public function down(): void { Schema::dropIfExists('LICHHOP'); }
};