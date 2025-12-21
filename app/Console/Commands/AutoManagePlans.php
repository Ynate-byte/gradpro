<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\KehoachKhoaluan;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use App\Services\NotificationService;

class AutoManagePlans extends Command
{
    /**
     * Tên lệnh: Tự động kích hoạt/đóng kế hoạch
     */
    protected $signature = 'app:auto-manage-plans';
    protected $description = 'Quản lý trạng thái kế hoạch: Kích hoạt lúc 00:01 và Đóng sau khi qua 23:59 ngày kết thúc.';

    public function handle()
    {
        // Lấy thời điểm 00:00:00 của ngày HÔM NAY
        $todayStart = Carbon::now()->startOfDay(); 

        $this->info("BẮT ĐẦU QUÉT: " . $todayStart->format('d/m/Y H:i:s') . " ");
        $plansToStart = KehoachKhoaluan::where('TRANGTHAI', 'Đã phê duyệt')
            // Điều kiện: NGAY_BATDAU <= Hôm nay (00:00:00)
            ->whereDate('NGAY_BATDAU', '<=', $todayStart)
            ->get();

        foreach ($plansToStart as $plan) {
            $plan->update(['TRANGTHAI' => 'Đang thực hiện']);
            
            Log::info("[AUTO-START] Kế hoạch ID {$plan->ID_KEHOACH} đã bắt đầu lúc 00:01 ngày " . $plan->NGAY_BATDAU->format('d/m/Y'));
            $this->info("Đã kích hoạt: {$plan->TEN_DOT}");

            // Gửi thông báo
            if ($plan->ID_NGUOITAO) {
                NotificationService::send(
                    $plan->ID_NGUOITAO,
                    "Kế hoạch đã bắt đầu",
                    "Kế hoạch '{$plan->TEN_DOT}' đã chính thức kích hoạt.",
                    'SYSTEM',
                    '/admin/thesis-plans',
                    ['plan_id' => $plan->ID_KEHOACH]
                );
            }
        }

        $plansToEnd = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm'])
            ->whereDate('NGAY_KETHUC', '<', $todayStart)
            ->get();

        foreach ($plansToEnd as $plan) {
            $plan->update(['TRANGTHAI' => 'Đã hoàn thành']);

            Log::info("[AUTO-CLOSE] Kế hoạch ID {$plan->ID_KEHOACH} đã kết thúc (sau 23:59 ngày " . $plan->NGAY_KETHUC->format('d/m/Y') . ")");
            $this->info("Đã đóng: {$plan->TEN_DOT}");

            if ($plan->ID_NGUOITAO) {
                NotificationService::send(
                    $plan->ID_NGUOITAO,
                    "Kế hoạch đã kết thúc",
                    "Kế hoạch '{$plan->TEN_DOT}' đã hết thời gian thực hiện.",
                    'SYSTEM',
                    '/admin/thesis-plans',
                    ['plan_id' => $plan->ID_KEHOACH],
                    'URGENT'
                );
            }
        }

        $this->info("HOÀN TẤT");
    }
}