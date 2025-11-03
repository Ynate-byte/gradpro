<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('TYTRONG_DIEM', function (Blueprint $table) {
            // Thêm cột ACTIVE để xác định tỷ trọng nào đang được áp dụng
            $table->boolean('ACTIVE')->default(true)->after('HOIDONG');
        });
        
        // Đảm bảo chỉ có 1 dòng active khi chạy migration (nếu đã có dữ liệu)
        if (DB::table('TYTRONG_DIEM')->count() > 0) {
            DB::table('TYTRONG_DIEM')->update(['ACTIVE' => false]);
            DB::table('TYTRONG_DIEM')->orderBy('ID_TYTRONG', 'desc')->limit(1)->update(['ACTIVE' => true]);
        } else {
             // Thêm dòng mặc định nếu bảng trống
            DB::table('TYTRONG_DIEM')->insert([
                'HUONGDAN' => 0.4,
                'PHANBIEN' => 0.3,
                'HOIDONG' => 0.3,
                'ACTIVE' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down()
    {
        Schema::table('TYTRONG_DIEM', function (Blueprint $table) {
            $table->dropColumn('ACTIVE');
        });
    }
};