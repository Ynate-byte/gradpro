<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Nhom;
use App\Models\ThanhvienNhom;
use App\Models\Nguoidung;
use App\Models\LoimoiNhom;
use App\Models\YeucauVaoNhom;
use App\Models\Notification;
use App\Models\SinhvienThamgia;
use App\Models\KehoachKhoaluan;
use Illuminate\Support\Facades\Log;

class NhomController extends Controller
{
    /**
     * Lấy danh sách các kế hoạch đang hoạt động mà sinh viên hiện tại đang tham gia.
     */
    public function getActivePlansForStudent(Request $request)
    {
        $user = $request->user();

        // Đảm bảo người dùng là sinh viên và có thông tin sinh viên liên kết
        if (!$user->sinhvien) {
            return response()->json([]);
        }
        
        $plans = KehoachKhoaluan::where('TRANGTHAI', 'Đang thực hiện')
            ->whereHas('sinhvienThamgias', function ($query) use ($user) {
                $query->where('ID_SINHVIEN', $user->sinhvien->ID_SINHVIEN);
            })
            ->get();
            
        return response()->json($plans);
    }

    /**
     * Lấy thông tin nhóm hiện tại của người dùng.
     */
    public function getMyGroup(Request $request)
    {
        try {
            $user = $request->user();
            $thanhvien = ThanhvienNhom::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)->first();

            if (!$thanhvien) {
                return response()->json(['has_group' => false]);
            }
            
            $nhom = Nhom::with([
                'thanhviens.nguoidung' => function ($query) {
                    $query->with(['vaitro', 'sinhvien.chuyennganh']);
                },
                'nhomtruong',
                'chuyennganh',
                'khoabomon',
                'yeucaus' => function($query) {
                    $query->where('TRANGTHAI', 'Đang chờ')->with(['nguoidung' => function($q) {
                        $q->with(['vaitro', 'sinhvien.chuyennganh']);
                    }]);
                }
            ])->find($thanhvien->ID_NHOM);

            if (!$nhom) {
                Log::error("Dữ liệu không nhất quán: Người dùng ID {$user->ID_NGUOIDUNG} có bản ghi thành viên trong nhóm ID {$thanhvien->ID_NHOM} không tồn tại.");
                // An toàn xóa bản ghi thành viên rác
                $thanhvien->delete();
                return response()->json(['has_group' => false]);
            }

            return response()->json(['has_group' => true, 'group_data' => $nhom]);

        } catch (\Exception $e) {
            Log::error('Error in getMyGroup: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi máy chủ khi lấy thông tin nhóm.'], 500);
        }
    }
    
    /**
     * Tạo một nhóm mới trong một kế hoạch cụ thể.
     */
    public function createGroup(Request $request)
    {
        $user = $request->user();

        if (ThanhvienNhom::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)->exists()) {
            return response()->json(['message' => 'Bạn đã là thành viên của một nhóm khác.'], 409);
        }

        $validated = $request->validate([
            'ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'TEN_NHOM' => 'required|string|max:100|unique:NHOM,TEN_NHOM',
            'MOTA' => 'nullable|string|max:255',
            'ID_CHUYENNGANH' => 'nullable|exists:CHUYENNGANH,ID_CHUYENNGANH',
            'ID_KHOA_BOMON' => 'nullable|exists:KHOA_BOMON,ID_KHOA_BOMON',
        ]);

        // Kiểm tra xem sinh viên có thực sự tham gia kế hoạch này không
        $isParticipant = SinhvienThamgia::where('ID_KEHOACH', $validated['ID_KEHOACH'])
                                        ->where('ID_SINHVIEN', $user->sinhvien->ID_SINHVIEN)
                                        ->exists();
        if (!$isParticipant) {
            return response()->json(['message' => 'Bạn không có quyền tạo nhóm trong kế hoạch này.'], 403);
        }

        $nhom = null;
        DB::transaction(function () use ($validated, $user, &$nhom) {
            $nhom = Nhom::create([
                'ID_KEHOACH' => $validated['ID_KEHOACH'],
                'TEN_NHOM' => $validated['TEN_NHOM'],
                'MOTA' => $validated['MOTA'],
                'ID_NHOMTRUONG' => $user->ID_NGUOIDUNG,
                'ID_CHUYENNGANH' => $validated['ID_CHUYENNGANH'],
                'ID_KHOA_BOMON' => $validated['ID_KHOA_BOMON'],
                'SO_THANHVIEN_HIENTAI' => 1,
            ]);

            ThanhvienNhom::create([
                'ID_NHOM' => $nhom->ID_NHOM,
                'ID_NGUOIDUNG' => $user->ID_NGUOIDUNG,
            ]);
        });

        return response()->json($nhom->load('thanhviens.nguoidung'), 201);
    }
    
    /**
     * Tìm kiếm các nhóm đang mở trong một kế hoạch cụ thể.
     */
    public function findGroups(Request $request)
    {
        $user = $request->user();
        
        $request->validate(['ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH']);
        $kehoachId = $request->ID_KEHOACH;

        $isParticipant = SinhvienThamgia::where('ID_KEHOACH', $kehoachId)
                                        ->where('ID_SINHVIEN', $user->sinhvien->ID_SINHVIEN)
                                        ->exists();
        if (!$isParticipant) {
             return response()->json(['data' => []]);
        }

        $query = Nhom::query()
            ->where('ID_KEHOACH', $kehoachId)
            ->where('TRANGTHAI', 'Đang mở');

        if($request->filled('search')) {
            $query->where('TEN_NHOM', 'like', '%' . $request->search . '%');
        }
        if($request->filled('ID_CHUYENNGANH')) {
            $query->where('ID_CHUYENNGANH', $request->ID_CHUYENNGANH);
        }
        if($request->filled('ID_KHOA_BOMON')) {
            $query->where('ID_KHOA_BOMON', $request->ID_KHOA_BOMON);
        }

        $nhoms = $query->with('nhomtruong', 'chuyennganh', 'khoabomon')->paginate(15);
        $sent_requests = YeucauVaoNhom::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)
            ->whereIn('ID_NHOM', $nhoms->pluck('ID_NHOM'))
            ->pluck('ID_NHOM')
            ->toArray();

        $nhoms->getCollection()->transform(function ($nhom) use ($sent_requests) {
            $nhom->da_gui_yeu_cau = in_array($nhom->ID_NHOM, $sent_requests);
            return $nhom;
        });
        
        return response()->json($nhoms);
    }

    /**
     * Gửi yêu cầu xin tham gia một nhóm.
     */
    public function requestToJoin(Request $request, Nhom $nhom)
    {
        $user = $request->user();

        if (ThanhvienNhom::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)->exists()) {
            return response()->json(['message' => 'Bạn đã là thành viên của một nhóm khác.'], 409);
        }

        // Kiểm tra SV có tham gia cùng kế hoạch với nhóm không
        $isParticipant = SinhvienThamgia::where('ID_KEHOACH', $nhom->ID_KEHOACH)
                                        ->where('ID_SINHVIEN', $user->sinhvien->ID_SINHVIEN)
                                        ->exists();
        if (!$isParticipant) {
            return response()->json(['message' => 'Bạn không thuộc kế hoạch khóa luận của nhóm này.'], 403);
        }

        if ($nhom->TRANGTHAI !== 'Đang mở') {
            return response()->json(['message' => 'Không thể gửi yêu cầu. Nhóm này không còn mở để nhận thành viên.'], 400);
        }

        $requestCount = YeucauVaoNhom::where('ID_NHOM', $nhom->ID_NHOM)
                                        ->where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)
                                        ->count();
        if ($requestCount >= 3) {
            return response()->json(['message' => 'Bạn đã gửi yêu cầu tới nhóm này 3 lần.'], 429);
        }

        YeucauVaoNhom::create([
            'ID_NHOM' => $nhom->ID_NHOM,
            'ID_NGUOIDUNG' => $user->ID_NGUOIDUNG,
            'LOINHAN' => $request->input('LOINHAN'),
        ]);

        Notification::create([
            'user_id' => $nhom->ID_NHOMTRUONG,
            'type' => 'JOIN_REQUEST_RECEIVED',
            'data' => [
                'group_name' => $nhom->TEN_NHOM,
                'requester_name' => $user->HODEM_VA_TEN,
            ]
        ]);

        return response()->json(['message' => 'Đã gửi yêu cầu gia nhập thành công.']);
    }

    /**
     * Mời một thành viên khác vào nhóm.
     */
    public function inviteMember(Request $request, Nhom $nhom)
    {
        $user = $request->user();

        if ($nhom->ID_NHOMTRUONG !== $user->ID_NGUOIDUNG) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }

        if ($nhom->SO_THANHVIEN_HIENTAI >= 4) {
            return response()->json(['message' => 'Nhóm đã đủ số lượng thành viên tối đa.'], 400);
        }
        
        $validated = $request->validate([
            'MA_DINHDANH' => 'required|string|exists:NGUOIDUNG,MA_DINHDANH',
            'LOINHAN' => 'nullable|string|max:150',
        ]);

        $memberToInvite = Nguoidung::where('MA_DINHDANH', $validated['MA_DINHDANH'])->first();
        
        if ($memberToInvite->ID_NGUOIDUNG === $user->ID_NGUOIDUNG) {
            return response()->json(['message' => 'Bạn không thể mời chính mình.'], 400);
        }

        if (!$memberToInvite->sinhvien) {
            return response()->json(['message' => 'Chỉ có thể mời sinh viên vào nhóm.'], 400);
        }

        // Kiểm tra người được mời có tham gia cùng kế hoạch không
        $isParticipant = SinhvienThamgia::where('ID_KEHOACH', $nhom->ID_KEHOACH)
                                        ->where('ID_SINHVIEN', $memberToInvite->sinhvien->ID_SINHVIEN)
                                        ->exists();
        if (!$isParticipant) {
            return response()->json(['message' => 'Sinh viên này không thuộc kế hoạch khóa luận của nhóm bạn.'], 403);
        }

        if (ThanhvienNhom::where('ID_NGUOIDUNG', $memberToInvite->ID_NGUOIDUNG)->exists()) {
             return response()->json(['message' => 'Sinh viên này đã ở trong một nhóm khác.'], 409);
        }
        
        $inviteCount = LoimoiNhom::where('ID_NHOM', $nhom->ID_NHOM)
                                     ->where('ID_NGUOI_DUOCMOI', $memberToInvite->ID_NGUOIDUNG)
                                     ->count();
        if ($inviteCount >= 3) {
            return response()->json(['message' => 'Bạn đã mời sinh viên này 3 lần. Không thể mời lại.'], 429);
        }

        LoimoiNhom::create([
            'ID_NHOM' => $nhom->ID_NHOM,
            'ID_NGUOI_DUOCMOI' => $memberToInvite->ID_NGUOIDUNG,
            'ID_NGUOIMOI' => $user->ID_NGUOIDUNG,
            'LOINHAN' => $validated['LOINHAN'],
            'NGAY_HETHAN' => now()->addDays(4),
        ]);

        Notification::create([
            'user_id' => $memberToInvite->ID_NGUOIDUNG,
            'type' => 'GROUP_INVITATION',
            'data' => [
                'group_name' => $nhom->TEN_NHOM,
                'inviter_name' => $user->HODEM_VA_TEN,
            ]
        ]);

        return response()->json(['message' => 'Đã gửi lời mời thành công.'], 200);
    }
    
    /**
     * Xử lý yêu cầu tham gia nhóm của nhóm trưởng.
     */
    public function handleJoinRequest(Request $request, Nhom $nhom, YeucauVaoNhom $yeucau)
    {
        $user = $request->user();

        if ($nhom->ID_NHOMTRUONG !== $user->ID_NGUOIDUNG || $yeucau->ID_NHOM !== $nhom->ID_NHOM) {
            return response()->json(['message' => 'Không có quyền thực hiện.'], 403);
        }
        
        $validated = $request->validate(['action' => 'required|in:accept,decline']);

        if ($validated['action'] === 'decline') {
            $yeucau->update(['TRANGTHAI' => 'Từ chối', 'NGAY_PHANHOI' => now(), 'ID_NGUOI_PHANHOI' => $user->ID_NGUOIDUNG]);
            return response()->json(['message' => 'Đã từ chối yêu cầu.']);
        }
        
        return DB::transaction(function () use ($nhom, $yeucau, $user) {
            $nhom = Nhom::where('ID_NHOM', $nhom->ID_NHOM)->lockForUpdate()->first();
            
            if ($nhom->SO_THANHVIEN_HIENTAI >= 4) {
                 $yeucau->update(['TRANGTHAI' => 'Từ chối']);
                return response()->json(['message' => 'Tham gia thất bại! Nhóm đã đủ thành viên.'], 409);
            }
            
            if (ThanhvienNhom::where('ID_NGUOIDUNG', $yeucau->ID_NGUOIDUNG)->exists()) {
                $yeucau->update(['TRANGTHAI' => 'Từ chối']);
                return response()->json(['message' => 'Sinh viên này đã tham gia nhóm khác.'], 409);
            }

            ThanhvienNhom::create(['ID_NHOM' => $nhom->ID_NHOM, 'ID_NGUOIDUNG' => $yeucau->ID_NGUOIDUNG]);
            $nhom->increment('SO_THANHVIEN_HIENTAI');
            if($nhom->SO_THANHVIEN_HIENTAI >= 4) {
                $nhom->TRANGTHAI = 'Đã đủ thành viên';
                $nhom->save();
            }

            $yeucau->update(['TRANGTHAI' => 'Chấp nhận', 'NGAY_PHANHOI' => now(), 'ID_NGUOI_PHANHOI' => $user->ID_NGUOIDUNG]);
            
            LoimoiNhom::where('ID_NGUOI_DUOCMOI', $yeucau->ID_NGUOIDUNG)
                        ->where('TRANGTHAI', 'Đang chờ')
                        ->update(['TRANGTHAI' => 'Từ chối']);

            return response()->json(['message' => 'Đã thêm thành viên mới vào nhóm.']);
        });
    }

    /**
     * Rời khỏi nhóm hiện tại.
     */
    public function leaveGroup(Request $request)
    {
        $user = $request->user();
        $thanhvien = ThanhvienNhom::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)->first();

        if (!$thanhvien) {
            return response()->json(['message' => 'Bạn không ở trong nhóm nào.'], 404);
        }

        $nhom = Nhom::find($thanhvien->ID_NHOM);

        if (!$nhom) {
            $thanhvien->delete(); // Dọn dẹp dữ liệu rác
            return response()->json(['message' => 'Rời nhóm thành công.']);
        }

        if ($nhom->ID_NHOMTRUONG === $user->ID_NGUOIDUNG && $nhom->SO_THANHVIEN_HIENTAI > 1) {
            return response()->json(['message' => 'Bạn phải chuyển quyền nhóm trưởng trước khi rời nhóm.'], 400);
        }

        DB::transaction(function () use ($nhom, $thanhvien) {
            if ($nhom->SO_THANHVIEN_HIENTAI <= 1) {
                // Nếu là người cuối cùng, xóa luôn nhóm
                $nhom->delete();
            } else {
                // Nếu không, chỉ xóa bản ghi thành viên và giảm số lượng
                $thanhvien->delete();
                $nhom->decrement('SO_THANHVIEN_HIENTAI');
            }
        });

        return response()->json(['message' => 'Rời nhóm thành công.']);
    }
    public function transferLeadership(Request $request, Nhom $nhom, $newLeaderId)
    {
        $user = $request->user();

        // 1. Authorize: Only current leader can transfer.
        if ($nhom->ID_NHOMTRUONG !== $user->ID_NGUOIDUNG) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }

        // 2. Validate: Ensure new leader is a member and not the current leader.
        if ($nhom->ID_NHOMTRUONG == $newLeaderId) {
            return response()->json(['message' => 'Người này đã là nhóm trưởng.'], 400);
        }

        $newLeaderIsMember = ThanhvienNhom::where('ID_NHOM', $nhom->ID_NHOM)
                                        ->where('ID_NGUOIDUNG', $newLeaderId)
                                        ->exists();

        if (!$newLeaderIsMember) {
            return response()->json(['message' => 'Người được chọn không phải là thành viên của nhóm.'], 400);
        }

        // 3. Update: Change ID_NHOMTRUONG on the Nhom model.
        $nhom->ID_NHOMTRUONG = $newLeaderId;
        $nhom->save();

        // Optional: Send notification to new leader?

        return response()->json(['message' => 'Đã chuyển quyền trưởng nhóm thành công.']);
    }
}
