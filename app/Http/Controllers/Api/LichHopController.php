<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LichHop;
use App\Models\Nhom;
use App\Models\KehoachKhoaluan;
use App\Models\PhancongDetaiNhom;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Carbon\Carbon;
use App\Services\ActivityLogger;
use App\Services\NotificationService;
// Import models cần dùng cho check trực tiếp
use App\Models\ThanhvienNhom;

class LichHopController extends Controller
{
    /**
     * Kiểm tra quyền truy cập vào lịch họp của một nhóm
     * (Fix lỗi 403: Truy vấn trực tiếp DB để chắc chắn)
     */
    private function checkGroupAccess(Nhom $nhom)
    {
        $user = Auth::user();
        if (!$user) return false;

        // 1. Admin / Quản lý
        if ($this->isAdmin() || $this->isGiaoVu() || $this->isTruongKhoa()) {
            return true;
        }

        // 2. Thành viên nhóm (Sinh viên) - Check trực tiếp bảng THANHVIEN_NHOM
        $isMember = ThanhvienNhom::where('ID_NHOM', $nhom->ID_NHOM)
            ->where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)
            ->exists();
            
        if ($isMember) return true;

        // 3. GVHD - Check trực tiếp bảng PHANCONG_DETAI_NHOM
        if ($user->giangvien) {
            $isGvhd = PhancongDetaiNhom::where('ID_NHOM', $nhom->ID_NHOM)
                ->where('ID_GVHD', $user->giangvien->ID_GIANGVIEN)
                ->exists();
            if ($isGvhd) return true;
        }

