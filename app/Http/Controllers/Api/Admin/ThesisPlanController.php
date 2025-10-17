<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\KehoachKhoaluan;
use App\Models\MocThoigian;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Barryvdh\DomPDF\Facade\Pdf;

class ThesisPlanController extends Controller
{
    public function index(Request $request)
    {
        $query = KehoachKhoaluan::with('nguoiTao')->orderBy('NGAYTAO', 'desc');

        // === BẮT ĐẦU THÊM MỚI: Xử lý logic tìm kiếm ===
        if ($request->filled('search')) {
            $query->where('TEN_DOT', 'like', '%' . $request->search . '%');
        }
        // === KẾT THÚC THÊM MỚI ===

        $plans = $query->paginate($request->per_page ?? 10);
        return response()->json($plans);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'TEN_DOT' => 'required|string|max:100',
            'NAMHOC' => 'required|string|max:20',
            'HOCKY' => 'required|in:1,2,3',
            'KHOAHOC' => 'required|string|max:10',
            'HEDAOTAO' => 'required|in:Cử nhân,Kỹ sư,Thạc sỹ',
            'NGAY_BATDAU' => 'required|date', 
            'NGAY_KETHUC' => 'required|date|after_or_equal:NGAY_BATDAU', 
            'mocThoigians' => 'required|array|min:1',
            'mocThoigians.*.TEN_SUKIEN' => 'required|string|max:255',
            'mocThoigians.*.NGAY_BATDAU' => 'required|date',
            'mocThoigians.*.NGAY_KETTHUC' => 'required|date|after_or_equal:mocThoigians.*.NGAY_BATDAU',
            'mocThoigians.*.MOTA' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $plan = KehoachKhoaluan::create([
                'TEN_DOT' => $validated['TEN_DOT'],
                'NAMHOC' => $validated['NAMHOC'],
                'HOCKY' => $validated['HOCKY'],
                'KHOAHOC' => $validated['KHOAHOC'],
                'HEDAOTAO' => $validated['HEDAOTAO'],
                'NGAY_BATDAU' => $validated['NGAY_BATDAU'], 
                'NGAY_KETHUC' => $validated['NGAY_KETHUC'], 
                'ID_NGUOITAO' => $request->user()->ID_NGUOIDUNG,
                'TRANGTHAI' => 'Bản nháp',
            ]);

            foreach ($validated['mocThoigians'] as $moc) {
                $plan->mocThoigians()->create($moc);
            }

            DB::commit();
            return response()->json($plan->load('mocThoigians'), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create thesis plan: ' . $e->getMessage());
            return response()->json(['message' => 'Tạo kế hoạch thất bại. Vui lòng thử lại.'], 500);
        }
    }

    public function show(KehoachKhoaluan $plan)
    {
        return response()->json($plan->load('mocThoigians', 'nguoiTao'));
    }

