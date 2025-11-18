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

class LichHopController extends Controller
{
    /**
     * Kiểm tra quyền truy cập vào lịch họp của một nhóm
     * (Helper function)
     */
    private function checkGroupAccess(Nhom $nhom)
    {
        $user = Auth::user();
        if ($this->isAdmin()) return true;

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

    // =========================================================================
    // API CHO SINH VIÊN / CHI TIẾT NHÓM (Tab Lịch họp trong chi tiết nhóm)
    // =========================================================================

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

        return response()->json($lichHop->load('nguoiTao:ID_NGUOIDUNG,HODEM_VA_TEN,ID_VAITRO', 'nguoiTao.vaitro:ID_VAITRO,TEN_VAITRO'), 201);
    }

    /**
     * Cập nhật một lịch họp (Full Update).
     * Hỗ trợ cập nhật cả đánh giá (DANHGIA) và nội dung họp.
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
            'DIADIEM' => 'nullable|string|max:255',
            'LINK_TRUCTUYEN' => 'nullable|url|max:500',
            'GHICHU' => 'nullable|string',
            'TRANGTHAI' => ['sometimes', Rule::in(['Đã lên lịch', 'Đã diễn ra', 'Đã hủy'])],
            'NOIDUNG_HOP' => 'nullable|string',
            'DANHGIA' => 'nullable|in:Tot,BinhThuong,KhongTot',
        ]);

        // ================= [FIX: Xóa logic xử lý múi giờ] =================
        // Frontend (MeetingDialog) đã chuyển đổi chuỗi thời gian địa phương
        // thành chuẩn ISO 8601 (có 'Z' hoặc '+00:00') trước khi gửi lên.
        // Laravel/Carbon sẽ tự động hiểu chuỗi này là UTC và lưu đúng giờ.
        // KHÔNG CẦN Carbon::parse($validated['THOIGIAN_BATDAU'], config('app.timezone')).
        // ================= [KẾT THÚC FIX] =================

        // Xử lý logic địa điểm/link nếu hình thức họp thay đổi
        if (isset($validated['HINHTHUC_HOP'])) {
            if ($validated['HINHTHUC_HOP'] === 'Trực tiếp') {
                $validated['LINK_TRUCTUYEN'] = null;
            } else {
                $validated['DIADIEM'] = null;
            }
        }
        
        // Nếu có đánh giá, có thể ngầm hiểu là đã diễn ra (tuỳ chọn logic business)
        // if (isset($validated['DANHGIA']) && $validated['DANHGIA']) {
        //  $validated['TRANGTHAI'] = 'Đã diễn ra';
        // }

        $lichhop->update($validated);

        return response()->json($lichhop->load('nguoiTao:ID_NGUOIDUNG,HODEM_VA_TEN,ID_VAITRO', 'nguoiTao.vaitro:ID_VAITRO,TEN_VAITRO'));
    }

    /**
     * Hủy một lịch họp.
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

    // =========================================================================
    // API CHO TRANG LỊCH GIẢNG VIÊN (Drag & Drop)
    // =========================================================================

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
            // [FIX] Chỉ lấy các cột tồn tại trong bảng NHOM (loại bỏ MA_NHOM nếu không có)
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
            ->where('TRANGTHAI', '!=', 'Đã hủy') // Ẩn các lịch đã hủy cho gọn bảng
            ->with('nhom:ID_NHOM,TEN_NHOM');

        if ($startDate && $endDate) {
            // Parse ngày từ query params để lọc
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
            'START_TIME' => 'required' // Nhận chuỗi YYYY-MM-DD HH:mm:ss
        ]);

        $user = Auth::user();
        
        // [FIX] Carbon parse chuỗi thời gian từ Frontend.
        // Frontend đã gửi chuỗi "YYYY-MM-DD HH:mm:ss" đại diện cho giờ mong muốn.
        // Carbon sẽ tạo đối tượng datetime dựa trên chuỗi đó và múi giờ mặc định của App.
        $startTime = Carbon::parse($request->START_TIME);
        $endTime = $startTime->copy()->addMinutes(45); // Mặc định họp 45p

        $nhom = Nhom::find($request->ID_NHOM);
        $title = "Họp hướng dẫn - " . $nhom->TEN_NHOM;

        $lichHop = LichHop::create([
            'ID_NHOM' => $request->ID_NHOM,
            'ID_NGUOITAO' => $user->ID_NGUOIDUNG,
            'TIEUDE_LICHHOP' => $title,
            'THOIGIAN_BATDAU' => $startTime,
            'THOIGIAN_KETTHUC' => $endTime,
            'HINHTHUC_HOP' => 'Trực tiếp', // Mặc định
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
            // Có thể thêm logic tự chuyển trạng thái nếu cần
        ]);

        return response()->json(['message' => 'Đã đánh giá cuộc họp.', 'data' => $lichHop]);
    }
}