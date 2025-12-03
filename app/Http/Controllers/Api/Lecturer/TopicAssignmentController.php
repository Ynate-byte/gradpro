<?php

namespace App\Http\Controllers\Api\Lecturer;

use App\Http\Controllers\Controller;
use App\Models\Detai;
use App\Models\Giangvien;
use App\Models\PhancongGvDetai;
use App\Models\KhoaBomon;
use App\Models\KehoachKhoaluan;
use App\Models\Nhom;
use App\Models\SinhvienThamgia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Services\ActivityLogger;
use App\Services\NotificationService;

class TopicAssignmentController extends Controller
{
    /**
     * Lấy danh sách giảng viên trong cùng bộ môn với thông tin phân công đề tài
     */
    public function getLecturers(Request $request)
    {
        $planId = $request->query('plan_id');

        if (!$planId) {
            return response()->json(['message' => 'Yêu cầu ID kế hoạch'], 400);
        }

        $currentUser = Auth::user();

        // Kiểm tra quyền Trưởng bộ môn
        if (!$currentUser->giangvien || !in_array('TRUONG_BOMON', $this->getUserPositionCodes())) {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        // Lấy bộ môn của giảng viên
        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        $lecturers = Giangvien::where('ID_KHOA_BOMON', $departmentId)
            ->with(['nguoidung'])
            ->with(['phancongGvDetais' => function ($q) use ($planId) {
                 $q->where(function($subQ) use ($planId) {
                     $subQ->whereNull('ID_DETAI')
                          ->where('ID_KEHOACH', $planId); 
                })->orWhere(function($subQ) use ($planId) {
                     $subQ->whereNotNull('ID_DETAI')
                          ->whereHas('detai', function($dq) use ($planId) {
                              $dq->where('ID_KEHOACH', $planId);
                          });
                });
            }])
            ->with(['detai' => function($q) use ($planId) {
                 $q->where('ID_KEHOACH', $planId)
                   ->whereIn('TRANGTHAI', ['Đã duyệt', 'Chờ duyệt']);
            }])
            ->get();

        $result = $lecturers->map(function($lecturer) {
            $quotaAssignment = $lecturer->phancongGvDetais->first(fn($i) => is_null($i->ID_DETAI));
            $actualAssigned = $lecturer->phancongGvDetais->filter(fn($i) => !is_null($i->ID_DETAI))->count();
            $topicsCreated = $lecturer->detai->count();

            $quotaAssigned = $quotaAssignment ? $quotaAssignment->SO_DETAI_PHANCONG : 0;

            return [
                'ID_GIANGVIEN' => $lecturer->ID_GIANGVIEN,
                'TEN_GIANGVIEN' => $lecturer->nguoidung->HODEM_VA_TEN,
                'EMAIL' => $lecturer->nguoidung->EMAIL,
                'HOCVI' => $lecturer->HOCVI,
                'SO_NHOM_TOIDA' => $lecturer->SO_NHOM_TOIDA,
                'quota_assigned' => $quotaAssigned,
                'actual_assigned' => $actualAssigned,
                'topics_created' => $topicsCreated,
                'topics_needed' => max(0, $quotaAssigned - $topicsCreated),
                'remaining_quota' => $quotaAssigned - $actualAssigned,
                'CHUYENMON' => $lecturer->CHUYENMON,
            ];
        });

        return response()->json([
            'department_id' => $departmentId,
            'lecturers' => $result,
        ]);
    }

    /**
     * Phân công quota đề tài cho giảng viên trong cùng bộ môn
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

        if (!$currentUser->giangvien || !in_array('TRUONG_BOMON', $this->getUserPositionCodes())) {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        // Lấy bộ môn của giảng viên hiện tại
        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;

        // Kiểm tra xem giảng viên được gán có thuộc cùng bộ môn không
        $lecturer = Giangvien::findOrFail($request->ID_GIANGVIEN);
        if ($lecturer->ID_KHOA_BOMON !== $departmentId) {
            return response()->json(['message' => 'Giảng viên không thuộc bộ môn của bạn'], 403);
        }

        DB::transaction(function () use ($request, $currentUser) {
            $existingQuota = PhancongGvDetai::where('ID_GIANGVIEN', $request->ID_GIANGVIEN)
                ->whereNull('ID_DETAI')
                ->first();

            if ($existingQuota) {
                if ($request->SO_DETAI_PHANCONG == 0) {
                    $existingQuota->delete();
                } else {
                    $existingQuota->update([
                        'SO_DETAI_PHANCONG' => $request->SO_DETAI_PHANCONG,
                        'GHICHU' => $request->GHICHU,
                        'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    ]);
                }
            } else if ($request->SO_DETAI_PHANCONG > 0) {
                PhancongGvDetai::create([
                    'ID_GIANGVIEN' => $request->ID_GIANGVIEN,
                    'SO_DETAI_PHANCONG' => $request->SO_DETAI_PHANCONG,
                    'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    'GHICHU' => $request->GHICHU,
                    'TRANGTHAI' => 'Đang phân công',
                ]);

                // Gửi thông báo
                $lecturer = Giangvien::find($request->ID_GIANGVIEN);
                if ($lecturer && $lecturer->nguoidung) {
                    NotificationService::send(
                        $lecturer->nguoidung->ID_NGUOIDUNG,
                        "Phân công chỉ tiêu hướng dẫn",
                        "Trưởng bộ môn đã phân công cho bạn hướng dẫn tối đa {$request->SO_DETAI_PHANCONG} đề tài.",
                        'ACADEMIC',
                        '/lecturer/quota-management',
                        null,
                        'HIGH'
                    );
                }
            }
        });

        return response()->json(['message' => 'Cập nhật phân công đề tài cho giảng viên thành công']);
    }

    /**
     * Tự động phân công quota đề tài cho giảng viên trong cùng bộ môn
     */
    public function autoAssignTopicQuotas(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();

        if (!$currentUser->giangvien || !in_array('TRUONG_BOMON', $this->getUserPositionCodes())) {
            return response()->json(['message' => 'Chỉ trưởng bộ môn mới có quyền truy cập chức năng này'], 403);
        }

        $departmentId = $currentUser->giangvien->ID_KHOA_BOMON;
        $planId = $request->ID_KEHOACH;

        try {
            DB::transaction(function () use ($planId, $departmentId, $currentUser) {
                $lecturers = Giangvien::where('ID_KHOA_BOMON', $departmentId)->get();

                if ($lecturers->isEmpty()) {
                    throw new \Exception('Không có giảng viên nào trong bộ môn');
                }

                // Lấy tổng số nhóm trong bộ môn cho kế hoạch này
                $totalGroups = Nhom::where('ID_KEHOACH', $planId)
                    ->where('ID_KHOA_BOMON', $departmentId)
                    ->count();

                if ($totalGroups === 0) {
                    throw new \Exception('Không có nhóm nào trong bộ môn cho kế hoạch này');
                }

                $totalTopics = ceil($totalGroups * 1.5);
                $topicsPerLecturer = floor($totalTopics / $lecturers->count());
                $remainingTopics = $totalTopics % $lecturers->count();

                $assignments = [];
                foreach ($lecturers as $index => $lecturer) {
                    $lecturerTopics = $topicsPerLecturer + ($index < $remainingTopics ? 1 : 0);
                    $assignments[] = [
                        'lecturer_id' => $lecturer->ID_GIANGVIEN,
                        'quota' => $lecturerTopics,
                    ];
                }

                foreach ($assignments as $assignment) {
                    $existingQuota = PhancongGvDetai::where('ID_GIANGVIEN', $assignment['lecturer_id'])
                        ->whereNull('ID_DETAI')
                        ->first();

                    if ($existingQuota) {
                        $existingQuota->update([
                            'SO_DETAI_PHANCONG' => $assignment['quota'],
                            'GHICHU' => 'Tự động phân công từ giảng viên',
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                        ]);
                    } else {
                        PhancongGvDetai::create([
                            'ID_GIANGVIEN' => $assignment['lecturer_id'],
                            'SO_DETAI_PHANCONG' => $assignment['quota'],
                            'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                            'GHICHU' => 'Tự động phân công từ giảng viên',
                            'TRANGTHAI' => 'Đang phân công',
                        ]);
                    }
                }
            });

            return response()->json(['message' => 'Tự động phân công đề tài cho giảng viên thành công']);
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
        
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $topic = Detai::findOrFail($request->ID_DETAI);
        $lecturer = Giangvien::findOrFail($request->ID_GIANGVIEN);

        DB::transaction(function () use ($request, $currentUser, $topic) {
            $existingAssignment = PhancongGvDetai::where('ID_DETAI', $request->ID_DETAI)
                                                ->whereNotNull('ID_DETAI')
                                                ->first();

            if ($existingAssignment) {
                $existingAssignment->update([
                    'ID_GVHD' => $request->ID_GIANGVIEN,
                    'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    'GHICHU' => $request->GHICHU ?? 'Admin updated supervisor manually',
                    'TRANGTHAI' => 'Đang phân công',
                ]);
            } else {
                PhancongGvDetai::create([
                    'ID_DETAI' => $request->ID_DETAI,
                    'ID_GVHD' => $request->ID_GIANGVIEN,
                    'ID_NGUOI_PHANCONG' => $currentUser->ID_NGUOIDUNG,
                    'GHICHU' => $request->GHICHU,
                    'SO_DETAI_PHANCONG' => 1,
                    'TRANGTHAI' => 'Đang phân công',
                ]);
            }

            if ($topic->TRANGTHAI === 'Nháp') {
                $topic->update(['TRANGTHAI' => 'Chờ duyệt']);
            }
        });

        return response()->json(['message' => "Đề tài '{$topic->TEN_DETAI}' đã được gán GVHD thành công."]);
    }

    /**
     * Lấy tất cả các phân công đề tài
     */
    public function getAssignments(Request $request)
    {
        $query = PhancongGvDetai::with([
            'detai.nguoiDexuat.nguoidung',
            'detai.khoaBomon', // [SỬA] Load Bộ môn thay vì Chuyên ngành
            'detai.kehoachKhoaluan',
            'giangvien.nguoidung',
            'giangvien.khoabomon',
            'nguoiPhancong'
        ]);

        if ($request->has('lecturer_id')) {
            $query->where('ID_GIANGVIEN', $request->lecturer_id);
        }

        if ($request->has('plan_id')) {
            $query->whereHas('detai', function($q) use ($request) {
                $q->where('ID_KEHOACH', $request->plan_id);
            });
        }

        if ($request->has('status')) {
            $query->where('TRANGTHAI', $request->status);
        }

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

    public function updateAssignmentStatus(Request $request, $assignmentId)
    {
        $validator = Validator::make($request->all(), [
            'TRANGTHAI' => 'required|in:Đang phân công,Hoàn thành,Ngừng phân công',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $assignment = PhancongGvDetai::findOrFail($assignmentId);
        $assignment->update(['TRANGTHAI' => $request->TRANGTHAI]);

        return response()->json(['message' => 'Cập nhật trạng thái thành công']);
    }

    public function removeAssignment($assignmentId)
    {
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $assignment = PhancongGvDetai::findOrFail($assignmentId);

        if ($assignment->ID_DETAI && $assignment->detai->phancongDetaiNhom()->exists()) {
            return response()->json(['message' => 'Không thể hủy phân công vì đề tài đã có nhóm đăng ký'], 409);
        }

        $assignment->delete();
        return response()->json(['message' => 'Hủy phân công thành công']);
    }
}