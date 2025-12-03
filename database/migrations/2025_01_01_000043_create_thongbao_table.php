<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('THONGBAO', function (Blueprint $table) {
            $table->id('ID_THONGBAO');
            $table->unsignedBigInteger('ID_NGUOINHAN');
            $table->string('TIEU_DE', 255);
            $table->text('NOI_DUNG');
            $table->enum('LOAI_THONGBAO', ['SYSTEM', 'GROUP', 'TASK', 'ACADEMIC'])->default('SYSTEM');
            $table->enum('DO_UU_TIEN', ['NORMAL', 'HIGH', 'URGENT'])->default('NORMAL');
            $table->string('LIEN_KET', 500)->nullable();
            $table->json('DU_LIEU_GOC')->nullable();
            $table->boolean('DA_DOC')->default(false);
            $table->timestamp('NGAY_TAO')->useCurrent();

            $table->foreign('ID_NGUOINHAN')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
        });
    }
    public function down(): void { Schema::dropIfExists('THONGBAO'); }
};