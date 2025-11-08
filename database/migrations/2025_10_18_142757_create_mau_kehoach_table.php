<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('MAU_KEHOACH', function (Blueprint $table) {
            $table->id('ID_MAU');
            $table->string('TEN_MAU', 100)->unique();
            $table->enum('HEDAOTAO_MACDINH', ['Cử nhân', 'Kỹ sư', 'Thạc sỹ']);
            $table->unsignedTinyInteger('SO_TUAN_MACDINH')->default(12);
            $table->text('MO_TA')->nullable();
            $table->timestamp('NGAYTAO')->useCurrent();
            $table->timestamp('NGAYCAPNHAT')->nullable()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('MAU_KEHOACH');
    }
};