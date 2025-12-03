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

class LichHopController extends Controller
{
    /**
     * Lấy tất cả lịch họp (sắp tới và đã qua) của một nhóm.
     */
    public function getMeetingsForGroup(Nhom $nhom, Request $request)
    {
        $this->authorize('view', $nhom);

        // Tải thông tin nhóm cần thiết để hiển thị header nếu cần
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
        $this->authorize('manage', $nhom);

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
            ['ID_NGUOITAO' => Auth::id()]
        ));

        // Gửi thông báo cho các thành viên khác trong nhóm
        // Logic: Lấy danh sách thành viên + GVHD (nếu có), trừ người tạo
        $memberIds = $nhom->thanhviens()->pluck('ID_NGUOIDUNG')->toArray();

        $assignment = $nhom->phancongDetaiNhom;
        if ($assignment && $assignment->ID_GVHD) {
            if (!in_array($assignment->ID_GVHD, $memberIds)) {
                $memberIds[] = $assignment->ID_GVHD;
            }
        }

        $currentUserId = Auth::id();
        
        foreach ($memberIds as $mid) {
            if ($mid == $currentUserId) continue;

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
        $this->authorize('manage', $lichhop->nhom);

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
        $this->authorize('manage', $lichhop->nhom);

        if ($lichhop->TRANGTHAI === 'Đã diễn ra') {
            return response()->json(['message' => 'Không thể hủy lịch họp đã diễn ra.'], 400);
        }

        $lichhop->update(['TRANGTHAI' => 'Đã hủy']);

        // Gửi thông báo hủy
        $user = Auth::user();
        $nhom = $lichhop->nhom;
        $recipientIds = $nhom->thanhviens->pluck('ID_NGUOIDUNG')->toArray();

        // Nếu GVHD hủy thì báo cho SV và ngược lại (đơn giản hóa: gửi cho tất cả trừ người hủy)
        foreach ($recipientIds as $uid) {
            if ($uid == $user->ID_NGUOIDUNG) continue; 

            NotificationService::send(
                $uid,
                "Hủy lịch họp: {$lichhop->TIEUDE_LICHHOP}",
                "Người dùng {$user->HODEM_VA_TEN} đã hủy cuộc họp dự kiến vào " . $lichhop->THOIGIAN_BATDAU->format('H:i d/m') . ".",
                'TASK',
                "/projects/my-group/schedule/{$nhom->ID_NHOM}",
                null,
                'URGENT'
            );
        }

        return response()->json(['message' => 'Đã hủy lịch họp thành công.']);
    }

    /**
     * Lấy danh sách các nhóm mà giảng viên đang hướng dẫn (Để hiện trong Calendar Filter)
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

        $groups = Nhom::whereIn('ID_KEHOACH', $activePlanIds)
            ->join('PHANCONG_DETAI_NHOM', 'NHOM.ID_NHOM', '=', 'PHANCONG_DETAI_NHOM.ID_NHOM')
            ->where('PHANCONG_DETAI_NHOM.ID_GVHD', $gvId)
            ->with('kehoach:ID_KEHOACH,TEN_DOT')
            ->select('NHOM.ID_NHOM', 'NHOM.TEN_NHOM', 'NHOM.ID_KEHOACH') 
            ->get();

        return response()->json($groups);
    }

    /**
     * Lấy toàn bộ lịch họp do Giảng viên tạo ra hoặc được mời
     */
    public function getLecturerSchedule(Request $request)
    {
        $user = Auth::user();
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        // Lấy các lịch họp do GV tạo
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
     * Tạo nhanh lịch họp từ Calendar (Dành cho Giảng viên)
     */
    public function createQuickMeeting(Request $request)
    {
        $request->validate([
            'ID_NHOM' => 'required|exists:NHOM,ID_NHOM',
            'START_TIME' => 'required'
        ]);

        $nhom = Nhom::findOrFail($request->ID_NHOM);
        
        $this->authorize('manage', $nhom);

        $user = Auth::user();
        
        $startTime = Carbon::parse($request->START_TIME);
        $endTime = $startTime->copy()->addMinutes(45);

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

        $memberIds = $nhom->thanhviens()->pluck('ID_NGUOIDUNG');
        foreach ($memberIds as $mid) {
            NotificationService::send(
                $mid,
                "Lịch họp mới từ GVHD",
                "{$title} vào lúc " . $startTime->format('H:i d/m'),
                'TASK',
                "/projects/my-group/schedule/{$nhom->ID_NHOM}"
            );
        }

        return response()->json($lichHop->load('nhom'), 201);
    }

    /**
     * Đánh giá cuộc họp (Chỉ người tạo mới được đánh giá)
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