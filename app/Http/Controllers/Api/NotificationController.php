<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Thongbao;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Lấy danh sách thông báo (có phân trang).
     */
    public function index(Request $request)
    {
        $userId = Auth::id();
        
        $query = Thongbao::where('ID_NGUOINHAN', $userId)
            ->orderBy('NGAY_TAO', 'desc');

        // Lọc xem tất cả hay chỉ xem chưa đọc
        if ($request->has('filter') && $request->filter === 'unread') {
            $query->where('DA_DOC', false);
        }

        $notifications = $query->paginate($request->per_page ?? 10);

        return response()->json($notifications);
    }

    /**
     * Đếm số lượng chưa đọc (cho Badge đỏ).
     */
    public function unreadCount()
    {
        $count = Thongbao::where('ID_NGUOINHAN', Auth::id())
            ->where('DA_DOC', false)
            ->count();
        
        return response()->json(['count' => $count]);
    }

    /**
     * Đánh dấu đã đọc (Một cái hoặc tất cả).
     */
    public function markAsRead(Request $request)
    {
        $userId = Auth::id();

        if ($request->has('id')) {
            // Đánh dấu 1 cái cụ thể
            Thongbao::where('ID_THONGBAO', $request->id)
                ->where('ID_NGUOINHAN', $userId)
                ->update(['DA_DOC' => true]);
        } else {
            // Đánh dấu tất cả
            Thongbao::where('ID_NGUOINHAN', $userId)
                ->where('DA_DOC', false)
                ->update(['DA_DOC' => true]);
        }
        
        return response()->json(['message' => 'Đã cập nhật trạng thái.']);
    }

    /**
     * Xóa thông báo.
     */
    public function destroy($id)
    {
        $noti = Thongbao::where('ID_THONGBAO', $id)
            ->where('ID_NGUOINHAN', Auth::id())
            ->first();

        if ($noti) {
            $noti->delete();
            return response()->json(['message' => 'Đã xóa thông báo.']);
        }

        return response()->json(['message' => 'Không tìm thấy.'], 404);
    }
}