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
        // 1. Cập nhật dữ liệu cũ (nếu có) để tránh lỗi khi sửa ENUM
        // Đưa các trạng thái lạ về 'Nháp' để an toàn
        DB::statement("UPDATE DETAI SET TRANGTHAI = 'Nháp' WHERE TRANGTHAI NOT IN ('Nháp', 'Chờ duyệt', 'Đang chỉnh sửa', 'Yêu cầu chỉnh sửa', 'Đã duyệt', 'Đã đầy', 'Đã khóa', 'Từ chối')");

        // 2. Sửa lại định nghĩa cột ENUM để bao gồm 'Từ chối'
        // Lưu ý: Cần liệt kê ĐẦY ĐỦ tất cả các trạng thái mong muốn
        DB::statement("ALTER TABLE DETAI MODIFY COLUMN TRANGTHAI ENUM('Nháp', 'Chờ duyệt', 'Đang chỉnh sửa', 'Yêu cầu chỉnh sửa', 'Đã duyệt', 'Đã đầy', 'Đã khóa', 'Từ chối') DEFAULT 'Nháp'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Khi rollback, chuyển các đề tài đang ở trạng thái 'Từ chối' về một trạng thái hợp lệ cũ (ví dụ: 'Yêu cầu chỉnh sửa')
        // để tránh lỗi Data truncated khi thu hẹp danh sách ENUM
        DB::statement("UPDATE DETAI SET TRANGTHAI = 'Yêu cầu chỉnh sửa' WHERE TRANGTHAI = 'Từ chối'");

        // Quay lại định nghĩa cũ (không có 'Từ chối')
        DB::statement("ALTER TABLE DETAI MODIFY COLUMN TRANGTHAI ENUM('Nháp', 'Chờ duyệt', 'Đang chỉnh sửa', 'Yêu cầu chỉnh sửa', 'Đã duyệt', 'Đã đầy', 'Đã khóa') DEFAULT 'Nháp'");
    }
};