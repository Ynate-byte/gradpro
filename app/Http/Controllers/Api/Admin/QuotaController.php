<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Detai;
use App\Models\Giangvien;
use App\Models\KhoaBomon;
use App\Models\KehoachKhoaluan;
use App\Models\Nhom;
use App\Models\Thongbao;
use App\Models\QuotaGiangvien;
use App\Models\QuotaKhoaBomon;
use App\Models\SinhvienThamgia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Exception;
use App\Services\NotificationService;

class QuotaController extends Controller
{
    public function getStatistics(Request $request)
    {
        $planId = $request->query('plan_id');

        if ($planId) {
            $totalStudents = SinhvienThamgia::where('ID_KEHOACH', $planId)->count();
            $totalGroups = Nhom::where('ID_KEHOACH', $planId)->count();
            $expectedGroups = ceil($totalStudents / 3);
            
            // Lấy danh sách khoa/bộ môn và thống kê số nhóm thuộc về bộ môn đó
            // (Dựa vào ID_KHOA_BOMON của nhóm)
            $departments = KhoaBomon::with(['giangvien', 'nhoms' => function ($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            }])->get()->map(function ($dept) {
                return [
                    'id' => $dept->ID_KHOA_BOMON,
                    'name' => $dept->TEN_KHOA_BOMON,
                    'total_lecturers' => $dept->giangvien->count(),
                    'total_groups' => $dept->nhoms->count(),
                ];
            });
            $quotas = QuotaGiangvien::where('ID_KEHOACH', $planId);
        } else {
            $totalStudents = SinhvienThamgia::count();
            $totalGroups = Nhom::count();
            $expectedGroups = ceil($totalStudents / 3);
            $departments = KhoaBomon::with(['giangvien', 'nhoms'])->get()->map(function ($dept) {
                return [
                    'id' => $dept->ID_KHOA_BOMON,
                    'name' => $dept->TEN_KHOA_BOMON,
                    'total_lecturers' => $dept->giangvien->count(),
                    'total_groups' => $dept->nhoms->count(),
                ];
            });
            $quotas = QuotaGiangvien::query();
        }

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

    public function getDepartments(Request $request)
    {
        $planId = $request->query('plan_id');

        if (!$planId) {
            return response()->json(['message' => 'Plan ID is required'], 400);
        }

        $departments = KhoaBomon::with(['giangvien'])->get();

        $result = $departments->map(function ($dept) use ($planId) {
            $quota = QuotaKhoaBomon::where('ID_KEHOACH', $planId)
                ->where('ID_KHOA_BOMON', $dept->ID_KHOA_BOMON)
                ->where('TRANGTHAI', 'Đang phân công')
                ->first();

            // [THAY ĐỔI]: Đếm số lượng đề tài đã tạo trực tiếp theo ID_KHOA_BOMON
            $actualCreated = Detai::where('ID_KEHOACH', $planId)
                ->where('ID_KHOA_BOMON', $dept->ID_KHOA_BOMON)
                ->whereIn('TRANGTHAI', ['Đã duyệt', 'Chờ duyệt', 'Nháp'])
                ->count();

            // Thống kê số nhóm thuộc bộ môn này
            $totalGroups = Nhom::where('ID_KEHOACH', $planId)
                ->where('ID_KHOA_BOMON', $dept->ID_KHOA_BOMON)
                ->count();

            // Thống kê số nhóm đã có đề tài thuộc bộ môn này
            // Logic: Nhóm -> Phân công -> Đề tài (check ID_KHOA_BOMON của đề tài)
            $groupsWithTopics = Nhom::where('ID_KEHOACH', $planId)
                ->whereHas('phancongDetaiNhom.detai', function ($q) use ($dept) {
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
        if (!$this->isAdmin() && !$this->isTruongKhoa()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

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
            } elseif ($request->SO_DETAI_QUOTA > 0) {
                QuotaKhoaBomon::create([
                    'ID_KEHOACH' => $request->ID_KEHOACH,
                    'ID_KHOA_BOMON' => $request->ID_KHOA_BOMON,
                    'SO_DETAI_QUOTA' => $request->SO_DETAI_QUOTA,
                    'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    'GHICHU' => $request->GHICHU,
                    'TRANGTHAI' => 'Đang phân công',
                ]);
            }
            
            if ($request->SO_DETAI_QUOTA > 0) {
                $this->sendNotification($request->ID_KHOA_BOMON, $request->ID_KEHOACH, $request->SO_DETAI_QUOTA);
            }
        });

        return response()->json(['message' => 'Cập nhật quota cho khoa/bộ môn thành công']);
    }

    private function sendNotification($departmentId, $planId, $quota)
    {
        try {
            $department = KhoaBomon::find($departmentId);
            // Tìm trưởng bộ môn
            $departmentHeads = Giangvien::where('ID_KHOA_BOMON', $departmentId)
                ->whereHas('chucvus', function ($q) {
                    $q->where('MA_CHUCVU', 'TRUONG_BOMON');
                })
                ->with('nguoidung')
                ->get();

            foreach ($departmentHeads as $head) {
                if ($head->nguoidung) {
                    NotificationService::send(
                        $head->nguoidung->ID_NGUOIDUNG,
                        "Giao chỉ tiêu bộ môn",
                        "Admin đã giao chỉ tiêu {$quota} đề tài cho bộ môn {$department->TEN_KHOA_BOMON}.",
                        'ACADEMIC',
                        '/department-head/quotas',
                        ['plan_id' => $planId],
                        'HIGH'
                    );
                }
            }
        } catch (Exception $e) {
            Log::error('Lỗi khi gửi thông báo phân công quota: ' . $e->getMessage());
        }
    }

    public function autoAssignQuotas(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();
        
        if (!$this->isAdmin() && !$this->isTruongKhoa()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $planId = $request->ID_KEHOACH;

        try {
            DB::transaction(function () use ($planId, $currentUser) {
                $totalStudents = SinhvienThamgia::where('ID_KEHOACH', $planId)->count();
                if ($totalStudents === 0) {
                    throw new \Exception('Không có sinh viên nào tham gia kế hoạch này');
                }

                $expectedGroups = ceil($totalStudents / 3);
                $totalTopics = ceil($expectedGroups * 1.5);
                
                // Lấy các bộ môn có giảng viên
                $departments = KhoaBomon::withCount('giangvien')
                    ->having('giangvien_count', '>', 0)
                    ->get();

                if ($departments->isEmpty()) {
                    throw new \Exception('Không có khoa/bộ môn nào có giảng viên');
                }

                // Chia đều quota
                $topicsPerDepartment = floor($totalTopics / $departments->count());
                $remainingTopics = $totalTopics % $departments->count();

                $assignments = [];
                foreach ($departments as $index => $department) {
                    $deptTopics = $topicsPerDepartment + ($index < $remainingTopics ? 1 : 0);
                    $assignments[] = [
                        'department_id' => $department->ID_KHOA_BOMON,
                        'quota' => $deptTopics,
                    ];
                }

                foreach ($assignments as $assignment) {
                    $existingQuota = QuotaKhoaBomon::where('ID_KEHOACH', $planId)
                        ->where('ID_KHOA_BOMON', $assignment['department_id'])
                        ->first();

                    if ($existingQuota) {
                        $existingQuota->update([
                            'SO_DETAI_QUOTA' => $assignment['quota'],
                            'GHICHU' => 'Tự động phân công theo kế hoạch',
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                        ]);
                    } else {
                        QuotaKhoaBomon::create([
                            'ID_KEHOACH' => $planId,
                            'ID_KHOA_BOMON' => $assignment['department_id'],
                            'SO_DETAI_QUOTA' => $assignment['quota'],
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                            'GHICHU' => 'Tự động phân công theo kế hoạch',
                            'TRANGTHAI' => 'Đang phân công',
                        ]);
                    }

                    $this->sendNotification($assignment['department_id'], $planId, $assignment['quota']);
                }
            });

            return response()->json(['message' => 'Tự động phân công đề tài cho các khoa/bộ môn thành công']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function getAssignments(Request $request)
    {
        $query = QuotaGiangvien::with([
            'kehoach',
            'giangvien.nguoidung',
            'giangvien.khoabomon',
            'nguoiPhancong'
        ]);

        if ($request->has('lecturer_id')) {
            $query->where('ID_GIANGVIEN', $request->lecturer_id);
        }

        if ($request->has('plan_id')) {
            $query->where('ID_KEHOACH', $request->plan_id);
        }

        if ($request->has('status')) {
            $query->where('TRANGTHAI', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('giangvien.nguoidung', function ($subQ) use ($search) {
                $subQ->where('HODEM_VA_TEN', 'like', '%' . $search . '%');
            });
        }

        $assignments = $query->orderBy('NGAY_PHANCONG', 'desc')->paginate(10);
        return response()->json($assignments);
    }

    public function updateAssignmentStatus(Request $request, $assignmentId)
    {
        $validator = Validator::make($request->all(), [
            'TRANGTHAI' => 'required|in:Đang phân công,Hoàn thành,Ngừng phân công',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();

        if (!$this->isAdmin() && !$this->isTruongKhoa()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $assignment = QuotaGiangvien::findOrFail($assignmentId);
        $assignment->update(['TRANGTHAI' => $request->TRANGTHAI]);

        return response()->json(['message' => 'Cập nhật trạng thái thành công']);
    }

    public function removeAssignment($assignmentId)
    {
        $currentUser = Auth::user();

        if (!$this->isAdmin() && !$this->isTruongKhoa()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $assignment = QuotaGiangvien::findOrFail($assignmentId);
        if (!$assignment->canDelete()) {
            return response()->json(['message' => 'Không thể hủy quota vì giảng viên đã tạo đề tài'], 409);
        }

        $assignment->delete();
        return response()->json(['message' => 'Hủy phân công thành công']);
    }
}