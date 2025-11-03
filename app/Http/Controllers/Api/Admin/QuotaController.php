<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Detai;
use App\Models\Giangvien;
use App\Models\KhoaBomon;
use App\Models\KehoachKhoaluan;
use App\Models\Nhom;
use App\Models\QuotaGiangvien;
use App\Models\QuotaKhoaBomon;
use App\Models\SinhvienThamgia;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Gate;

class QuotaController extends Controller
{
    /**
     * Get statistics overview for quota assignment
     */

    public function getStatistics(Request $request)
    {
        $planId = $request->query('plan_id');

        if ($planId) {
            // Get total students participating in the plan
            $totalStudents = SinhvienThamgia::where('ID_KEHOACH', $planId)->count();

            // Get total groups in the plan
            $totalGroups = Nhom::where('ID_KEHOACH', $planId)->count();

            // Calculate expected groups (total students / 3)
            $expectedGroups = ceil($totalStudents / 3);

            // Get department statistics
            $departments = KhoaBomon::with(['giangvien', 'nhoms' => function($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            }])->get()->map(function($dept) {
                return [
                    'id' => $dept->ID_KHOA_BOMON,
                    'name' => $dept->TEN_KHOA_BOMON,
                    'total_lecturers' => $dept->giangvien->count(),
                    'total_groups' => $dept->nhoms->count(),
                ];
            });

            // Get quota statistics for the plan
            $quotas = QuotaGiangvien::where('ID_KEHOACH', $planId);
        } else {
            // Overall statistics
            $totalStudents = SinhvienThamgia::count();
            $totalGroups = Nhom::count();
            // Calculate expected groups (total students / 3)
            $expectedGroups = ceil($totalStudents / 3);

            $departments = KhoaBomon::with(['giangvien', 'nhoms'])->get()->map(function($dept) {
                return [
                    'id' => $dept->ID_KHOA_BOMON,
                    'name' => $dept->TEN_KHOA_BOMON,
                    'total_lecturers' => $dept->giangvien->count(),
                    'total_groups' => $dept->nhoms->count(),
                ];
            });

            $quotas = QuotaGiangvien::query();
        }

        // Calculate required topics (1.5 times expected groups)
        $requiredTopics = ceil($expectedGroups * 1.5);

        $quotaStats = [
            'total_assigned_lecturers' => $quotas->distinct('ID_GIANGVIEN')->count('ID_GIANGVIEN'),
            'total_quota_topics' => $quotas->sum('SO_DETAI_QUOTA'),
            'active_quotas' => (clone $quotas)->where('TRANGTHAI', 'Đang phân công')->count(),
            'completed_quotas' => (clone $quotas)->where('TRANGTHAI', 'Hoàn thành')->count(),
        ];

        return response()->json([
            'overview' => [
                'total_students' => $totalStudents,
                'total_groups' => $totalGroups,
                'expected_groups' => $expectedGroups,
                'required_topics' => $requiredTopics,
            ],
            'departments' => $departments,
            'quotas' => $quotaStats,
        ]);
    }

    /**
     * Get departments with quota info
     */
    public function getDepartments(Request $request)
    {
        $planId = $request->query('plan_id');

        if (!$planId) {
            return response()->json(['message' => 'Plan ID is required'], 400);
        }

        $departments = KhoaBomon::with(['giangvien'])->get();

        $result = $departments->map(function($dept) use ($planId) {
            // Get current department quota assignment
            $quota = QuotaKhoaBomon::where('ID_KEHOACH', $planId)
                ->where('ID_KHOA_BOMON', $dept->ID_KHOA_BOMON)
                ->where('TRANGTHAI', 'Đang phân công')
                ->first();

            // Get actual topics created by lecturers in this department for this plan
            $actualCreated = Detai::where('ID_KEHOACH', $planId)
                ->whereHas('nguoiDexuat', function($q) use ($dept) {
                    $q->where('ID_KHOA_BOMON', $dept->ID_KHOA_BOMON);
                })
                ->whereIn('TRANGTHAI', ['Đã duyệt', 'Chờ duyệt', 'Nháp'])
                ->count();

            // Get number of groups in this department for this plan
            $totalGroups = Nhom::where('ID_KEHOACH', $planId)
                ->where('ID_KHOA_BOMON', $dept->ID_KHOA_BOMON)
                ->count();

            // Get number of groups that have registered for topics created by lecturers in this department
            $groupsWithTopics = Nhom::where('ID_KEHOACH', $planId)
                ->where('ID_KHOA_BOMON', $dept->ID_KHOA_BOMON)
                ->whereHas('phancongDetaiNhom.detai.nguoiDexuat', function($q) use ($dept) {
                    $q->where('ID_KHOA_BOMON', $dept->ID_KHOA_BOMON);
                })
                ->count();

            return [
                'ID_KHOA_BOMON' => $dept->ID_KHOA_BOMON,
                'TEN_KHOA_BOMON' => $dept->TEN_KHOA_BOMON,
                'total_lecturers' => $dept->giangvien->count(),
                'total_groups' => $totalGroups,
                'groups_registered' => $groupsWithTopics,
                'quota_assigned' => $quota ? $quota->SO_DETAI_QUOTA : 0,
                'actual_created' => $actualCreated,
            ];
        });

        return response()->json($result);
    }

