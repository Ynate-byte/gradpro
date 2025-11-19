<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LichSuHoatDong;
use App\Models\Nhom;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class HistoryController extends Controller
{
    /**
     * Lấy lịch sử hoạt động cá nhân.
     */
    public function getPersonalHistory(Request $request)
    {
        $user = $request->user(); 

        $query = LichSuHoatDong::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)
            ->with('nhom:ID_NHOM,TEN_NHOM')
            ->orderBy('NGAY_TAO', 'desc');

        if ($request->filled('type')) {
            $query->where('LOAI_HANH_DONG', $request->type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('TIEU_DE', 'like', "%{$search}%");
        }

        $history = $query->paginate($request->per_page ?? 20);

        return response()->json($history);
    }

    /**
     * Lấy thống kê hoạt động cá nhân (Cho các thẻ Dashboard)
     */
    public function getPersonalStats(Request $request)
    {
        try {
            // Sử dụng Auth::id() để an toàn hơn, hoặc fallback nếu $request->user() null
            $userId = Auth::id() ?? $request->user()?->ID_NGUOIDUNG;

            if (!$userId) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }
            
            // Tổng số
            $total = LichSuHoatDong::where('ID_NGUOIDUNG', $userId)->count();
            
            // Hôm nay
            $today = LichSuHoatDong::where('ID_NGUOIDUNG', $userId)
                ->whereDate('NGAY_TAO', Carbon::today())
                ->count();

            // Tạo mới (Các hành động tạo, đăng ký, nộp, mời, gửi yêu cầu)
            $created = LichSuHoatDong::where('ID_NGUOIDUNG', $userId)
                ->where(function($q) {
                    $q->where('LOAI_HANH_DONG', 'like', '%CREATE%')     
                      ->orWhere('LOAI_HANH_DONG', 'like', '%REGISTER%') 
                      ->orWhere('LOAI_HANH_DONG', 'like', '%SUBMIT%')   
                      ->orWhere('LOAI_HANH_DONG', 'like', '%INVITE%')   
                      ->orWhere('LOAI_HANH_DONG', 'like', '%REQUEST%')  
                      ->orWhere('LOAI_HANH_DONG', 'like', '%JOIN%');    
                })->count();

            // Cập nhật (Sửa, chuyển, đổi mật khẩu)
            $updated = LichSuHoatDong::where('ID_NGUOIDUNG', $userId)
                ->where(function($q) {
                    $q->where('LOAI_HANH_DONG', 'like', '%UPDATE%')
                      ->orWhere('LOAI_HANH_DONG', 'like', '%MOVE%')      
                      ->orWhere('LOAI_HANH_DONG', 'like', '%CHANGE%')    
                      ->orWhere('LOAI_HANH_DONG', 'like', '%TRANSFER%'); 
                })->count();

            // Xác thực (Đăng nhập/xuất)
            $auth = LichSuHoatDong::where('ID_NGUOIDUNG', $userId)
                ->whereIn('LOAI_HANH_DONG', ['LOGIN', 'LOGOUT'])
                ->count();

            return response()->json([
                'total' => $total,
                'today' => $today,
                'created' => $created,
                'updated' => $updated,
                'auth' => $auth
            ]);
        } catch (\Exception $e) {
            Log::error("Error getting personal stats: " . $e->getMessage());
            return response()->json(['message' => 'Server Error'], 500);
        }
    }
    
    /**
     * Lấy lịch sử hoạt động của một nhóm.
     */
    public function getGroupHistory(Request $request, $groupId)
    {
        $user = $request->user();
        $nhom = Nhom::findOrFail($groupId);

        $isManager = $this->isAdmin() || $this->isGiaoVu() || $this->isTruongKhoa();
        $isMember = $nhom->thanhviens()->where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)->exists();
        $isGvhd = $user->giangvien && ($nhom->phancongDetaiNhom?->ID_GVHD === $user->giangvien->ID_GIANGVIEN);

        if (!$isManager && !$isMember && !$isGvhd) {
            return response()->json(['message' => 'Bạn không có quyền xem lịch sử của nhóm này.'], 403);
        }

        $query = LichSuHoatDong::where('ID_NHOM', $groupId)
            ->with('nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN,MA_DINHDANH,EMAIL')
            ->orderBy('NGAY_TAO', 'desc');

        if ($request->filled('type')) {
            $query->where('LOAI_HANH_DONG', $request->type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('TIEU_DE', 'like', "%{$search}%")
                  ->orWhereHas('nguoidung', function($subQ) use ($search) {
                      $subQ->where('HODEM_VA_TEN', 'like', "%{$search}%");
                  });
            });
        }

        $history = $query->paginate($request->per_page ?? 20);

        return response()->json($history);
    }
}