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

class GroupAdminController extends Controller
{
    /**
     * Lấy danh sách các nhóm, hỗ trợ lọc và phân trang.
     */
    public function getGroups(Request $request)
    {
        $request->validate([
            'plan_id' => 'sometimes|nullable|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'search' => 'nullable|string|max:100', // Universal search
            'statuses' => 'nullable|array', // Filter by statuses
            'statuses.*' => 'in:Đang mở,Đã đủ thành viên', // Validate status values
            'is_special' => 'nullable|array', // Accept array for consistency
            'is_special.*' => 'boolean',
        ]);

        $query = Nhom::with(['nhomtruong', 'chuyennganh', 'khoabomon', 'thanhviens.nguoidung', 'phancongDetaiNhom']);
        
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
            $query->whereIn('TRANGTHAI', $request->statuses);
        }

        //Lọc theo Mảng Is Special (0 hoặc 1) -----
        if ($request->filled('is_special')) {
            // Lọc các giá trị boolean (true/false, 1/0)
            $specialValues = collect($request->is_special)->map(function ($value) {
                return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            })->filter(fn($value) => $value !== null)->unique()->all();
            
            if (!empty($specialValues)) {
                 $query->whereIn('LA_NHOM_DACBIET', $specialValues);
            }
        }

        $groups = $query->orderBy('NHOM.NGAYTAO', 'desc')->paginate($request->per_page ?? 10);
        
