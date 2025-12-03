<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        Schema::create('TYTRONG_DIEM', function (Blueprint $table) {
            $table->id('ID_TYTRONG');
            $table->decimal('HUONGDAN', 5, 2)->default(0.4);
            $table->decimal('PHANBIEN', 5, 2)->default(0.3);
            $table->decimal('HOIDONG', 5, 2)->default(0.3);
            $table->boolean('ACTIVE')->default(true);
            $table->timestamps();
        });
        DB::table('TYTRONG_DIEM')->insert(['HUONGDAN'=>0.4, 'PHANBIEN'=>0.3, 'HOIDONG'=>0.3, 'ACTIVE'=>true]);
    }
    public function down(): void { Schema::dropIfExists('TYTRONG_DIEM'); }
};