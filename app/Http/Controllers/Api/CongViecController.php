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
use App\Services\ActivityLogger;
use App\Services\NotificationService;

class CongViecController extends Controller
{
    // --- HÀM HELPER PHÂN QUYỀN ---

    private function getAuthInfo(Nhom $nhom)
    {
        $user = Auth::user();
        
        // Kiểm tra xem user có phải là thành viên của nhóm không
        $isMember = $user->thanhvienNhom()->where('ID_NHOM', $nhom->ID_NHOM)->exists();
        
        // Kiểm tra Nhóm trưởng
        $isLeader = $nhom->ID_NHOMTRUONG === $user->ID_NGUOIDUNG;
        
        // Kiểm tra GVHD (Dựa vào phân công đề tài)
        $isGvhd = $user->giangvien && $nhom->phancongDetaiNhom?->ID_GVHD === $user->giangvien->ID_GIANGVIEN;
        
        // Kiểm tra Admin/Quản lý khoa
        // [LƯU Ý] Các hàm này đã được cập nhật ở Base Controller để check bảng quan hệ N-N
        $isAdmin = $this->isAdmin() || $this->isGiaoVu() || $this->isTruongKhoa();

        // 1. canView: Quyền cơ bản (Xem, Tạo, Sửa nội dung, Chuyển trạng thái, Checklist, Comment)
        // Áp dụng cho: Tất cả thành viên nhóm + GVHD + Admin
        $canView = $isMember || $isGvhd || $isAdmin;
        
        // 2. canManage: Quyền cao cấp (Xóa Task, Gán người)
        // Áp dụng cho: Nhóm trưởng + GVHD + Admin
        $canManage = $isGvhd || $isLeader || $isAdmin;

        return compact('user', 'isMember', 'isLeader', 'isGvhd', 'isAdmin', 'canView', 'canManage');
    }

    // --- CÁC HÀM API CHÍNH ---

    /**
     * Lấy thống kê số lượng công việc tồn đọng (chưa hoàn thành)
     */
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

    /**
     * Lấy dữ liệu bảng Kanban (Cột, Task, Thành viên)
     */
    public function getBoardData(Nhom $nhom, Request $request) 
    {
        $auth = $this->getAuthInfo($nhom);
        if (!$auth['canView']) {
            return response()->json(['message' => 'Không có quyền truy cập.'], 403);
        }

        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        // Lấy danh sách cột
        $columns = CotCongViec::orderBy('THUTU_HIENTHI', 'asc')->get();

        // Query Task
        $tasksQuery = $nhom->congViecs()
            ->whereNotIn('TRANGTHAI', ['Đã hủy'])
            ->with([
                // [QUAN TRỌNG] Load thêm vai trò của người tạo để Frontend highlight task GV
                'nguoiTao' => function($q) {
                    $q->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'ID_VAITRO')
                      ->with('vaitro:ID_VAITRO,TEN_VAITRO');
                },
                'nguoiDuocPhanCong:ID_NGUOIDUNG,HODEM_VA_TEN',
                'checklistItems',
            ])
            ->withCount('allComments')
            ->orderBy('THUTU_HIENTHI', 'asc');

