<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Detai;
use App\Models\Giangvien;
use App\Models\PhancongGvDetai;
use App\Models\Thongbao;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Services\ActivityLogger;
use App\Services\NotificationService;
use App\Models\PhancongNguoiGopY;
use App\Models\Nguoidung;
use Illuminate\Database\Eloquent\Builder;

class TopicAssignmentController extends Controller
{
    /**
     * Get statistics overview for topic assignment
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

            // Get assignment statistics for the plan
            $assignments = PhancongGvDetai::whereNull('ID_DETAI');
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

            $assignments = PhancongGvDetai::whereNull('ID_DETAI');
        }

        // Calculate required topics (1.5 times expected groups)
        $requiredTopics = ceil($expectedGroups * 1.5);

        $assignmentStats = [
            'total_assigned_lecturers' => $assignments->distinct('ID_GIANGVIEN')->count('ID_GIANGVIEN'),
            'total_quota_topics' => $assignments->sum('SO_DETAI_PHANCONG'),
            'active_assignments' => (clone $assignments)->where('TRANGTHAI', 'Đang phân công')->count(),
            'completed_assignments' => (clone $assignments)->where('TRANGTHAI', 'Hoàn thành')->count(),
        ];

        return response()->json([
            'overview' => [
                'total_students' => $totalStudents,
                'total_groups' => $totalGroups,
                'expected_groups' => $expectedGroups,
                'required_topics' => $requiredTopics,
            ],
            'departments' => $departments,
            'assignments' => $assignmentStats,
        ]);
    }

    /**
     * Get lecturers grouped by department with assignment info
     */
    public function getLecturers(Request $request)
    {
        $planId = $request->query('plan_id');

        $departments = KhoaBomon::with(['giangvien.nguoidung'])->get();

        $result = $departments->map(function($dept) use ($planId) {
            $lecturers = $dept->giangvien->map(function($lecturer) use ($planId) {
                // Get current quota assignment
                $quotaAssignment = PhancongGvDetai::where('ID_GIANGVIEN', $lecturer->ID_GIANGVIEN)
                    ->whereNull('ID_DETAI')
                    ->where('TRANGTHAI', 'Đang phân công')
                    ->first();

                // Get actual assigned topics count
                $actualAssigned = PhancongGvDetai::where('ID_GIANGVIEN', $lecturer->ID_GIANGVIEN)
                    ->whereNotNull('ID_DETAI')
                    ->where('TRANGTHAI', 'Đang phân công')
                    ->when($planId, function($q) use ($planId) {
                        $q->whereHas('detai', function($subQ) use ($planId) {
                            $subQ->where('ID_KEHOACH', $planId);
                        });
                    })
                    ->count();

                return [
                    'ID_GIANGVIEN' => $lecturer->ID_GIANGVIEN,
                    'ten_giang_vien' => $lecturer->nguoidung->HODEM_VA_TEN ?? 'N/A',
                    'hoc_vi' => $lecturer->HOCVI,
                    // 'chuc_vu' => $lecturer->CHUCVU, // Cột này đã xóa, có thể load từ chucvus nếu cần hiển thị
                    'so_nhom_toida' => $lecturer->SO_NHOM_TOIDA,
                    'quota_assigned' => $quotaAssignment ? $quotaAssignment->SO_DETAI_PHANCONG : 0,
                    'actual_assigned' => $actualAssigned,
                    'remaining_quota' => ($quotaAssignment ? $quotaAssignment->SO_DETAI_PHANCONG : 0) - $actualAssigned,
                    'chuyen_mon' => $lecturer->CHUYENMON,
                ];
            });

            return [
                'department_id' => $dept->ID_KHOA_BOMON,
                'department_name' => $dept->TEN_KHOA_BOMON,
                'total_lecturers' => $lecturers->count(),
                'lecturers' => $lecturers,
            ];
        });

        return response()->json($result);
    }

