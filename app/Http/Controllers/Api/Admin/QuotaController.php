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
use Illuminate\Support\Facades\Log; // Thêm Log facade
use Exception; // Thêm Exception

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
     * [NÂNG CẤP] Tự động phân phối lại quota cho các khoa khác.
     */
    public function assignDepartmentQuota(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'ID_KHOA_BOMON' => 'required|exists:KHOA_BOMON,ID_KHOA_BOMON',
            'SO_DETAI_QUOTA' => 'required|integer|min:0|max:100',
            'GHICHU' => 'nullable|string|max:500',
            'auto_distribute' => 'sometimes|boolean', // Thêm cờ để kiểm soát hành vi
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();
        if ($currentUser->vaitro->TEN_VAITRO !== 'Admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $planId = $request->ID_KEHOACH;
        $pinnedDepartmentId = $request->ID_KHOA_BOMON;
        $pinnedQuota = (int)$request->SO_DETAI_QUOTA;
        $shouldAutoDistribute = $request->boolean('auto_distribute', true); // Mặc định là Tự động phân phối
        
        if (!$shouldAutoDistribute) {
            // Logic cũ: Chỉ cập nhật một khoa
            return $this->updateSingleDepartment($request, $currentUser);
        }

        // Logic mới: "Ghim" (Pin) và "Tự động phân phối lại"
        try {
            DB::transaction(function () use ($planId, $pinnedDepartmentId, $pinnedQuota, $request, $currentUser) {
                // 1. Tính tổng quota cần thiết (lấy từ logic autoAssignQuotas)
                $totalStudents = SinhvienThamgia::where('ID_KEHOACH', $planId)->count();
                if ($totalStudents === 0) {
                    throw new Exception('Không có sinh viên nào tham gia kế hoạch này.');
                }
                $expectedGroups = ceil($totalStudents / 3);
                $totalRequiredTopics = ceil($expectedGroups * 1.5);

                // 2. Kiểm tra xem quota ghim có vượt tổng không
                if ($pinnedQuota > $totalRequiredTopics) {
                    throw new Exception("Số quota ({$pinnedQuota}) vượt quá tổng số đề tài cần thiết ({$totalRequiredTopics}).");
                }

                // 3. Lấy danh sách các khoa/bộ môn khác (có giảng viên)
                $otherDepartments = KhoaBomon::whereHas('giangvien')
                    ->where('ID_KHOA_BOMON', '!=', $pinnedDepartmentId)
                    ->pluck('ID_KHOA_BOMON');
                
                $otherDeptCount = $otherDepartments->count();

                // 4. Tính toán quota còn lại và chia đều
                $remainingQuota = $totalRequiredTopics - $pinnedQuota;
                $quotaPerOtherDept = 0;
                $remainder = 0;

                if ($otherDeptCount > 0 && $remainingQuota > 0) {
                    $quotaPerOtherDept = floor($remainingQuota / $otherDeptCount);
                    $remainder = $remainingQuota % $otherDeptCount;
                } elseif ($remainingQuota < 0) {
                    // Nếu ghim 1 khoa quá cao, các khoa khác sẽ = 0
                    $remainingQuota = 0; 
                }

                // 5. Cập nhật khoa/bộ môn được ghim (PINNED)
                QuotaKhoaBomon::updateOrCreate(
                    [
                        'ID_KEHOACH' => $planId,
                        'ID_KHOA_BOMON' => $pinnedDepartmentId,
                    ],
                    [
                        'SO_DETAI_QUOTA' => $pinnedQuota,
                        'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                        'GHICHU' => $request->GHICHU ?? 'Ghim thủ công & Tự động phân phối lại',
                        'TRANGTHAI' => 'Đang phân công',
                    ]
                );
                $this->sendNotification($pinnedDepartmentId, $planId, $pinnedQuota);

                // 6. Cập nhật các khoa/bộ môn khác
                foreach ($otherDepartments as $index => $deptId) {
                    $deptQuota = $quotaPerOtherDept;
                    if ($remainder > 0) {
                        $deptQuota++;
                        $remainder--;
                    }

                    QuotaKhoaBomon::updateOrCreate(
                        [
                            'ID_KEHOACH' => $planId,
                            'ID_KHOA_BOMON' => $deptId,
                        ],
                        [
                            'SO_DETAI_QUOTA' => $deptQuota,
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                            'GHICHU' => 'Tự động phân phối lại sau khi ghim',
                            'TRANGTHAI' => 'Đang phân công',
                        ]
                    );
                    // (Tùy chọn) Gửi thông báo cho các khoa khác
                    // $this->sendNotification($deptId, $planId, $deptQuota);
                }
            });
        } catch (Exception $e) {
            Log::error('Lỗi khi ghim và phân phối quota: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 400);
        }

        return response()->json(['message' => 'Đã ghim quota và tự động phân phối lại thành công']);
    }

    /**
     * [HELPER] Logic cập nhật một khoa duy nhất (hành vi cũ)
     */
    private function updateSingleDepartment(Request $request, $currentUser)
    {
         DB::transaction(function () use ($request, $currentUser) {
            $existingQuota = QuotaKhoaBomon::where('ID_KEHOACH', $request->ID_KEHOACH)
                ->where('ID_KHOA_BOMON', $request->ID_KHOA_BOMON)
                ->first();

            if ($existingQuota) {
                if ($request->SO_DETAI_QUOTA == 0) {
                    $existingQuota->delete();
                } else {
                    $existingQuota->update([
                        'SO_DETAI_QUOTA' => $request->SO_DETAI_QUOTA,
                        'GHICHU' => $request->GHICHU,
                        'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    ]);
                }
            } else if ($request->SO_DETAI_QUOTA > 0) {
                QuotaKhoaBomon::create([
                    'ID_KEHOACH' => $request->ID_KEHOACH,
                    'ID_KHOA_BOMON' => $request->ID_KHOA_BOMON,
                    'SO_DETAI_QUOTA' => $request->SO_DETAI_QUOTA,
                    'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    'GHICHU' => $request->GHICHU,
                    'TRANGTHAI' => 'Đang phân công',
                ]);

                $this->sendNotification($request->ID_KHOA_BOMON, $request->ID_KEHOACH, $request->SO_DETAI_QUOTA);
            }
        });

        return response()->json(['message' => 'Cập nhật quota (thủ công) cho khoa/bộ môn thành công']);
    }


    /**
     * [HELPER] Gửi thông báo cho Trưởng bộ môn
     */
    private function sendNotification($departmentId, $planId, $quota)
    {
         try {
            $department = KhoaBomon::find($departmentId);
            $departmentHead = Giangvien::where('ID_KHOA_BOMON', $departmentId)
                ->where('CHUCVU', 'Trưởng bộ môn')
                ->first();

            if ($departmentHead && $departmentHead->nguoidung) {
                Notification::create([
                    'user_id' => $departmentHead->nguoidung->ID_NGUOIDUNG,
                    'type' => 'department_quota_assigned',
                    'data' => [
                        'message' => "Bạn đã được phân công {$quota} đề tài cho bộ môn {$department->TEN_KHOA_BOMON}",
                        'department_name' => $department->TEN_KHOA_BOMON,
                        'quota' => $quota,
                        'plan_id' => $planId,
                    ],
                ]);
            }
         } catch (Exception $e) {
             Log::error('Lỗi khi gửi thông báo phân công quota: ' . $e->getMessage());
         }
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
                    // Gửi thông báo
                    $this->sendNotification($assignment['department_id'], $planId, $assignment['quota']);
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