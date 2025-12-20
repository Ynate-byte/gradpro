<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\LoimoiNhom;
use App\Models\Nhom;
use App\Models\ThanhvienNhom;
use App\Models\KehoachKhoaluan;
use App\Models\YeucauVaoNhom;
use App\Models\Nguoidung;
use App\Models\SinhvienThamgia;
use App\Services\ActivityLogger;
use App\Services\NotificationService;

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

        // 1. Kiểm tra quyền sở hữu lời mời
        if ($loimoi->ID_NGUOI_DUOCMOI !== $user->ID_NGUOIDUNG) {
            return response()->json(['message' => 'Lời mời không hợp lệ.'], 403);
        }
        
        $validated = $request->validate(['action' => 'required|in:accept,decline']);

        // 2. Trường hợp TỪ CHỐI
        if ($validated['action'] === 'decline') {
            $loimoi->update(['TRANGTHAI' => 'Từ chối', 'NGAY_PHANHOI' => now()]);
            return response()->json(['message' => 'Bạn đã từ chối lời mời.']);
        }
        
        // 3. Trường hợp CHẤP NHẬN (Sử dụng Transaction để đảm bảo toàn vẹn dữ liệu)
        return DB::transaction(function () use ($loimoi, $user) {
            // Lock dòng dữ liệu nhóm để tránh race condition (nhiều người vào cùng lúc)
            $nhom = Nhom::where('ID_NHOM', $loimoi->ID_NHOM)->lockForUpdate()->first();
            
            // Kiểm tra kế hoạch & Feature Flag
            $plan = KehoachKhoaluan::find($nhom->ID_KEHOACH);
            $maxMembers = $plan->SO_THANHVIEN_TOIDA ?? 4; // Mặc định 4 nếu không tìm thấy

            // Nếu không phải Admin/GV thì phải check thời gian mở chức năng
            if ($plan && !$plan->isFeatureActive('SV_TAO_NHOM')) {
                if (!$this->isAdmin() && !$this->isGiaoVu() && !$this->isTruongKhoa()) {
                    return response()->json(['message' => 'Giai đoạn tham gia nhóm đã kết thúc.'], 403);
                }
            }
            
            // Kiểm tra số lượng thành viên
            if ($nhom->SO_THANHVIEN_HIENTAI >= $maxMembers) {
                $loimoi->update(['TRANGTHAI' => 'Hết hạn']);
                return response()->json(['message' => "Tham gia thất bại! Nhóm đã đủ thành viên ({$maxMembers} người)."], 409);
            }

            // Kiểm tra xem user đã có nhóm nào khác trong kế hoạch này chưa
            $alreadyInGroup = ThanhvienNhom::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)
                ->whereHas('nhom', fn($q) => $q->where('ID_KEHOACH', $nhom->ID_KEHOACH))
                ->exists();

            if ($alreadyInGroup) {
                return response()->json(['message' => 'Bạn đã là thành viên của một nhóm khác.'], 409);
            }
            
            //THÊM THÀNH VIÊN VÀO NHÓM
            ThanhvienNhom::create([
                'ID_NHOM' => $nhom->ID_NHOM,
                'ID_NGUOIDUNG' => $user->ID_NGUOIDUNG,
                'NGAY_VAONHOM' => now(),
            ]);
            
            $nhom->increment('SO_THANHVIEN_HIENTAI');

            // Cập nhật trạng thái nhóm nếu đã đầy
            if ($nhom->SO_THANHVIEN_HIENTAI >= $maxMembers) {
                $nhom->TRANGTHAI = 'Đã đủ thành viên';
                $nhom->save();

                // Tự động hủy các lời mời/yêu cầu khác CỦA NHÓM NÀY (vì nhóm đã đầy)
                LoimoiNhom::where('ID_NHOM', $nhom->ID_NHOM)
                    ->where('TRANGTHAI', 'Đang chờ')
                    ->update(['TRANGTHAI' => 'Hết hạn']); 

                YeucauVaoNhom::where('ID_NHOM', $nhom->ID_NHOM)
                    ->where('TRANGTHAI', 'Đang chờ')
                    ->update(['TRANGTHAI' => 'Từ chối']);
            }

            // Cập nhật trạng thái lời mời hiện tại
            $loimoi->update(['TRANGTHAI' => 'Chấp nhận', 'NGAY_PHANHOI' => now()]);
            
            LoimoiNhom::where('ID_NGUOI_DUOCMOI', $user->ID_NGUOIDUNG)
                ->where('ID_LOIMOI', '!=', $loimoi->ID_LOIMOI)
                ->where('TRANGTHAI', 'Đang chờ')
                ->update(['TRANGTHAI' => 'Từ chối']);

            YeucauVaoNhom::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)
                ->where('TRANGTHAI', 'Đang chờ')
                ->whereHas('nhom', function($q) use ($nhom) {
                    $q->where('ID_KEHOACH', $nhom->ID_KEHOACH);
                })
                ->update(['TRANGTHAI' => 'Đã hủy']);
            
            // Ghi Log
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