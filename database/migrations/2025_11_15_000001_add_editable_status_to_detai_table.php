<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, update any existing records that might have invalid status values
        DB::statement("UPDATE DETAI SET TRANGTHAI = 'Nháp' WHERE TRANGTHAI NOT IN ('Nháp', 'Chờ duyệt', 'Yêu cầu chỉnh sửa', 'Đã duyệt', 'Đã đầy', 'Đã khóa')");

        Schema::table('DETAI', function (Blueprint $table) {
            $table->enum('TRANGTHAI', ['Nháp', 'Chờ duyệt', 'Đang chỉnh sửa', 'Yêu cầu chỉnh sửa', 'Đã duyệt', 'Đã đầy', 'Đã khóa'])
                ->default('Nháp')
                ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('DETAI', function (Blueprint $table) {
            $table->enum('TRANGTHAI', ['Nháp', 'Chờ duyệt', 'Yêu cầu chỉnh sửa', 'Đã duyệt', 'Đã đầy', 'Đã khóa'])
                ->default('Nháp')
                ->change();
        });
    }
};
