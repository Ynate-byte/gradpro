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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->comment('ID người nhận');
            $table->string('type')->comment('Loại thông báo, vd: GROUP_INVITATION');
            $table->json('data')->comment('Dữ liệu kèm theo, vd: tên nhóm, tên người mời');
            $table->timestamp('read_at')->nullable()->comment('Thời điểm đã đọc');
            $table->timestamps();

            $table->foreign('user_id')->references('ID_NGUOIDUNG')->on('NGUOIDUNG')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};