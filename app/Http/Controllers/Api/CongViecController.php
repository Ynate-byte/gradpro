<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CongViec;
use App\Models\CotCongViec;
use App\Models\Nhom;
use App\Models\Nguoidung;
use App\Models\DanhSachKiemTraCongViec;
use App\Models\BinhLuanCongViec;
use App\Models\PhanCongCongViec;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;

class CongViecController extends Controller
{
    // --- HÀM HELPER PHÂN QUYỀN ---

    private function getAuthInfo(Nhom $nhom)
    {
        $user = Auth::user();
        $isMember = $user->thanhvienNhom()->where('ID_NHOM', $nhom->ID_NHOM)->exists();
        $isLeader = $nhom->ID_NHOMTRUONG === $user->ID_NGUOIDUNG;
        $isGvhd = $user->giangvien && $nhom->phancongDetaiNhom?->ID_GVHD === $user->giangvien->ID_GIANGVIEN;
        $isAdmin = $this->isAdmin() || $this->isGiaoVu() || $this->isTruongKhoa();

        $canView = $isMember || $isGvhd || $isAdmin;
        $canManage = $isGvhd || $isLeader || $isAdmin;

        return compact('user', 'isMember', 'isLeader', 'isGvhd', 'isAdmin', 'canView', 'canManage');
    }

    private function checkTaskEditPermission(CongViec $congviec, Nguoidung $user, bool $canManage)
    {
        if ($canManage) return true;
        return $congviec->ID_NGUOITAO === $user->ID_NGUOIDUNG;
    }

    // --- CÁC HÀM API CHÍNH ---

    public function getTaskStats(Nhom $nhom)
    {
        try {
            $auth = $this->getAuthInfo($nhom);
            if (!$auth['canView']) {
                return response()->json(['message' => 'Không có quyền truy cập.'], 403);
            }

            $tasksCount = $nhom->congViecs()
                            ->whereNotIn('TRANGTHAI', ['Đã hủy'])
                            ->whereHas('cot', function ($query) { 
                                $query->where('TEN_COT', '!=', 'Hoàn thành');
                            })
                            ->count();
            
            return response()->json([
                'tasks_ton_dong' => $tasksCount,
            ]);
        } catch (\Exception $e) {
            Log::error("Lỗi getTaskStats cho Nhom ID {$nhom->ID_NHOM}: " . $e->getMessage());
            return response()->json(['message' => 'Lỗi máy chủ khi lấy thống kê công việc.'], 500);
        }
    }

