<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\NopSanpham;
use App\Models\PhancongDetaiNhom;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Services\ActivityLogger;
use App\Services\NotificationService;

class SubmissionController extends Controller
{
    /**
     * Helper: Kiểm tra quyền duyệt bài (Admin, GVu, TKhoa HOẶC là GVHD của nhóm đó)
     */
    private function checkApprovalPermission($submission = null)
    {
        $user = Auth::user();
        
        // 1. Quyền quản trị cấp cao (duyệt tất cả)
        if ($this->isAdmin() || $this->isGiaoVu() || $this->isTruongKhoa()) {
            return true;
        }

        // 2. Quyền Giảng viên hướng dẫn (chỉ duyệt nhóm mình)
        if ($user->giangvien && $submission) {
            // Lấy thông tin phân công từ phiếu nộp
            $phancong = $submission->phancong; 
            if ($phancong && $phancong->ID_GVHD === $user->giangvien->ID_GIANGVIEN) {
                return true;
            }
        }

        return false;
    }

    /**
     * Lấy danh sách các phiếu nộp (có tìm kiếm & lọc)
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        if (!$user->giangvien && !$this->isAdmin() && !$this->isGiaoVu()) {
            return response()->json(['message' => 'Bạn không có quyền truy cập.'], 403);
        }

        try {
            $submissionTable = (new NopSanpham)->getTable();

            $query = NopSanpham::query()->with([
                'nguoiNop:ID_NGUOIDUNG,HODEM_VA_TEN,MA_DINHDANH', // Lấy thêm MA_DINHDANH để search
                'phancong.nhom:ID_NHOM,TEN_NHOM,ID_KEHOACH',
                'phancong.detai:ID_DETAI,TEN_DETAI',
                'phancong.gvhd.nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN' 
            ]);

            // Phân quyền dữ liệu
            if (!($this->isAdmin() || $this->isGiaoVu() || $this->isTruongKhoa())) {
                if ($user->giangvien) {
                    $gvId = $user->giangvien->ID_GIANGVIEN;
                    $query->whereHas('phancong', function($q) use ($gvId) {
                        $q->where('ID_GVHD', $gvId);
                    });
                } else {
                    return response()->json(['data' => []]);
                }
            }

            // Lọc theo trạng thái
            if ($request->filled('trangthai') && $request->trangthai !== 'Tất cả') {
                $query->where("{$submissionTable}.TRANGTHAI", $request->trangthai);
            }

            // Lọc theo kế hoạch
            if ($request->filled('plan_id')) {
                $query->whereHas('phancong.nhom', function ($q) use ($request) {
                    $q->where('ID_KEHOACH', $request->plan_id);
                });
            }

            // [MỚI] Logic tìm kiếm (Search)
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    // Tìm theo tên đề tài
                    $q->whereHas('phancong.detai', function($subQ) use ($search) {
                        $subQ->where('TEN_DETAI', 'like', '%' . $search . '%');
                    })
                    // Tìm theo tên nhóm
                    ->orWhereHas('phancong.nhom', function($subQ) use ($search) {
                        $subQ->where('TEN_NHOM', 'like', '%' . $search . '%');
                    })
                    // Tìm theo tên hoặc mã sinh viên nộp
                    ->orWhereHas('nguoiNop', function($subQ) use ($search) {
                        $subQ->where('HODEM_VA_TEN', 'like', '%' . $search . '%')
                             ->orWhere('MA_DINHDANH', 'like', '%' . $search . '%');
                    });
                });
            }

            // Sắp xếp
            if ($request->filled('sort')) {
                list($sortCol, $sortDir) = explode(',', $request->sort);
                $sortDir = strtolower($sortDir) === 'desc' ? 'desc' : 'asc';
                $allowedSorts = ['NGAY_NOP', 'TRANGTHAI'];
                
                if (in_array($sortCol, $allowedSorts)) {
                    $query->orderBy("{$submissionTable}.{$sortCol}", $sortDir);
                } else {
                    $query->orderBy("{$submissionTable}.NGAY_NOP", 'asc');
                }
            } else {
                $query->orderBy("{$submissionTable}.NGAY_NOP", 'asc');
            }

            $submissions = $query->paginate($request->per_page ?? 15);
            return response()->json($submissions);

        } catch (\Throwable $e) {
            Log::error('Error in SubmissionController@index: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi máy chủ nội bộ.'], 500);
        }
    }

    /**
     * [MỚI] Lấy thống kê nộp bài (bao gồm số nhóm chưa nộp)
     */
    public function getStatistics(Request $request)
    {
        $planId = $request->plan_id;

        // 1. Tính tổng số nhóm ĐANG THỰC HIỆN đề tài (Đây là những nhóm CẦN nộp bài)
        $assignmentsQuery = PhancongDetaiNhom::query()
            ->where('TRANGTHAI', 'Đang thực hiện'); // Chỉ tính nhóm đang làm, bỏ qua nhóm đã hủy/hoàn thành

        if ($planId && $planId !== 'all') {
            $assignmentsQuery->whereHas('nhom', function($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            });
        }
        
        $totalActiveGroups = $assignmentsQuery->count();

        // 2. Tính số nhóm ĐÃ NỘP (ít nhất 1 lần)
        // Dùng distinct ID_PHANCONG vì một nhóm có thể nộp nhiều lần
        $submittedQuery = NopSanpham::query()
            ->whereIn('TRANGTHAI', ['Chờ xác nhận', 'Đã xác nhận', 'Yêu cầu nộp lại'])
            ->distinct('ID_PHANCONG');

        if ($planId && $planId !== 'all') {
            $submittedQuery->whereHas('phancong.nhom', function($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            });
        }
        
        $submittedGroupsCount = $submittedQuery->count('ID_PHANCONG');

        // 3. Tính số lượng theo từng trạng thái cụ thể
        $baseSubmissionQuery = NopSanpham::query();
        if ($planId && $planId !== 'all') {
            $baseSubmissionQuery->whereHas('phancong.nhom', function($q) use ($planId) {
                $q->where('ID_KEHOACH', $planId);
            });
        }

        $pendingCount = (clone $baseSubmissionQuery)->where('TRANGTHAI', 'Chờ xác nhận')->count();
        $approvedCount = (clone $baseSubmissionQuery)->where('TRANGTHAI', 'Đã xác nhận')->count();
        $rejectedCount = (clone $baseSubmissionQuery)->where('TRANGTHAI', 'Yêu cầu nộp lại')->count();

        return response()->json([
            'not_submitted' => max(0, $totalActiveGroups - $submittedGroupsCount), // Số nhóm chưa nộp
            'pending' => $pendingCount,
            'approved' => $approvedCount,
            'rejected' => $rejectedCount,
            'total_submissions' => $baseSubmissionQuery->count()
        ]);
    }

