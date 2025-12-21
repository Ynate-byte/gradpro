<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Lệnh nhắc nhở giảng viên (Gửi lúc 7h sáng)
Schedule::command('app:send-lecturer-reminders')->dailyAt('07:00');

// Chạy lúc 00:01 sáng.
// - Kế hoạch bắt đầu hôm nay: Sẽ được bật ngay lập tức.
// - Kế hoạch kết thúc hôm qua (23:59 hôm qua): Sẽ được đóng ngay lúc này.
Schedule::command('app:auto-manage-plans')->dailyAt('00:01');