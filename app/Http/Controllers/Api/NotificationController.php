<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Notification;

class NotificationController extends Controller
{
    /**
     * Lấy danh sách 5 thông báo chưa đọc gần nhất.
     */
    public function index(Request $request)
    {
        $notifications = $request->user()->notifications()
            // BỎ DÒNG NÀY ĐỂ LẤY CẢ THÔNG BÁO ĐÃ ĐỌC
            // ->whereNull('read_at') 
            ->latest()
            ->take(5)
            ->get();

        return response()->json($notifications);
    }

    /**
     * Lấy tổng số lượng thông báo chưa đọc.
     */
    public function unreadCount(Request $request)
    {
        $count = $request->user()->notifications()->whereNull('read_at')->count();
        return response()->json(['count' => $count]);
    }

    /**
     * Đánh dấu tất cả thông báo chưa đọc là đã đọc.
     */
    public function markAsRead(Request $request)
    {
        $request->user()->notifications()->whereNull('read_at')->update(['read_at' => now()]);
        return response()->json(['message' => 'Đã đánh dấu tất cả là đã đọc.']);
    }
}