        // Lọc theo ngày (nếu có)
        if ($startDate && $endDate) {
            $tasksQuery->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('NGAY_HETHAN', [
                    $startDate . ' 00:00:00',
                    $endDate . ' 23:59:59'
                ])
                ->orWhereNull('NGAY_HETHAN'); // Luôn hiện task không có deadline
            });
        }
        
        $tasks = $tasksQuery->get();
        
        // Map thêm count comment vào attribute dễ dùng
        $tasks->each(function ($task) {
            $task->binh_luans_count = $task->all_comments_count;
        });

        // Lấy danh sách thành viên để gán task
        $members = $nhom->thanhviens()->with('nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN,MA_DINHDANH')->get();

        return response()->json([
            'columns' => $columns,
            'tasks' => $tasks->groupBy('ID_COT'),
            'members' => $members,
        ]);
    }

    /**
     * Tạo công việc mới
     */
    public function createTask(Request $request, Nhom $nhom)
    {
        $auth = $this->getAuthInfo($nhom);
        
        // [RULE] Ai trong nhóm (SV, GV) cũng có thể tạo công việc
        if (!$auth['canView']) { 
            return response()->json(['message' => 'Không có quyền tạo công việc.'], 403);
        }

        $validated = $request->validate([
            'TEN_CONGVIEC' => 'required|string|max:255',
            'ID_COT' => 'required|exists:COT_CONGVIEC,ID_COT',
            'MOTA' => 'nullable|string',
            'NGAY_HETHAN' => 'nullable|date',
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

            // Gán người thực hiện ngay khi tạo (cho phép ở bước tạo)
            if (!empty($validated['assignee_ids'])) {
                $task->nguoiDuocPhanCong()->sync($validated['assignee_ids']);

                foreach ($validated['assignee_ids'] as $uid) {
                    if ($uid == Auth::id()) continue;
                    NotificationService::send(
                        $uid, 
                        "Bạn được giao công việc mới", 
                        "Bạn được gán vào công việc: {$task->TEN_CONGVIEC}", 
                        'TASK', 
                        "/projects/my-group/kanban/{$nhom->ID_NHOM}"
                    );
                }
            }
        });

        // [QUAN TRỌNG] Load lại đầy đủ thông tin (bao gồm vai trò người tạo) để trả về Frontend
        $task->load([
            'nguoiTao' => function($q) {
                $q->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'ID_VAITRO')
                  ->with('vaitro:ID_VAITRO,TEN_VAITRO');
            },
            'nguoiDuocPhanCong:ID_NGUOIDUNG,HODEM_VA_TEN',
            'checklistItems',
        ])->loadCount('allComments');

        $task->binh_luans_count = $task->all_comments_count;

        ActivityLogger::log(
            'TASK_CREATE', 
            "Tạo công việc mới: {$task->TEN_CONGVIEC}", 
            ['task_id' => $task->ID_CONGVIEC], 
            $nhom->ID_NHOM
        );

        return response()->json($task, 201);
    }

    /**
     * Cập nhật công việc (Tên, Mô tả, Trạng thái...)
     */
    public function updateTask(Request $request, CongViec $congviec)
    {
        $auth = $this->getAuthInfo($congviec->nhom);

        if (!$auth['canView']) {
            return response()->json(['message' => 'Bạn không có quyền sửa công việc này.'], 403);
        }

        $validated = $request->validate([
            'TEN_CONGVIEC' => 'sometimes|required|string|max:255',
            'MOTA' => 'nullable|string',
            'NGAY_HETHAN' => 'nullable|date',
            'DO_UUTIEN' => ['nullable', Rule::in(['Thấp', 'Trung bình', 'Cao'])],
            'TRANGTHAI' => ['sometimes', Rule::in(['Hoạt động', 'Đã hủy', 'Tạm dừng', 'Hoàn thành'])],
            'ID_COT' => 'sometimes|exists:COT_CONGVIEC,ID_COT', // Cho phép đổi cột trong dialog
        ]);

        $congviec->fill($validated);

        
        // Nếu có thay đổi cột (ID_COT) -> Cần xử lý thứ tự để tránh lỗi hiển thị
        if ($congviec->isDirty('ID_COT')) {
            // Đưa task xuống cuối cột mới
            $maxOrder = CongViec::where('ID_COT', $validated['ID_COT'])
                                ->where('ID_NHOM', $congviec->ID_NHOM)
                                ->max('THUTU_HIENTHI');
            $congviec->THUTU_HIENTHI = $maxOrder + 1;
        }

        // Kiểm tra các trường quan trọng đã thay đổi để ghi log
        $changes = $congviec->getDirty();
        $congviec->save();

        // Chỉ ghi log nếu có thay đổi quan trọng
        if (!empty($changes)) {
            // Ưu tiên log trạng thái hoặc cột trước
            if (isset($changes['TRANGTHAI'])) {
                ActivityLogger::log(
                    'TASK_UPDATE', 
                    "Đổi trạng thái công việc '{$congviec->TEN_CONGVIEC}' sang {$changes['TRANGTHAI']}", 
                    ['task_id' => $congviec->ID_CONGVIEC, 'status' => $changes['TRANGTHAI']], 
                    $congviec->ID_NHOM
                );
            } 
            elseif (isset($changes['ID_COT'])) {
                $tenCot = CotCongViec::find($changes['ID_COT'])?->TEN_COT ?? 'Cột mới';
                ActivityLogger::log(
                    'TASK_MOVE', 
                    "Chuyển công việc '{$congviec->TEN_CONGVIEC}' sang cột {$tenCot}", 
                    ['task_id' => $congviec->ID_CONGVIEC, 'column' => $tenCot], 
                    $congviec->ID_NHOM
                );
            }
            // Nếu chỉ đổi tên/mô tả thì log nhẹ nhàng hoặc bỏ qua nếu muốn ít spam
            elseif (isset($changes['TEN_CONGVIEC']) || isset($changes['MOTA']) || isset($changes['DO_UUTIEN'])) {
                ActivityLogger::log(
                    'TASK_UPDATE', 
                    "Cập nhật thông tin công việc: {$congviec->TEN_CONGVIEC}", 
                    ['task_id' => $congviec->ID_CONGVIEC], 
                    $congviec->ID_NHOM
                );
            }
        }
        
        return response()->json($congviec);
    }
    /**
     * Di chuyển công việc (Kéo thả sang cột khác hoặc đổi thứ tự)
     */
    public function moveTask(Request $request, CongViec $congviec)
    {
        $auth = $this->getAuthInfo($congviec->nhom);

        if (!$auth['canView']) {
            return response()->json(['message' => 'Bạn không có quyền di chuyển công việc này.'], 403);
        }

        $validated = $request->validate([
            'ID_COT_MOI' => 'required|integer|exists:COT_CONGVIEC,ID_COT',
            'THUTU_MOI' => 'required|integer|min:0',
            'sibling_task_ids' => 'nullable|array', 
        ]);

        $oldColumnId = $congviec->ID_COT;
        $newColumnId = $validated['ID_COT_MOI'];

        DB::transaction(function () use ($congviec, $validated) {
            $congviec->ID_COT = $validated['ID_COT_MOI'];
            $congviec->THUTU_HIENTHI = $validated['THUTU_MOI'];

            // Nếu chuyển sang cột Hoàn thành -> Cập nhật ngày hoàn thành
            $cotMoi = CotCongViec::find($validated['ID_COT_MOI']);
            if ($cotMoi && $cotMoi->TEN_COT === 'Hoàn thành') {
                $congviec->NGAY_HOANTHANH = now();
                $congviec->TRANGTHAI = 'Hoàn thành'; // [BỔ SUNG] Cập nhật luôn trạng thái
            } else {
                $congviec->NGAY_HOANTHANH = null;
                // Nếu cột cũ là hoàn thành mà kéo ra, có thể set lại Hoạt động
                if($congviec->TRANGTHAI === 'Hoàn thành') {
                     $congviec->TRANGTHAI = 'Hoạt động';
                }
            }
            $congviec->save();

            // Cập nhật thứ tự các task khác trong cùng cột
            if (!empty($validated['sibling_task_ids'])) {
                foreach ($validated['sibling_task_ids'] as $index => $taskId) {
                    CongViec::where('ID_CONGVIEC', $taskId)
                            ->where('ID_COT', $validated['ID_COT_MOI'])
                            ->update(['THUTU_HIENTHI' => $validated['THUTU_MOI'] + 1 + $index]);
                }
            }
        });

        if ($oldColumnId != $newColumnId) {
            $cotMoi = \App\Models\CotCongViec::find($validated['ID_COT_MOI']);
            $tenCot = $cotMoi ? $cotMoi->TEN_COT : 'Cột mới';

            ActivityLogger::log(
                'TASK_MOVE', 
                "Chuyển công việc '{$congviec->TEN_CONGVIEC}' sang '{$tenCot}'", 
                ['task_id' => $congviec->ID_CONGVIEC, 'to_column' => $tenCot], 
                $congviec->ID_NHOM
            );
        }

        return response()->json(['message' => 'Cập nhật vị trí thành công.']);
    }

    /**
     * Xóa công việc
     */
    public function deleteTask(CongViec $congviec)
    {
        $auth = $this->getAuthInfo($congviec->nhom);

        // [RULE] CHỈ Nhóm trưởng / GV / Admin mới được XÓA công việc
        if (!$auth['canManage']) {
            return response()->json(['message' => 'Chỉ Nhóm trưởng hoặc Giảng viên mới có quyền xóa công việc.'], 403);
        }

        $congviec->delete();
        return response()->json(null, 204);
    }

    /**
     * Gán người thực hiện (Sau khi đã tạo task)
     */
    public function assignTask(Request $request, CongViec $congviec)
    {
        $auth = $this->getAuthInfo($congviec->nhom);

        // [RULE] CHỈ Nhóm trưởng / GV / Admin mới được GÁN người
        if (!$auth['canManage']) {
            return response()->json(['message' => 'Chỉ Nhóm trưởng hoặc GVHD mới có quyền gán việc.'], 403);
        }

        $validated = $request->validate([
            'user_ids' => 'present|array', 
            'user_ids.*' => 'integer|exists:NGUOIDUNG,ID_NGUOIDUNG',
        ]);
        
        $congviec->nguoiDuocPhanCong()->sync($validated['user_ids']);

        foreach ($validated['user_ids'] as $userId) {
            if ($userId == Auth::id()) continue;
            NotificationService::send(
                $userId,
                "Bạn được giao công việc",
                "Bạn đã được gán vào công việc: {$congviec->TEN_CONGVIEC}",
                'TASK',
                "/projects/my-group/kanban/{$congviec->ID_NHOM}"
            );
        }

        return response()->json($congviec->load('nguoiDuocPhanCong:ID_NGUOIDUNG,HODEM_VA_TEN'));
    }

    /**
     * Lấy chi tiết một công việc (cho Dialog)
     */
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
    
    /**
     * Thêm mục checklist
     */
    public function addChecklistItem(Request $request, CongViec $congviec)
    {
        $auth = $this->getAuthInfo($congviec->nhom);
        // [RULE] Ai trong nhóm cũng có thể thêm checklist
        if (!$auth['canView']) {
            return response()->json(['message' => 'Không có quyền.'], 403);
        }
        $validated = $request->validate(['NOIDUNG_MUC' => 'required|string|max:255']);

        $item = $congviec->checklistItems()->create($validated);
        return response()->json($item, 201);
    }

    /**
     * Xóa mục checklist
     */
    public function deleteChecklistItem(DanhSachKiemTraCongViec $item)
    {
        $auth = $this->getAuthInfo($item->congViec->nhom);
        // [RULE] Ai trong nhóm cũng có thể xóa mục checklist
        if (!$auth['canView']) {
            return response()->json(['message' => 'Bạn không có quyền xóa mục này.'], 403);
        }
        
        $item->delete();
        return response()->json(null, 204);
    }

    /**
     * Thêm bình luận
     */
    public function addComment(Request $request, CongViec $congviec)
    {
        $auth = $this->getAuthInfo($congviec->nhom);
        // [RULE] Ai trong nhóm cũng có thể bình luận
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

    /**
     * Cập nhật mục checklist (Hoàn thành/Chưa hoàn thành)
     */
    public function updateChecklistItem(Request $request, DanhSachKiemTraCongViec $item)
    {
        $congviec = $item->congViec;
        $auth = $this->getAuthInfo($congviec->nhom);
        
        // [RULE] Ai trong nhóm cũng có thể check/uncheck
        if (!$auth['canView']) {
            return response()->json(['message' => 'Bạn không có quyền sửa mục này.'], 403);
        }

        $validated = $request->validate([
            'DA_HOANTHANH' => 'required|boolean',
        ]);

        $item->update($validated);
        return response()->json($item);
    }
}