    public function getBoardData(Nhom $nhom, Request $request) 
    {
        $auth = $this->getAuthInfo($nhom);
        // Sử dụng canView vì cả GVHD và thành viên đều có thể xem Kanban
        if (!$auth['canView']) {
            return response()->json(['message' => 'Không có quyền truy cập.'], 403);
        }

        // 1. Lấy tham số lọc ngày từ request
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        // Lấy danh sách các cột
        $columns = CotCongViec::orderBy('THUTU_HIENTHI', 'asc')->get();

        // Khởi tạo query lấy các công việc của nhóm
        $tasksQuery = $nhom->congViecs()
            ->whereNotIn('TRANGTHAI', ['Đã hủy']) // Chỉ hiển thị các task chưa bị hủy
            ->with([
                'nguoiTao:ID_NGUOIDUNG,HODEM_VA_TEN',
                'nguoiDuocPhanCong:ID_NGUOIDUNG,HODEM_VA_TEN',
                'checklistItems',
            ])
            ->withCount('allComments')
            ->orderBy('THUTU_HIENTHI', 'asc');

        // 2. Áp dụng bộ lọc tuần nếu có tham số ngày
        if ($startDate && $endDate) {
            // [ĐÃ SỬA] Bao gồm cả các task có deadline trong tuần VÀ task không có deadline (NULL)
            $tasksQuery->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('NGAY_HETHAN', [
                    $startDate . ' 00:00:00',
                    $endDate . ' 23:59:59'
                ])
                // THÊM: Hoặc những công việc không có thời gian cụ thể (deadline IS NULL)
                ->orWhereNull('NGAY_HETHAN');
            });
        }
        
        $tasks = $tasksQuery->get();
        
        // Đảm bảo count comments được thêm vào task object
        $tasks->each(function ($task) {
            $task->binh_luans_count = $task->all_comments_count;
        });

        // Lấy danh sách thành viên (cho dropdown gán việc)
        $members = $nhom->thanhviens()->with('nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN,MA_DINHDANH')->get();

        return response()->json([
            'columns' => $columns,
            'tasks' => $tasks->groupBy('ID_COT'),
            'members' => $members,
        ]);
    }

    public function createTask(Request $request, Nhom $nhom)
    {
        $auth = $this->getAuthInfo($nhom);
        if (!$auth['canView']) { 
            return response()->json(['message' => 'Không có quyền tạo công việc.'], 403);
        }

        $validated = $request->validate([
            'TEN_CONGVIEC' => 'required|string|max:255',
            'ID_COT' => 'required|exists:COT_CONGVIEC,ID_COT',
            'MOTA' => 'nullable|string',
            'NGAY_HETHAN' => 'nullable|date|after_or_equal:today',
            'DO_UUTIEN' => ['nullable', Rule::in(['Thấp', 'Trung bình', 'Cao'])],
            'assignee_ids' => 'nullable|array', 
            'assignee_ids.*' => 'integer|exists:NGUOIDUNG,ID_NGUOIDUNG',
        ]);

        $task = null;
        DB::transaction(function () use ($nhom, $auth, $validated, &$task) {
            $task = $nhom->congViecs()->create([
                'ID_COT' => $validated['ID_COT'],
                'ID_NGUOITAO' => $auth['user']->ID_NGUOIDUNG,
                'TEN_CONGVIEC' => $validated['TEN_CONGVIEC'],
                'MOTA' => $validated['MOTA'] ?? null,
                'NGAY_HETHAN' => $validated['NGAY_HETHAN'] ?? null,
                'DO_UUTIEN' => $validated['DO_UUTIEN'] ?? 'Trung bình',
                'TRANGTHAI' => 'Hoạt động',
            ]);

            if (!empty($validated['assignee_ids'])) {
                $task->nguoiDuocPhanCong()->sync($validated['assignee_ids']);
            }
        });

        $task->load([
            'nguoiTao:ID_NGUOIDUNG,HODEM_VA_TEN',
            'nguoiDuocPhanCong:ID_NGUOIDUNG,HODEM_VA_TEN',
            'checklistItems',
        ])->loadCount('allComments');

        $task->binh_luans_count = $task->all_comments_count;

        return response()->json($task, 201);
    }

    public function updateTask(Request $request, CongViec $congviec)
    {
        $auth = $this->getAuthInfo($congviec->nhom);
        if (!$this->checkTaskEditPermission($congviec, $auth['user'], $auth['canManage'])) {
            return response()->json(['message' => 'Bạn không có quyền sửa công việc này.'], 403);
        }

        $validated = $request->validate([
            'TEN_CONGVIEC' => 'sometimes|required|string|max:255',
            'MOTA' => 'nullable|string',
            'NGAY_HETHAN' => 'nullable|date',
            'DO_UUTIEN' => ['nullable', Rule::in(['Thấp', 'Trung bình', 'Cao'])],
            'TRANGTHAI' => ['sometimes', Rule::in(['Hoạt động', 'Đã hủy', 'Tạm dừng'])],
        ]);

        $congviec->update($validated);
        
        return response()->json($congviec);
    }

    public function deleteTask(CongViec $congviec)
    {
        $auth = $this->getAuthInfo($congviec->nhom);
        if (!$this->checkTaskEditPermission($congviec, $auth['user'], $auth['canManage'])) {
            return response()->json(['message' => 'Bạn không có quyền xóa công việc này.'], 403);
        }

        $congviec->delete();
        return response()->json(null, 204);
    }

    public function moveTask(Request $request, CongViec $congviec)
    {
        $auth = $this->getAuthInfo($congviec->nhom);
        $isAssigned = $congviec->nguoiDuocPhanCong()->where('NGUOIDUNG.ID_NGUOIDUNG', $auth['user']->ID_NGUOIDUNG)->exists();

        if (!$auth['canManage'] && !$isAssigned) {
            return response()->json(['message' => 'Bạn không có quyền di chuyển công việc này.'], 403);
        }

        $validated = $request->validate([
            'ID_COT_MOI' => 'required|integer|exists:COT_CONGVIEC,ID_COT',
            'THUTU_MOI' => 'required|integer|min:0',
            'sibling_task_ids' => 'nullable|array', 
        ]);

        DB::transaction(function () use ($congviec, $validated) {
            $congviec->ID_COT = $validated['ID_COT_MOI'];
            $congviec->THUTU_HIENTHI = $validated['THUTU_MOI'];

            $cotMoi = CotCongViec::find($validated['ID_COT_MOI']);
            if ($cotMoi && $cotMoi->TEN_COT === 'Hoàn thành') {
                $congviec->NGAY_HOANTHANH = now();
            } else {
                $congviec->NGAY_HOANTHANH = null;
            }
            $congviec->save();

            if (!empty($validated['sibling_task_ids'])) {
                foreach ($validated['sibling_task_ids'] as $index => $taskId) {
                    CongViec::where('ID_CONGVIEC', $taskId)
                            ->where('ID_COT', $validated['ID_COT_MOI'])
                            ->update(['THUTU_HIENTHI' => $validated['THUTU_MOI'] + 1 + $index]);
                }
            }
        });

        return response()->json(['message' => 'Cập nhật vị trí thành công.']);
    }

    public function assignTask(Request $request, CongViec $congviec)
    {
        $auth = $this->getAuthInfo($congviec->nhom);
        if (!$auth['canManage']) {
            return response()->json(['message' => 'Chỉ Nhóm trưởng hoặc GVHD mới có quyền gán việc.'], 403);
        }

        // ===== [SỬA LỖI TẠI ĐÂY] =====
        // Thay 'required' bằng 'present' để cho phép gửi mảng rỗng [] (khi gỡ hết assign)
        $validated = $request->validate([
            'user_ids' => 'present|array', 
            'user_ids.*' => 'integer|exists:NGUOIDUNG,ID_NGUOIDUNG',
        ]);
        // ============================
        
        $congviec->nguoiDuocPhanCong()->sync($validated['user_ids']);

        return response()->json($congviec->load('nguoiDuocPhanCong:ID_NGUOIDUNG,HODEM_VA_TEN'));
    }

    public function getTaskDetails(CongViec $congviec)
    {
        $auth = $this->getAuthInfo($congviec->nhom);
        if (!$auth['canView']) {
            return response()->json(['message' => 'Không có quyền truy cập.'], 403);
        }

        try {
            $congviec->load([
                'nguoiTao:ID_NGUOIDUNG,HODEM_VA_TEN',
                'nguoiDuocPhanCong:ID_NGUOIDUNG,HODEM_VA_TEN',
                'checklistItems' => fn($q) => $q->orderBy('THUTU_HIENTHI'),
                'binhLuans' => fn($q) => $q->with([
                        'nguoiBinhLuan:ID_NGUOIDUNG,HODEM_VA_TEN',
                        'replies' => fn($q2) => $q2->with('nguoiBinhLuan:ID_NGUOIDUNG,HODEM_VA_TEN')->orderBy('NGAYTAO', 'asc'),
                    ])->orderBy('NGAYTAO', 'asc'),
            ]);
    
            return response()->json($congviec);

        } catch (\Exception $e) {
            Log::error("Lỗi getTaskDetails cho CongViec ID {$congviec->ID_CONGVIEC}: " . $e->getMessage());
            return response()->json(['message' => 'Lỗi máy chủ khi lấy chi tiết công việc.'], 500);
        }
    }

    public function addChecklistItem(Request $request, CongViec $congviec)
    {
        $auth = $this->getAuthInfo($congviec->nhom);
        if (!$auth['canView']) {
            return response()->json(['message' => 'Không có quyền.'], 403);
        }
        $validated = $request->validate(['NOIDUNG_MUC' => 'required|string|max:255']);

        $item = $congviec->checklistItems()->create($validated);
        return response()->json($item, 201);
    }

    public function deleteChecklistItem(DanhSachKiemTraCongViec $item)
    {
        $auth = $this->getAuthInfo($item->congViec->nhom);
        if (!$auth['canManage'] && $item->congViec->ID_NGUOITAO !== $auth['user']->ID_NGUOIDUNG) {
            return response()->json(['message' => 'Bạn không có quyền xóa mục này.'], 403);
        }
        
        $item->delete();
        return response()->json(null, 204);
    }

    /**
     * Thêm bình luận (Chỉ có 1 hàm này)
     */
    public function addComment(Request $request, CongViec $congviec)
    {
        $auth = $this->getAuthInfo($congviec->nhom);
        if (!$auth['canView']) {
            return response()->json(['message' => 'Bạn không có quyền bình luận.'], 403);
        }

        $validated = $request->validate([
            'NOIDUNG_BINHLUAN' => 'required|string',
            'ID_BINHLUAN_CHA' => 'nullable|integer|exists:BINHLUAN_CONGVIEC,ID_BINHLUAN',
        ]);

        $comment = $congviec->allComments()->create([ 
            'ID_NGUOIDUNG' => $auth['user']->ID_NGUOIDUNG,
            'NOIDUNG_BINHLUAN' => $validated['NOIDUNG_BINHLUAN'],
            'ID_BINHLUAN_CHA' => $validated['ID_BINHLUAN_CHA'] ?? null,
        ]);

        $comment->load([
            'nguoiBinhLuan:ID_NGUOIDUNG,HODEM_VA_TEN',
            'replies'
        ]);

        return response()->json($comment, 201);
    }

    public function updateChecklistItem(Request $request, DanhSachKiemTraCongViec $item)
    {
        $congviec = $item->congViec;
        $auth = $this->getAuthInfo($congviec->nhom);
        $isAssigned = $congviec->nguoiDuocPhanCong()->where('NGUOIDUNG.ID_NGUOIDUNG', $auth['user']->ID_NGUOIDUNG)->exists();

        if (!$auth['canManage'] && !$isAssigned) {
            return response()->json(['message' => 'Bạn không có quyền sửa mục này.'], 403);
        }

        $validated = $request->validate([
            'DA_HOANTHANH' => 'required|boolean',
        ]);

        $item->update($validated);
        return response()->json($item);
    }
}