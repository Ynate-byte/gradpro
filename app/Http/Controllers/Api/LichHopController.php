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

class LichHopController extends Controller
{
    /**
     * Kiểm tra quyền truy cập vào lịch họp của một nhóm
     * (Helper function)
     */
    private function checkGroupAccess(Nhom $nhom)
    {
        $user = Auth::user();
        
        if ($this->isAdmin() || $this->isGiaoVu() || $this->isTruongKhoa()) {
            return true;
        }

        // Kiểm tra thành viên
        $isMember = $nhom->thanhviens()->where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)->exists();
        if ($isMember) return true;

        // Kiểm tra GVHD
        if ($user->giangvien) {
            $isGvhd = $nhom->phancongDetaiNhom?->ID_GVHD === $user->giangvien->ID_GIANGVIEN;
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
            // Đảm bảo so sánh ngày bao trọn vẹn khoảng thời gian
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
     * Tạo một lịch họp mới cho nhóm (Form truyền thống).
     */
    public function storeMeetingForGroup(Request $request, Nhom $nhom)
    {
        $user = Auth::user();
        $isLeader = $nhom->ID_NHOMTRUONG === $user->ID_NGUOIDUNG;
        
        $isGvhd = $user->giangvien && ($nhom->phancongDetaiNhom?->ID_GVHD === $user->giangvien->ID_GIANGVIEN);

        // [CẬP NHẬT] Cho phép các vai trò quản lý tạo lịch họp
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

        ActivityLogger::log(
            'CREATE_MEETING', 
            "Lên lịch họp: {$lichHop->TIEUDE_LICHHOP}", 
            ['meeting_id' => $lichHop->ID_LICHHOP, 'time' => $lichHop->THOIGIAN_BATDAU], 
            $nhom->ID_NHOM
        );

        return response()->json($lichHop->load('nguoiTao:ID_NGUOIDUNG,HODEM_VA_TEN,ID_VAITRO', 'nguoiTao.vaitro:ID_VAITRO,TEN_VAITRO'), 201);
    }

    /**
     * Cập nhật một lịch họp (Full Update).
     * Hỗ trợ cập nhật cả đánh giá (DANHGIA) và nội dung họp.
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

        // Xử lý logic địa điểm/link nếu hình thức họp thay đổi
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
     * (Chỉ trong các kế hoạch Đang thực hiện/Chấm điểm để hiện lên Sidebar)
     */
    public function getLecturerGroups(Request $request)
    {
        $user = Auth::user();
        if (!$user->giangvien) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        $gvId = $user->giangvien->ID_GIANGVIEN;

        // 1. Lấy các kế hoạch đang active
        $activePlanIds = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm'])
            ->pluck('ID_KEHOACH');

        // 2. Lấy các nhóm mà GV này hướng dẫn trong các kế hoạch đó
        $groups = Nhom::whereIn('ID_KEHOACH', $activePlanIds)
            ->whereHas('phancongDetaiNhom', function ($q) use ($gvId) {
                $q->where('ID_GVHD', $gvId);
            })
            ->with('kehoach:ID_KEHOACH,TEN_DOT')
            ->select('ID_NHOM', 'TEN_NHOM', 'ID_KEHOACH') 
            ->get();

        return response()->json($groups);
    }

    /**
     * Lấy toàn bộ lịch họp do Giảng viên tạo ra (theo khoảng thời gian)
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

    /**
     * Tạo nhanh lịch họp (Kéo thả) - Mặc định 45 phút.
     * [QUAN TRỌNG]: Xử lý chuỗi thời gian từ Frontend gửi lên.
     */
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

    /**
     * Đánh giá cuộc họp (Thay đổi icon/màu sắc) - API riêng biệt
     */
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