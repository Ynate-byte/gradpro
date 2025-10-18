<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Nguoidung;
use App\Models\Nhom;
use App\Models\ThanhvienNhom;
use App\Models\KehoachKhoaluan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use App\Exports\GroupsExport;
use Maatwebsite\Excel\Facades\Excel;
use App\Services\AutoGroupingService;

class GroupAdminController extends Controller
{
    public function getGroups(Request $request)
    {
        $request->validate(['plan_id' => 'sometimes|nullable|exists:KEHOACH_KHOALUAN,ID_KEHOACH']);

        $query = Nhom::with(['nhomtruong', 'chuyennganh', 'khoabomon', 'thanhviens.nguoidung']);

        if ($request->filled('plan_id')) {
            $query->where('ID_KEHOACH', $request->input('plan_id'));
        }

        if ($request->filled('search')) {
            $query->where('TEN_NHOM', 'like', '%' . $request->search . '%');
        }

        if ($request->filled('is_special')) {
            $query->where('LA_NHOM_DACBIET', $request->boolean('is_special'));
        }

        $groups = $query->orderBy('NGAYTAO', 'desc')->paginate($request->per_page ?? 10);
        return response()->json($groups);
    }

    public function update(Request $request, Nhom $nhom)
    {
        $validated = $request->validate([
            'TEN_NHOM' => ['required', 'string', 'max:100', Rule::unique('NHOM')->ignore($nhom->ID_NHOM, 'ID_NHOM')],
            'MOTA' => 'nullable|string|max:255',
        ]);

        $nhom->update($validated);
        return response()->json($nhom->load('nhomtruong', 'thanhviens'));
    }

    public function destroy(Nhom $nhom)
    {
        DB::transaction(function () use ($nhom) {
            ThanhvienNhom::where('ID_NHOM', $nhom->ID_NHOM)->delete();
            $nhom->delete();
        });
        
        return response()->json(null, 204);
    }
    
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
            Log::error('Failed to get group statistics for plan ' . $plan->ID_KEHOACH . ': ' . $e->getMessage());
            return response()->json(['message' => 'Không thể lấy dữ liệu thống kê.'], 500);
        }
    }

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

    public function removeStudents(Request $request)
    {
        $validated = $request->validate(['studentIds' => 'required|array', 'studentIds.*' => 'exists:NGUOIDUNG,ID_NGUOIDUNG']);
        Nguoidung::whereIn('ID_NGUOIDUNG', $validated['studentIds'])->update(['TRANGTHAI_KICHHOAT' => false]);
        return response()->json(['message' => 'Đã vô hiệu hóa các sinh viên được chọn thành công.']);
    }

    public function markAsSpecial(Request $request, Nhom $nhom)
    {
        $validated = $request->validate(['is_special' => 'required|boolean']);
        $nhom->update(['LA_NHOM_DACBIET' => $validated['is_special']]);
        $message = $validated['is_special'] ? 'Đã đánh dấu nhóm là nhóm đặc biệt.' : 'Đã gỡ đánh dấu nhóm đặc biệt.';
        return response()->json(['message' => $message]);
    }
    
    public function addStudentToGroup(Request $request)
    {
        $validated = $request->validate([
            'ID_NGUOIDUNG' => ['required', 'exists:NGUOIDUNG,ID_NGUOIDUNG', Rule::unique('THANHVIEN_NHOM', 'ID_NGUOIDUNG')],
            'ID_NHOM' => 'required|exists:NHOM,ID_NHOM',
        ]);

        $nhom = Nhom::find($validated['ID_NHOM']);
        if ($nhom->SO_THANHVIEN_HIENTAI >= 5) {
            return response()->json(['message' => 'Nhóm đã đạt số lượng thành viên tối đa.'], 400);
        }

        DB::transaction(function () use ($validated, $nhom) {
            ThanhvienNhom::create($validated);
            $nhom->increment('SO_THANHVIEN_HIENTAI');
        });
        
        return response()->json(['message' => 'Đã thêm sinh viên vào nhóm thành công.']);
    }
    
    public function exportGroups(Request $request)
    {
        $request->validate(['plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH']);
        $plan = KehoachKhoaluan::find($request->plan_id);

        return Excel::download(new GroupsExport($plan->ID_KEHOACH), 'danh-sach-nhom-'.$plan->KHOAHOC.'.xlsx');
    }

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
    
    public function searchUngroupedStudents(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'search' => 'nullable|string|max:100',
        ]);
        $planId = $validated['plan_id'];

        $query = Nguoidung::query()
            ->where('TRANGTHAI_KICHHOAT', true)
            ->whereHas('sinhvien.cacDotThamGia', function ($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            })
            ->whereDoesntHave('thanhvienNhom', function ($q) use ($planId) {
                $q->whereHas('nhom', function ($subQ) use ($planId) {
                    $subQ->where('ID_KEHOACH', $planId);
                });
            });

        if ($request->filled('search')) {
            $searchTerm = $validated['search'];
            $query->where(function ($q) use ($searchTerm) {
                $q->where('HODEM_VA_TEN', 'like', "%{$searchTerm}%")
                  ->orWhere('MA_DINHDANH', 'like', "%{$searchTerm}%")
                  ->orWhere('EMAIL', 'like', "%{$searchTerm}%");
            });
        }

        $students = $query->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'MA_DINHDANH')->take(10)->get();

        return response()->json($students);
    }

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

        $existingMembers = ThanhvienNhom::whereIn('ID_NGUOIDUNG', $validated['member_ids'])->count();
        if ($existingMembers > 0) {
            return response()->json(['message' => 'Một hoặc nhiều sinh viên đã có nhóm. Vui lòng kiểm tra lại.'], 409);
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
        });

        return response()->json($group->load('thanhviens.nguoidung', 'nhomtruong'), 201);
    }
}