<?php

namespace App\Services;

use App\Models\LichSuHoatDong;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ActivityLogger
{
    /**
     * Ghi lại một hoạt động vào lịch sử.
     *
     * @param string $action Mã hành động (VD: 'LOGIN', 'TASK_UPDATE')
     * @param string $title Tiêu đề hiển thị
     * @param array|null $details Chi tiết bổ sung (mảng)
     * @param int|null $groupId ID nhóm (nếu có)
     * @param string|null $icon Tên icon cho frontend (tùy chọn)
     */
    public static function log(string $action, string $title, ?array $details = [], ?int $groupId = null, ?string $icon = null)
    {
        try {
            if (!Auth::check()) {
                return; // Không ghi nếu chưa đăng nhập (trừ login sẽ xử lý riêng)
            }
            
            // Tự động chọn icon nếu không truyền vào
            if (!$icon) {
                $icon = self::getDefaultIcon($action);
            }

            LichSuHoatDong::create([
                'ID_NGUOIDUNG' => Auth::id(),
                'ID_NHOM' => $groupId,
                'LOAI_HANH_DONG' => $action,
                'TIEU_DE' => $title,
                'CHI_TIET' => $details,
                'ICON' => $icon,
                'NGAY_TAO' => now(),
            ]);

        } catch (\Exception $e) {
            // Không để lỗi ghi log làm chết app, chỉ ghi vào file log hệ thống
            Log::error("ActivityLogger Error: " . $e->getMessage());
        }
    }

    /**
     * Ghi log đặc biệt cho hành động Login (khi chưa có Auth::user() ổn định hoặc vừa login xong)
     */
    public static function logLogin($userId)
    {
        LichSuHoatDong::create([
            'ID_NGUOIDUNG' => $userId,
            'ID_NHOM' => null,
            'LOAI_HANH_DONG' => 'LOGIN',
            'TIEU_DE' => 'Đăng nhập hệ thống',
            'CHI_TIET' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            'ICON' => 'LogIn',
            'NGAY_TAO' => now(),
        ]);
    }

    private static function getDefaultIcon($action)
    {
        return match ($action) {
            'LOGIN' => 'LogIn',
            'LOGOUT' => 'LogOut',
            'UPDATE_PROFILE' => 'UserCog',
            'CHANGE_PASSWORD' => 'KeyRound',
            'CREATE_GROUP', 'JOIN_GROUP' => 'Users',
            'LEAVE_GROUP' => 'UserMinus',
            'REGISTER_TOPIC' => 'BookOpen',
            'TASK_CREATE', 'TASK_UPDATE' => 'CheckSquare',
            'TASK_MOVE' => 'Trello',
            'SUBMIT_PRODUCT' => 'UploadCloud',
            'CREATE_MEETING' => 'Calendar',
            default => 'Activity',
        };
    }
}