    /**
     * Assign topic quota to lecturer
     */
    public function assignTopicQuota(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ID_GIANGVIEN' => 'required|exists:GIANGVIEN,ID_GIANGVIEN',
            'SO_DETAI_PHANCONG' => 'required|integer|min:0|max:50',
            'GHICHU' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();
        
        // [UPDATE] Sử dụng helper isAdmin() thay vì check string
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        DB::transaction(function () use ($request, $currentUser) {
            // Check if lecturer already has quota assigned
            $existingQuota = PhancongGvDetai::where('ID_GIANGVIEN', $request->ID_GIANGVIEN)
                ->whereNull('ID_DETAI')
                ->first();

            if ($existingQuota) {
                if ($request->SO_DETAI_PHANCONG == 0) {
                    // Remove quota if set to 0
                    $existingQuota->delete();
                } else {
                    // Update existing quota
                    $existingQuota->update([
                        'SO_DETAI_PHANCONG' => $request->SO_DETAI_PHANCONG,
                        'GHICHU' => $request->GHICHU,
                        'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    ]);
                }
            } else if ($request->SO_DETAI_PHANCONG > 0) {
                // Create new quota assignment
                PhancongGvDetai::create([
                    'ID_GIANGVIEN' => $request->ID_GIANGVIEN,
                    'SO_DETAI_PHANCONG' => $request->SO_DETAI_PHANCONG,
                    'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    'GHICHU' => $request->GHICHU,
                    'TRANGTHAI' => 'Đang phân công',
                ]);
            }

            $lecturer = \App\Models\Giangvien::find($request->ID_GIANGVIEN);
            if ($lecturer) {
                NotificationService::send(
                    $lecturer->ID_NGUOIDUNG,
                    "Phân công chỉ tiêu hướng dẫn",
                    "Bạn được phân công hướng dẫn tối đa {$request->SO_DETAI_PHANCONG} đề tài.",
                    'ACADEMIC',
                    '/lecturer/quota-management'
                );
            }
        });

        return response()->json(['message' => 'Cập nhật phân công đề tài thành công']);
    }

    /**
     * Auto assign topic quotas to lecturers based on plan
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
        
        // [UPDATE] Sử dụng helper isAdmin()
        if (!$this->isAdmin()) {
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
                    $lecturers = $department->giangvien;
                    if ($lecturers->isEmpty()) continue;

                    // Add remaining topics to first departments
                    $deptTopics = $topicsPerDepartment + ($index < $remainingTopics ? 1 : 0);

                    // Calculate topics per lecturer in this department
                    $topicsPerLecturer = floor($deptTopics / $lecturers->count());
                    $remainingLecturerTopics = $deptTopics % $lecturers->count();

                    foreach ($lecturers as $lecturerIndex => $lecturer) {
                        // Add remaining topics to first lecturers
                        $lecturerTopics = $topicsPerLecturer + ($lecturerIndex < $remainingLecturerTopics ? 1 : 0);

                        $assignments[] = [
                            'lecturer_id' => $lecturer->ID_GIANGVIEN,
                            'quota' => $lecturerTopics,
                        ];
                    }
                }

                // Apply assignments
                foreach ($assignments as $assignment) {
                    // Check if lecturer already has quota
                    $existingQuota = PhancongGvDetai::where('ID_GIANGVIEN', $assignment['lecturer_id'])
                        ->whereNull('ID_DETAI')
                        ->first();

                    if ($existingQuota) {
                        // Update existing quota
                        $existingQuota->update([
                            'SO_DETAI_PHANCONG' => $assignment['quota'],
                            'GHICHU' => 'Tự động phân công theo kế hoạch',
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                        ]);
                    } else {
                        // Create new quota assignment
                        PhancongGvDetai::create([
                            'ID_GIANGVIEN' => $assignment['lecturer_id'],
                            'SO_DETAI_PHANCONG' => $assignment['quota'],
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                            'GHICHU' => 'Tự động phân công theo kế hoạch',
                            'TRANGTHAI' => 'Đang phân công',
                        ]);
                    }
                }
            });

            return response()->json(['message' => 'Tự động phân công đề tài thành công']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function assignTopicToLecturer(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ID_DETAI' => 'required|exists:DETAI,ID_DETAI',
            'ID_GIANGVIEN' => 'required|exists:GIANGVIEN,ID_GIANGVIEN',
            'GHICHU' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();
        
        // [UPDATE] Sử dụng helper isAdmin()
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $topic = Detai::findOrFail($request->ID_DETAI);
        $lecturer = Giangvien::findOrFail($request->ID_GIANGVIEN);

        // 1. Check if lecturer is already the proposer (Self-supervision is typical)
        if ($topic->ID_NGUOI_DEXUAT != $lecturer->ID_GIANGVIEN) {
             // 2. Check current assignments/quota limits (for manual check, may be overridden by admin)
             // Check lecturer's SO_NHOM_TOIDA if needed, but for now, rely on softer checks.
        }

        DB::transaction(function () use ($request, $currentUser, $topic) {
            
            // Check if the topic is already assigned (as a supervisor assignment)
            $existingAssignment = PhancongGvDetai::where('ID_DETAI', $request->ID_DETAI)
                                                ->whereNotNull('ID_DETAI') // Filter out Quota assignments
                                                ->first();

            if ($existingAssignment) {
                // Update existing assignment if it exists (Reassigning the supervisor)
                $existingAssignment->update([
                    'ID_GVHD' => $request->ID_GIANGVIEN,
                    'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    'GHICHU' => $request->GHICHU ?? 'Admin updated supervisor manually',
                    'TRANGTHAI' => 'Đang phân công',
                ]);
            } else {
                // Create new assignment
                PhancongGvDetai::create([
                    'ID_DETAI' => $request->ID_DETAI,
                    'ID_GVHD' => $request->ID_GIANGVIEN,
                    'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    'GHICHU' => $request->GHICHU,
                    'SO_DETAI_PHANCONG' => 1, // Treat as one topic assignment
                    'TRANGTHAI' => 'Đang phân công',
                ]);
            }

            // Ensure the topic status reflects its assignment potential
            if ($topic->TRANGTHAI === 'Nháp') {
                $topic->update(['TRANGTHAI' => 'Chờ duyệt']);
            }
        });

        $lecturer = \App\Models\Giangvien::find($request->ID_GIANGVIEN);
        $topic = \App\Models\Detai::find($request->ID_DETAI);
        
        if ($lecturer && $topic) {
            NotificationService::send(
                $lecturer->ID_NGUOIDUNG,
                "Phân công giám sát đề tài",
                "Bạn được chỉ định làm GVHD cho đề tài: {$topic->TEN_DETAI}",
                'ACADEMIC',
                '/lecturer/thesis-topics'
            );
        }

        return response()->json(['message' => "Đề tài '{$topic->TEN_DETAI}' đã được gán GVHD thành công."]);
    }

    /**
     * Get all topic assignments
     */
    public function getAssignments(Request $request)
    {
        $query = PhancongGvDetai::with([
            'detai.nguoiDexuat.nguoidung',
            'detai.chuyennganh',
            'detai.kehoachKhoaluan',
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
            $query->whereHas('detai', function($q) use ($request) {
                $q->where('ID_KEHOACH', $request->plan_id);
            });
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('TRANGTHAI', $request->status);
        }

        // Search by topic title or lecturer name
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->whereHas('detai', function($subQ) use ($search) {
                    $subQ->where('TEN_DETAI', 'like', '%' . $search . '%');
                })->orWhereHas('giangvien.nguoidung', function($subQ) use ($search) {
                    $subQ->where('HODEM_VA_TEN', 'like', '%' . $search . '%');
                });
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
        
        // [UPDATE] Sử dụng helper isAdmin()
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $assignment = PhancongGvDetai::findOrFail($assignmentId);
        $assignment->update(['TRANGTHAI' => $request->TRANGTHAI]);

        return response()->json(['message' => 'Cập nhật trạng thái thành công']);
    }

    /**
     * Remove assignment
     */
    public function removeAssignment($assignmentId)
    {
        $currentUser = Auth::user();
        
        // [UPDATE] Sử dụng helper isAdmin()
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $assignment = PhancongGvDetai::findOrFail($assignmentId);

        // Check if topic assignment has registered groups
        if ($assignment->ID_DETAI && $assignment->detai->phancongDetaiNhom()->exists()) {
            return response()->json(['message' => 'Không thể hủy phân công vì đề tài đã có nhóm đăng ký'], 409);
        }

        $assignment->delete();

        return response()->json(['message' => 'Hủy phân công thành công']);
    }
}