    /**
     * Assign topic quota to department for a specific plan
     */
    public function assignDepartmentQuota(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'ID_KHOA_BOMON' => 'required|exists:KHOA_BOMON,ID_KHOA_BOMON',
            'SO_DETAI_QUOTA' => 'required|integer|min:0|max:100',
            'GHICHU' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();
        if ($currentUser->vaitro->TEN_VAITRO !== 'Admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        DB::transaction(function () use ($request, $currentUser) {
            // Check if department already has quota for this plan
            $existingQuota = QuotaKhoaBomon::where('ID_KEHOACH', $request->ID_KEHOACH)
                ->where('ID_KHOA_BOMON', $request->ID_KHOA_BOMON)
                ->first();

            if ($existingQuota) {
                if ($request->SO_DETAI_QUOTA == 0) {
                    // Remove quota if set to 0
                    $existingQuota->delete();
                } else {
                    // Update existing quota
                    $existingQuota->update([
                        'SO_DETAI_QUOTA' => $request->SO_DETAI_QUOTA,
                        'GHICHU' => $request->GHICHU,
                        'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    ]);
                }
            } else if ($request->SO_DETAI_QUOTA > 0) {
                // Create new quota assignment
                QuotaKhoaBomon::create([
                    'ID_KEHOACH' => $request->ID_KEHOACH,
                    'ID_KHOA_BOMON' => $request->ID_KHOA_BOMON,
                    'SO_DETAI_QUOTA' => $request->SO_DETAI_QUOTA,
                    'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    'GHICHU' => $request->GHICHU,
                    'TRANGTHAI' => 'Đang phân công',
                ]);

                // Send notification to department head
                $department = KhoaBomon::find($request->ID_KHOA_BOMON);
                $departmentHead = Giangvien::where('ID_KHOA_BOMON', $request->ID_KHOA_BOMON)
                    ->where('CHUCVU', 'Trưởng bộ môn')
                    ->first();

                if ($departmentHead && $departmentHead->nguoidung) {
                    Notification::create([
                        'user_id' => $departmentHead->nguoidung->ID_NGUOIDUNG,
                        'type' => 'department_quota_assigned',
                        'data' => [
                            'message' => "Bạn đã được phân công {$request->SO_DETAI_QUOTA} đề tài cho bộ môn {$department->TEN_KHOA_BOMON}",
                            'department_name' => $department->TEN_KHOA_BOMON,
                            'quota' => $request->SO_DETAI_QUOTA,
                            'plan_id' => $request->ID_KEHOACH,
                        ],
                    ]);
                }
            }
        });

        return response()->json(['message' => 'Cập nhật quota đề tài cho khoa/bộ môn thành công']);
    }

    /**
     * Auto assign topic quotas to departments based on plan
     */
    public function autoAssignQuotas(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();
        if ($currentUser->vaitro->TEN_VAITRO !== 'Admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $planId = $request->ID_KEHOACH;

        try {
            DB::transaction(function () use ($planId, $currentUser) {
                // Get total students in the plan
                $totalStudents = SinhvienThamgia::where('ID_KEHOACH', $planId)->count();

                if ($totalStudents === 0) {
                    throw new \Exception('Không có sinh viên nào tham gia kế hoạch này');
                }

                // Calculate expected groups (total students / 3)
                $expectedGroups = ceil($totalStudents / 3);

                // Calculate total topics needed (1.5 times expected groups)
                $totalTopics = ceil($expectedGroups * 1.5);

                // Get all departments with lecturers
                $departments = KhoaBomon::with(['giangvien'])->whereHas('giangvien')->get();

                if ($departments->isEmpty()) {
                    throw new \Exception('Không có khoa/bộ môn nào có giảng viên');
                }

                // Calculate topics per department (equal distribution)
                $topicsPerDepartment = floor($totalTopics / $departments->count());
                $remainingTopics = $totalTopics % $departments->count();

                $assignments = [];

                foreach ($departments as $index => $department) {
                    // Add remaining topics to first departments
                    $deptTopics = $topicsPerDepartment + ($index < $remainingTopics ? 1 : 0);

                    $assignments[] = [
                        'department_id' => $department->ID_KHOA_BOMON,
                        'quota' => $deptTopics,
                    ];
                }

                // Apply assignments to departments
                foreach ($assignments as $assignment) {
                    // Check if department already has quota for this plan
                    $existingQuota = QuotaKhoaBomon::where('ID_KEHOACH', $planId)
                        ->where('ID_KHOA_BOMON', $assignment['department_id'])
                        ->first();

                    if ($existingQuota) {
                        // Update existing quota
                        $existingQuota->update([
                            'SO_DETAI_QUOTA' => $assignment['quota'],
                            'GHICHU' => 'Tự động phân công theo kế hoạch',
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                        ]);
                    } else {
                        // Create new quota assignment
                        QuotaKhoaBomon::create([
                            'ID_KEHOACH' => $planId,
                            'ID_KHOA_BOMON' => $assignment['department_id'],
                            'SO_DETAI_QUOTA' => $assignment['quota'],
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                            'GHICHU' => 'Tự động phân công theo kế hoạch',
                            'TRANGTHAI' => 'Đang phân công',
                        ]);
                    }
                }
            });

            return response()->json(['message' => 'Tự động phân công đề tài cho các khoa/bộ môn thành công']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Get all quota assignments
     */
    public function getAssignments(Request $request)
    {
        $query = QuotaGiangvien::with([
            'kehoach',
            'giangvien.nguoidung',
            'giangvien.khoabomon',
            'nguoiPhancong'
        ]);

        // Filter by lecturer
        if ($request->has('lecturer_id')) {
            $query->where('ID_GIANGVIEN', $request->lecturer_id);
        }

        // Filter by plan
        if ($request->has('plan_id')) {
            $query->where('ID_KEHOACH', $request->plan_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('TRANGTHAI', $request->status);
        }

        // Search by lecturer name
        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('giangvien.nguoidung', function($subQ) use ($search) {
                $subQ->where('HODEM_VA_TEN', 'like', '%' . $search . '%');
            });
        }

        $assignments = $query->orderBy('NGAY_PHANCONG', 'desc')->paginate(10);

        return response()->json($assignments);
    }

    /**
     * Update assignment status
     */
    public function updateAssignmentStatus(Request $request, $assignmentId)
    {
        $validator = Validator::make($request->all(), [
            'TRANGTHAI' => 'required|in:Đang phân công,Hoàn thành,Ngừng phân công',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();
        if ($currentUser->vaitro->TEN_VAITRO !== 'Admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $assignment = QuotaGiangvien::findOrFail($assignmentId);
        $assignment->update(['TRANGTHAI' => $request->TRANGTHAI]);

        return response()->json(['message' => 'Cập nhật trạng thái thành công']);
    }

    /**
     * Remove assignment
     */
    public function removeAssignment($assignmentId)
    {
        $currentUser = Auth::user();
        if ($currentUser->vaitro->TEN_VAITRO !== 'Admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $assignment = QuotaGiangvien::findOrFail($assignmentId);

        // Check if lecturer has created topics under this quota
        if (!$assignment->canDelete()) {
            return response()->json(['message' => 'Không thể hủy quota vì giảng viên đã tạo đề tài'], 409);
        }

        $assignment->delete();

        return response()->json(['message' => 'Hủy phân công thành công']);
    }
}
