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
    public function getTaskStats(Nhom $nhom)
    {
        try {
            $this->authorize('view', $nhom);

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
        $this->authorize('view', $nhom);

        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $columns = CotCongViec::orderBy('THUTU_HIENTHI', 'asc')->get();

        $tasksQuery = $nhom->congViecs()
            ->whereNotIn('TRANGTHAI', ['Đã hủy'])
            ->with([
                'nguoiTao' => function ($q) {
                    $q->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'ID_VAITRO')
                        ->with('vaitro:ID_VAITRO,TEN_VAITRO');
                },
                'nguoiDuocPhanCong:ID_NGUOIDUNG,HODEM_VA_TEN',
                'checklistItems',
            ])
            ->withCount('allComments')
            ->orderBy('THUTU_HIENTHI', 'asc');

        if ($startDate && $endDate) {
            $tasksQuery->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('NGAY_HETHAN', [
                    $startDate . ' 00:00:00',
                    $endDate . ' 23:59:59'
                ])
                    ->orWhereNull('NGAY_HETHAN');
            });
        }

        $tasks = $tasksQuery->get();

        $tasks->each(function ($task) {
            $task->binh_luans_count = $task->all_comments_count;
        });

        $members = $nhom->thanhviens()->with('nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN,MA_DINHDANH')->get();

        return response()->json([
            'columns' => $columns,
            'tasks' => $tasks->groupBy('ID_COT'),
            'members' => $members,
            'can_manage' => $request->user()->can('manage', $nhom)
        ]);
    }

    public function createTask(Request $request, Nhom $nhom)
    {
        $this->authorize('view', $nhom);

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
        DB::transaction(function () use ($nhom, $validated, &$task) {
            $task = $nhom->congViecs()->create([
                'ID_COT' => $validated['ID_COT'],
                'ID_NGUOITAO' => Auth::id(),
                'TEN_CONGVIEC' => $validated['TEN_CONGVIEC'],
                'MOTA' => $validated['MOTA'] ?? null,
                'NGAY_HETHAN' => $validated['NGAY_HETHAN'] ?? null,
                'DO_UUTIEN' => $validated['DO_UUTIEN'] ?? 'Trung bình',
                'TRANGTHAI' => 'Hoạt động',
            ]);

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

        $task->load([
            'nguoiTao' => function ($q) {
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

    public function updateTask(Request $request, CongViec $congviec)
    {
        $this->authorize('view', $congviec->nhom);

        $validated = $request->validate([
            'TEN_CONGVIEC' => 'sometimes|required|string|max:255',
            'MOTA' => 'nullable|string',
            'NGAY_HETHAN' => 'nullable|date',
            'DO_UUTIEN' => ['nullable', Rule::in(['Thấp', 'Trung bình', 'Cao'])],
            'TRANGTHAI' => ['sometimes', Rule::in(['Hoạt động', 'Đã hủy', 'Tạm dừng', 'Hoàn thành'])],
            'ID_COT' => 'sometimes|exists:COT_CONGVIEC,ID_COT',
        ]);

        $congviec->fill($validated);

        if ($congviec->isDirty('ID_COT')) {
            $maxOrder = CongViec::where('ID_COT', $validated['ID_COT'])
                ->where('ID_NHOM', $congviec->ID_NHOM)
                ->max('THUTU_HIENTHI');
            $congviec->THUTU_HIENTHI = $maxOrder + 1;
        }

        $changes = $congviec->getDirty();
        $congviec->save();

        if (!empty($changes)) {
            if (isset($changes['TRANGTHAI'])) {
                ActivityLogger::log(
                    'TASK_UPDATE',
                    "Đổi trạng thái công việc '{$congviec->TEN_CONGVIEC}' sang {$changes['TRANGTHAI']}",
                    ['task_id' => $congviec->ID_CONGVIEC, 'status' => $changes['TRANGTHAI']],
                    $congviec->ID_NHOM
                );
            } elseif (isset($changes['ID_COT'])) {
                $tenCot = CotCongViec::find($changes['ID_COT'])?->TEN_COT ?? 'Cột mới';
                ActivityLogger::log(
                    'TASK_MOVE',
                    "Chuyển công việc '{$congviec->TEN_CONGVIEC}' sang cột {$tenCot}",
                    ['task_id' => $congviec->ID_CONGVIEC, 'column' => $tenCot],
                    $congviec->ID_NHOM
                );
            } elseif (isset($changes['TEN_CONGVIEC']) || isset($changes['MOTA']) || isset($changes['DO_UUTIEN'])) {
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

    public function moveTask(Request $request, CongViec $congviec)
    {
        $this->authorize('view', $congviec->nhom);

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

            $cotMoi = CotCongViec::find($validated['ID_COT_MOI']);
            if ($cotMoi && $cotMoi->TEN_COT === 'Hoàn thành') {
                $congviec->NGAY_HOANTHANH = now();
                $congviec->TRANGTHAI = 'Hoàn thành';
            } else {
                $congviec->NGAY_HOANTHANH = null;
                if ($congviec->TRANGTHAI === 'Hoàn thành') {
                    $congviec->TRANGTHAI = 'Hoạt động';
                }
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

    public function deleteTask(CongViec $congviec)
    {
        $this->authorize('manage', $congviec->nhom);

        $congviec->delete();
        return response()->json(null, 204);
    }

    public function assignTask(Request $request, CongViec $congviec)
    {
        $this->authorize('manage', $congviec->nhom);

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

    public function getTaskDetails(CongViec $congviec)
    {
        $this->authorize('view', $congviec->nhom);

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
        $this->authorize('view', $congviec->nhom);

        $validated = $request->validate(['NOIDUNG_MUC' => 'required|string|max:255']);

        $item = $congviec->checklistItems()->create($validated);
        return response()->json($item, 201);
    }

    public function deleteChecklistItem(DanhSachKiemTraCongViec $item)
    {
        $this->authorize('view', $item->congViec->nhom);

        $item->delete();
        return response()->json(null, 204);
    }

    public function addComment(Request $request, CongViec $congviec)
    {
        $this->authorize('view', $congviec->nhom);

        $validated = $request->validate([
            'NOIDUNG_BINHLUAN' => 'required|string',
            'ID_BINHLUAN_CHA' => 'nullable|integer|exists:BINHLUAN_CONGVIEC,ID_BINHLUAN',
        ]);

        $comment = $congviec->allComments()->create([
            'ID_NGUOIDUNG' => Auth::id(),
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
        $this->authorize('view', $item->congViec->nhom);

        $validated = $request->validate([
            'DA_HOANTHANH' => 'required|boolean',
        ]);

        $item->update($validated);
        return response()->json($item);
    }
}