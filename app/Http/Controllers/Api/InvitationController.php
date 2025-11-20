<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\LoimoiNhom;
use App\Models\Nhom;
use App\Models\ThanhvienNhom;
use App\Models\KehoachKhoaluan;
use App\Services\ActivityLogger;

class InvitationController extends Controller
{
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

        if ($validated['action'] === 'decline') {
            $loimoi->update(['TRANGTHAI' => 'Từ chối', 'NGAY_PHANHOI' => now()]);
            return response()->json(['message' => 'Bạn đã từ chối lời mời.']);
        }
        
        return DB::transaction(function () use ($loimoi, $user) {
            // Lock row để tránh race condition
            $nhom = Nhom::where('ID_NHOM', $loimoi->ID_NHOM)->lockForUpdate()->first();
            
            // [SỬA] Tải thông tin kế hoạch để lấy giới hạn thành viên
            $nhom->load('kehoach');
            $plan = $nhom->kehoach;
            $maxMembers = $plan->SO_THANHVIEN_TOIDA ?? 3; // Mặc định 4 nếu không tìm thấy

            // Check feature flag
            if ($plan && !$plan->isFeatureActive('SV_TAO_NHOM')) {
                if (!$this->isAdmin() && !$this->isGiaoVu() && !$this->isTruongKhoa()) {
                    return response()->json(['message' => 'Giai đoạn tham gia nhóm đã kết thúc.'], 403);
                }
            }
            
            // [SỬA] Kiểm tra dựa trên số max động
            if ($nhom->SO_THANHVIEN_HIENTAI >= $maxMembers) {
                $loimoi->update(['TRANGTHAI' => 'Hết hạn']);
                return response()->json(['message' => "Tham gia thất bại! Nhóm đã đủ thành viên ({$maxMembers} người)."], 409);
            }
            
            ThanhvienNhom::create([
                'ID_NHOM' => $nhom->ID_NHOM,
                'ID_NGUOIDUNG' => $user->ID_NGUOIDUNG,
                'NGAY_VAONHOM' => now(),
            ]);
            
            $nhom->increment('SO_THANHVIEN_HIENTAI');

            // [SỬA] So sánh với số max động
            if ($nhom->SO_THANHVIEN_HIENTAI >= $maxMembers) {
                $nhom->TRANGTHAI = 'Đã đủ thành viên';
                $nhom->save();

                // --- TỰ ĐỘNG HỦY/TỪ CHỐI CÁC YÊU CẦU KHÁC ---
                \App\Models\LoimoiNhom::where('ID_NHOM', $nhom->ID_NHOM)
                    ->where('TRANGTHAI', 'Đang chờ')
                    ->update(['TRANGTHAI' => 'Hết hạn']); // Dùng trạng thái 'Hết hạn' hợp lý hơn

                \App\Models\YeucauVaoNhom::where('ID_NHOM', $nhom->ID_NHOM)
                    ->where('TRANGTHAI', 'Đang chờ')
                    ->update(['TRANGTHAI' => 'Từ chối']);
            }

            $loimoi->update(['TRANGTHAI' => 'Chấp nhận', 'NGAY_PHANHOI' => now()]);
            
            // Hủy các lời mời khác gửi đến user này (giữ nguyên logic cũ nếu có)
            \App\Models\LoimoiNhom::where('ID_NGUOI_DUOCMOI', $user->ID_NGUOIDUNG)
                ->where('ID_LOIMOI', '!=', $loimoi->ID_LOIMOI)
                ->where('TRANGTHAI', 'Đang chờ')
                ->update(['TRANGTHAI' => 'Từ chối']); // Tự động từ chối các nhóm khác
            
            ActivityLogger::log(
                'JOIN_GROUP', 
                "Đã tham gia nhóm {$nhom->TEN_NHOM}", 
                ['group_id' => $nhom->ID_NHOM],
                $nhom->ID_NHOM,
                'UserPlus'
            );
            return response()->json(['message' => 'Chào mừng bạn đến với nhóm mới!']);
        });
    }
}