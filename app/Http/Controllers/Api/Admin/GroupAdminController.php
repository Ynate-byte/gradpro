<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Nguoidung;
use App\Models\Nhom;
use App\Models\ThanhvienNhom;
use App\Models\KehoachKhoaluan;
use App\Models\Sinhvien;
use App\Models\SinhvienThamgia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use App\Exports\GroupsExport;
use Maatwebsite\Excel\Facades\Excel;
use App\Services\AutoGroupingService;
use App\Models\PhancongDetaiNhom;
use App\Services\ActivityLogger;
use App\Services\NotificationService;
use Illuminate\Validation\ValidationException;


class GroupAdminController extends Controller
{
    /**
     * Lấy danh sách các nhóm, hỗ trợ lọc và phân trang.
     */
    public function getGroups(Request $request)
    {
        $request->validate([
            'plan_id' => 'sometimes|nullable|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'search' => 'nullable|string|max:100',
            'statuses' => 'nullable|array',
            'statuses.*' => 'in:Đang mở,Đã đủ thành viên,Đang thực hiện,Đã hoàn thành,Không đạt',
            'is_special' => 'nullable|array',
            'is_special.*' => 'boolean',
        ]);

        $query = Nhom::with([
            'nhomtruong', 
            'chuyennganh', 
            'khoabomon',
            'kehoach',
            'thanhviens.nguoidung.sinhvien.chuyennganh', 
            'phancongDetaiNhom.detai',
            'phancongDetaiNhom.gvhd.nguoidung',
            'diemTongKet'
        ]);

        if ($request->filled('plan_id')) {
            $query->where('ID_KEHOACH', $request->input('plan_id'));
        }

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('TEN_NHOM', 'like', '%' . $searchTerm . '%')
                    ->orWhereHas('thanhviens.nguoidung', function ($subQ) use ($searchTerm) {
                            $subQ->where('HODEM_VA_TEN', 'like', '%' . $searchTerm . '%');
                        });
            });
        }

        if ($request->filled('statuses')) {
            $statuses = $request->statuses;
            
            $groupStatuses = array_intersect($statuses, ['Đang mở', 'Đã đủ thành viên']);
            $assignmentStatuses = array_intersect($statuses, ['Đang thực hiện', 'Đã hoàn thành', 'Không đạt']);

            $query->where(function ($q) use ($groupStatuses, $assignmentStatuses) {
                if (!empty($groupStatuses) && !empty($assignmentStatuses)) {
                    $q->where(function ($subQ) use ($groupStatuses) {
                        $subQ->whereIn('TRANGTHAI', $groupStatuses)
                             ->whereDoesntHave('phancongDetaiNhom');
                    })->orWhereHas('phancongDetaiNhom', function ($subQ) use ($assignmentStatuses) {
                        $subQ->whereIn('TRANGTHAI', $assignmentStatuses);
                    });
                } elseif (!empty($groupStatuses)) {
                    $q->where(function ($subQ) use ($groupStatuses) {
                        $subQ->whereIn('TRANGTHAI', $groupStatuses)
                             ->whereDoesntHave('phancongDetaiNhom');
                    });
                } elseif (!empty($assignmentStatuses)) {
                    $q->whereHas('phancongDetaiNhom', function ($subQ) use ($assignmentStatuses) {
                        $subQ->whereIn('TRANGTHAI', $assignmentStatuses);
                    });
                }
            });
        }

        if ($request->filled('is_special')) {
            $specialValues = collect($request->is_special)->map(function ($value) {
                return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            })->filter(fn($value) => $value !== null)->unique()->all();

            if (!empty($specialValues)) {
                $query->whereIn('LA_NHOM_DACBIET', $specialValues);
            }
        }

        $groups = $query->orderBy('NGAYTAO', 'desc')->paginate($request->per_page ?? 10);

        return response()->json($groups);
    }

    /**
     * Cập nhật thông tin của một nhóm cụ thể.
     * (Đã nâng cấp để nhận 'member_ids' đồng bộ)
     */
    public function update(Request $request, Nhom $nhom)
    {
        $validated = $request->validate([
            'TEN_NHOM' => ['required', 'string', 'max:100', Rule::unique('NHOM')->ignore($nhom->ID_NHOM, 'ID_NHOM')],
            'MOTA' => 'nullable|string|max:255',
            'ID_NHOMTRUONG' => [
                'required',
                'exists:NGUOIDUNG,ID_NGUOIDUNG',
                function ($attribute, $value, $fail) use ($request, $nhom) {
                    if ($request->has('member_ids') && !in_array($value, $request->input('member_ids', []))) {
                        $fail('Nhóm trưởng phải là một trong các thành viên của nhóm.');
                    }
                    if (!$request->has('member_ids') && !ThanhvienNhom::where('ID_NHOM', $nhom->ID_NHOM)->where('ID_NGUOIDUNG', $value)->exists()) {
                        $fail('Trưởng nhóm mới phải là một thành viên hợp lệ của nhóm.');
                    }
                },
            ],
            'member_ids' => 'sometimes|array|min:1',
            'member_ids.*' => 'required|exists:NGUOIDUNG,ID_NGUOIDUNG',
        ], [
            'member_ids.min' => 'Nhóm phải có ít nhất 1 thành viên.',
        ]);

        try {
            DB::transaction(function () use ($nhom, $validated, $request) {
                $planId = $nhom->ID_KEHOACH;

                // 1. Cập nhật thông tin cơ bản
                $nhom->update([
                    'TEN_NHOM' => $validated['TEN_NHOM'],
                    'MOTA' => $validated['MOTA'],
                    'ID_NHOMTRUONG' => $validated['ID_NHOMTRUONG'],
                ]);

                // 2. Chỉ đồng bộ thành viên nếu mảng 'member_ids' được gửi lên
                if ($request->has('member_ids')) {
                    $newMemberIds = $validated['member_ids'];
                    $currentMemberIds = $nhom->thanhviens()->pluck('ID_NGUOIDUNG')->all();

                    $idsToAdd = array_diff($newMemberIds, $currentMemberIds);
                    $idsToRemove = array_diff($currentMemberIds, $newMemberIds);

                    // 2a. Kiểm tra xung đột (sinh viên thêm vào đã ở nhóm khác chưa)
                    if (count($idsToAdd) > 0) {
                        $conflictingMembers = ThanhvienNhom::whereIn('ID_NGUOIDUNG', $idsToAdd)
                            ->whereHas('nhom', function ($query) use ($planId) {
                                $query->where('ID_KEHOACH', $planId);
                            })
                            ->with('nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN')
                            ->get();

                        if ($conflictingMembers->isNotEmpty()) {
                            $names = $conflictingMembers->pluck('nguoidung.HODEM_VA_TEN')->implode(', ');
                            throw ValidationException::withMessages([
                                'member_ids' => "Không thể thêm: {$names} đã thuộc nhóm khác trong kế hoạch này."
                            ]);
                        }
                    }

                    // 2b. Xóa thành viên
                    if (count($idsToRemove) > 0) {
                        ThanhvienNhom::where('ID_NHOM', $nhom->ID_NHOM)->whereIn('ID_NGUOIDUNG', $idsToRemove)->delete();
                    }

                    // 2c. Thêm thành viên mới
                    if (count($idsToAdd) > 0) {
                        $membersToInsert = collect($idsToAdd)->map(fn($id) => [
                            'ID_NHOM' => $nhom->ID_NHOM,
                            'ID_NGUOIDUNG' => $id,
                            'NGAY_VAONHOM' => now(),
                        ])->all();
                        ThanhvienNhom::insert($membersToInsert);
                        $this->addStudentsToPlanIfNotExists($idsToAdd, $planId);
                    }

                    // 2d. Cập nhật số lượng và trạng thái nhóm
                    $newCount = count($newMemberIds);

                    $plan = KehoachKhoaluan::find($planId);
                    $maxMembers = $plan->SO_THANHVIEN_TOIDA ?? 3;

                    $nhom->update([
                        'SO_THANHVIEN_HIENTAI' => $newCount,
                        'TRANGTHAI' => ($newCount >= $maxMembers) ? 'Đã đủ thành viên' : 'Đang mở',
                    ]);
                }
            });
        } catch (ValidationException $e) {
            return response()->json(['message' => $e->getMessage(), 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Lỗi khi cập nhật nhóm: ' . $e->getMessage());
            return response()->json(['message' => 'Đã xảy ra lỗi khi cập nhật nhóm.'], 500);
        }

        return response()->json($nhom->load('nhomtruong', 'thanhviens.nguoidung'));
    }

    /**
     * Xóa một nhóm và tất cả thành viên của nhóm đó.
     */
    public function destroy(Nhom $nhom)
    {
        DB::transaction(function () use ($nhom) {
            ThanhvienNhom::where('ID_NHOM', $nhom->ID_NHOM)->delete();
            $nhom->delete();
        });

        return response()->json(null, 204);
    }

    /**
     * Lấy thông kê về sinh viên và nhóm trong một kế hoạch.
     */
    public function getStatistics(Request $request)
    {
        $request->validate(['plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH']);
        $plan = KehoachKhoaluan::find($request->plan_id);

        try {
            $activeStudentUserIdsQuery = Nguoidung::query()
                ->where('TRANGTHAI_KICHHOAT', true)
                ->whereHas('sinhvien.cacDotThamGia', function ($query) use ($plan) {
                    $query->where('ID_KEHOACH', $plan->ID_KEHOACH);
                });

            $totalStudents = (clone $activeStudentUserIdsQuery)->count();

            $studentsWithoutGroup = (clone $activeStudentUserIdsQuery)
                ->whereDoesntHave('thanhvienNhom', function($query) use ($plan) {
                    $query->whereHas('nhom', fn($q) => $q->where('ID_KEHOACH', $plan->ID_KEHOACH));
                })
                ->count();

            $inactiveStudents = Nguoidung::query()
                ->whereNull('DANGNHAP_CUOI')
                ->whereHas('sinhvien.cacDotThamGia', function ($query) use ($plan) {
                    $query->where('ID_KEHOACH', $plan->ID_KEHOACH);
                })->count();

            return response()->json([
                'totalStudents' => $totalStudents,
                'inactiveStudents' => $inactiveStudents,
                'studentsWithoutGroup' => $studentsWithoutGroup,
                'totalGroups' => $plan->nhoms()->count(),
                'fullGroups' => $plan->nhoms()->where('SO_THANHVIEN_HIENTAI', '>=', 4)->count(),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get group statistics for plan ' . $plan->ID_KEHOACH . ': ' . $e->getMessage(), ['trace' => $e->getTrace()]);
            return response()->json(['message' => 'Không thể lấy dữ liệu thống kê.'], 500);
        }
    }

    /**
     * Lấy danh sách sinh viên chưa kích hoạt (chưa đăng nhập) trong kế hoạch.
     * [SỬA ĐỔI] Trả về thông tin Nguoidung KÈM THEO ID_THAMGIA
     */
    public function getInactiveStudents(Request $request)
    {
        $request->validate(['plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH']);
        $plan = KehoachKhoaluan::find($request->plan_id);

        // Lấy các bản ghi SINHVIEN_THAMGIA của kế hoạch này
        $participants = SinhvienThamgia::where('ID_KEHOACH', $plan->ID_KEHOACH)
            ->with([
                // Tải thông tin sinh viên
                'sinhvien' => function ($query) {
                    $query->select('ID_SINHVIEN', 'ID_NGUOIDUNG', 'ID_CHUYENNGANH');
                },
                // Tải thông tin người dùng (qua sinhvien)
                'sinhvien.nguoidung' => function ($query) {
                    $query->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'MA_DINHDANH', 'EMAIL', 'DANGNHAP_CUOI', 'NGAYSINH') // Cũng lấy NGAYSINH
                          ->whereNull('DANGNHAP_CUOI'); // Lọc người dùng chưa đăng nhập
                },
                // Tải chuyên ngành (qua sinhvien)
                'sinhvien.chuyennganh:ID_CHUYENNGANH,TEN_CHUYENNGANH'
            ])
            // Chỉ lấy những ai có người dùng (và người dùng đó chưa đăng nhập)
            ->whereHas('sinhvien.nguoidung', function ($query) {
                $query->whereNull('DANGNHAP_CUOI');
            })
            ->get();

        // Định dạng lại dữ liệu trả về
        $students = $participants->map(function ($participant) {
            // Đảm bảo $participant->sinhvien và $participant->sinhvien->nguoidung tồn tại (dù query đã lọc)
            if (!$participant->sinhvien || !$participant->sinhvien->nguoidung) {
                return null;
            }

            $nguoidung = $participant->sinhvien->nguoidung;
            
            // Gộp dữ liệu từ NGUOIDUNG và thêm ID_THAMGIA
            return [
                'ID_NGUOIDUNG' => $nguoidung->ID_NGUOIDUNG,
                'ID_THAMGIA' => $participant->ID_THAMGIA, // Đây là ID_THAMGIA (để xóa khỏi kế hoạch)
                'HODEM_VA_TEN' => $nguoidung->HODEM_VA_TEN,
                'MA_DINHDANH' => $nguoidung->MA_DINHDANH,
                'EMAIL' => $nguoidung->EMAIL,
                'NGAYSINH' => $nguoidung->NGAYSINH,
                'DANGNHAP_CUOI' => $nguoidung->DANGNHAP_CUOI,
                'sinhvien' => [
                    'chuyennganh' => $participant->sinhvien->chuyennganh
                ]
            ];
        })->filter(); // Lọc bỏ các giá trị null (nếu có lỗi data)

        return response()->json($students);
    }

    /**
     * Xóa một thành viên cụ thể ra khỏi nhóm.
     */
    public function removeMember(Nhom $nhom, $userId)
    {
        $member = ThanhvienNhom::where('ID_NHOM', $nhom->ID_NHOM)
                                ->where('ID_NGUOIDUNG', $userId)
                                ->firstOrFail();

        if ($nhom->ID_NHOMTRUONG == $userId) {
            return response()->json(['message' => 'Không thể xóa nhóm trưởng. Vui lòng chuyển quyền trưởng nhóm trước.'], 400);
        }

        if ($nhom->SO_THANHVIEN_HIENTAI <= 1) {
            return response()->json(['message' => 'Không thể xóa thành viên cuối cùng.'], 400);
        }

        DB::transaction(function () use ($nhom, $member) {
            $member->delete();
            $nhom->decrement('SO_THANHVIEN_HIENTAI');

            $plan = KehoachKhoaluan::find($nhom->ID_KEHOACH);
            $maxMembers = $plan->SO_THANHVIEN_TOIDA ?? 3;

            if ($nhom->TRANGTHAI === 'Đã đủ thành viên' && $nhom->SO_THANHVIEN_HIENTAI < $maxMembers) {
                $nhom->TRANGTHAI = 'Đang mở';
                $nhom->save();
            }
        });

        return response()->json(['message' => 'Đã xóa thành viên khỏi nhóm thành công.']);
    }

    /**
     * [MỚI] Xóa sinh viên chưa đăng nhập khỏi kế hoạch VÀ nhóm (Logic thông minh)
     * Thực thi logic:
     * 1. Chặn nếu là trưởng nhóm Đặc Biệt.
     * 2. Tự động chuyển quyền trưởng nhóm Thường (nếu còn TV).
     * 3. Tự động xóa nhóm Thường (nếu là TV cuối cùng).
     * 4. Xóa khỏi `THANHVIEN_NHOM` và `SINHVIEN_THAMGIA`.
     */
    public function removeInactiveStudentsFromPlan(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'participant_ids' => 'required|array|min:1',
            'participant_ids.*' => 'exists:SINHVIEN_THAMGIA,ID_THAMGIA',
        ]);

        $planId = $validated['plan_id'];
        $participantIds = $validated['participant_ids'];

        // 1. Lấy User IDs từ Participant IDs
        $participants = SinhvienThamgia::with('sinhvien:ID_SINHVIEN,ID_NGUOIDUNG')
                            ->whereIn('ID_THAMGIA', $participantIds)
                            ->where('ID_KEHOACH', $planId) // Đảm bảo họ thuộc kế hoạch này
                            ->get();

        $userIdsToRemove = $participants->pluck('sinhvien.ID_NGUOIDUNG')->filter()->unique();

        if ($userIdsToRemove->isEmpty()) {
            return response()->json(['message' => 'Không tìm thấy người dùng hợp lệ để xóa.'], 404);
        }

        // 2. Kiểm tra xung đột (Trưởng nhóm của NHÓM ĐẶC BIỆT)
        $conflictingLeaders = Nhom::where('ID_KEHOACH', $planId)
            ->where('LA_NHOM_DACBIET', true) // Chỉ nhóm đặc biệt
            ->whereIn('ID_NHOMTRUONG', $userIdsToRemove)
            ->with('nhomtruong:ID_NGUOIDUNG,HODEM_VA_TEN')
            ->get();

        if ($conflictingLeaders->isNotEmpty()) {
            $names = $conflictingLeaders->pluck('nhomtruong.HODEM_VA_TEN')->implode(', ');
            return response()->json([
                'message' => "Không thể xóa: {$names}. Họ là trưởng nhóm của nhóm ĐẶC BIỆT. Vui lòng xử lý thủ công."
            ], 409); // 409 Conflict
        }

        // 3. Bắt đầu Transaction
        DB::beginTransaction();
        try {
            // 4. Xử lý chuyển quyền trưởng nhóm cho các NHÓM THƯỜNG
            $leaderGroupsToProcess = Nhom::where('ID_KEHOACH', $planId)
                ->where('LA_NHOM_DACBIET', false) // Chỉ nhóm thường
                ->whereIn('ID_NHOMTRUONG', $userIdsToRemove)
                ->with('thanhviens:ID_NHOM,ID_NGUOIDUNG') // Tải tất cả thành viên
                ->get();

            $groupsToDelete = collect(); // Nhóm sẽ bị xóa (vì rỗng)

            foreach ($leaderGroupsToProcess as $nhom) {
                // Tìm một trưởng nhóm mới (người không nằm trong danh sách sắp bị xóa)
                $newLeader = $nhom->thanhviens
                                ->whereNotIn('ID_NGUOIDUNG', $userIdsToRemove)
                                ->first();

                if ($newLeader) {
                    // Nếu tìm thấy, gán trưởng nhóm mới
                    $nhom->ID_NHOMTRUONG = $newLeader->ID_NGUOIDUNG;
                    $nhom->save();
                } else {
                    // Nếu không (nhóm chỉ có mình trưởng nhóm này, hoặc tất cả tv đều bị xóa)
                    // -> đánh dấu để xóa nhóm
                    $groupsToDelete->push($nhom->ID_NHOM);
                }
            }

            // 5. Lấy ID tất cả các nhóm trong kế hoạch
            $allGroupIdsInPlan = Nhom::where('ID_KEHOACH', $planId)->pluck('ID_NHOM');
            
            // 6. Lấy ID các nhóm bị ảnh hưởng (các nhóm mà SV sắp xóa đang tham gia)
            $affectedGroupIds = ThanhvienNhom::whereIn('ID_NGUOIDUNG', $userIdsToRemove)
                                ->whereIn('ID_NHOM', $allGroupIdsInPlan)
                                ->pluck('ID_NHOM')
                                ->unique();

            // 7. Xóa sinh viên khỏi các nhóm (THANHVIEN_NHOM)
            ThanhvienNhom::whereIn('ID_NGUOIDUNG', $userIdsToRemove)
                            ->whereIn('ID_NHOM', $allGroupIdsInPlan)
                            ->delete();

            // 8. Xóa sinh viên khỏi kế hoạch (SINHVIEN_THAMGIA)
            SinhvienThamgia::whereIn('ID_THAMGIA', $participantIds)->delete();

            // 9. Cập nhật lại số lượng thành viên (hoặc xóa nhóm nếu rỗng)
            $allAffectedGroupIds = $affectedGroupIds->merge($groupsToDelete)->unique();

            foreach ($allAffectedGroupIds as $groupId) {
                // Kiểm tra xem nhóm còn tồn tại không (phòng trường hợp đã bị xóa ở bước 4)
                $group = Nhom::find($groupId);
                if (!$group) continue; 
                
                $newCount = ThanhvienNhom::where('ID_NHOM', $groupId)->count();
                
                if ($newCount == 0) {
                    // Nếu nhóm rỗng, xóa luôn nhóm
                    $group->delete();
                } else {
                    // Nếu còn, cập nhật lại số lượng
                    // (Cũng kiểm tra nếu trưởng nhóm cũ bị xóa, gán cho người đầu tiên)
                    if (!ThanhvienNhom::where('ID_NHOM', $groupId)->where('ID_NGUOIDUNG', $group->ID_NHOMTRUONG)->exists()) {
                        $group->ID_NHOMTRUONG = ThanhvienNhom::where('ID_NHOM', $groupId)->first()->ID_NGUOIDUNG;
                    }
                    $group->SO_THANHVIEN_HIENTAI = $newCount;
                    $group->save();
                }
            }

            DB::commit();
            return response()->json(['message' => "Đã xóa thành công " . count($participantIds) . " sinh viên khỏi kế hoạch (và khỏi nhóm của họ)."]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi khi xóa SV chưa đăng nhập: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Xóa thất bại do lỗi server: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Đánh dấu hoặc gỡ đánh dấu "nhóm đặc biệt".
     */
    public function markAsSpecial(Request $request, Nhom $nhom)
    {
        $validated = $request->validate(['is_special' => 'required|boolean']);

        $nhom->update(['LA_NHOM_DACBIET' => $validated['is_special']]);

        $message = $validated['is_special'] ? 'Đã đánh dấu nhóm là nhóm đặc biệt.' : 'Đã gỡ đánh dấu nhóm đặc biệt.';

        return response()->json(['message' => $message]);
    }

    /**
     * Thêm nhiều sinh viên vào một nhóm đã có.
     */
    public function addMembersToGroup(Request $request)
    {
        $validated = $request->validate([
            'ID_NHOM' => 'required|exists:NHOM,ID_NHOM',
            'student_ids' => 'required|array|min:1',
            'student_ids.*' => 'exists:NGUOIDUNG,ID_NGUOIDUNG',
        ]);

        $nhom = Nhom::find($validated['ID_NHOM']);
        $planId = $nhom->ID_KEHOACH;
        
        $plan = KehoachKhoaluan::find($planId);
        $maxMembers = $plan->SO_THANHVIEN_TOIDA ?? 4;

        $countToAdd = count($validated['student_ids']);

        if ($nhom->SO_THANHVIEN_HIENTAI + $countToAdd > $maxMembers) {
            return response()->json(['message' => "Số lượng thành viên thêm vào vượt quá giới hạn của nhóm ({$maxMembers} người)."], 400);
        }

        $existingMembers = ThanhvienNhom::whereIn('ID_NGUOIDUNG', $validated['student_ids'])
            ->whereHas('nhom', function ($query) use ($planId) {
                $query->where('ID_KEHOACH', $planId);
            })
            ->count();

        if ($existingMembers > 0) {
            return response()->json(['message' => 'Một hoặc nhiều sinh viên được chọn đã thuộc về một nhóm khác trong kế hoạch này.'], 409);
        }

        DB::transaction(function () use ($validated, $nhom, $countToAdd, $planId, $maxMembers) {
            $membersToInsert = collect($validated['student_ids'])->map(fn($id) => [
                'ID_NHOM' => $nhom->ID_NHOM,
                'ID_NGUOIDUNG' => $id,
                'NGAY_VAONHOM' => now(),
            ])->all();

            ThanhvienNhom::insert($membersToInsert);
            $newCount = $nhom->SO_THANHVIEN_HIENTAI + $countToAdd;
            
            $nhom->SO_THANHVIEN_HIENTAI = $newCount;
            if ($newCount >= $maxMembers) {
                $nhom->TRANGTHAI = 'Đã đủ thành viên';
            }
            $nhom->save();

            $this->addStudentsToPlanIfNotExists($validated['student_ids'], $planId);

            YeucauVaoNhom::whereIn('ID_NGUOIDUNG', $validated['student_ids'])
            ->where('TRANGTHAI', 'Đang chờ')
            ->whereHas('nhom', fn($q) => $q->where('ID_KEHOACH', $planId))
            ->update(['TRANGTHAI' => 'Đã hủy']);

            LoimoiNhom::whereIn('ID_NGUOI_DUOCMOI', $validated['student_ids'])
                ->where('TRANGTHAI', 'Đang chờ')
                ->whereHas('nhom', fn($q) => $q->where('ID_KEHOACH', $planId))
                ->update(['TRANGTHAI' => 'Hết hạn']);
        });

        return response()->json(['message' => "Đã thêm thành công {$countToAdd} sinh viên vào nhóm."]);
    }

    /**
     * Xuất danh sách nhóm ra file Excel.
     */
    public function exportGroups(Request $request)
    {
        $request->validate(['plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH']);
        $plan = KehoachKhoaluan::find($request->plan_id);

        return Excel::download(new GroupsExport($plan->ID_KEHOACH), 'danh-sach-nhom-'.$plan->KHOAHOC.'.xlsx');
    }

    /**
     * Tự động chia nhóm cho các sinh viên chưa có nhóm.
     */
    public function autoGroupStudents(Request $request, AutoGroupingService $groupingService)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'desiredMembers' => 'required|integer|min:2|max:5',
            'priority' => 'required|in:chuyennganh,lop',
        ]);

        $plan = KehoachKhoaluan::find($validated['plan_id']);

        $result = $groupingService->execute($plan, $validated['desiredMembers'], $validated['priority']);

        return response()->json($result);
    }

    /**
     * Tìm kiếm sinh viên chưa có nhóm trong một kế hoạch. (Dùng cho Tạo nhóm)
     */
    public function searchUngroupedStudents(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'search' => 'nullable|string|min:2|max:100',
        ], [
            'search.min' => 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự.',
        ]);

        $planId = $validated['plan_id'];
        $searchTerm = $validated['search'] ?? null;

        if (!$searchTerm) {
            return response()->json([]);
        }

        $query = Nguoidung::query()
            ->where('TRANGTHAI_KICHHOAT', true)
            ->whereHas('sinhvien.cacDotThamGia', function ($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            })
            ->whereDoesntHave('thanhvienNhom.nhom', function ($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            })
            ->where(function ($q) use ($searchTerm) {
                $q->where('HODEM_VA_TEN', 'like', "%{$searchTerm}%")
                  ->orWhere('MA_DINHDANH', 'like', "%{$searchTerm}%")
                  ->orWhere('EMAIL', 'like', "%{$searchTerm}%");
            });

        $students = $query->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'MA_DINHDANH')
                            ->limit(20)
                            ->get();

        return response()->json($students);
    }

    /**
     * Tạo một nhóm mới và thêm thành viên ngay lập tức.
     */
    public function createWithMembers(Request $request)
    {
        // ----- SỬA LỖI 500 (Dòng 439) -----
        $validated = $request->validate([
            'plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'TEN_NHOM' => [
                'required', 
                'string', 
                'max:100', 
                Rule::unique('NHOM')->where('ID_KEHOACH', $request->input('plan_id')) // Sửa $validated['plan_id'] thành $request->input('plan_id')
            ],
            'MOTA' => 'nullable|string|max:255',
            'ID_NHOMTRUONG' => 'required|exists:NGUOIDUNG,ID_NGUOIDUNG',
            'member_ids' => 'required|array|min:1',
            'member_ids.*' => 'exists:NGUOIDUNG,ID_NGUOIDUNG',
        ]);
        // ----- KẾT THÚC SỬA LỖI -----

        if (!in_array($validated['ID_NHOMTRUONG'], $validated['member_ids'])) {
            return response()->json(['message' => 'Nhóm trưởng phải là một trong các thành viên được chọn.'], 422);
        }

        $planId = $validated['plan_id'];
        $existingMembers = ThanhvienNhom::whereIn('ID_NGUOIDUNG', $validated['member_ids'])
            ->whereHas('nhom', function ($query) use ($planId) {
                $query->where('ID_KEHOACH', $planId);
            })
            ->count();

        if ($existingMembers > 0) {
            return response()->json(['message' => 'Một hoặc nhiều sinh viên đã có nhóm trong kế hoạch này. Vui lòng kiểm tra lại.'], 409);
        }

        $group = null;
        DB::transaction(function () use ($validated, &$group) {
            $group = Nhom::create([
                'ID_KEHOACH' => $validated['plan_id'],
                'TEN_NHOM' => $validated['TEN_NHOM'],
                'MOTA' => $validated['MOTA'],
                'ID_NHOMTRUONG' => $validated['ID_NHOMTRUONG'],
                'SO_THANHVIEN_HIENTAI' => count($validated['member_ids']),
                'LA_NHOM_DACBIET' => true,
            ]);

            $membersToInsert = collect($validated['member_ids'])->map(fn($id) => [
                'ID_NHOM' => $group->ID_NHOM,
                'ID_NGUOIDUNG' => $id,
                'NGAY_VAONHOM' => now(),
            ])->all();

            ThanhvienNhom::insert($membersToInsert);

            $this->addStudentsToPlanIfNotExists($validated['member_ids'], $validated['plan_id']);
        });

        return response()->json($group->load('thanhviens.nguoidung', 'nhomtruong'), 201);
    }

    /**
     * Lấy toàn bộ danh sách sinh viên chưa có nhóm trong kế hoạch.
     */
    public function getUngroupedStudents(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'search' => 'nullable|string|max:100',
        ]);
        $planId = $validated['plan_id'];
        $searchTerm = $validated['search'] ?? null;

        $query = Nguoidung::query()
            ->where('TRANGTHAI_KICHHOAT', true)
            ->whereHas('sinhvien.cacDotThamGia', function ($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            })
            ->whereDoesntHave('thanhvienNhom.nhom', function ($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            });

        if ($searchTerm) {
            $query->where(function ($q) use ($searchTerm) {
                $q->where('HODEM_VA_TEN', 'like', "%{$searchTerm}%")
                  ->orWhere('MA_DINHDANH', 'like', "%{$searchTerm}%")
                  ->orWhere('EMAIL', 'like', "%{$searchTerm}%");
            });
        }

        $students = $query
            ->with('sinhvien.chuyennganh')
            ->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'MA_DINHDANH', 'EMAIL', 'NGAYSINH') // Thêm NGAYSINH
            ->orderBy('HODEM_VA_TEN')
            ->get();

        return response()->json($students);
    }

    /**
     * [Hàm helper] Tự động thêm sinh viên vào bảng SINHVIEN_THAMGIA nếu họ chưa có.
     */
    private function addStudentsToPlanIfNotExists(array $userIds, int $planId)
    {
        $studentMap = Sinhvien::whereIn('ID_NGUOIDUNG', $userIds)
                                ->pluck('ID_SINHVIEN', 'ID_NGUOIDUNG');

        $existingStudentIdsInPlan = SinhvienThamgia::where('ID_KEHOACH', $planId)
                                    ->whereIn('ID_SINHVIEN', $studentMap->values())
                                    ->pluck('ID_SINHVIEN');

        $missingStudentIds = $studentMap->values()->diff($existingStudentIdsInPlan);

        if ($missingStudentIds->isNotEmpty()) {
            $dataToInsert = $missingStudentIds->map(fn($studentId) => [
                'ID_KEHOACH' => $planId,
                'ID_SINHVIEN' => $studentId,
                'DU_DIEUKIEN' => true,
                'NGAY_DANGKY' => now(),
            ])->all();

            SinhvienThamgia::insert($dataToInsert);

            Log::info("Admin action: Automatically added " . $missingStudentIds->count() . " students to SINHVIEN_THAMGIA for plan $planId.");
        }
    }

    /**
     * Gán một đề tài cụ thể cho nhóm (Admin/Giáo vụ thực hiện).
     */
    public function assignTopic(Request $request, Nhom $nhom)
    {
        $validated = $request->validate([
            'ID_DETAI' => 'required|exists:DETAI,ID_DETAI',
        ]);

        // Eager load người đề xuất để lấy tên GVHD cho thông báo
        $topic = \App\Models\Detai::with('nguoiDexuat.nguoidung')->findOrFail($validated['ID_DETAI']);

        // 1. Kiểm tra tính hợp lệ
        if ($topic->ID_KEHOACH != $nhom->ID_KEHOACH) {
            return response()->json(['message' => 'Đề tài và Nhóm không thuộc cùng một kế hoạch.'], 400);
        }

        if ($topic->TRANGTHAI !== 'Đã duyệt') {
            return response()->json(['message' => 'Chỉ có thể gán các đề tài đã được duyệt.'], 400);
        }

        DB::transaction(function () use ($nhom, $topic) {            
            // Kiểm tra xem nhóm này hiện tại đang có đề tài nào không
            $oldAssignment = \App\Models\PhancongDetaiNhom::where('ID_NHOM', $nhom->ID_NHOM)->first();

            if ($oldAssignment) {
                // Nếu nhóm ĐÃ CÓ đề tài trước đó
                if ($oldAssignment->ID_DETAI != $topic->ID_DETAI) {
                    // 1. Giảm số lượng nhóm của đề tài CŨ
                    \App\Models\Detai::where('ID_DETAI', $oldAssignment->ID_DETAI)
                        ->where('SO_NHOM_HIENTAI', '>', 0) // Đảm bảo không âm
                        ->decrement('SO_NHOM_HIENTAI');

                    $topic->increment('SO_NHOM_HIENTAI');
                }
            } else {
                $topic->increment('SO_NHOM_HIENTAI');
            }
            
            // 3. Tạo hoặc cập nhật phân công
            \App\Models\PhancongDetaiNhom::updateOrCreate(
                ['ID_NHOM' => $nhom->ID_NHOM],
                [
                    'ID_DETAI' => $topic->ID_DETAI,
                    'ID_GVHD' => $topic->ID_NGUOI_DEXUAT,
                    'NGAY_PHANCONG' => now(),
                    'TRANGTHAI' => 'Đang thực hiện'
                ]
            );

            // 4. Cập nhật thông tin nhóm
            $nhom->update([
                'TEN_NHOM' => $topic->TEN_DETAI,
                'TRANGTHAI' => 'Đang thực hiện'
            ]);

            // 5. Ghi log
            ActivityLogger::log(
                'ASSIGN_TOPIC',
                "Đã gán đề tài: {$topic->TEN_DETAI}",
                [
                    'topic_id' => $topic->ID_DETAI,
                    'topic_name' => $topic->TEN_DETAI,
                    'supervisor' => $topic->nguoiDexuat->nguoidung->HODEM_VA_TEN ?? 'N/A',
                    'old_topic_id' => $oldAssignment ? $oldAssignment->ID_DETAI : null // Log thêm ID cũ để tracking
                ],
                $nhom->ID_NHOM,
                'BookCheck'
            );

            // 6. Gửi thông báo
            if ($nhom->ID_NHOMTRUONG) {
                NotificationService::send(
                    $nhom->ID_NHOMTRUONG,
                    "Nhóm được gán đề tài mới",
                    "Giáo vụ đã gán đề tài '{$topic->TEN_DETAI}' cho nhóm của bạn. GVHD: {$topic->nguoiDexuat->nguoidung->HODEM_VA_TEN}.",
                    'ACADEMIC',
                    '/projects/my-group'
                );
            }
        });

        return response()->json(['message' => "Đã gán đề tài '{$topic->TEN_DETAI}' cho nhóm thành công."]);
    }
}