    /**
     * Lấy chi tiết một phiếu nộp
     */
    public function show(NopSanpham $submission)
    {
        if (!$this->checkApprovalPermission($submission)) {
             return response()->json(['message' => 'Bạn không có quyền xem phiếu nộp này.'], 403);
        }

        return $submission->load([
            'files',
            'nguoiNop:ID_NGUOIDUNG,HODEM_VA_TEN,EMAIL',
            'phancong.nhom',
            'phancong.detai',
            'phancong.gvhd.nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN'
        ]);
    }

    /**
     * Xác nhận nộp đủ
     */
    public function confirmSubmission(NopSanpham $submission)
    {
        if (!$this->checkApprovalPermission($submission)) {
            return response()->json(['message' => 'Bạn không có quyền duyệt phiếu nộp của nhóm này.'], 403);
        }

        if ($submission->TRANGTHAI !== 'Chờ xác nhận') {
            return response()->json(['message' => 'Lần nộp này đã được xử lý trước đó.'], 400);
        }

        DB::transaction(function () use ($submission) {
            $submission->update([
                'TRANGTHAI' => 'Đã xác nhận',
                'ID_NGUOI_XACNHAN' => Auth::id(),
                'NGAY_XACNHAN' => now(),
                'PHANHOI_ADMIN' => null,
            ]);

            $submission->phancong()->update(['TRANGTHAI' => 'Đã hoàn thành']);
        });

        NotificationService::send(
            $submission->ID_NGUOI_NOP,
            "Bài nộp đã được duyệt",
            "GVHD đã xác nhận bài nộp của nhóm bạn.",
            'ACADEMIC',
            '/projects/my-group',
            null,
            'HIGH'
        );

        $submission->load('phancong.nhom');
        ActivityLogger::log(
            'CONFIRM_SUBMISSION', 
            "Đã xác nhận bài nộp", 
            ['submission_id' => $submission->ID_NOP_SANPHAM], 
            $submission->phancong->nhom->ID_NHOM,
            'CheckCircle'
        );

        return response()->json(['message' => 'Đã xác nhận nhóm nộp sản phẩm thành công.']);
    }

