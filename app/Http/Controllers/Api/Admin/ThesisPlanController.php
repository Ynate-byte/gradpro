<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreThesisPlanRequest;
use App\Http\Requests\UpdateThesisPlanRequest;
use App\Models\KehoachKhoaluan;
use App\Models\MocThoigian;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;

class ThesisPlanController extends Controller
{
    /**
     * Lấy danh sách kế hoạch (hỗ trợ phân trang và tìm kiếm).
     */
    public function index(Request $request)
    {
        $query = KehoachKhoaluan::with('nguoiTao')->orderBy('NGAYTAO', 'desc');

        if ($request->filled('search')) {
            $query->where('TEN_DOT', 'like', '%' . $request->search . '%');
        }

        $plans = $query->paginate($request->per_page ?? 10);
        
        return response()->json($plans);
    }

    /**
     * Lưu một kế hoạch khóa luận mới (dạng bản nháp).
     */
    public function store(StoreThesisPlanRequest $request)
    {
        $validated = $request->validated();

        try {
            DB::beginTransaction();

            $planData = collect($validated)->except('mocThoigians')->all();
            $plan = KehoachKhoaluan::create(array_merge($planData, [
                'ID_NGUOITAO' => $request->user()->ID_NGUOIDUNG,
                'TRANGTHAI' => 'Bản nháp',
            ]));

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

    /**
     * Lấy chi tiết thông tin của một kế hoạch.
     */
    public function show(KehoachKhoaluan $plan)
    {
        return response()->json($plan->load('mocThoigians', 'nguoiTao'));
    }

    /**
     * Cập nhật thông tin kế hoạch (chỉ khi ở trạng thái 'Bản nháp' hoặc 'Yêu cầu chỉnh sửa').
     */
    public function update(UpdateThesisPlanRequest $request, KehoachKhoaluan $plan)
    {
        if (!in_array($plan->TRANGTHAI, ['Bản nháp', 'Yêu cầu chỉnh sửa'])) {
            return response()->json(['message' => 'Không thể chỉnh sửa kế hoạch ở trạng thái này.'], 403);
        }

        $validated = $request->validated();

        try {
            DB::beginTransaction();

            $plan->update(collect($validated)->except('mocThoigians')->all());

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

    /**
     * Xóa một kế hoạch (chỉ khi ở trạng thái 'Bản nháp').
     */
    public function destroy(KehoachKhoaluan $plan)
    {
        if ($plan->TRANGTHAI !== 'Bản nháp') {
            return response()->json(['message' => 'Chỉ có thể xóa kế hoạch ở trạng thái "Bản nháp".'], 403);
        }
        
        $plan->delete();
        
        return response()->json(null, 204);
    }
    /**
     * Gửi kế hoạch (từ 'Bản nháp') để 'Chờ phê duyệt'.
     */
    public function submitForApproval(KehoachKhoaluan $plan)
    {
        if ($plan->TRANGTHAI !== 'Bản nháp') {
            return response()->json(['message' => 'Chỉ có thể gửi duyệt kế hoạch ở trạng thái "Bản nháp".'], 400);
        }
        
        $plan->update(['TRANGTHAI' => 'Chờ phê duyệt']);
        
        return response()->json(['message' => 'Đã gửi kế hoạch để phê duyệt thành công.']);
    }

    /**
     * Phê duyệt kế hoạch (từ 'Chờ phê duyệt' sang 'Đã phê duyệt').
     */
    public function approve(KehoachKhoaluan $plan)
    {
        if ($plan->TRANGTHAI !== 'Chờ phê duyệt') {
            return response()->json(['message' => 'Chỉ có thể phê duyệt kế hoạch ở trạng thái "Chờ phê duyệt".'], 400);
        }
        
        $plan->update(['TRANGTHAI' => 'Đã phê duyệt', 'BINHLUAN_PHEDUYET' => null]);
        
        return response()->json(['message' => 'Đã phê duyệt kế hoạch thành công.']);
    }

    /**
     * Yêu cầu chỉnh sửa (từ 'Chờ phê duyệt' sang 'Yêu cầu chỉnh sửa').
     */
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
    /**
     * Xuất thông báo kế hoạch dưới dạng file PDF (tải về).
     */
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

    /**
     * Xem trước thông báo kế hoạch (dạng PDF) trực tiếp trên trình duyệt.
     */
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
    
    /**
     * Xem trước file PDF (dựa trên dữ liệu form) khi tạo kế hoạch mới (chưa lưu).
     */
    public function previewNewPlan(StoreThesisPlanRequest $request)
    {
        $validated = $request->validated();

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
    /**
     * Lấy danh sách rút gọn (ID, Tên) của tất cả kế hoạch (dùng cho dropdown).
     */
    public function getAllPlans()
    {
        $plans = KehoachKhoaluan::orderBy('NGAYTAO', 'desc')->get(['ID_KEHOACH', 'TEN_DOT']);
        
        return response()->json($plans);
    }
}