        return response()->json($groups);
    }

    /**
     * Cập nhật thông tin của một nhóm cụ thể.
     */
    public function update(Request $request, Nhom $nhom)
    {
        $validated = $request->validate([
            'TEN_NHOM' => ['required', 'string', 'max:100', Rule::unique('NHOM')->ignore($nhom->ID_NHOM, 'ID_NHOM')],
            'MOTA' => 'nullable|string|max:255',
            'ID_NHOMTRUONG' => [
                'sometimes',
                'required',
                'exists:NGUOIDUNG,ID_NGUOIDUNG',
                Rule::exists('THANHVIEN_NHOM', 'ID_NGUOIDUNG')->where('ID_NHOM', $nhom->ID_NHOM)
            ],
        ], [
            'ID_NHOMTRUONG.exists' => 'Trưởng nhóm mới phải là một thành viên hợp lệ của nhóm.'
        ]);

        $nhom->update($validated);
        
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
                    $query->where('SINHVIEN_THAMGIA.ID_KEHOACH', $plan->ID_KEHOACH);
                });

            $totalStudents = (clone $activeStudentUserIdsQuery)->count();

            $studentsWithoutGroup = (clone $activeStudentUserIdsQuery)
                ->whereDoesntHave('thanhvienNhom', function($query) use ($plan) {
                    $query->whereHas('nhom', fn($q) => $q->where('NHOM.ID_KEHOACH', $plan->ID_KEHOACH));
                })
                ->count();

            $inactiveStudents = Nguoidung::query()
                ->whereNull('DANGNHAP_CUOI')
                ->whereHas('sinhvien.cacDotThamGia', function ($query) use ($plan) {
                    $query->where('SINHVIEN_THAMGIA.ID_KEHOACH', $plan->ID_KEHOACH);
                })->count();

            return response()->json([
                'totalStudents' => $totalStudents,
                'inactiveStudents' => $inactiveStudents,
                'studentsWithoutGroup' => $studentsWithoutGroup,
                'totalGroups' => $plan->nhoms()->count(),
                'fullGroups' => $plan->nhoms()->where('SO_THANHVIEN_HIENTAI', '>=', 4)->count(),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get group statistics for plan ' . $plan->ID_KEHOACH . ': ' . $e->getMessage());
            return response()->json(['message' => 'Không thể lấy dữ liệu thống kê.'], 500);
        }
    }

    /**
     * Lấy danh sách sinh viên chưa kích hoạt (chưa đăng nhập) trong kế hoạch.
     */
    public function getInactiveStudents(Request $request)
    {
        $request->validate(['plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH']);
        $plan = KehoachKhoaluan::find($request->plan_id);

        $allStudentIdsInPlan = $plan->sinhvienThamgias()->pluck('ID_SINHVIEN');
        $allUserIdsInPlan = DB::table('SINHVIEN')->whereIn('ID_SINHVIEN', $allStudentIdsInPlan)->pluck('ID_NGUOIDUNG');

        $students = Nguoidung::with('sinhvien.chuyennganh')
            ->whereIn('ID_NGUOIDUNG', $allUserIdsInPlan)
            ->whereNull('DANGNHAP_CUOI')
            ->get();
            
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
            
            if ($nhom->TRANGTHAI === 'Đã đủ thành viên' && $nhom->SO_THANHVIEN_HIENTAI < 4) {
                $nhom->TRANGTHAI = 'Đang mở';
                $nhom->save();
            }
        });

        return response()->json(['message' => 'Đã xóa thành viên khỏi nhóm thành công.']);
    }
    
    /**
     * Vô hiệu hóa tài khoản của nhiều sinh viên.
     */
    public function removeStudents(Request $request)
    {
        $validated = $request->validate([
            'studentIds' => 'required|array', 
            'studentIds.*' => 'exists:NGUOIDUNG,ID_NGUOIDUNG'
        ]);
        
        Nguoidung::whereIn('ID_NGUOIDUNG', $validated['studentIds'])->update(['TRANGTHAI_KICHHOAT' => false]);
        
        return response()->json(['message' => 'Đã vô hiệu hóa các sinh viên được chọn thành công.']);
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
        $countToAdd = count($validated['student_ids']);

        if ($nhom->SO_THANHVIEN_HIENTAI + $countToAdd > 5) {
            return response()->json(['message' => 'Số lượng thành viên thêm vào vượt quá giới hạn của nhóm.'], 400);
        }

        $existingMembers = ThanhvienNhom::whereIn('ID_NGUOIDUNG', $validated['student_ids'])
            ->whereHas('nhom', function ($query) use ($planId) {
                $query->where('ID_KEHOACH', $planId);
            })
            ->count();

        if ($existingMembers > 0) {
            return response()->json(['message' => 'Một hoặc nhiều sinh viên được chọn đã thuộc về một nhóm khác trong kế hoạch này.'], 409);
        }

        DB::transaction(function () use ($validated, $nhom, $countToAdd, $planId) {
            $membersToInsert = collect($validated['student_ids'])->map(fn($id) => [
                'ID_NHOM' => $nhom->ID_NHOM,
                'ID_NGUOIDUNG' => $id,
                'NGAY_VAONHOM' => now(),
            ])->all();
            
            ThanhvienNhom::insert($membersToInsert);
            $nhom->increment('SO_THANHVIEN_HIENTAI', $countToAdd);

            $this->addStudentsToPlanIfNotExists($validated['student_ids'], $planId);
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
     * Tìm kiếm sinh viên chưa có nhóm trong một kế hoạch.
     */
    public function searchUngroupedStudents(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'search' => 'nullable|string|max:100',
        ]);
        $planId = $validated['plan_id'];

        $groupedUserIds = ThanhvienNhom::query()
            ->whereHas('nhom', function ($query) use ($planId) {
                $query->where('ID_KEHOACH', $planId);
            })
            ->pluck('ID_NGUOIDUNG');

        $query = Nguoidung::query()
            ->where('TRANGTHAI_KICHHOAT', true)
            ->whereHas('sinhvien.cacDotThamGia', function ($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            })
            ->whereNotIn('ID_NGUOIDUNG', $groupedUserIds);

        if ($request->filled('search')) {
            $searchTerm = $validated['search'];
            $query->where(function ($q) use ($searchTerm) {
                $q->where('HODEM_VA_TEN', 'like', "%{$searchTerm}%")
                    ->orWhere('MA_DINHDANH', 'like', "%{$searchTerm}%")
                    ->orWhere('EMAIL', 'like', "%{$searchTerm}%");
            });
        }

        $students = $query->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'MA_DINHDANH')->get();

        return response()->json($students);
    }

    /**
     * Tạo một nhóm mới và thêm thành viên ngay lập tức.
     */
    public function createWithMembers(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'TEN_NHOM' => ['required', 'string', 'max:100', Rule::unique('NHOM')->where('ID_KEHOACH', $request->plan_id)],
            'MOTA' => 'nullable|string|max:255',
            'ID_NHOMTRUONG' => 'required|exists:NGUOIDUNG,ID_NGUOIDUNG',
            'member_ids' => 'required|array|min:1',
            'member_ids.*' => 'exists:NGUOIDUNG,ID_NGUOIDUNG',
        ]);

        if (!in_array($validated['ID_NHOMTRUONG'], $validated['member_ids'])) {
            return response()->json(['message' => 'Nhóm trưởng phải là một trong các thành viên được chọn.'], 422);
        }

        // ----- SỬA LỖI 409: Chỉ kiểm tra sinh viên trong kế hoạch này -----
        $planId = $validated['plan_id']; // Lấy plan_id từ data đã validate
        $existingMembers = ThanhvienNhom::whereIn('ID_NGUOIDUNG', $validated['member_ids'])
            ->whereHas('nhom', function ($query) use ($planId) {
                $query->where('ID_KEHOACH', $planId);
            })
            ->count();
            
        if ($existingMembers > 0) {
            return response()->json(['message' => 'Một hoặc nhiều sinh viên đã có nhóm trong kế hoạch này. Vui lòng kiểm tra lại.'], 409);
        }
        // ----- KẾT THÚC SỬA LỖI -----

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
        ]);
        $planId = $validated['plan_id'];

        $groupedUserIds = ThanhvienNhom::query()
            ->whereHas('nhom', function ($query) use ($planId) {
                $query->where('ID_KEHOACH', $planId);
            })
            ->pluck('ID_NGUOIDUNG');

        $students = Nguoidung::query()
            ->where('TRANGTHAI_KICHHOAT', true)
            ->whereHas('sinhvien.cacDotThamGia', function ($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            })
            ->whereNotIn('ID_NGUOIDUNG', $groupedUserIds)
            ->with('sinhvien.chuyennganh')
            ->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'MA_DINHDANH', 'EMAIL')
            ->orderBy('HODEM_VA_TEN')
            ->get();

        return response()->json($students);
    }

    /**
     * [Hàm helper] Tự động thêm sinh viên vào bảng SINHVIEN_THAMGIA nếu họ chưa có.
     *
     * @param array $userIds Mảng các ID_NGUOIDUNG
     * @param int $planId ID_KEHOACH
     */
    private function addStudentsToPlanIfNotExists(array $userIds, int $planId)
    {
        // 1. Lấy map [ID_NGUOIDUNG => ID_SINHVIEN]
        $studentMap = Sinhvien::whereIn('ID_NGUOIDUNG', $userIds)
                                ->pluck('ID_SINHVIEN', 'ID_NGUOIDUNG');

        // 2. Lấy các ID_SINHVIEN đã tồn tại trong kế hoạch
        $existingStudentIdsInPlan = SinhvienThamgia::where('ID_KEHOACH', $planId)
                                                ->whereIn('ID_SINHVIEN', $studentMap->values())
                                                ->pluck('ID_SINHVIEN');
                                                
        // 3. Lọc ra các ID_SINHVIEN còn thiếu
        $missingStudentIds = $studentMap->values()->diff($existingStudentIdsInPlan);

        // 4. Thêm các sinh viên còn thiếu
        if ($missingStudentIds->isNotEmpty()) {
            $dataToInsert = $missingStudentIds->map(fn($studentId) => [
                'ID_KEHOACH' => $planId,
                'ID_SINHVIEN' => $studentId,
                'DU_DIEUKIEN' => true, // Mặc định là true khi admin thêm thủ công
                'NGAY_DANGKY' => now(),
            ])->all();

            SinhvienThamgia::insert($dataToInsert);
            
            Log::info("Admin action: Automatically added " . $missingStudentIds->count() . " students to SINHVIEN_THAMGIA for plan $planId.");
        }
    }
}