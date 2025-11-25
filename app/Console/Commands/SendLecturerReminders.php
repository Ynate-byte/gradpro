<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Hoidong;
use App\Models\LichHop;
use App\Models\NopSanpham;
use App\Services\NotificationService;
use Carbon\Carbon;

class SendLecturerReminders extends Command
{
    /**
     * Tên lệnh để gọi trong terminal hoặc scheduler
     */
    protected $signature = 'app:send-lecturer-reminders';

    /**
     * Mô tả lệnh
     */
    protected $description = 'Gửi thông báo nhắc nhở cho giảng viên (Hội đồng, Lịch họp, Chấm bài)';

    /**
     * Logic chính của lệnh
     */
    public function handle()
    {
        $tomorrow = Carbon::tomorrow();
        $threeDaysAgo = Carbon::now()->subDays(3);

        $this->info('Bắt đầu gửi nhắc nhở...');

        // 1. Nhắc nhở Hội đồng (Sẽ diễn ra vào ngày mai)
        $upcomingCouncils = Hoidong::whereDate('NGAY_BAOCAO', $tomorrow)
            ->with('giangviens.nguoidung')
            ->get();

        foreach ($upcomingCouncils as $council) {
            foreach ($council->giangviens as $gv) {
                if ($gv->nguoidung) {
                    NotificationService::send(
                        $gv->nguoidung->ID_NGUOIDUNG,
                        "Nhắc nhở: Hội đồng bảo vệ ngày mai",
                        "Bạn có lịch hội đồng '{$council->TEN_HOIDONG}' vào ngày mai " . $tomorrow->format('d/m/Y') . ".",
                        'ACADEMIC',
                        '/lecturer/council'
                    );
                }
            }
        }
        $this->info('Đã gửi nhắc nhở Hội đồng.');

        // 2. Nhắc nhở Lịch họp (Sẽ diễn ra vào ngày mai - Chỉ nhắc người tạo là GV)
        $upcomingMeetings = LichHop::whereDate('THOIGIAN_BATDAU', $tomorrow)
            ->where('TRANGTHAI', '!=', 'Đã hủy')
            ->with(['nguoiTao.giangvien'])
            ->get();

        foreach ($upcomingMeetings as $meeting) {
            // Kiểm tra nếu người tạo là giảng viên (để tránh spam sinh viên)
            if ($meeting->nguoiTao && $meeting->nguoiTao->giangvien) {
                NotificationService::send(
                    $meeting->ID_NGUOITAO,
                    "Nhắc nhở: Lịch họp nhóm ngày mai",
                    "Cuộc họp '{$meeting->TIEUDE_LICHHOP}' sẽ diễn ra vào ngày mai lúc " . $meeting->THOIGIAN_BATDAU->format('H:i') . ".",
                    'TASK',
                    "/lecturer/groups-management/{$meeting->ID_NHOM}/schedule"
                );
            }
        }
        $this->info('Đã gửi nhắc nhở Lịch họp.');

        // 3. Nhắc nhở Duyệt bài (Bài nộp chờ > 3 ngày chưa duyệt)
        $pendingSubmissions = NopSanpham::where('TRANGTHAI', 'Chờ xác nhận')
            ->whereDate('NGAY_NOP', '<=', $threeDaysAgo)
            ->with('phancong.gvhd.nguoidung')
            ->get();

        // Group theo GVHD để gom thông báo (tránh spam 10 thông báo nếu có 10 bài)
        $pendingByGv = $pendingSubmissions->groupBy(function($item) {
            return $item->phancong->gvhd->ID_NGUOIDUNG ?? 'unknown';
        });

        foreach ($pendingByGv as $gvUserId => $submissions) {
            if ($gvUserId === 'unknown') continue;
            
            $count = $submissions->count();
            NotificationService::send(
                $gvUserId,
                "Nhắc nhở: Duyệt bài nộp",
                "Bạn có {$count} bài nộp của sinh viên đã chờ quá 3 ngày chưa được xử lý.",
                'ACADEMIC',
                '/lecturer/submissions'
            );
        }
        $this->info('Đã gửi nhắc nhở Duyệt bài.');
        
        $this->info('Hoàn tất quá trình gửi nhắc nhở.');
    }
}