        return false;
    }

    /**
     * Lấy tất cả lịch họp (sắp tới và đã qua) của một nhóm.
     */
    public function getMeetingsForGroup(Nhom $nhom, Request $request)
    {
        if (!$this->checkGroupAccess($nhom)) {
            return response()->json(['message' => 'Bạn không có quyền xem lịch họp của nhóm này.'], 403);
        }

        // Tải thông tin nhóm cần thiết
        $nhom->loadMissing([
            'phancongDetaiNhom.detai.nguoiDexuat.nguoidung',
            'phancongDetaiNhom.gvhd.nguoidung',
            'thanhviens.nguoidung' => function ($query) {
                $query->with(['vaitro', 'sinhvien.chuyennganh']); 
            },
            'nhomtruong',
        ]);

        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        // Query Lịch họp
        $query = $nhom->lichHops()
            ->with('nguoiTao:ID_NGUOIDUNG,HODEM_VA_TEN,ID_VAITRO', 'nguoiTao.vaitro:ID_VAITRO,TEN_VAITRO');
            
        if ($startDate && $endDate) {
            $start = Carbon::parse($startDate)->startOfDay();
            $end = Carbon::parse($endDate)->endOfDay();
            $query->whereBetween('THOIGIAN_BATDAU', [$start, $end]);
        }
            
        $meetings = $query->orderBy('THOIGIAN_BATDAU', 'desc')->get();
        
        return response()->json([
            'groupInfo' => $nhom,
            'meetings' => $meetings,
        ]);
    }

    /**
     * Tạo một lịch họp mới cho nhóm.
     */
    public function storeMeetingForGroup(Request $request, Nhom $nhom)
    {
        $user = Auth::user();
        
        // Kiểm tra quyền quản lý nhóm (Trưởng nhóm hoặc GVHD hoặc Quản lý)
        $isLeader = $nhom->ID_NHOMTRUONG === $user->ID_NGUOIDUNG;
        
        // Check GVHD trực tiếp DB
        $isGvhd = false;
        if ($user->giangvien) {
            $isGvhd = PhancongDetaiNhom::where('ID_NHOM', $nhom->ID_NHOM)
                ->where('ID_GVHD', $user->giangvien->ID_GIANGVIEN)
                ->exists();
        }

        $isManager = $this->isAdmin() || $this->isGiaoVu() || $this->isTruongKhoa();

        if (!$isLeader && !$isGvhd && !$isManager) {
            return response()->json(['message' => 'Chỉ Nhóm trưởng, GVHD hoặc Quản lý mới có thể tạo lịch họp.'], 403);
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

        // Gửi thông báo cho các thành viên khác
        $memberIds = ThanhvienNhom::where('ID_NHOM', $nhom->ID_NHOM)
            ->where('ID_NGUOIDUNG', '!=', $user->ID_NGUOIDUNG)
            ->pluck('ID_NGUOIDUNG')
            ->toArray();

        // Nếu GVHD tạo -> Gửi cho SV. Nếu SV tạo -> Gửi cho GVHD (nếu có)
        $assignment = PhancongDetaiNhom::where('ID_NHOM', $nhom->ID_NHOM)->first();
        if ($assignment && $assignment->ID_GVHD != $user->ID_NGUOIDUNG) {
            // Tránh duplicate nếu GVHD vô tình cũng là thành viên (hiếm nhưng an toàn)
            if (!in_array($assignment->ID_GVHD, $memberIds)) {
                $memberIds[] = $assignment->ID_GVHD;
            }
        }

        foreach ($memberIds as $mid) {
            NotificationService::send(
                $mid,
                "Lịch họp mới: {$lichHop->TIEUDE_LICHHOP}",
                "Thời gian: " . Carbon::parse($lichHop->THOIGIAN_BATDAU)->format('H:i d/m/Y'),
                'TASK',
                "/projects/my-group/schedule/{$nhom->ID_NHOM}"
            );
        }

        ActivityLogger::log(
            'CREATE_MEETING', 
            "Lên lịch họp: {$lichHop->TIEUDE_LICHHOP}", 
            ['meeting_id' => $lichHop->ID_LICHHOP, 'time' => $lichHop->THOIGIAN_BATDAU], 
            $nhom->ID_NHOM
        );

        return response()->json($lichHop->load('nguoiTao:ID_NGUOIDUNG,HODEM_VA_TEN,ID_VAITRO', 'nguoiTao.vaitro:ID_VAITRO,TEN_VAITRO'), 201);
    }

    /**
     * Cập nhật một lịch họp đã có.
     */
    public function updateMeeting(Request $request, LichHop $lichhop)
    {
        $isCreator = $lichhop->ID_NGUOITAO === Auth::id();
        $isManager = $this->isAdmin() || $this->isGiaoVu() || $this->isTruongKhoa();

        if (!$isCreator && !$isManager) {
            return response()->json(['message' => 'Bạn không có quyền sửa lịch họp này.'], 403);
        }

        $validated = $request->validate([
            'TIEUDE_LICHHOP' => 'sometimes|required|string|max:255',
            'THOIGIAN_BATDAU' => 'sometimes|required|date',
            'THOIGIAN_KETTHUC' => 'nullable|date|after:THOIGIAN_BATDAU',
            'HINHTHUC_HOP' => ['sometimes', 'required', Rule::in(['Trực tiếp', 'Trực tuyến'])],
            'DIADIEM' => 'nullable|string|max:255',
            'LINK_TRUCTUYEN' => 'nullable|url|max:500',
            'GHICHU' => 'nullable|string',
            'TRANGTHAI' => ['sometimes', Rule::in(['Đã lên lịch', 'Đã diễn ra', 'Đã hủy'])],
            'NOIDUNG_HOP' => 'nullable|string',
            'DANHGIA' => 'nullable|in:Tot,BinhThuong,KhongTot',
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
     */
    public function cancelMeeting(LichHop $lichhop)
    {
        $isCreator = $lichhop->ID_NGUOITAO === Auth::id();
        $isManager = $this->isAdmin() || $this->isGiaoVu() || $this->isTruongKhoa();

        if (!$isCreator && !$isManager) {
            return response()->json(['message' => 'Bạn không có quyền hủy lịch họp này.'], 403);
        }

        if ($lichhop->TRANGTHAI === 'Đã diễn ra') {
            return response()->json(['message' => 'Không thể hủy lịch họp đã diễn ra.'], 400);
        }

        $lichhop->update(['TRANGTHAI' => 'Đã hủy']);

        return response()->json(['message' => 'Đã hủy lịch họp thành công.']);
    }

    /**
     * Lấy danh sách các nhóm mà giảng viên đang hướng dẫn 
     */
    public function getLecturerGroups(Request $request)
    {
        $user = Auth::user();
        if (!$user->giangvien) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        $gvId = $user->giangvien->ID_GIANGVIEN;

        $activePlanIds = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm'])
            ->pluck('ID_KEHOACH');

        // Sử dụng PhancongDetaiNhom để link chuẩn xác hơn
        $groups = Nhom::whereIn('ID_KEHOACH', $activePlanIds)
            ->join('PHANCONG_DETAI_NHOM', 'NHOM.ID_NHOM', '=', 'PHANCONG_DETAI_NHOM.ID_NHOM')
            ->where('PHANCONG_DETAI_NHOM.ID_GVHD', $gvId)
            ->with('kehoach:ID_KEHOACH,TEN_DOT')
            ->select('NHOM.ID_NHOM', 'NHOM.TEN_NHOM', 'NHOM.ID_KEHOACH') 
            ->get();

        return response()->json($groups);
    }

    /**
     * Lấy toàn bộ lịch họp do Giảng viên tạo ra
     */
    public function getLecturerSchedule(Request $request)
    {
        $user = Auth::user();
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $query = LichHop::query()
            ->where('ID_NGUOITAO', $user->ID_NGUOIDUNG)
            ->where('TRANGTHAI', '!=', 'Đã hủy')
            ->with('nhom:ID_NHOM,TEN_NHOM');

        if ($startDate && $endDate) {
            $start = Carbon::parse($startDate)->startOfDay();
            $end = Carbon::parse($endDate)->endOfDay();
            $query->whereBetween('THOIGIAN_BATDAU', [$start, $end]);
        }

        $meetings = $query->get();
        return response()->json($meetings);
    }

    public function createQuickMeeting(Request $request)
    {
        $request->validate([
            'ID_NHOM' => 'required|exists:NHOM,ID_NHOM',
            'START_TIME' => 'required'
        ]);

        $user = Auth::user();
        
        $startTime = Carbon::parse($request->START_TIME);
        $endTime = $startTime->copy()->addMinutes(45);

        $nhom = Nhom::find($request->ID_NHOM);
        $title = "Họp hướng dẫn - " . $nhom->TEN_NHOM;

        $lichHop = LichHop::create([
            'ID_NHOM' => $request->ID_NHOM,
            'ID_NGUOITAO' => $user->ID_NGUOIDUNG,
            'TIEUDE_LICHHOP' => $title,
            'THOIGIAN_BATDAU' => $startTime,
            'THOIGIAN_KETTHUC' => $endTime,
            'HINHTHUC_HOP' => 'Trực tiếp',
            'TRANGTHAI' => 'Đã lên lịch',
            'GHICHU' => 'Lịch hẹn nhanh qua Calendar'
        ]);

        return response()->json($lichHop->load('nhom'), 201);
    }

    public function rateMeeting(Request $request, $id)
    {
        $request->validate([
            'DANHGIA' => 'required|in:Tot,BinhThuong,KhongTot'
        ]);

        $lichHop = LichHop::where('ID_LICHHOP', $id)
            ->where('ID_NGUOITAO', Auth::id())
            ->firstOrFail();

        $lichHop->update([
            'DANHGIA' => $request->DANHGIA,
        ]);

        return response()->json(['message' => 'Đã đánh giá cuộc họp.', 'data' => $lichHop]);
    }
}