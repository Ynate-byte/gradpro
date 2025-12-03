<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('KEHOACH_KHOALUAN', function (Blueprint $table) {
            $table->id('ID_KEHOACH');
            $table->string('TEN_DOT', 100);
            $table->string('NAMHOC', 20);
            $table->enum('HOCKY', ['1', '2', '3']);
            $table->string('KHOAHOC', 10);
            $table->enum('HEDAOTAO', ['Cử nhân', 'Kỹ sư', 'Thạc sỹ']);
            $table->unsignedTinyInteger('SO_TUAN_THUCHIEN')->default(12);
            $table->unsignedTinyInteger('SO_THANHVIEN_TOITHIEU')->default(1);
            $table->unsignedTinyInteger('SO_THANHVIEN_TOIDA')->default(4);
            $table->unsignedInteger('SO_NHOM_DUKIEN')->nullable();
            
            $table->enum('TRANGTHAI', [
                'Bản nháp', 'Chờ phê duyệt', 'Yêu cầu chỉnh sửa', 'Đã phê duyệt',
                'Đã hủy', 'Đang thực hiện', 'Đang chấm điểm', 'Đã hoàn thành', 'Chờ duyệt chỉnh sửa'
            ])->default('Bản nháp');

            $table->boolean('TRANGTHAI_KICHHOAT')->default(true);
            $table->integer('TYLE_TAISUDUNG_TOIDA')->default(20);
            $table->timestamp('NGAY_BATDAU')->nullable();
            $table->timestamp('NGAY_KETHUC')->nullable();
            
            $table->unsignedBigInteger('ID_NGUOITAO')->nullable();
            $table->unsignedBigInteger('ID_NGUOIPHEDUYET')->nullable();
            $table->text('BINHLUAN_PHEDUYET')->nullable();
            
            $table->json('SETTINGS')->nullable();
            $table->decimal('TYTRONG_DIEM_QUATRINH', 5, 2)->nullable();
            $table->decimal('TYTRONG_DIEM_HOIDONG', 5, 2)->nullable();
            $table->decimal('TYTRONG_DIEM_PHANBIEN', 5, 2)->nullable();
            
            $table->timestamp('NGAYTAO')->nullable()->useCurrent();
            $table->timestamp('NGAYCAPNHAT')->nullable()->useCurrentOnUpdate();

            $table->foreign('ID_NGUOITAO')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('set null');
            $table->foreign('ID_NGUOIPHEDUYET')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('set null');
        });
    }
    public function down(): void { Schema::dropIfExists('KEHOACH_KHOALUAN'); }
};