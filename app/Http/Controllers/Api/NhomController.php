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
use App\Models\PhancongDetaiNhom;
use App\Models\NopSanpham;
use App\Models\FileNopSanpham;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use App\Models\Notification;
use App\Models\SinhvienThamgia;
use App\Models\KehoachKhoaluan;
use Illuminate\Support\Facades\Log;

class NhomController extends Controller
{
    // THÔNG TIN NHÓM VÀ KẾ HOẠCH

    /**
     * Lấy danh sách các kế hoạch đang hoạt động mà sinh viên đang tham gia.
     */
    public function getActivePlansForStudent(Request $request)
    {
        $user = $request->user();

        // Kiểm tra nếu người dùng không có bản ghi sinhvien (vd: là Admin/GV)
        if (!$user->sinhvien) {
            return response()->json([]); // Trả về mảng rỗng
        }

        // Giờ $user->sinhvien đã an toàn
        $sinhvienId = $user->sinhvien->ID_SINHVIEN;

        $plans = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm'])
            ->whereHas('sinhvienThamgias', function ($query) use ($sinhvienId) {
                $query->where('ID_SINHVIEN', $sinhvienId); // Sử dụng biến an toàn
            })
            ->with(['mocThoigians' => function ($query) {
                $query->orderBy('NGAY_BATDAU');
            },
            // Thêm eager loading cho sinhvienThamgias để lấy DU_DIEUKIEN
            'sinhvienThamgias' => function ($query) use ($sinhvienId) {
                $query->where('ID_SINHVIEN', $sinhvienId);
            }])
            ->get();

        return response()->json($plans);
    }

    /**
     * Lấy thông tin nhóm hiện tại của người dùng.
     * [NÂNG CẤP]: Lấy TẤT CẢ lời mời và yêu cầu, không chỉ 'Đang chờ'.
     */
    public function getMyGroup(Request $request)
    {
        try {
            $user = $request->user();
            $planId = $request->input('plan_id');

            $thanhvienQuery = ThanhvienNhom::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG);

            if ($planId) {
                $thanhvienQuery->whereHas('nhom', function ($query) use ($planId) {
                    $query->where('ID_KEHOACH', $planId);
                });
            }

            $thanhvien = $thanhvienQuery->first();

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
                    $query->with(['nguoidung' => function($q) {
                        $q->with(['vaitro', 'sinhvien.chuyennganh']);
                    }])
                    ->orderByRaw("CASE WHEN TRANGTHAI = 'Đang chờ' THEN 1 ELSE 2 END, NGAYTAO DESC");
                },
                'loimois' => function($query) {
                    $query->with('nguoiduocmoi.sinhvien.chuyennganh')
                    ->orderByRaw("CASE WHEN TRANGTHAI = 'Đang chờ' THEN 1 ELSE 2 END, NGAYTAO DESC");
                },

