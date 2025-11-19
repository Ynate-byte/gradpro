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

class SubmissionController extends Controller
{
    /**
     * Helper: Kiểm tra quyền duyệt bài (Admin, GVu, TKhoa HOẶC là GVHD của nhóm đó)
     */
    private function checkApprovalPermission($submission = null)
    {
        $user = Auth::user();
        
        // 1. Quyền quản trị cấp cao (duyệt tất cả)
        // Các hàm này đã được cập nhật trong Base Controller để check bảng GIANGVIEN_CHUCVU
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
     * Lấy danh sách các phiếu nộp
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
                'nguoiNop:ID_NGUOIDUNG,HODEM_VA_TEN',
                'phancong.nhom:ID_NHOM,TEN_NHOM',
                'phancong.detai:ID_DETAI,TEN_DETAI',
                'phancong.gvhd.nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN' 
            ]);

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

            if ($request->filled('trangthai') && $request->trangthai !== 'Tất cả') {
                $query->where("{$submissionTable}.TRANGTHAI", $request->trangthai);
            }

            if ($request->filled('plan_id')) {
                $query->whereHas('phancong.nhom', function ($q) use ($request) {
                    $q->where('ID_KEHOACH', $request->plan_id);
                });
            }

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
            \Illuminate\Support\Facades\Log::error('Error in SubmissionController@index: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi máy chủ nội bộ.'], 500);
        }
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