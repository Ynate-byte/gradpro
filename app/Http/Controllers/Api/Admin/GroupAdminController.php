<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Nguoidung;
use App\Models\Nhom;
use App\Models\ThanhvienNhom;
use App\Models\Vaitro;
use App\Models\KehoachKhoaluan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use App\Exports\GroupsExport;
use Maatwebsite\Excel\Facades\Excel;

class GroupAdminController extends Controller
{
    public function getGroups(Request $request)
    {
        $request->validate(['plan_id' => 'sometimes|nullable|exists:KEHOACH_KHOALUAN,ID_KEHOACH']);

        $query = Nhom::with(['nhomtruong', 'chuyennganh', 'khoabomon', 'thanhviens.nguoidung']);

        if ($request->filled('plan_id')) {
            // SỬA LỖI: Sử dụng $request->input() để đảm bảo lấy đúng tham số query
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
            $allStudentIdsInPlan = $plan->sinhvienThamgias()->pluck('ID_SINHVIEN');
            
            $allUserIdsInPlan = DB::table('SINHVIEN')->whereIn('ID_SINHVIEN', $allStudentIdsInPlan)->pluck('ID_NGUOIDUNG');

            $activeStudentsQuery = Nguoidung::whereIn('ID_NGUOIDUNG', $allUserIdsInPlan)
                ->where('TRANGTHAI_KICHHOAT', true);

            $totalStudents = (clone $activeStudentsQuery)->count();
            
            $inactiveStudents = Nguoidung::whereIn('ID_NGUOIDUNG', $allUserIdsInPlan)
                ->whereNull('DANGNHAP_CUOI')
                ->count();
            
            $groupIDsInPlan = $plan->nhoms()->pluck('ID_NHOM');
            $studentsInGroupIds = ThanhvienNhom::whereIn('ID_NHOM', $groupIDsInPlan)->pluck('ID_NGUOIDUNG');

            $studentsWithoutGroup = (clone $activeStudentsQuery)
                ->whereNotIn('ID_NGUOIDUNG', $studentsInGroupIds)
                ->count();

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

    public function autoGroupStudents(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'desiredMembers' => 'required|integer|min:2|max:5',
            'priority' => 'required|in:chuyennganh,lop',
        ]);
        
        $plan = KehoachKhoaluan::find($validated['plan_id']);
        $desiredMembers = $validated['desiredMembers'];
        $priority = $validated['priority'];
    
        return DB::transaction(function () use ($desiredMembers, $priority, $plan) {
            $allStudentIdsInPlan = $plan->sinhvienThamgias()->pluck('ID_SINHVIEN');
            $allUserIdsInPlan = DB::table('SINHVIEN')->whereIn('ID_SINHVIEN', $allStudentIdsInPlan)->pluck('ID_NGUOIDUNG');
            $groupIDsInPlan = $plan->nhoms()->pluck('ID_NHOM');
            $studentsInGroupIds = ThanhvienNhom::whereIn('ID_NHOM', $groupIDsInPlan)->pluck('ID_NGUOIDUNG');

            $ungroupedStudents = Nguoidung::whereIn('ID_NGUOIDUNG', $allUserIdsInPlan)
                ->where('TRANGTHAI_KICHHOAT', true)
                ->whereNotIn('ID_NGUOIDUNG', $studentsInGroupIds)
                ->with('sinhvien.chuyennganh')
                ->get()
                ->shuffle();
    
            $notFullGroups = $plan->nhoms()
                ->where('SO_THANHVIEN_HIENTAI', '<', $desiredMembers)
                ->where('LA_NHOM_DACBIET', false)
                ->get();
            
            $membersAddedCount = 0;
            $newGroupsCount = 0;
    
            foreach ($notFullGroups as $group) {
                if ($ungroupedStudents->isEmpty()) break;
    
                $spaceLeft = $desiredMembers - $group->SO_THANHVIEN_HIENTAI;
                $studentsToFill = $ungroupedStudents->filter(function ($student) use ($group, $priority) {
                    if ($priority === 'chuyennganh' && $group->ID_CHUYENNGANH) {
                        return $student->sinhvien?->ID_CHUYENNGANH === $group->ID_CHUYENNGANH;
                    }
                    return true;
                })->take($spaceLeft);
                
                if ($studentsToFill->isNotEmpty()) {
                    $studentIds = $studentsToFill->pluck('ID_NGUOIDUNG');
                    foreach($studentIds as $id) {
                         ThanhvienNhom::create(['ID_NHOM' => $group->ID_NHOM, 'ID_NGUOIDUNG' => $id]);
                    }
                    $group->increment('SO_THANHVIEN_HIENTAI', $studentsToFill->count());
                    $membersAddedCount += $studentsToFill->count();
                    $ungroupedStudents = $ungroupedStudents->reject(fn($s) => $studentIds->contains($s->ID_NGUOIDUNG));
                }
            }
    
            $studentsGroupedByPriority = $ungroupedStudents->groupBy(function ($student) use ($priority) {
                if ($priority === 'chuyennganh') {
                    return $student->sinhvien?->ID_CHUYENNGANH ?? 'no_major';
                }
                return 'no_priority';
            });
            
            foreach($studentsGroupedByPriority as $priorityId => $priorityGroup) {
                if ($priorityId === 'no_major' || $priorityId === 'no_priority') continue;

                foreach($priorityGroup->chunk($desiredMembers) as $chunk) {
                    if ($chunk->count() < 2) continue;
    
                    $leader = $chunk->first();
                    $majorCode = $leader->sinhvien?->chuyennganh?->MA_CHUYENNGANH ?? 'N/A';

                    $newGroup = Nhom::create([
                        'ID_KEHOACH' => $plan->ID_KEHOACH,
                        'TEN_NHOM' => "Nhóm tự động - {$majorCode} - " . substr(uniqid(), -4),
                        'ID_NHOMTRUONG' => $leader->ID_NGUOIDUNG,
                        'ID_CHUYENNGANH' => $leader->sinhvien?->ID_CHUYENNGANH,
                        'SO_THANHVIEN_HIENTAI' => $chunk->count(),
                    ]);
                    $newGroupsCount++;
    
                    $studentIdsForNewGroup = $chunk->pluck('ID_NGUOIDUNG');
                    $membersToInsert = $studentIdsForNewGroup->map(fn($id) => [
                        'ID_NHOM' => $newGroup->ID_NHOM,
                        'ID_NGUOIDUNG' => $id,
                        'NGAY_VAONHOM' => now(),
                    ])->all();
                    ThanhvienNhom::insert($membersToInsert);
                    
                    $membersAddedCount += $chunk->count();
                    $ungroupedStudents = $ungroupedStudents->reject(fn($s) => $studentIdsForNewGroup->contains($s->ID_NGUOIDUNG));
                }
            }
            
            return response()->json([
                'message' => 'Quá trình ghép nhóm tự động đã hoàn tất.',
                'newGroupsCreated' => $newGroupsCount,
                'membersAdded' => $membersAddedCount,
                'leftoverStudents' => $ungroupedStudents->values()->all(),
            ]);
        });
    }
}