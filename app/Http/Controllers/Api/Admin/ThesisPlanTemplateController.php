<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MauKehoach;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ThesisPlanTemplateController extends Controller
{
    /**
     * Lấy danh sách tất cả mẫu kế hoạch.
     */
    public function index()
    {
        try {
            // Tải relationship và sắp xếp
            $templates = MauKehoach::with('mauMocThoigians')->orderBy('TEN_MAU')->get();
            return response()->json($templates);

        } catch (\Exception $e) {
            // Ghi log lỗi chi tiết
            Log::error('Failed to retrieve thesis plan templates: ' . $e->getMessage());
            // Trả về lỗi 500 với thông báo
            return response()->json(['message' => 'Không thể tải danh sách bản mẫu. Vui lòng kiểm tra logs.'], 500);
        }
    }

    /**
     * Lưu một mẫu kế hoạch mới vào cơ sở dữ liệu.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'TEN_MAU' => 'required|string|max:100|unique:MAU_KEHOACH,TEN_MAU',
            'HEDAOTAO_MACDINH' => 'required|in:Cử nhân,Kỹ sư,Thạc sỹ',
            'SO_TUAN_MACDINH' => 'required|integer|min:1',
            'MO_TA' => 'nullable|string|max:1000',
            'mocThoigians' => 'required|array|min:1',
            'mocThoigians.*.TEN_SUKIEN' => 'required|string|max:255',
            'mocThoigians.*.MOTA' => 'nullable|string',
            'mocThoigians.*.OFFSET_BATDAU' => 'required|integer|min:0',
            'mocThoigians.*.THOI_LUONG' => 'required|integer|min:1',
        ]);

        try {
            DB::beginTransaction();

            $template = MauKehoach::create(collect($validated)->except('mocThoigians')->all());

            foreach ($validated['mocThoigians'] as $index => $moc) {
                $template->mauMocThoigians()->create(array_merge($moc, ['THU_TU' => $index]));
            }

            DB::commit();

            return response()->json($template->load('mauMocThoigians'), 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create thesis plan template: ' . $e->getMessage());

            return response()->json(['message' => 'Tạo bản mẫu thất bại.'], 500);
        }
    }

    /**
     * Lấy chi tiết một mẫu kế hoạch cụ thể.
     */
    public function show(MauKehoach $template)
    {
       try {
            // Tải kèm relationship mauMocThoigians
            return response()->json($template->load('mauMocThoigians'));
        } catch (\Exception $e) {
            Log::error("Failed to retrieve template ID {$template->ID_MAU}: " . $e->getMessage());
            return response()->json(['message' => 'Không thể tải chi tiết bản mẫu.'], 500);
        }
    }

    /**
     * Cập nhật thông tin của một mẫu kế hoạch đã có.
     */
    public function update(Request $request, MauKehoach $template)
    {
        $validated = $request->validate([
            'TEN_MAU' => 'required|string|max:100|unique:MAU_KEHOACH,TEN_MAU,' . $template->ID_MAU . ',ID_MAU',
            'HEDAOTAO_MACDINH' => 'required|in:Cử nhân,Kỹ sư,Thạc sỹ',
            'SO_TUAN_MACDINH' => 'required|integer|min:1',
            'MO_TA' => 'nullable|string|max:1000',
            'mocThoigians' => 'required|array|min:1',
            'mocThoigians.*.ID_MAU_MOC' => 'nullable|integer|exists:MAU_MOC_THOIGIAN,ID_MAU_MOC',
            'mocThoigians.*.TEN_SUKIEN' => 'required|string|max:255',
            'mocThoigians.*.MOTA' => 'nullable|string',
            'mocThoigians.*.OFFSET_BATDAU' => 'required|integer|min:0',
            'mocThoigians.*.THOI_LUONG' => 'required|integer|min:1',
        ]);

        try {
            DB::beginTransaction();

            $template->update(collect($validated)->except('mocThoigians')->all());

            $incomingIds = collect($validated['mocThoigians'])->pluck('ID_MAU_MOC')->filter()->all();

            // Xóa các mốc không còn tồn tại trong request
            $template->mauMocThoigians()->whereNotIn('ID_MAU_MOC', $incomingIds)->delete();

            foreach ($validated['mocThoigians'] as $index => $moc) {
                $template->mauMocThoigians()->updateOrCreate(
                    ['ID_MAU_MOC' => $moc['ID_MAU_MOC'] ?? null],
                    array_merge(collect($moc)->except('ID_MAU_MOC')->all(), ['THU_TU' => $index])
                );
            }

            DB::commit();

            return response()->json($template->load('mauMocThoigians'));

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update thesis plan template: ' . $e->getMessage() . ' File:' . $e->getFile() . ' Line:' . $e->getLine());

            return response()->json(['message' => 'Cập nhật bản mẫu thất bại.'], 500);
        }
    }


    /**
     * Xóa một mẫu kế hoạch.
     */
    public function destroy(MauKehoach $template)
    {
        try {
            // Transaction để đảm bảo xóa cả template và các mốc liên quan
            DB::transaction(function () use ($template) {
                // Xóa các mốc thời gian liên quan trước (nếu cần, tùy vào onDelete của khóa ngoại)
                // $template->mauMocThoigians()->delete(); // Bỏ comment nếu khóa ngoại không set cascade on delete

                // Xóa bản mẫu
                $template->delete();
            });

            return response()->json(null, 204);

        } catch (\Exception $e) {
            Log::error('Failed to delete thesis plan template: ' . $e->getMessage());

            return response()->json(['message' => 'Xóa bản mẫu thất bại.'], 500);
        }
    }
}