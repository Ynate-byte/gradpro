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
    // Lấy danh sách lời mời đang chờ
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
    
    // Nghiệp vụ 2.3: Xử lý lời mời
    public function handleInvitation(Request $request, LoimoiNhom $loimoi)
    {
        $user = $request->user();
        if ($loimoi->ID_NGUOI_DUOCMOI !== $user->ID_NGUOIDUNG) {
            return response()->json(['message' => 'Lời mời không hợp lệ.'], 403);
        }
        
        $validated = $request->validate(['action' => 'required|in:accept,decline']);

        if ($validated['action'] === 'decline') {
            $loimoi->update(['TRANGTHAI' => 'Từ chối', 'NGAY_PHANHOI' => now()]);
            return response()->json(['message' => 'Bạn đã từ chối lời mời.']);
        }
        
        // Xử lý chấp nhận lời mời
        return DB::transaction(function () use ($loimoi, $user) {
            // Khóa dòng nhóm để kiểm tra
            $nhom = Nhom::where('ID_NHOM', $loimoi->ID_NHOM)->lockForUpdate()->first();
            
            if ($nhom->SO_THANHVIEN_HIENTAI >= 4) { // Giả sử giới hạn là 4
                $loimoi->update(['TRANGTHAI' => 'Hết hạn']); // Lời mời này không còn hợp lệ
                return response()->json(['message' => 'Tham gia thất bại! Nhóm này đã đủ thành viên.'], 409);
            }
            
            // Thêm thành viên vào nhóm
            ThanhvienNhom::create([
                'ID_NHOM' => $nhom->ID_NHOM,
                'ID_NGUOIDUNG' => $user->ID_NGUOIDUNG,
            ]);
            
            // Cập nhật số lượng thành viên
            $nhom->increment('SO_THANHVIEN_HIENTAI');
            if($nhom->SO_THANHVIEN_HIENTAI >= 4) {
                $nhom->TRANGTHAI = 'Đã đủ thành viên';
                $nhom->save();
            }

            // Cập nhật trạng thái lời mời hiện tại
            $loimoi->update(['TRANGTHAI' => 'Chấp nhận', 'NGAY_PHANHOI' => now()]);
            
            // Tự động từ chối tất cả các lời mời khác
            LoimoiNhom::where('ID_NGUOI_DUOCMOI', $user->ID_NGUOIDUNG)
                      ->where('TRANGTHAI', 'Đang chờ')
                      ->update(['TRANGTHAI' => 'Từ chối']);
                      
            return response()->json(['message' => 'Chào mừng bạn đến với nhóm mới!']);
        });
    }
}