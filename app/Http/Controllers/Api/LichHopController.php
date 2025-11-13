<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LichHop;
use App\Models\Nhom;
use App\Models\ThanhvienNhom;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class LichHopController extends Controller
{
    /**
     * Kiểm tra quyền truy cập vào lịch họp của một nhóm
     * (Thành viên, GVHD, hoặc Admin)
     */
    private function checkGroupAccess(Nhom $nhom)
    {
        $user = Auth::user();
        if ($this->isAdmin()) return true;

        // Kiểm tra thành viên
        $isMember = $nhom->thanhviens()->where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)->exists();
        if ($isMember) return true;

        // Kiểm tra GVHD (Đã sửa lỗi)
        if ($user->giangvien) {
            $isGvhd = $nhom->phancongDetaiNhom?->ID_GVHD === $user->giangvien->ID_GIANGVIEN;
            if ($isGvhd) return true;
        }

        return false;
    }

    /**
     * Lấy tất cả lịch họp (sắp tới và đã qua) của một nhóm.
     * [SỬA ĐỔI]: Eager-load thêm thông tin Nhóm, Đề tài, và Vai trò của Người tạo.
     */
    public function getMeetingsForGroup(Nhom $nhom)
    {
        if (!$this->checkGroupAccess($nhom)) {
            return response()->json(['message' => 'Bạn không có quyền xem lịch họp của nhóm này.'], 403);
        }

        // Tải đầy đủ thông tin nhóm, bao gồm cả thành viên
        $nhom->loadMissing([
            'phancongDetaiNhom.detai.nguoiDexuat.nguoidung', // Tải đề tài
            'phancongDetaiNhom.gvhd.nguoidung', // Tải GVHD
            'thanhviens.nguoidung' => function ($query) { // Tải thành viên
                $query->with(['vaitro', 'sinhvien.chuyennganh']); 
            },
            'nhomtruong', // Tải nhóm trưởng
        ]);

        $meetings = $nhom->lichHops()
                         // ===== [SỬA ĐỔI TẠI ĐÂY] =====
                         // Tải thêm 'vaitro' của người tạo
                         ->with('nguoiTao:ID_NGUOIDUNG,HODEM_VA_TEN,ID_VAITRO', 'nguoiTao.vaitro:ID_VAITRO,TEN_VAITRO')
                         // ===== [KẾT THÚC SỬA ĐỔI] =====
                         ->orderBy('THOIGIAN_BATDAU', 'desc')
                         ->get();
        
        // Gói dữ liệu trả về
        return response()->json([
            'groupInfo' => $nhom,
            'meetings' => $meetings,
        ]);
    }

    /**
     * Tạo một lịch họp mới cho nhóm.
     * (Chỉ nhóm trưởng hoặc GVHD)
     */
    public function storeMeetingForGroup(Request $request, Nhom $nhom)
    {
        $user = Auth::user();
        $isLeader = $nhom->ID_NHOMTRUONG === $user->ID_NGUOIDUNG;
        
        $isGvhd = $user->giangvien && ($nhom->phancongDetaiNhom?->ID_GVHD === $user->giangvien->ID_GIANGVIEN);

        if (!$isLeader && !$isGvhd && !$this->isAdmin()) {
            return response()->json(['message' => 'Chỉ Nhóm trưởng hoặc GVHD mới có thể tạo lịch họp.'], 403);
        }

        $validated = $request->validate([
            'TIEUDE_LICHHOP' => 'required|string|max:255',
            'THOIGIAN_BATDAU' => 'required|date|after_or_equal:now',
            'THOIGIAN_KETTHUC' => 'nullable|date|after:THOIGIAN_BATDAU',
            'HINHTHUC_HOP' => ['required', Rule::in(['Trực tiếp', 'Trực tuyến'])],
            'DIADIEM' => 'nullable|string|max:255|required_if:HINHTHUC_HOP,Trực tiếp',
            'LINK_TRUCTUYEN' => 'nullable|url|max:500|required_if:HINHTHUC_HOP,Trực tuyến',
            'GHICHU' => 'nullable|string',
        ]);
        
        if ($validated['HINHTHUC_HOP'] === 'Trực tiếp') {
            $validated['LINK_TRUCTUYEN'] = null;
        } else {
            $validated['DIADIEM'] = null;
        }

        $lichHop = $nhom->lichHops()->create(array_merge(
            $validated,
            ['ID_NGUOITAO' => $user->ID_NGUOIDUNG]
        ));

        // TODO: Gửi thông báo (Notification)

        return response()->json($lichHop->load('nguoiTao:ID_NGUOIDUNG,HODEM_VA_TEN,ID_VAITRO', 'nguoiTao.vaitro:ID_VAITRO,TEN_VAITRO'), 201);
    }

    /**
     * Cập nhật một lịch họp.
     * (Chỉ người tạo lịch họp)
     */
    public function updateMeeting(Request $request, LichHop $lichhop)
    {
        if ($lichhop->ID_NGUOITAO !== Auth::id()) {
            return response()->json(['message' => 'Bạn không có quyền sửa lịch họp này.'], 403);
        }

        $validated = $request->validate([
            'TIEUDE_LICHHOP' => 'sometimes|required|string|max:255',
            'THOIGIAN_BATDAU' => 'sometimes|required|date',
            'THOIGIAN_KETTHUC' => 'nullable|date|after:THOIGIAN_BATDAU',
            'HINHTHUC_HOP' => ['sometimes', 'required', Rule::in(['Trực tiếp', 'Trực tuyến'])],
            'DIADIEM' => 'nullable|string|max:255|required_if:HINHTHUC_HOP,Trực tiếp',
            'LINK_TRUCTUYEN' => 'nullable|url|max:500|required_if:HINHTHUC_HOP,Trực tuyến',
            'GHICHU' => 'nullable|string',
            'TRANGTHAI' => ['sometimes', Rule::in(['Đã lên lịch', 'Đã diễn ra', 'Đã hủy'])],
        ]);

        if (isset($validated['HINHTHUC_HOP'])) {
            if ($validated['HINHTHUC_HOP'] === 'Trực tiếp') {
                $validated['LINK_TRUCTUYEN'] = null;
            } else {
                $validated['DIADIEM'] = null;
            }
        }

        $lichhop->update($validated);

        return response()->json($lichhop->load('nguoiTao:ID_NGUOIDUNG,HODEM_VA_TEN,ID_VAITRO', 'nguoiTao.vaitro:ID_VAITRO,TEN_VAITRO'));
    }

    /**
     * Hủy một lịch họp.
     * (Chỉ người tạo lịch họp)
     */
    public function cancelMeeting(LichHop $lichhop)
    {
        if ($lichhop->ID_NGUOITAO !== Auth::id()) {
            return response()->json(['message' => 'Bạn không có quyền hủy lịch họp này.'], 403);
        }

        if ($lichhop->TRANGTHAI === 'Đã diễn ra') {
            return response()->json(['message' => 'Không thể hủy lịch họp đã diễn ra.'], 400);
        }

        $lichhop->update(['TRANGTHAI' => 'Đã hủy']);

        return response()->json(['message' => 'Đã hủy lịch họp thành công.']);
    }
}