    /**
     * Yêu cầu nộp lại
     */
    public function rejectSubmission(Request $request, NopSanpham $submission)
    {
        if (!$this->checkApprovalPermission($submission)) {
            return response()->json(['message' => 'Bạn không có quyền từ chối phiếu nộp của nhóm này.'], 403);
        }

        $validated = $request->validate([
            'ly_do' => 'required|string|min:10|max:1000',
        ], [
            'ly_do.required' => 'Vui lòng nhập lý do yêu cầu nộp lại.',
            'ly_do.min' => 'Lý do phải có ít nhất 10 ký tự.',
        ]);

        if ($submission->TRANGTHAI !== 'Chờ xác nhận') {
            return response()->json(['message' => 'Lần nộp này đã được xử lý trước đó.'], 400);
        }

        $submission->update([
            'TRANGTHAI' => 'Yêu cầu nộp lại',
            'ID_NGUOI_XACNHAN' => Auth::id(),
            'NGAY_XACNHAN' => now(),
            'PHANHOI_ADMIN' => $validated['ly_do'],
        ]);

        NotificationService::send(
            $submission->ID_NGUOI_NOP,
            "Yêu cầu nộp lại sản phẩm",
            "Bài nộp bị từ chối. Lý do: {$request->ly_do}",
            'ACADEMIC',
            '/projects/my-group',
            null,
            'URGENT'
        );

        $submission->load('phancong.nhom');
        ActivityLogger::log(
            'REJECT_SUBMISSION', 
            "Yêu cầu nộp lại bài", 
            ['reason' => $validated['ly_do']], 
            $submission->phancong->nhom->ID_NHOM,
            'AlertCircle'
        );

        return response()->json(['message' => 'Đã gửi yêu cầu nộp lại cho nhóm.']);
    }

    /**
     * Lấy lịch sử nộp bài cho Admin/GV
     */
    public function getSubmissionsForPhancong(Request $request, PhancongDetaiNhom $phancong)
    {
        $dummySubmission = new NopSanpham();
        $dummySubmission->setRelation('phancong', $phancong);

        if (!$this->checkApprovalPermission($dummySubmission)) {
            return response()->json(['message' => 'Bạn không có quyền xem thông tin này.'], 403);
        }

        try {
            $submissions = NopSanpham::where('ID_PHANCONG', $phancong->ID_PHANCONG)
                ->with(['files', 'nguoiNop:ID_NGUOIDUNG,HODEM_VA_TEN', 'nguoiXacNhan:ID_NGUOIDUNG,HODEM_VA_TEN'])
                ->orderBy('NGAY_NOP', 'desc')
                ->get();

            return response()->json($submissions);

        } catch (\Exception $e) {
            Log::error('Error in SubmissionController@getSubmissionsForPhancong: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi máy chủ khi lấy lịch sử nộp bài.'], 500);
        }
    }
}