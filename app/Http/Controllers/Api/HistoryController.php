<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LichSuHoatDong;
use App\Models\Nhom;
use Illuminate\Support\Facades\Auth;

class HistoryController extends Controller
{
    /**
     * Lấy lịch sử hoạt động cá nhân.
     */
    public function getPersonalHistory(Request $request)
    {
        $user = Auth::user();

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
     * Lấy lịch sử hoạt động của một nhóm.
     */
    public function getGroupHistory(Request $request, $groupId)
    {
        $user = Auth::user();
        $nhom = Nhom::findOrFail($groupId);

        // 1. Kiểm tra quyền
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