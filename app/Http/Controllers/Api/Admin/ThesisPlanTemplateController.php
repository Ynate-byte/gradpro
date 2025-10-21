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
     * Display a listing of the resource.
     */
    public function index()
    {
        // Lấy danh sách mẫu kèm các mốc thời gian
        return MauKehoach::with('mauMocThoigians')->orderBy('TEN_MAU')->get();
    }

    /**
     * Store a newly created resource in storage.
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
     * Display the specified resource.
     */
    public function show(MauKehoach $template) // Sử dụng Route Model Binding
    {
        return $template->load('mauMocThoigians');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, MauKehoach $template)
    {
        $validated = $request->validate([
             'TEN_MAU' => 'required|string|max:100|unique:MAU_KEHOACH,TEN_MAU,' . $template->ID_MAU . ',ID_MAU',
            'HEDAOTAO_MACDINH' => 'required|in:Cử nhân,Kỹ sư,Thạc sỹ',
            'SO_TUAN_MACDINH' => 'required|integer|min:1',
            'MO_TA' => 'nullable|string|max:1000',
            'mocThoigians' => 'required|array|min:1',
            'mocThoigians.*.ID_MAU_MOC' => 'nullable|integer|exists:MAU_MOC_THOIGIAN,ID_MAU_MOC', // ID của mốc cũ (nếu có)
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
                    ['ID_MAU_MOC' => $moc['ID_MAU_MOC'] ?? null], // Điều kiện tìm kiếm (ID cũ hoặc null nếu mới)
                    array_merge(collect($moc)->except('ID_MAU_MOC')->all(), ['THU_TU' => $index]) // Dữ liệu cập nhật/tạo mới
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
     * Remove the specified resource from storage.
     */
    public function destroy(MauKehoach $template)
    {
        try {
            // Các mốc thời gian sẽ tự động bị xóa do 'onDelete('cascade')'
            $template->delete();
            return response()->json(null, 204);
        } catch (\Exception $e) {
            Log::error('Failed to delete thesis plan template: ' . $e->getMessage());
            return response()->json(['message' => 'Xóa bản mẫu thất bại.'], 500);
        }
    }
}