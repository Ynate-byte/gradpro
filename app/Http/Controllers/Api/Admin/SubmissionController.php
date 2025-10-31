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
     * Lấy danh sách các phiếu nộp
     */
    public function index(Request $request)
    {
        if (!$this->canApproveSubmissions()) {
            return response()->json(['message' => 'Bạn không có quyền truy cập.'], 403);
        }

        try {
            $submissionTable = (new NopSanpham)->getTable(); // 'NOP_SANPHAM'

            // ***** SỬA LỖI 500 (AMBIGUOUS COLUMN) *****
            // Bọc query chính trong một closure `where` để đảm bảo các điều kiện
            // trên bảng `NOP_SANPHAM` không bị xung đột khi `whereHas` thực hiện JOIN.
            
            $query = NopSanpham::query()->where(function ($mainQuery) use ($request, $submissionTable) {
                
                // Lọc theo trạng thái (ĐÃ SỬA: thêm tiền tố bảng)
                if ($request->filled('trangthai') && $request->trangthai !== 'Tất cả') {
                    // Thêm tiền tố bảng $submissionTable để tránh xung đột
                    $mainQuery->where("{$submissionTable}.TRANGTHAI", $request->trangthai);
                }
                
                // Các điều kiện lọc khác trên bảng NOP_SANPHAM có thể thêm vào đây...

            })->with([ // Tải các quan hệ
                'nguoiNop:ID_NGUOIDUNG,HODEM_VA_TEN',
                'phancong.nhom:ID_NHOM,TEN_NHOM',
                'phancong.detai:ID_DETAI,TEN_DETAI'
            ]);

            // Lọc theo kế hoạch (whereHas ở ngoài closure là OK)
            if ($request->filled('plan_id')) {
                $query->whereHas('phancong.nhom', function ($q) use ($request) {
                    $q->where('ID_KEHOACH', $request->plan_id);
                });
            }
            
            // ***** KẾT THÚC SỬA LỖI *****


            // Logic sắp xếp động
            if ($request->filled('sort')) {
                list($sortCol, $sortDir) = explode(',', $request->sort);
                $sortDir = strtolower($sortDir) === 'desc' ? 'desc' : 'asc';
                
                $allowedSorts = ['NGAY_NOP', 'TRANGTHAI'];
                
                if (in_array($sortCol, $allowedSorts)) {
                     // Luôn thêm tiền tố bảng
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
            // Ghi log lỗi chi tiết
            Log::error('Error in SubmissionController@index: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            // Trả về lỗi 500
            return response()->json(['message' => 'Lỗi máy chủ nội bộ. Vui lòng kiểm tra file log Laravel.'], 500);
        }
    }

    /**
     * Lấy chi tiết một phiếu nộp (bao gồm file)
     */
    public function show(NopSanpham $submission)
    {
        if (!$this->canApproveSubmissions()) {
            return response()->json(['message' => 'Bạn không có quyền truy cập.'], 403);
        }

        return $submission->load([
            'files',
            'nguoiNop:ID_NGUOIDUNG,HODEM_VA_TEN,EMAIL',
            'phancong.nhom',
            'phancong.detai'
        ]);
    }

    /**
     * Xác nhận nộp đủ
     */
    public function confirmSubmission(NopSanpham $submission)
    {
        if (!$this->canApproveSubmissions()) {
            return response()->json(['message' => 'Bạn không có quyền duyệt.'], 403);
        }

        if ($submission->TRANGTHAI !== 'Chờ xác nhận') {
            return response()->json(['message' => 'Lần nộp này đã được xử lý trước đó.'], 400);
        }

        DB::transaction(function () use ($submission) {
            // 1. Cập nhật phiếu nộp
            $submission->update([
                'TRANGTHAI' => 'Đã xác nhận',
                'ID_NGUOI_XACNHAN' => Auth::id(),
                'NGAY_XACNHAN' => now(),
                'PHANHOI_ADMIN' => null,
            ]);

            // 2. Cập nhật trạng thái phân công chính của nhóm
            $submission->phancong()->update(['TRANGTHAI' => 'Đã hoàn thành']);
        });

        // TODO: Gửi thông báo cho nhóm

        return response()->json(['message' => 'Đã xác nhận nhóm nộp sản phẩm thành công.']);
    }

    /**
     * Yêu cầu nộp lại
     */
    public function rejectSubmission(Request $request, NopSanpham $submission)
    {
        if (!$this->canApproveSubmissions()) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện việc này.'], 403);
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

        // TODO: Gửi thông báo cho nhóm

        return response()->json(['message' => 'Đã gửi yêu cầu nộp lại cho nhóm.']);
    }
}
