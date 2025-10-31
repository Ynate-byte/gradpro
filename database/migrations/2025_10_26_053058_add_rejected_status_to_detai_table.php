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
        // First, we need to modify the enum to include 'Từ chối'
        // Since MySQL doesn't support direct enum modification, we'll use raw SQL
        DB::statement("ALTER TABLE detai MODIFY COLUMN TRANGTHAI ENUM('Nháp', 'Chờ duyệt', 'Yêu cầu chỉnh sửa', 'Đã duyệt', 'Đã đầy', 'Đã khóa', 'Từ chối') DEFAULT 'Nháp'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to original enum values
        DB::statement("ALTER TABLE detai MODIFY COLUMN TRANGTHAI ENUM('Nháp', 'Chờ duyệt', 'Yêu cầu chỉnh sửa', 'Đã duyệt', 'Đã đầy', 'Đã khóa') DEFAULT 'Nháp'");
    }
};