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
    // THÔNG TIN NHÓM VÀ KẾ HOẠCH

    /**
     * Lấy danh sách các kế hoạch đang hoạt động mà sinh viên đang tham gia.
     */
    public function getActivePlansForStudent(Request $request)
    {
        $user = $request->user();

        if (!$user->sinhvien) {
            return response()->json([]);
        }

        $plans = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm'])
            ->whereHas('sinhvienThamgias', function ($query) use ($user) {
                $query->where('ID_SINHVIEN', $user->sinhvien->ID_SINHVIEN);
            })
            ->with(['mocThoigians' => function ($query) {
                $query->orderBy('NGAY_BATDAU');
            }])
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
                    $query->where('TRANGTHAI', YeucauVaoNhom::STATUS_PENDING)->with(['nguoidung' => function($q) {
                        $q->with(['vaitro', 'sinhvien.chuyennganh']);
                    }]);
                },
                // Tải các lời mời (invitations) đã gửi đi và đang chờ
                'loimois' => function($query) {
                    $query->where('TRANGTHAI', LoimoiNhom::STATUS_PENDING)->with('nguoiduocmoi.sinhvien.chuyennganh');
                }
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

        // Kiểm tra xem người dùng đã có nhóm trong kế hoạch này chưa
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

        // Kiểm tra xem SV có tham gia kế hoạch không
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

        // Kiểm tra xem SV có tham gia kế hoạch không
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

        // Lấy danh sách ID các nhóm mà người dùng đã gửi yêu cầu (đang chờ)
        $sent_requests = YeucauVaoNhom::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)
            ->where('TRANGTHAI', YeucauVaoNhom::STATUS_PENDING) // Chỉ kiểm tra yêu cầu đang chờ
            ->whereIn('ID_NHOM', $nhoms->pluck('ID_NHOM'))
            ->get(['ID_NHOM', 'ID_YEUCAU']); // Lấy cả ID_YEUCAU

        // Chuyển đổi sang map để dễ tra cứu
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
     */
    public function requestToJoin(Request $request, Nhom $nhom)
    {
        $user = $request->user();

        // Kiểm tra xem người dùng đã có nhóm trong kế hoạch này chưa
        $existingMembership = ThanhvienNhom::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)
            ->whereHas('nhom', function ($query) use ($nhom) {
                $query->where('ID_KEHOACH', $nhom->ID_KEHOACH);
            })->exists();

        if ($existingMembership) {
            return response()->json(['message' => 'Bạn đã là thành viên của một nhóm khác trong kế hoạch này.'], 409);
        }

        if(!$user->sinhvien) {
             return response()->json(['message' => 'Tài khoản của bạn không phải là sinh viên.'], 403);
        }
        // Kiểm tra xem SV có tham gia kế hoạch không
        $isParticipant = SinhvienThamgia::where('ID_KEHOACH', $nhom->ID_KEHOACH)
                                        ->where('ID_SINHVIEN', $user->sinhvien->ID_SINHVIEN)
                                        ->exists();
        if (!$isParticipant) {
            return response()->json(['message' => 'Bạn không thuộc kế hoạch khóa luận của nhóm này.'], 403);
        }


        if ($nhom->TRANGTHAI !== 'Đang mở') {
            return response()->json(['message' => 'Không thể gửi yêu cầu. Nhóm này không còn mở để nhận thành viên.'], 400);
        }

        // Kiểm tra xem đã gửi yêu cầu đang chờ chưa
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

        // Tạo thông báo cho nhóm trưởng
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

        // Kiểm tra SV được mời có tham gia kế hoạch không
        $isParticipant = SinhvienThamgia::where('ID_KEHOACH', $nhom->ID_KEHOACH)
                                        ->where('ID_SINHVIEN', $memberToInvite->sinhvien->ID_SINHVIEN)
                                        ->exists();
        if (!$isParticipant) {
             return response()->json(['message' => 'Sinh viên này không thuộc kế hoạch khóa luận của nhóm bạn.'], 403);
        }

        // Kiểm tra xem người được mời đã có nhóm trong kế hoạch này chưa
        $alreadyInGroup = ThanhvienNhom::where('ID_NGUOIDUNG', $memberToInvite->ID_NGUOIDUNG)
            ->whereHas('nhom', function ($query) use ($nhom) {
                $query->where('ID_KEHOACH', $nhom->ID_KEHOACH);
            })->exists();
        if ($alreadyInGroup) {
             return response()->json(['message' => 'Sinh viên này đã ở trong một nhóm khác thuộc kế hoạch này.'], 409);
        }

        // Kiểm tra xem đã mời người này (và đang chờ) chưa
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

        // Tạo thông báo cho người được mời
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
             'invite' => $invite->load('nguoiduocmoi.sinhvien.chuyennganh') // Trả về lời mời vừa tạo
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

    // ***** HÀM MỚI: Hủy lời mời (do nhóm trưởng) *****
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

    // ***** HÀM MỚI: Hủy yêu cầu tham gia (do người xin) *****
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
                 if ($nhom->TRANGTHAI === 'Đã đủ thành viên' && $nhom->SO_THANHVIEN_HIENTAI < $nhom->SOB_THANHVIEN_TOIDA) {
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

        // Trả về nhóm đã cập nhật (với nhóm trưởng mới)
        return response()->json([
            'message' => 'Đã chuyển quyền trưởng nhóm thành công.',
            'group' => $nhom->load('nhomtruong') // Tải lại thông tin nhóm trưởng mới
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

        // Thêm thông tin đề tài và giảng viên nếu có
        $assignment = $nhom->phancongDetaiNhom;
        if ($assignment) {
            $nhom->detai = $assignment->detai;
            $nhom->gvhd = $assignment->gvhd;
            $nhom->ngay_phan_cong = $assignment->NGAY_PHANCONG;
            $nhom->trang_thai = $assignment->TRANGTHAI;
        }

        return response()->json($nhom);
    }
}