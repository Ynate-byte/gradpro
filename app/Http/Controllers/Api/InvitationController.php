<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\LoimoiNhom;
use App\Models\Nhom;
use App\Models\ThanhvienNhom;

class InvitationController extends Controller
{
    // QUẢN LÝ LỜI MỜI VÀO NHÓM

    /**
     * Lấy danh sách các lời mời đang chờ của người dùng.
     */
    public function getPendingInvitations(Request $request)
    {
        $user = $request->user();
        
        $invitations = LoimoiNhom::where('ID_NGUOI_DUOCMOI', $user->ID_NGUOIDUNG)
            ->where('TRANGTHAI', 'Đang chờ')
            ->where('NGAY_HETHAN', '>', now())
            ->with('nhom.nhomtruong')
            ->orderBy('NGAYTAO', 'desc')
            ->get();
            
        return response()->json($invitations);
    }
    
    /**
     * Xử lý việc chấp nhận hoặc từ chối một lời mời vào nhóm.
     */
    public function handleInvitation(Request $request, LoimoiNhom $loimoi)
    {
        $user = $request->user();
        if ($loimoi->ID_NGUOI_DUOCMOI !== $user->ID_NGUOIDUNG) {
            return response()->json(['message' => 'Lời mời không hợp lệ.'], 403);
        }
        
        $validated = $request->validate(['action' => 'required|in:accept,decline']);

        // Trường hợp từ chối lời mời
        if ($validated['action'] === 'decline') {
            $loimoi->update(['TRANGTHAI' => 'Từ chối', 'NGAY_PHANHOI' => now()]);
            return response()->json(['message' => 'Bạn đã từ chối lời mời.']);
        }
        
        // Trường hợp chấp nhận lời mời (sử dụng transaction để đảm bảo toàn vẹn dữ liệu)
        return DB::transaction(function () use ($loimoi, $user) {
            $nhom = Nhom::where('ID_NHOM', $loimoi->ID_NHOM)->lockForUpdate()->first();
            
            // Kiểm tra xem nhóm còn chỗ không
            if ($nhom->SO_THANHVIEN_HIENTAI >= 4) {
                $loimoi->update(['TRANGTHAI' => 'Hết hạn']);
                return response()->json(['message' => 'Tham gia thất bại! Nhóm này đã đủ thành viên.'], 409);
            }
            
            // Thêm người dùng vào nhóm
            ThanhvienNhom::create([
                'ID_NHOM' => $nhom->ID_NHOM,
                'ID_NGUOIDUNG' => $user->ID_NGUOIDUNG,
            ]);
            
            // Cập nhật số lượng thành viên và trạng thái nhóm nếu cần
            $nhom->increment('SO_THANHVIEN_HIENTAI');
            if ($nhom->SO_THANHVIEN_HIENTAI >= 4) {
                $nhom->TRANGTHAI = 'Đã đủ thành viên';
                $nhom->save();
            }

            // Cập nhật trạng thái lời mời hiện tại là "Chấp nhận"
            $loimoi->update(['TRANGTHAI' => 'Chấp nhận', 'NGAY_PHANHOI' => now()]);
            
            // Tự động từ chối tất cả các lời mời đang chờ khác của người dùng
            LoimoiNhom::where('ID_NGUOI_DUOCMOI', $user->ID_NGUOIDUNG)
                      ->where('TRANGTHAI', 'Đang chờ')
                      ->update(['TRANGTHAI' => 'Từ chối']);
                      
            return response()->json(['message' => 'Chào mừng bạn đến với nhóm mới!']);
        });
    }
}