    public function update(Request $request, KehoachKhoaluan $plan)
    {
        if (!in_array($plan->TRANGTHAI, ['Bản nháp', 'Yêu cầu chỉnh sửa'])) {
            return response()->json(['message' => 'Không thể chỉnh sửa kế hoạch ở trạng thái này.'], 403);
        }

        $validated = $request->validate([
            'TEN_DOT' => 'required|string|max:100',
            'NAMHOC' => 'required|string|max:20',
            'HOCKY' => 'required|in:1,2,3',
            'KHOAHOC' => 'required|string|max:10',
            'HEDAOTAO' => 'required|in:Cử nhân,Kỹ sư,Thạc sỹ',
            'NGAY_BATDAU' => 'required|date', 
            'NGAY_KETHUC' => 'required|date|after_or_equal:NGAY_BATDAU', 
            'mocThoigians' => 'required|array|min:1',
            'mocThoigians.*.id' => 'nullable|integer',
            'mocThoigians.*.TEN_SUKIEN' => 'required|string|max:255',
            'mocThoigians.*.NGAY_BATDAU' => 'required|date',
            'mocThoigians.*.NGAY_KETTHUC' => 'required|date|after_or_equal:mocThoigians.*.NGAY_BATDAU',
            'mocThoigians.*.MOTA' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $plan->update($validated);

            $incomingIds = collect($validated['mocThoigians'])->pluck('id')->filter();
            $plan->mocThoigians()->whereNotIn('ID', $incomingIds)->delete();

            foreach ($validated['mocThoigians'] as $moc) {
                MocThoigian::updateOrCreate(
                    ['ID' => $moc['id'] ?? null, 'ID_KEHOACH' => $plan->ID_KEHOACH],
                    $moc
                );
            }

            if ($plan->TRANGTHAI === 'Yêu cầu chỉnh sửa') {
                $plan->TRANGTHAI = 'Chờ phê duyệt';
                $plan->BINHLUAN_PHEDUYET = null;
                $plan->save();
            }

            DB::commit();
            return response()->json($plan->load('mocThoigians'));
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update thesis plan: ' . $e->getMessage());
            return response()->json(['message' => 'Cập nhật kế hoạch thất bại. Vui lòng thử lại.'], 500);
        }
    }
    
    public function submitForApproval(KehoachKhoaluan $plan)
    {
        if ($plan->TRANGTHAI !== 'Bản nháp') {
            return response()->json(['message' => 'Chỉ có thể gửi duyệt kế hoạch ở trạng thái "Bản nháp".'], 400);
        }
        $plan->update(['TRANGTHAI' => 'Chờ phê duyệt']);
        return response()->json(['message' => 'Đã gửi kế hoạch để phê duyệt thành công.']);
    }

    public function approve(KehoachKhoaluan $plan)
    {
        if ($plan->TRANGTHAI !== 'Chờ phê duyệt') {
            return response()->json(['message' => 'Chỉ có thể phê duyệt kế hoạch ở trạng thái "Chờ phê duyệt".'], 400);
        }
        $plan->update(['TRANGTHAI' => 'Đã phê duyệt', 'BINHLUAN_PHEDUYET' => null]);
        return response()->json(['message' => 'Đã phê duyệt kế hoạch thành công.']);
    }

    public function requestChanges(Request $request, KehoachKhoaluan $plan)
    {
        $validated = $request->validate(['comment' => 'required|string|max:1000']);
        if ($plan->TRANGTHAI !== 'Chờ phê duyệt') {
            return response()->json(['message' => 'Chỉ có thể yêu cầu chỉnh sửa kế hoạch ở trạng thái "Chờ phê duyệt".'], 400);
        }
        $plan->update([
            'TRANGTHAI' => 'Yêu cầu chỉnh sửa',
            'BINHLUAN_PHEDUYET' => $validated['comment']
        ]);
        return response()->json(['message' => 'Đã gửi yêu cầu chỉnh sửa.']);
    }

    public function destroy(KehoachKhoaluan $plan)
    {
        if ($plan->TRANGTHAI !== 'Bản nháp') {
            return response()->json(['message' => 'Chỉ có thể xóa kế hoạch ở trạng thái "Bản nháp".'], 403);
        }
        $plan->delete();
        return response()->json(null, 204);
    }
    
    public function exportDocument(KehoachKhoaluan $plan)
    {
        try {
            $plan->load('mocThoigians');
            $pdf = Pdf::loadView('documents.thesis_plan', ['plan' => $plan]);
            $fileName = 'Thong-bao-KLTN-' . $plan->KHOAHOC . '.pdf';
            return $pdf->download($fileName);
        } catch (\Exception $e) {
            Log::error('Failed to export PDF document: ' . $e->getMessage());
            return response()->json(['message' => 'Xuất file PDF thất bại.'], 500);
        }
    }

    public function previewDocument(KehoachKhoaluan $plan)
    {
        try {
            $plan->load('mocThoigians');
            $pdf = Pdf::loadView('documents.thesis_plan', ['plan' => $plan]);
            return $pdf->stream();
        } catch (\Exception $e) {
            Log::error('Failed to preview PDF document: ' . $e->getMessage());
            return response()->json(['message' => 'Xem trước file PDF thất bại.'], 500);
        }
    }
    
    public function previewNewPlan(Request $request)
    {
        $validated = $request->validate([
            'TEN_DOT' => 'required|string|max:100',
            'NAMHOC' => 'required|string|max:20',
            'HOCKY' => 'required|in:1,2,3',
            'KHOAHOC' => 'required|string|max:10',
            'HEDAOTAO' => 'required|in:Cử nhân,Kỹ sư,Thạc sỹ',
            // Thêm 2 trường mới vào đây để preview
            'NGAY_BATDAU' => 'required|date',
            'NGAY_KETHUC' => 'required|date|after_or_equal:NGAY_BATDAU',
            'mocThoigians' => 'required|array|min:1',
            'mocThoigians.*.TEN_SUKIEN' => 'required|string|max:255',
            'mocThoigians.*.NGAY_BATDAU' => 'required|date',
            'mocThoigians.*.NGAY_KETTHUC' => 'required|date|after_or_equal:mocThoigians.*.NGAY_BATDAU',
            'mocThoigians.*.MOTA' => 'nullable|string',
        ]);

        try {
            $plan = new KehoachKhoaluan($validated);
            $mocThoigianCollection = collect($validated['mocThoigians'])->map(function ($moc) {
                return new MocThoigian($moc);
            });
            $plan->setRelation('mocThoigians', $mocThoigianCollection);
            $pdf = Pdf::loadView('documents.thesis_plan', ['plan' => $plan]);
            return $pdf->stream('xem-truoc-ke-hoach.pdf');

        } catch (\Exception $e) {
            Log::error('Failed to preview new PDF document: ' . $e->getMessage());
            return response()->json(['message' => 'Xem trước file PDF thất bại.'], 500);
        }
    }
    
    public function getAllPlans()
    {
        $plans = KehoachKhoaluan::orderBy('NGAYTAO', 'desc')->get(['ID_KEHOACH', 'TEN_DOT']);
        return response()->json($plans);
    }
}