                'phancongDetaiNhom.detai'
                ])->find($thanhvien->ID_NHOM);

            if (!$nhom) {
                Log::error("Dữ liệu không nhất quán: Người dùng ID {$user->ID_NGUOIDUNG} có bản ghi thành viên trong nhóm ID {$thanhvien->ID_NHOM} không tồn tại.");
                return response()->json(['has_group' => false]);
            }

            return response()->json(['has_group' => true, 'group_data' => $nhom]);

        } catch (\Exception $e) {
            Log::error('Error in getMyGroup: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi máy chủ khi lấy thông tin nhóm.'], 500);
        }
    }

    // TƯƠNG TÁC VỚI NHÓM (TẠO, TÌM KIẾM)

    /**
     * Tạo một nhóm mới trong một kế hoạch cụ thể.
     */
    public function createGroup(Request $request)
    {
        $user = $request->user();
        $planId = $request->input('ID_KEHOACH');

        if (!$user->sinhvien) {
            return response()->json(['message' => 'Tài khoản của bạn không phải là sinh viên.'], 403);
        }

        $existingMembership = ThanhvienNhom::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)
            ->whereHas('nhom', function ($query) use ($planId) {
                $query->where('ID_KEHOACH', $planId);
            })->exists();

        if ($existingMembership) {
            return response()->json(['message' => 'Bạn đã là thành viên của một nhóm trong kế hoạch này.'], 409);
        }


        $validated = $request->validate([
            'ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'TEN_NHOM' => ['required', 'string', 'max:100', \Illuminate\Validation\Rule::unique('NHOM')->where('ID_KEHOACH', $request->ID_KEHOACH)],
            'MOTA' => 'nullable|string|max:255',
            'ID_CHUYENNGANH' => 'nullable|exists:CHUYENNGANH,ID_CHUYENNGANH',
            'ID_KHOA_BOMON' => 'nullable|exists:KHOA_BOMON,ID_KHOA_BOMON',
        ], [
            'TEN_NHOM.unique' => 'Tên nhóm này đã tồn tại trong kế hoạch này.'
        ]);

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
                'NGAY_VAONHOM' => now(),
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

        if(!$user->sinhvien) {
             return response()->json(['data' => []]);
        }
        $isParticipant = SinhvienThamgia::where('ID_KEHOACH', $kehoachId)
                                        ->where('ID_SINHVIEN', $user->sinhvien->ID_SINHVIEN)
                                        ->exists();
        if (!$isParticipant) {
             return response()->json(['data' => []]);
        }


        $query = Nhom::query()
            ->where('ID_KEHOACH', $kehoachId)
            ->where('TRANGTHAI', 'Đang mở');

        if ($request->filled('search')) {
            $query->where('TEN_NHOM', 'like', '%' . $request->search . '%');
        }
        if ($request->filled('ID_CHUYENNGANH')) {
            $query->where('ID_CHUYENNGANH', $request->ID_CHUYENNGANH);
        }
        if ($request->filled('ID_KHOA_BOMON')) {
            $query->where('ID_KHOA_BOMON', $request->ID_KHOA_BOMON);
        }

        $nhoms = $query->with('nhomtruong', 'chuyennganh', 'khoabomon')->paginate(15);

        $sent_requests = YeucauVaoNhom::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)
            ->where('TRANGTHAI', YeucauVaoNhom::STATUS_PENDING)
            ->whereIn('ID_NHOM', $nhoms->pluck('ID_NHOM'))
            ->get(['ID_NHOM', 'ID_YEUCAU']);

        $sentRequestMap = $sent_requests->pluck('ID_YEUCAU', 'ID_NHOM');

        $nhoms->getCollection()->transform(function ($nhom) use ($sentRequestMap) {
            $nhom->da_gui_yeu_cau = $sentRequestMap->has($nhom->ID_NHOM);
            $nhom->id_yeu_cau_da_gui = $sentRequestMap->get($nhom->ID_NHOM);
            return $nhom;
        });

        return response()->json($nhoms);
    }

    // QUẢN LÝ YÊU CẦU VÀ LỜI MỜI

    /**
     * Gửi yêu cầu xin tham gia một nhóm.
     * [NÂNG CẤP]: Giới hạn 8 yêu cầu "Đang chờ" cho mỗi nhóm.
     */
    public function requestToJoin(Request $request, Nhom $nhom)
    {
        $user = $request->user();

        if (!$user->sinhvien) {
            return response()->json(['message' => 'Tài khoản của bạn không phải là sinh viên.'], 403);
        }

        $existingMembership = ThanhvienNhom::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)
            ->whereHas('nhom', function ($query) use ($nhom) {
                $query->where('ID_KEHOACH', $nhom->ID_KEHOACH);
            })->exists();

        if ($existingMembership) {
            return response()->json(['message' => 'Bạn đã là thành viên của một nhóm khác trong kế hoạch này.'], 409);
        }
        
        $isParticipant = SinhvienThamgia::where('ID_KEHOACH', $nhom->ID_KEHOACH)
                                        ->where('ID_SINHVIEN', $user->sinhvien->ID_SINHVIEN)
                                        ->exists();
        if (!$isParticipant) {
            return response()->json(['message' => 'Bạn không thuộc kế hoạch khóa luận của nhóm này.'], 403);
        }


        if ($nhom->TRANGTHAI !== 'Đang mở') {
            return response()->json(['message' => 'Không thể gửi yêu cầu. Nhóm này không còn mở để nhận thành viên.'], 400);
        }

        $pendingCount = $nhom->yeucaus()->where('TRANGTHAI', YeucauVaoNhom::STATUS_PENDING)->count();
        if ($pendingCount >= 8) {
            return response()->json(['message' => 'Nhóm này đã có quá nhiều yêu cầu đang chờ. Vui lòng thử lại sau.'], 400);
        }

        $existingRequest = YeucauVaoNhom::where('ID_NHOM', $nhom->ID_NHOM)
                                        ->where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)
                                        ->where('TRANGTHAI', YeucauVaoNhom::STATUS_PENDING)
                                        ->exists();
        if ($existingRequest) {
            return response()->json(['message' => 'Bạn đã gửi yêu cầu tới nhóm này rồi.'], 409);
        }

        YeucauVaoNhom::create([
            'ID_NHOM' => $nhom->ID_NHOM,
            'ID_NGUOIDUNG' => $user->ID_NGUOIDUNG,
            'LOINHAN' => $request->input('LOINHAN'),
            'TRANGTHAI' => YeucauVaoNhom::STATUS_PENDING,
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
     * Mời một thành viên khác vào nhóm (chỉ nhóm trưởng).
     * [NÂNG CẤP]: Giới hạn 8 lời mời "Đang chờ" cho mỗi nhóm.
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

        $pendingCount = $nhom->loimois()->where('TRANGTHAI', LoimoiNhom::STATUS_PENDING)->count();
        if ($pendingCount >= 8) {
            return response()->json(['message' => 'Nhóm đã gửi quá 8 lời mời đang chờ. Vui lòng đợi các sinh viên khác phản hồi.'], 400);
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

        $isParticipant = SinhvienThamgia::where('ID_KEHOACH', $nhom->ID_KEHOACH)
                                        ->where('ID_SINHVIEN', $memberToInvite->sinhvien->ID_SINHVIEN)
                                        ->exists();
        if (!$isParticipant) {
             return response()->json(['message' => 'Sinh viên này không thuộc kế hoạch khóa luận của nhóm bạn.'], 403);
        }

        $alreadyInGroup = ThanhvienNhom::where('ID_NGUOIDUNG', $memberToInvite->ID_NGUOIDUNG)
            ->whereHas('nhom', function ($query) use ($nhom) {
                $query->where('ID_KEHOACH', $nhom->ID_KEHOACH);
            })->exists();
        if ($alreadyInGroup) {
             return response()->json(['message' => 'Sinh viên này đã ở trong một nhóm khác thuộc kế hoạch này.'], 409);
        }

        $existingInvite = LoimoiNhom::where('ID_NHOM', $nhom->ID_NHOM)
                                      ->where('ID_NGUOI_DUOCMOI', $memberToInvite->ID_NGUOIDUNG)
                                      ->where('TRANGTHAI', LoimoiNhom::STATUS_PENDING)
                                      ->exists();
        if ($existingInvite) {
             return response()->json(['message' => 'Bạn đã gửi lời mời tới sinh viên này rồi.'], 409);
        }


        $invite = LoimoiNhom::create([
            'ID_NHOM' => $nhom->ID_NHOM,
            'ID_NGUOI_DUOCMOI' => $memberToInvite->ID_NGUOIDUNG,
            'ID_NGUOIMOI' => $user->ID_NGUOIDUNG,
            'LOINHAN' => $validated['LOINHAN'],
            'NGAY_HETHAN' => now()->addDays(4),
            'TRANGTHAI' => LoimoiNhom::STATUS_PENDING,
        ]);

        Notification::create([
            'user_id' => $memberToInvite->ID_NGUOIDUNG,
            'type' => 'GROUP_INVITATION',
            'data' => [
                'group_name' => $nhom->TEN_NHOM,
                'inviter_name' => $user->HODEM_VA_TEN,
            ]
        ]);

        return response()->json([
            'message' => 'Đã gửi lời mời thành công.',
             'invite' => $invite->load('nguoiduocmoi.sinhvien.chuyennganh')
        ], 200);
    }

    /**
     * Xử lý yêu cầu tham gia nhóm (chỉ nhóm trưởng).
     */
    public function handleJoinRequest(Request $request, Nhom $nhom, YeucauVaoNhom $yeucau)
    {
        $user = $request->user();

        if ($nhom->ID_NHOMTRUONG !== $user->ID_NGUOIDUNG || $yeucau->ID_NHOM !== $nhom->ID_NHOM) {
            return response()->json(['message' => 'Không có quyền thực hiện.'], 403);
        }

        if ($yeucau->TRANGTHAI !== YeucauVaoNhom::STATUS_PENDING) {
             return response()->json(['message' => 'Yêu cầu này đã được xử lý hoặc đã hủy.'], 400);
        }

        $validated = $request->validate(['action' => 'required|in:accept,decline']);

        if ($validated['action'] === 'decline') {
            $yeucau->update(['TRANGTHAI' => YeucauVaoNhom::STATUS_DECLINED, 'NGAY_PHANHOI' => now(), 'ID_NGUOI_PHANHOI' => $user->ID_NGUOIDUNG]);
            return response()->json(['message' => 'Đã từ chối yêu cầu.']);
        }

        return DB::transaction(function () use ($nhom, $yeucau, $user) {
            $nhom = Nhom::where('ID_NHOM', $nhom->ID_NHOM)->lockForUpdate()->first();

            if ($nhom->SO_THANHVIEN_HIENTAI >= 4 || $nhom->TRANGTHAI !== 'Đang mở') {
                 $yeucau->update(['TRANGTHAI' => YeucauVaoNhom::STATUS_DECLINED]);
                 return response()->json(['message' => 'Tham gia thất bại! Nhóm đã đủ thành viên hoặc không còn mở.'], 409);
            }

             $alreadyInGroup = ThanhvienNhom::where('ID_NGUOIDUNG', $yeucau->ID_NGUOIDUNG)
                ->whereHas('nhom', function ($query) use ($nhom) {
                     $query->where('ID_KEHOACH', $nhom->ID_KEHOACH);
                })->exists();
            if ($alreadyInGroup) {
                 $yeucau->update(['TRANGTHAI' => YeucauVaoNhom::STATUS_DECLINED]);
                 return response()->json(['message' => 'Sinh viên này đã tham gia nhóm khác trong kế hoạch này.'], 409);
            }


            ThanhvienNhom::create([
                'ID_NHOM' => $nhom->ID_NHOM,
                'ID_NGUOIDUNG' => $yeucau->ID_NGUOIDUNG,
                'NGAY_VAONHOM' => now(),
            ]);

            $nhom->increment('SO_THANHVIEN_HIENTAI');
            if($nhom->SO_THANHVIEN_HIENTAI >= 4) {
                $nhom->TRANGTHAI = 'Đã đủ thành viên';
                $nhom->save();
            }

            $yeucau->update(['TRANGTHAI' => YeucauVaoNhom::STATUS_ACCEPTED, 'NGAY_PHANHOI' => now(), 'ID_NGUOI_PHANHOI' => $user->ID_NGUOIDUNG]);

            LoimoiNhom::where('ID_NGUOI_DUOCMOI', $yeucau->ID_NGUOIDUNG)
                        ->where('TRANGTHAI', LoimoiNhom::STATUS_PENDING)
                        ->whereHas('nhom', function($q) use ($nhom) {
                             $q->where('ID_KEHOACH', $nhom->ID_KEHOACH);
                        })
                        ->update(['TRANGTHAI' => LoimoiNhom::STATUS_DECLINED]);

            YeucauVaoNhom::where('ID_NGUOIDUNG', $yeucau->ID_NGUOIDUNG)
                        ->where('ID_YEUCAU', '!=', $yeucau->ID_YEUCAU)
                        ->where('TRANGTHAI', YeucauVaoNhom::STATUS_PENDING)
                        ->whereHas('nhom', function($q) use ($nhom) {
                             $q->where('ID_KEHOACH', $nhom->ID_KEHOACH);
                        })
                        ->update(['TRANGTHAI' => YeucauVaoNhom::STATUS_CANCELLED]);


            return response()->json(['message' => 'Đã thêm thành viên mới vào nhóm.']);
        });
    }

    /**
     * Hủy lời mời (do nhóm trưởng)
     */
    public function cancelInvitation(Request $request, Nhom $nhom, LoimoiNhom $loimoi)
    {
        $user = $request->user();

        if ($nhom->ID_NHOMTRUONG !== $user->ID_NGUOIDUNG) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }
        if ($loimoi->ID_NHOM !== $nhom->ID_NHOM) {
             return response()->json(['message' => 'Lời mời không thuộc nhóm này.'], 400);
        }
        if ($loimoi->TRANGTHAI !== LoimoiNhom::STATUS_PENDING) {
            return response()->json(['message' => 'Không thể hủy lời mời đã được xử lý hoặc hết hạn.'], 400);
        }
        $loimoi->update(['TRANGTHAI' => LoimoiNhom::STATUS_CANCELLED]);
        return response()->json(['message' => 'Đã hủy lời mời thành công.']);
    }

    /**
     * Hủy yêu cầu tham gia (do người xin)
     */
    public function cancelJoinRequest(Request $request, YeucauVaoNhom $yeucau)
    {
        $user = $request->user();

        if ($yeucau->ID_NGUOIDUNG !== $user->ID_NGUOIDUNG) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }
        if ($yeucau->TRANGTHAI !== YeucauVaoNhom::STATUS_PENDING) {
            return response()->json(['message' => 'Không thể hủy yêu cầu đã được xử lý.'], 400);
        }
        $yeucau->update(['TRANGTHAI' => YeucauVaoNhom::STATUS_CANCELLED]);
        return response()->json(['message' => 'Đã hủy yêu cầu tham gia thành công.']);
    }

    // QUẢN LÝ THÀNH VIÊN NHÓM

    /**
     * Rời khỏi nhóm hiện tại.
     */
    public function leaveGroup(Request $request)
    {
        $user = $request->user();
        $planId = $request->input('plan_id');
        if (!$planId) {
             return response()->json(['message' => 'Thiếu ID kế hoạch.'], 400);
        }

        $thanhvienQuery = ThanhvienNhom::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG);
        $thanhvienQuery->whereHas('nhom', function ($query) use ($planId) {
            $query->where('ID_KEHOACH', $planId);
        });
        $thanhvien = $thanhvienQuery->first();

        if (!$thanhvien) {
            return response()->json(['message' => 'Bạn không ở trong nhóm nào thuộc kế hoạch này.'], 404);
        }

        $nhom = Nhom::find($thanhvien->ID_NHOM);

        if (!$nhom) {
            $thanhvien->delete();
            return response()->json(['message' => 'Rời nhóm thành công (nhóm không tồn tại).']);
        }

        if ($nhom->ID_NHOMTRUONG === $user->ID_NGUOIDUNG && $nhom->SO_THANHVIEN_HIENTAI > 1) {
            return response()->json(['message' => 'Bạn phải chuyển quyền nhóm trưởng trước khi rời nhóm.'], 400);
        }

        DB::transaction(function () use ($nhom, $thanhvien) {
            if ($nhom->SO_THANHVIEN_HIENTAI <= 1) {
                $nhom->delete();
            } else {
                $thanhvien->delete();
                $nhom->decrement('SO_THANHVIEN_HIENTAI');
                if ($nhom->TRANGTHAI === 'Đã đủ thành viên' && $nhom->SO_THANHVIEN_HIENTAI < 4) {
                    $nhom->TRANGTHAI = 'Đang mở';
                    $nhom->save();
                }
            }
        });

        return response()->json(['message' => 'Rời nhóm thành công.']);
    }

    /**
     * Chuyển quyền nhóm trưởng cho thành viên khác.
     */
    public function transferLeadership(Request $request, Nhom $nhom, $newLeaderId)
    {
        $user = $request->user();

        if ($nhom->ID_NHOMTRUONG !== $user->ID_NGUOIDUNG) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }

        if ($nhom->ID_NHOMTRUONG == $newLeaderId) {
            return response()->json(['message' => 'Người này đã là nhóm trưởng.'], 400);
        }

        $newLeaderIsMember = ThanhvienNhom::where('ID_NHOM', $nhom->ID_NHOM)
                                        ->where('ID_NGUOIDUNG', $newLeaderId)
                                        ->exists();

        if (!$newLeaderIsMember) {
            return response()->json(['message' => 'Người được chọn không phải là thành viên của nhóm.'], 400);
        }

        $nhom->ID_NHOMTRUONG = $newLeaderId;
        $nhom->save();

        return response()->json([
            'message' => 'Đã chuyển quyền trưởng nhóm thành công.',
            'group' => $nhom->load('nhomtruong')
        ]);
    }

    /**
     * Lấy chi tiết nhóm theo ID
     */
    public function getGroupById($id)
    {
        $nhom = Nhom::with([
            'thanhviens.nguoidung',
            'nhomtruong',
            'chuyennganh',
            'khoabomon',
            'phancongDetaiNhom.detai.nguoiDexuat.nguoidung',
            'phancongDetaiNhom.detai.nguoiDuyet',
            'phancongDetaiNhom.detai.chuyennganh',
            'phancongDetaiNhom.gvhd.nguoidung'
        ])->findOrFail($id);

        $assignment = $nhom->phancongDetaiNhom;
        if ($assignment) {
            $nhom->detai = $assignment->detai;
            $nhom->gvhd = $assignment->gvhd;
            $nhom->ngay_phan_cong = $assignment->NGAY_PHANCONG;
            $nhom->trang_thai = $assignment->TRANGTHAI;
        }

        return response()->json($nhom);
    }
        
    /**
     * Lấy lịch sử các lần nộp của nhóm cho một phân công cụ thể. (Dành cho Sinh viên HOẶC ADMIN)
     */
    public function getSubmissions(Request $request, PhancongDetaiNhom $phancong)
    {
        $user = $request->user();

        $isMember = ThanhvienNhom::where('ID_NHOM', $phancong->ID_NHOM)
                                ->where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)
                                ->exists();

        if (!$isMember && !$this->isAdmin() && !$this->isGiaoVu() && !$this->isTruongKhoa()) {
             return response()->json(['message' => 'Bạn không thuộc nhóm này.'], 403);
        }

        $submissions = NopSanpham::where('ID_PHANCONG', $phancong->ID_PHANCONG)
            ->with(['files', 'nguoiNop:ID_NGUOIDUNG,HODEM_VA_TEN', 'nguoiXacNhan:ID_NGUOIDUNG,HODEM_VA_TEN'])
            ->orderBy('NGAY_NOP', 'desc')
            ->get();

        return response()->json($submissions);
    }

    /**
     * Xử lý nộp sản phẩm (tạo phiếu nộp mới).
     */
    public function submitProduct(Request $request, PhancongDetaiNhom $phancong)
    {
        $user = $request->user();

        $isMember = ThanhvienNhom::where('ID_NHOM', $phancong->ID_NHOM)
                                ->where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)
                                ->exists();

        if (!$isMember) {
            return response()->json(['message' => 'Bạn không thuộc nhóm này.'], 403);
        }

        if ($phancong->TRANGTHAI !== 'Đang thực hiện') {
            return response()->json(['message' => 'Không thể nộp. Đề tài không ở trạng thái "Đang thực hiện".'], 400);
        }

        $isPending = NopSanpham::where('ID_PHANCONG', $phancong->ID_PHANCONG)
                                ->where('TRANGTHAI', 'Chờ xác nhận')
                                ->exists();
        if ($isPending) {
            return response()->json(['message' => 'Bạn có một lần nộp đang chờ xác nhận. Vui lòng đợi admin duyệt.'], 409);
        }

        $validated = $request->validate([
            'BaoCaoPDF' => 'nullable|file|mimes:pdf|max:20480',
            'SourceCodeZIP' => 'nullable|file|mimes:zip,rar,7z|max:102400',
            'LinkDemo' => 'nullable|url|max:500',
            'LinkRepository' => 'nullable|url|max:500',
        ]);

        if (empty($validated)) {
             throw ValidationException::withMessages(['files' => 'Phải nộp ít nhất 1 sản phẩm (file hoặc link).']);
        }

        $filesToInsert = [];
        $storagePath = "submissions/plan_{$phancong->nhom->ID_KEHOACH}/group_{$phancong->ID_NHOM}";

        try {
            $newSubmission = DB::transaction(function () use ($phancong, $user, $validated, $request, $storagePath, &$filesToInsert) {
                $submission = NopSanpham::create([
                    'ID_PHANCONG' => $phancong->ID_PHANCONG,
                    'ID_NGUOI_NOP' => $user->ID_NGUOIDUNG,
                    'TRANGTHAI' => 'Chờ xác nhận',
                ]);

                foreach (['BaoCaoPDF', 'SourceCodeZIP'] as $fileType) {
                    if ($request->hasFile($fileType)) {
                        $file = $request->file($fileType);
                        $path = $file->store($storagePath, 'public');
                        $filesToInsert[] = [
                            'ID_NOP_SANPHAM' => $submission->ID_NOP_SANPHAM,
                            'LOAI_FILE' => $fileType,
                            'DUONG_DAN_HOAC_NOI_DUNG' => $path,
                            'TEN_FILE_GOC' => $file->getClientOriginalName(),
                            'KICH_THUOC_FILE' => $file->getSize(),
                        ];
                    }
                }

                foreach (['LinkDemo', 'LinkRepository'] as $linkType) {
                    if (!empty($validated[$linkType])) {
                        $filesToInsert[] = [
                            'ID_NOP_SANPHAM' => $submission->ID_NOP_SANPHAM,
                            'LOAI_FILE' => $linkType,
                            'DUONG_DAN_HOAC_NOI_DUNG' => $validated[$linkType],
                            'TEN_FILE_GOC' => null,
                            'KICH_THUOC_FILE' => null,
                        ];
                    }
                }

                if (!empty($filesToInsert)) {
                    FileNopSanpham::insert($filesToInsert);
                }

                return $submission;
            });

            return response()->json([
                'message' => 'Nộp sản phẩm thành công! Vui lòng chờ admin xác nhận.',
                'submission' => $newSubmission->load('files')
            ], 201);

        } catch (ValidationException $e) {
            return response()->json(['message' => 'Dữ liệu không hợp lệ.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            foreach ($filesToInsert as $fileData) {
                if ($fileData['LOAI_FILE'] !== 'LinkDemo' && $fileData['LOAI_FILE'] !== 'LinkRepository') {
                    Storage::disk('public')->delete($fileData['DUONG_DAN_HOAC_NOI_DUNG']);
                }
            }
            Log::error('submitProduct failed: ' . $e->getMessage());
            return response()->json(['message' => 'Nộp sản phẩm thất bại. Vui lòng thử lại.'], 500);
        }
    }


    /**
     * [MỚI] Tìm kiếm sinh viên chưa có nhóm trong kế hoạch (cho Nhóm trưởng).
     */
    public function searchAvailableStudents(Request $request, $planId)
    {
        $user = $request->user();

        $validated = $request->validate([
            'search' => 'nullable|string|max:100',
            'chuyen_nganh_ids' => 'nullable|array',
            'chuyen_nganh_ids.*' => 'integer|exists:CHUYENNGANH,ID_CHUYENNGANH',
            'page' => 'integer|min:1',
            'per_page' => 'integer|min:5|max:100',
        ]);

        $studentsInGroupIds = ThanhvienNhom::query()
            ->whereHas('nhom', fn($q) => $q->where('ID_KEHOACH', $planId))
            ->pluck('ID_NGUOIDUNG');

        $studentsInGroupIds->push($user->ID_NGUOIDUNG);

        $query = Nguoidung::query()
            ->with(['sinhvien.chuyennganh:ID_CHUYENNGANH,TEN_CHUYENNGANH'])
            ->where('TRANGTHAI_KICHHOAT', true)
            ->whereHas('sinhvien.cacDotThamGia', function ($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            })
            ->whereNotIn('ID_NGUOIDUNG', $studentsInGroupIds)
            ->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'MA_DINHDANH');

        if (!empty($validated['search'])) {
            $searchTerm = $validated['search'];
            $query->where(function ($q) use ($searchTerm) {
                $q->where('HODEM_VA_TEN', 'like', "%{$searchTerm}%")
                  ->orWhere('MA_DINHDANH', 'like', "%{$searchTerm}%");
            });
        }

        if (!empty($validated['chuyen_nganh_ids'])) {
            $query->whereHas('sinhvien', function ($q) use ($validated) {
                $q->whereIn('ID_CHUYENNGANH', $validated['chuyen_nganh_ids']);
            });
        }

        $students = $query
            ->orderBy('HODEM_VA_TEN')
            ->paginate($validated['per_page'] ?? 10);

        return response()->json($students);
    }

    /**
     * [MỚI] Mời nhiều thành viên vào nhóm (chỉ nhóm trưởng).
     * [NÂNG CẤP]: Gỡ bỏ kiểm tra 4 thành viên, giữ lại 8 lời mời chờ.
     */
    public function inviteMultipleMembers(Request $request, Nhom $nhom)
    {
        $user = $request->user();

        if ($nhom->ID_NHOMTRUONG !== $user->ID_NGUOIDUNG) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }

        $validated = $request->validate([
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'required|integer|exists:NGUOIDUNG,ID_NGUOIDUNG',
            'LOINHAN' => 'nullable|string|max:150',
        ]);

        $userIds = $validated['user_ids'];
        $count = count($userIds);

        // --- NÂNG CẤP: Kiểm tra giới hạn 8 lời mời "Đang chờ" ---
        $pendingCount = $nhom->loimois()->where('TRANGTHAI', LoimoiNhom::STATUS_PENDING)->count();
        if (($pendingCount + $count) > 8) {
            return response()->json(['message' => "Bạn chỉ có thể gửi tối đa 8 lời mời đang chờ. (Hiện tại: $pendingCount)"], 400);
        }
        // --- KẾT THÚC NÂNG CẤP ---

        // ----- ĐÃ GỠ BỎ LOGIC KIỂM TRA 4 THÀNH VIÊN -----
        // if (($nhom->SO_THANHVIEN_HIENTAI + $count) > 4) {
        //     return response()->json(['message' => 'Số lượng mời vượt quá số chỗ còn lại của nhóm.'], 400);
        // }
        // ----- KẾT THÚC GỠ BỎ -----

        $planId = $nhom->ID_KEHOACH;
        $now = now();
        $expiresAt = $now->copy()->addDays(4);

        $conflicts = ThanhvienNhom::whereIn('ID_NGUOIDUNG', $userIds)
            ->whereHas('nhom', fn($q) => $q->where('ID_KEHOACH', $planId))
            ->with('nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN')
            ->get();

        if ($conflicts->isNotEmpty()) {
            $names = $conflicts->pluck('nguoidung.HODEM_VA_TEN')->implode(', ');
            return response()->json(['message' => "Không thể mời: {$names} đã ở trong nhóm khác."], 409);
        }
        
        $pendingInvites = LoimoiNhom::where('ID_NHOM', $nhom->ID_NHOM)
            ->where('TRANGTHAI', LoimoiNhom::STATUS_PENDING)
            ->whereIn('ID_NGUOI_DUOCMOI', $userIds)
            ->pluck('ID_NGUOI_DUOCMOI');

        $invitesToCreate = [];
        $notificationsToCreate = [];

        foreach ($userIds as $userId) {
            if ($pendingInvites->contains($userId)) {
                continue;
            }

            $invitesToCreate[] = [
                'ID_NHOM' => $nhom->ID_NHOM,
                'ID_NGUOI_DUOCMOI' => $userId,
                'ID_NGUOIMOI' => $user->ID_NGUOIDUNG,
                'LOINHAN' => $validated['LOINHAN'],
                'NGAY_HETHAN' => $expiresAt,
                'TRANGTHAI' => LoimoiNhom::STATUS_PENDING,
                'NGAYTAO' => $now,
            ];
            
            $notificationsToCreate[] = [
                'user_id' => $userId,
                'type' => 'GROUP_INVITATION',
                'data' => json_encode([
                    'group_name' => $nhom->TEN_NHOM,
                    'inviter_name' => $user->HODEM_VA_TEN,
                ]),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        
        if (empty($invitesToCreate)) {
            return response()->json(['message' => 'Các sinh viên này đã được mời trước đó và đang chờ phản hồi.'], 409);
        }

        LoimoiNhom::insert($invitesToCreate);
        Notification::insert($notificationsToCreate);

        return response()->json([
            'message' => 'Đã gửi lời mời thành công đến ' . count($invitesToCreate) . ' sinh viên.',
        ], 200);
    }
}