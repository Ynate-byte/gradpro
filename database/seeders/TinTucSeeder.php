<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class TinTucSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('news')->delete();

        $adminId = DB::table('NGUOIDUNG')->where('ID_VAITRO', 1)->value('ID_NGUOIDUNG') ?? 1;

        $news = [
            [
                'title' => 'Thông báo về việc nộp Đề cương chi tiết Khóa luận tốt nghiệp HK1 2025-2026',
                'content' => '<p>Chào các bạn sinh viên,</p><p>Khoa thông báo hạn chót nộp đề cương chi tiết là ngày <strong>15/10/2025</strong>. Các nhóm vui lòng nộp đúng hạn qua hệ thống.</p><p>Trân trọng.</p>',
                'category' => 'Thông báo học vụ',
                'is_pinned' => true,
                'target_roles' => json_encode(['SINH_VIEN']),
                'created_at' => now()->subDays(2),
            ],
            [
                'title' => 'Hướng dẫn trình bày báo cáo Khóa luận tốt nghiệp',
                'content' => '<p>Sinh viên tải file mẫu trình bày báo cáo tại mục Tài liệu tham khảo. Lưu ý tuân thủ đúng quy định về font chữ, lề và trích dẫn tài liệu.</p>',
                'category' => 'Hướng dẫn',
                'is_pinned' => false,
                'target_roles' => json_encode(['ALL']),
                'created_at' => now()->subDays(5),
            ],
            [
                'title' => 'Mời tham gia Hội thảo: "Kỹ năng viết báo cáo khoa học"',
                'content' => '<p>Thời gian: 08:00 ngày 20/10/2025<br>Địa điểm: Hội trường C.</p>',
                'category' => 'Sự kiện',
                'is_pinned' => false,
                'target_roles' => json_encode(['SINH_VIEN', 'GIANG_VIEN']),
                'created_at' => now()->subDays(10),
            ],
            [
                'title' => 'Nhắc nhở giảng viên về việc cập nhật tiến độ hàng tuần',
                'content' => '<p>Kính đề nghị quý Thầy/Cô cập nhật đánh giá tiến độ cho các nhóm hướng dẫn trước thứ 6 hàng tuần.</p>',
                'category' => 'Dành cho Giảng viên',
                'is_pinned' => true,
                'target_roles' => json_encode(['GIANG_VIEN']),
                'created_at' => now()->subDays(1),
            ]
        ];

        foreach ($news as $item) {
            DB::table('news')->insert(array_merge($item, [
                'created_by' => $adminId,
                'updated_at' => now()
            ]));
        }
    }
}