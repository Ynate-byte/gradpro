<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreThesisPlanRequest;
use App\Http\Requests\UpdateThesisPlanRequest;
use App\Models\KehoachKhoaluan;
use App\Models\MocThoigian;
use App\Models\ThanhvienNhom;
use App\Models\SinhvienThamgia;
use App\Models\Nguoidung;
use App\Models\Sinhvien;
use App\Models\Nhom;
use Illuminate\Validation\Rule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Maatwebsite\Excel\Facades\Excel; // Import Excel
use stdClass; // Import stdClass
use App\Imports\PlanParticipantsImport; // Import Class Wizard
use Illuminate\Support\Facades\Hash; // Import Hash
use Illuminate\Support\Facades\Validator; // Import Validator
use Illuminate\Validation\ValidationException; // Import ValidationException
use Illuminate\Support\Str; // Import Str
use Carbon\Carbon; // Import Carbon
use Illuminate\Support\Facades\Storage;

class ThesisPlanController extends Controller
{
    /**
     * Lấy danh sách kế hoạch (hỗ trợ phân trang, tìm kiếm và lọc).
     */
    public function index(Request $request)
    {
        $request->validate([
            'search' => 'nullable|string|max:100',
            'statuses' => 'nullable|array',
            'khoahoc' => 'nullable|array',
            'namhoc' => 'nullable|array',
            'hocky' => 'nullable|array',
            'hedaotao' => 'nullable|array',
        ]);

        $query = KehoachKhoaluan::with('nguoiTao')
                                ->orderBy('KEHOACH_KHOALUAN.NGAYTAO', 'desc');

        if ($request->filled('search')) {
            $query->where('TEN_DOT', 'like', '%' . $request->search . '%');
        }

        if ($request->filled('statuses')) {
            $query->whereIn('TRANGTHAI', $request->statuses);
        }
        if ($request->filled('khoahoc')) {
            $query->whereIn('KHOAHOC', $request->khoahoc);
        }
        if ($request->filled('namhoc')) {
            $query->whereIn('NAMHOC', $request->namhoc);
        }
        if ($request->filled('hocky')) {
            $query->whereIn('HOCKY', $request->hocky);
        }
        if ($request->filled('hedaotao')) {
            $query->whereIn('HEDAOTAO', $request->hedaotao);
        }

        $plans = $query->paginate($request->per_page ?? 10);

        return response()->json($plans);
    }

    /**
     * Lưu một kế hoạch khóa luận mới. 
     * Tự động duyệt nếu người tạo là Trưởng khoa, ngược lại là Chờ phê duyệt.
     */
    public function store(StoreThesisPlanRequest $request)
    {
        if (!$this->canCreatePlan()) {
            return response()->json(['message' => 'Bạn không có quyền tạo kế hoạch.'], 403);
        }

        $validated = $request->validated();

        try {
            DB::beginTransaction();

            $planData = collect($validated)->except('mocThoigians')->all();
            
            $currentUser = $request->user();
            $isTruongKhoa = $this->isTruongKhoa();
            
            $trangThai = $isTruongKhoa ? 'Đã phê duyệt' : 'Bản nháp';
            $nguoiPheDuyet = $isTruongKhoa ? $currentUser->ID_NGUOIDUNG : null;

            $plan = KehoachKhoaluan::create(array_merge($planData, [
                'ID_NGUOITAO' => $currentUser->ID_NGUOIDUNG,
                'TRANGTHAI' => $trangThai,
                'ID_NGUOIPHEDUYET' => $nguoiPheDuyet,
                'NGAYTAO' => now(), // Đảm bảo NGAYTAO được set
                'NGAYCAPNHAT' => now(), // Đảm bảo NGAYCAPNHAT được set
            ]));

            // Tạo các mốc thời gian liên quan
            foreach ($validated['mocThoigians'] as $moc) {
                $plan->mocThoigians()->create([
                    'TEN_SUKIEN' => $moc['TEN_SUKIEN'],
                    'NGAY_BATDAU' => $moc['NGAY_BATDAU'],
                    'NGAY_KETTHUC' => $moc['NGAY_KETTHUC'],
                    'MOTA' => $moc['MOTA'],
                    'VAITRO_THUCHIEN' => $moc['VAITRO_THUCHIEN'] ?? null,
                ]);
            }

            DB::commit();
            
            Cache::forget('plan_filter_options');

            return response()->json($plan->load('mocThoigians', 'nguoiTao', 'nguoiPheDuyet'), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create thesis plan: ' . $e->getMessage());
            return response()->json(['message' => 'Tạo kế hoạch thất bại. Vui lòng thử lại.'], 500);
        }
    }

    /**
     * Lấy chi tiết thông tin của một kế hoạch, bao gồm mốc thời gian và thông tin người tạo/duyệt.
     */
    public function show(KehoachKhoaluan $plan)
    {
        return response()->json($plan->load('mocThoigians', 'nguoiTao', 'nguoiPheDuyet'));
    }

    /**
     * Cập nhật thông tin kế hoạch và các mốc thời gian liên quan.
     */
    public function update(UpdateThesisPlanRequest $request, KehoachKhoaluan $plan)
    {
        $isCreator = $plan->ID_NGUOITAO == Auth::id();
        
        if ($this->isTruongKhoa()) {
             if ($plan->TRANGTHAI === 'Đã hoàn thành') {
                 return response()->json(['message' => 'Không thể chỉnh sửa kế hoạch đã hoàn thành.'], 403);
             }
        } else {
             $canEditDraft = in_array($plan->TRANGTHAI, ['Bản nháp', 'Yêu cầu chỉnh sửa']) && ($isCreator || $this->isAdmin());
             $canEditActive = $plan->TRANGTHAI === 'Đang thực hiện' && ($this->isGiaoVu() || $this->isAdmin());
             if (!($canEditDraft || $canEditActive)) {
                 return response()->json(['message' => 'Bạn không có quyền chỉnh sửa kế hoạch ở trạng thái này.'], 403);
             }
        }

        $validated = $request->validated();
        
        $isPlanRunning = in_array($plan->TRANGTHAI, ['Đang thực hiện', 'Đang chấm điểm', 'Đã hoàn thành']);
        
        $formattedPlanDate = $plan->NGAY_BATDAU->format('Y-m-d'); 

        if ($isPlanRunning && isset($validated['NGAY_BATDAU']) && $validated['NGAY_BATDAU'] !== $formattedPlanDate) {
            return response()->json(['message' => 'Không thể thay đổi Ngày Bắt Đầu khi kế hoạch đang thực hiện hoặc đã hoàn thành.'], 403);
        }
        
        if ($isPlanRunning) {
            unset($validated['NGAY_BATDAU']);
        }

        try {
            DB::beginTransaction();
            
            // Cập nhật kế hoạch (chỉ với các trường đã validate và được phép)
            $plan->update(collect($validated)->except('mocThoigians')->all());

            $incomingIds = collect($validated['mocThoigians'])->pluck('id')->filter();
            $plan->mocThoigians()->whereNotIn('ID', $incomingIds)->delete();
            foreach ($validated['mocThoigians'] as $moc) {
                MocThoigian::updateOrCreate(
                    ['ID' => $moc['id'] ?? null, 'ID_KEHOACH' => $plan->ID_KEHOACH],
                    [
                        'TEN_SUKIEN' => $moc['TEN_SUKIEN'],
                        'NGAY_BATDAU' => $moc['NGAY_BATDAU'],
                        'NGAY_KETTHUC' => $moc['NGAY_KETTHUC'],
                        'MOTA' => $moc['MOTA'],
                        'VAITRO_THUCHIEN' => $moc['VAITRO_THUCHIEN'] ?? null,
                    ]
                );
            }
            
            if (in_array($plan->TRANGTHAI, ['Bản nháp', 'Yêu cầu chỉnh sửa'])) {
                if (($this->isGiaoVu() || $this->isAdmin()) && ($isCreator || $this->isAdmin())) {
                    $plan->TRANGTHAI = 'Bản nháp';
                    $plan->BINHLUAN_PHEDUYET = null;
                } elseif ($this->isTruongKhoa() && ($isCreator || $this->isAdmin())) {
                    $plan->TRANGTHAI = 'Đã phê duyệt';
                    $plan->BINHLUAN_PHEDUYET = null;
                    $plan->ID_NGUOIPHEDUYET = Auth::id();
                }
            }
            elseif ($plan->TRANGTHAI === 'Đang thực hiện') {
                 if ($this->isGiaoVu()) {
                     $plan->TRANGTHAI = 'Chờ duyệt chỉnh sửa';
                     Log::info("Plan ID {$plan->ID_KEHOACH} updated by Giao Vu. Awaiting re-approval.");
                 } elseif ($this->isTruongKhoa() || $this->isAdmin()) {
                     Log::info("Plan ID {$plan->ID_KEHOACH} updated and auto-approved by Truong Khoa/Admin.");
                 }
            }
            elseif ($this->isTruongKhoa()) {
                 if(in_array($plan->TRANGTHAI, ['Chờ phê duyệt', 'Chờ duyệt chỉnh sửa'])){
                     $plan->TRANGTHAI = ($plan->TRANGTHAI === 'Chờ duyệt chỉnh sửa') ? 'Đang thực hiện' : 'Đã phê duyệt';
                     $plan->ID_NGUOIPHEDUYET = Auth::id();
                     $plan->BINHLUAN_PHEDUYET = null;
                 }
            }
            
            $plan->save();

            DB::commit();
            
            Cache::forget('plan_filter_options');

            return response()->json($plan->load('mocThoigians'));
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update thesis plan: ' . $e->getMessage());
            return response()->json(['message' => 'Cập nhật kế hoạch thất bại. Vui lòng thử lại.'], 500);
        }
    }

    /**
     * Xóa một kế hoạch (chỉ khi ở trạng thái 'Bản nháp' và là người tạo hoặc Admin).
     */
    public function destroy(KehoachKhoaluan $plan)
    {
        $isTruongKhoa = $this->isTruongKhoa();
        $isCreatorOrAdmin = ($plan->ID_NGUOITAO === Auth::id() || $this->isAdmin());

        if ($isTruongKhoa) {
            if ($plan->TRANGTHAI === 'Đã hoàn thành') {
                 return response()->json(['message' => 'Không thể xóa kế hoạch đã hoàn thành.'], 403);
            }
        } else if ($isCreatorOrAdmin) {
            if ($plan->TRANGTHAI !== 'Bản nháp') {
                return response()->json(['message' => 'Chỉ có thể xóa kế hoạch ở trạng thái "Bản nháp".'], 403);
            }
        } else {
             return response()->json(['message' => 'Bạn không có quyền xóa kế hoạch này.'], 403);
        }
        
        $plan->delete();
        Cache::forget('plan_filter_options');
        return response()->json(null, 204);
    }

    /**
     * Gửi kế hoạch (từ 'Bản nháp') để chuyển sang trạng thái 'Chờ phê duyệt'.
     * Chỉ người tạo (là Giáo vụ/Admin) mới có quyền gửi.
     */
    public function submitForApproval(Request $request, KehoachKhoaluan $plan)
    {
         if (!(($this->isGiaoVu() || $this->isAdmin()) && $plan->ID_NGUOITAO === Auth::id())) {
             return response()->json(['message' => 'Bạn không có quyền gửi duyệt kế hoạch này.'], 403);
         }

         if ($plan->TRANGTHAI !== 'Bản nháp') {
             return response()->json(['message' => 'Chỉ có thể gửi duyệt kế hoạch ở trạng thái "Bản nháp".'], 400);
         }
         
         $plan->update(['TRANGTHAI' => 'Chờ phê duyệt']);
         
         return response()->json(['message' => 'Đã gửi kế hoạch để phê duyệt thành công.']);
    }

    /**
     * Phê duyệt kế hoạch. 
     * Chỉ Trưởng khoa mới có quyền thực hiện.
     */
    public function approve(KehoachKhoaluan $plan)
    {
        if (!$this->isTruongKhoa()) {
             return response()->json(['message' => 'Bạn không có quyền phê duyệt kế hoạch.'], 403);
        }

        $allowedStatuses = ['Chờ phê duyệt', 'Chờ duyệt chỉnh sửa'];
        if (!in_array($plan->TRANGTHAI, $allowedStatuses)) {
            return response()->json(['message' => 'Chỉ có thể phê duyệt kế hoạch ở trạng thái "Chờ phê duyệt" hoặc "Chờ duyệt chỉnh sửa".'], 400);
        }

        $newStatus = ($plan->TRANGTHAI === 'Chờ duyệt chỉnh sửa') ? 'Đang thực hiện' : 'Đã phê duyệt';

        $plan->update([
            'TRANGTHAI' => $newStatus,
            'BINHLUAN_PHEDUYET' => null, // Xóa bình luận nếu có từ yêu cầu chỉnh sửa
            'ID_NGUOIPHEDUYET' => Auth::id()
        ]);
        
        return response()->json(['message' => 'Đã phê duyệt kế hoạch thành công.']);
    }

    /**
     * Yêu cầu người tạo chỉnh sửa kế hoạch.
     * Chỉ Trưởng khoa mới có quyền thực hiện.
     */
    public function requestChanges(Request $request, KehoachKhoaluan $plan)
    {
        $validated = $request->validate(['comment' => 'required|string|max:1000']);
        
        if (!$this->isTruongKhoa()) {
             return response()->json(['message' => 'Bạn không có quyền yêu cầu chỉnh sửa.'], 403);
        }

        $allowedStatuses = ['Chờ phê duyệt', 'Chờ duyệt chỉnh sửa'];
        if (!in_array($plan->TRANGTHAI, $allowedStatuses)) {
            return response()->json(['message' => 'Chỉ có thể yêu cầu chỉnh sửa kế hoạch ở các trạng thái chờ duyệt.'], 400);
        }

        $plan->update([
            'TRANGTHAI' => 'Yêu cầu chỉnh sửa',
            'BINHLUAN_PHEDUYET' => $validated['comment'],
            'ID_NGUOIPHEDUYET' => Auth::id()
        ]);

        return response()->json(['message' => 'Đã gửi yêu cầu chỉnh sửa.']);
    }

    /**
     * Kích hoạt kế hoạch (chuyển sang 'Đang thực hiện').
     * Chỉ áp dụng cho kế hoạch ở trạng thái 'Đã phê duyệt'.
     */
    public function activatePlan(Request $request, KehoachKhoaluan $plan)
    {
        if (!($this->isGiaoVu() || $this->isTruongKhoa() || $this->isAdmin())) {
             return response()->json(['message' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }

        if ($plan->TRANGTHAI !== 'Đã phê duyệt') {
            return response()->json(['message' => 'Chỉ có thể kích hoạt kế hoạch ở trạng thái "Đã phê duyệt".'], 400);
        }
        
        $plan->update(['TRANGTHAI' => 'Đang thực hiện']);
        
        return response()->json(['message' => 'Kế hoạch đã được kích hoạt và đang thực hiện.']);
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
     * Xem trước file PDF (dựa trên dữ liệu form) khi tạo kế hoạch mới.
     */
    public function previewNewPlan(StoreThesisPlanRequest $request)
    {
        $validated = $request->validated();

        try {
            // Tạo đối tượng KehoachKhoaluan và MocThoigian ảo để hiển thị
            $plan = new KehoachKhoaluan($validated);
            $mocThoigianCollection = collect($validated['mocThoigians'])->map(function ($moc) {
                return new MocThoigian([
                    'TEN_SUKIEN' => $moc['TEN_SUKIEN'],
                    'NGAY_BATDAU' => $moc['NGAY_BATDAU'],
                    'NGAY_KETTHUC' => $moc['NGAY_KETTHUC'],
                    'MOTA' => $moc['MOTA'],
                    'VAITRO_THUCHIEN' => $moc['VAITRO_THUCHIEN'] ?? null,
                ]);
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
     * Lấy danh sách rút gọn (ID, Tên) của tất cả kế hoạch (dùng cho dropdown/selectbox).
     */
    public function getAllPlans()
    {
        $plans = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đã phê duyệt', 'Đang thực hiện'])
            ->orderBy('NGAYTAO', 'desc')
            ->get(['ID_KEHOACH', 'TEN_DOT', 'NAMHOC', 'TRANGTHAI', 'KHOAHOC', 'NGAYTAO']);

        return response()->json($plans);
    }

    /**
     * Lấy các giá trị duy nhất (distinct) cho các cột lọc (Khóa học, Năm học, Học kỳ, Hệ đào tạo).
     */
    public function getFilterOptions()
    {
        // Cache kết quả trong 10 phút để tối ưu hiệu suất
        $options = Cache::remember('plan_filter_options', 60 * 10, function () {
            $khoahoc = KehoachKhoaluan::select('KHOAHOC')
                ->whereNotNull('KHOAHOC')
                ->distinct()
                ->orderBy('KHOAHOC', 'desc')
                ->pluck('KHOAHOC');

            $namhoc = KehoachKhoaluan::select('NAMHOC')
                ->whereNotNull('NAMHOC')
                ->distinct()
                ->orderBy('NAMHOC', 'desc')
                ->pluck('NAMHOC');

            $hocky = KehoachKhoaluan::select('HOCKY')
                ->whereNotNull('HOCKY')
                ->distinct()
                ->orderBy('HOCKY')
                ->pluck('HOCKY');

            $hedaotao = KehoachKhoaluan::select('HEDAOTAO')
                ->whereNotNull('HEDAOTAO')
                ->distinct()
                ->orderBy('HEDAOTAO')
                ->pluck('HEDAOTAO');

            return [
                'khoahoc' => $khoahoc,
                'namhoc' => $namhoc,
                'hocky' => $hocky,
                'hedaotao' => $hedaotao,
            ];
        });

        return response()->json($options);
    }

    /**
     * Lấy danh sách sinh viên tham gia một kế hoạch (hỗ trợ phân trang, tìm kiếm và lọc).
     */
    public function getParticipants(Request $request, KehoachKhoaluan $plan)
    {
        // Validation cho bộ lọc chuyên ngành
        $request->validate([
            'search' => 'nullable|string|max:100',
            'eligible' => 'nullable|array',
            'chuyen_nganh_ids' => 'nullable|array',
            'chuyen_nganh_ids.*' => 'integer',
        ]);
        
        $query = SinhvienThamgia::where('ID_KEHOACH', $plan->ID_KEHOACH)
            ->with(['sinhvien.nguoidung', 'sinhvien.chuyennganh']);

        // Lọc theo từ khóa tìm kiếm
        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->whereHas('sinhvien.nguoidung', function ($q) use ($searchTerm) {
                $q->where('HODEM_VA_TEN', 'like', "%{$searchTerm}%")
                    ->orWhere('MA_DINHDANH', 'like', "%{$searchTerm}%")
                    ->orWhere('EMAIL', 'like', "%{$searchTerm}%");
            });
        }

        // Lọc theo điều kiện đủ điều kiện (DU_DIEUKIEN)
        if ($request->filled('eligible')) {
            $eligibleValues = collect($request->input('eligible'))->map(function ($value) {
                return $value === 'true' ? 1 : ($value === 'false' ? 0 : null);
            })->filter(fn($v) => $v !== null)->all();

            if (!empty($eligibleValues)) {
                $query->whereIn('DU_DIEUKIEN', $eligibleValues);
            }
        }

        // Logic lọc theo chuyên ngành
        if ($request->filled('chuyen_nganh_ids')) {
            $query->whereHas('sinhvien', function ($q) use ($request) {
                $q->whereIn('ID_CHUYENNGANH', $request->chuyen_nganh_ids);
            });
        }
        
        // Sắp xếp
        $nameSubQuery = Nguoidung::select('HODEM_VA_TEN')
            ->join('SINHVIEN', 'SINHVIEN.ID_NGUOIDUNG', '=', 'NGUOIDUNG.ID_NGUOIDUNG')
            ->whereColumn('SINHVIEN.ID_SINHVIEN', 'SINHVIEN_THAMGIA.ID_SINHVIEN')
            ->limit(1);

        if ($request->filled('sort')) {
            list($sortCol, $sortDir) = explode(',', $request->sort);

            if ($sortCol === 'sinhvien.nguoidung.HODEM_VA_TEN') {
                $query->orderBy($nameSubQuery, $sortDir);
            } elseif (in_array($sortCol, ['NGAY_DANGKY', 'DU_DIEUKIEN'])) {
                $query->orderBy($sortCol, $sortDir);
            }
        } else {
            $query->orderBy($nameSubQuery, 'asc'); // Mặc định sắp xếp theo tên
        }

        $participants = $query->paginate($request->per_page ?? 15);

        return response()->json($participants);
    }

    /**
     * Thêm một hoặc nhiều sinh viên vào kế hoạch.
     * Kiểm tra trùng lặp sinh viên trong kế hoạch.
     */
    public function addParticipants(Request $request, KehoachKhoaluan $plan)
    {
        $validated = $request->validate([
            'student_ids' => 'required|array|min:1',
            'student_ids.*' => [
                'required',
                'integer',
                'exists:SINHVIEN,ID_SINHVIEN',
                // Đảm bảo sinh viên chưa có trong kế hoạch
                Rule::unique('SINHVIEN_THAMGIA', 'ID_SINHVIEN')->where('ID_KEHOACH', $plan->ID_KEHOACH)
            ],
            'du_dieukien' => 'sometimes|boolean'
        ], [
            'student_ids.*.exists' => 'ID Sinh viên #:input không tồn tại.',
            'student_ids.*.unique' => 'Sinh viên #:input đã có trong kế hoạch này.'
        ]);

        $dataToInsert = [];
        $now = now();
        $duDieuKien = $request->boolean('du_dieukien', true);

        // Chuẩn bị dữ liệu để insert hàng loạt
        foreach ($validated['student_ids'] as $studentId) {
            $dataToInsert[] = [
                'ID_KEHOACH' => $plan->ID_KEHOACH,
                'ID_SINHVIEN' => $studentId,
                'DU_DIEUKIEN' => $duDieuKien,
                'NGAY_DANGKY' => $now,
            ];
        }

        SinhvienThamgia::insert($dataToInsert);

        return response()->json(['message' => 'Đã thêm thành công ' . count($dataToInsert) . ' sinh viên vào kế hoạch.'], 201);
    }

    /**
     * Cập nhật thông tin tham gia của sinh viên (VD: trạng thái đủ điều kiện).
     */
    public function updateParticipant(Request $request, KehoachKhoaluan $plan, SinhvienThamgia $sinhvienThamgia)
    {
        if ($sinhvienThamgia->ID_KEHOACH !== $plan->ID_KEHOACH) {
            return response()->json(['message' => 'Thông tin không khớp.'], 400);
        }

        $validated = $request->validate([
            'DU_DIEUKIEN' => 'required|boolean',
        ]);

        $sinhvienThamgia->update($validated);

        return response()->json($sinhvienThamgia->load(['sinhvien.nguoidung', 'sinhvien.chuyennganh']));
    }

    /**
     * Xóa sinh viên khỏi kế hoạch.
     * [HOÀN TÁC] Logic an toàn: Chỉ xóa nếu không ở trong nhóm.
     */
    public function removeParticipant(KehoachKhoaluan $plan, SinhvienThamgia $sinhvienThamgia)
    {
        if ($sinhvienThamgia->ID_KEHOACH !== $plan->ID_KEHOACH) {
            return response()->json(['message' => 'Thông tin không khớp.'], 400);
        }

        $sinhvienThamgia->loadMissing('sinhvien.nguoidung');
        if (!$sinhvienThamgia->sinhvien) {
            Log::warning("SinhvienThamgia record ID {$sinhvienThamgia->ID_THAMGIA} is missing the Sinhvien relationship.");
        } else {
            $studentUserId = $sinhvienThamgia->sinhvien->ID_NGUOIDUNG;
            if ($studentUserId) {
                // Kiểm tra sinh viên có phải là thành viên của nhóm nào trong kế hoạch này không
                $isInGroup = ThanhvienNhom::where('ID_NGUOIDUNG', $studentUserId)
                    ->whereHas('nhom', fn($q) => $q->where('ID_KEHOACH', $plan->ID_KEHOACH))
                    ->exists();

                if ($isInGroup) {
                    $studentName = $sinhvienThamgia->sinhvien->nguoidung->HODEM_VA_TEN ?? $sinhvienThamgia->sinhvien->ID_SINHVIEN;
                    return response()->json(['message' => "Không thể xóa sinh viên '{$studentName}' vì đang ở trong một nhóm. Vui lòng xóa sinh viên khỏi nhóm trước."], 409);
                }
            } else {
                Log::warning("Sinhvien record ID {$sinhvienThamgia->sinhvien->ID_SINHVIEN} linked to SinhvienThamgia ID {$sinhvienThamgia->ID_THAMGIA} is missing ID_NGUOIDUNG.");
            }
        }

        $sinhvienThamgia->delete();

        return response()->json(null, 204);
    }

    /**
     * Xóa hàng loạt sinh viên khỏi kế hoạch.
     * [HOÀN TÁC] Logic an toàn: Chỉ xóa nếu không ở trong nhóm.
     */
    public function bulkRemoveParticipants(Request $request, KehoachKhoaluan $plan)
    {
        $validated = $request->validate([
            'participant_ids' => 'required|array|min:1',
            'participant_ids.*' => [
                'required',
                'integer',
                Rule::exists('SINHVIEN_THAMGIA', 'ID_THAMGIA')->where('ID_KEHOACH', $plan->ID_KEHOACH)
            ]
        ], [
            'participant_ids.*.exists' => 'Một hoặc nhiều ID tham gia không hợp lệ hoặc không thuộc kế hoạch này.'
        ]);

        $participantIds = $validated['participant_ids'];
        $count = count($participantIds);

        // Lấy thông tin sinh viên để kiểm tra trạng thái nhóm
        $participantsInfo = SinhvienThamgia::with('sinhvien.nguoidung')
                            ->whereIn('ID_THAMGIA', $participantIds)
                            ->get();

        $studentNamesInGroups = [];
        foreach ($participantsInfo as $participant) {
            if ($participant->sinhvien?->ID_NGUOIDUNG) {
                 // Kiểm tra sinh viên có thuộc nhóm nào trong kế hoạch này không
                 $isInGroup = ThanhvienNhom::where('ID_NGUOIDUNG', $participant->sinhvien->ID_NGUOIDUNG)
                    ->whereHas('nhom', fn($q) => $q->where('ID_KEHOACH', $plan->ID_KEHOACH))
                    ->exists();
                 if ($isInGroup) {
                     $studentNamesInGroups[] = $participant->sinhvien->nguoidung->HODEM_VA_TEN ?? $participant->sinhvien->ID_SINHVIEN;
                 }
            }
        }

        if (!empty($studentNamesInGroups)) {
             return response()->json([
                 'message' => 'Không thể xóa vì các sinh viên sau đang ở trong nhóm: ' . implode(', ', $studentNamesInGroups) . '. Vui lòng xóa họ khỏi nhóm trước.'
             ], 409);
        }

        try {
            DB::beginTransaction();
            // Tiến hành xóa hàng loạt
            SinhvienThamgia::whereIn('ID_THAMGIA', $participantIds)->delete();
            DB::commit();
            Log::info("Admin user ID {$request->user()->ID_NGUOIDUNG} bulk removed {$count} participants from plan ID {$plan->ID_KEHOACH}.");
            return response()->json(['message' => "Đã xóa thành công {$count} sinh viên khỏi kế hoạch."]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to bulk remove participants from plan ID {$plan->ID_KEHOACH}: " . $e->getMessage());
            return response()->json(['message' => 'Xóa hàng loạt thất bại. Vui lòng thử lại.'], 500);
        }
    }


    /**
     * Tìm kiếm sinh viên (chưa tham gia kế hoạch này) để thêm vào.
     */
    public function searchStudentsForPlan(Request $request, KehoachKhoaluan $plan)
    {
         $request->validate([
            'search' => 'nullable|string|min:2|max:100'
         ], [
             'search.min' => 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự.',
         ]);
         
         $searchTerm = $request->search;

         if (!$searchTerm) {
             return response()->json([]);
         }
         
         $existingStudentIds = SinhvienThamgia::where('ID_KEHOACH', $plan->ID_KEHOACH)->pluck('ID_SINHVIEN');

         $query = Sinhvien::with(['nguoidung' => function ($q) {
             $q->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'MA_DINHDANH', 'EMAIL');
         }, 'chuyennganh' => function ($q) {
             $q->select('ID_CHUYENNGANH', 'TEN_CHUYENNGANH');
         }])
             ->whereNotIn('ID_SINHVIEN', $existingStudentIds)
             ->whereHas('nguoidung', function ($q) use ($searchTerm) {
                 $q->where('HODEM_VA_TEN', 'like', "%{$searchTerm}%")
                     ->orWhere('MA_DINHDANH', 'like', "%{$searchTerm}%")
                     ->orWhere('EMAIL', 'like', "%{$searchTerm}%");
             })
             ->select('SINHVIEN.ID_SINHVIEN', 'SINHVIEN.ID_NGUOIDUNG', 'SINHVIEN.ID_CHUYENNGANH');

         $query->limit(20); 
         $students = $query->get();

         $results = $students->map(function ($sv) {
             if (!$sv->nguoidung) {
                 Log::warning("Sinhvien ID {$sv->ID_SINHVIEN} is missing Nguoidung relationship in searchStudentsForPlan.");
                 return null;
             }
            return [
                 'ID_SINHVIEN' => $sv->ID_SINHVIEN,
                 'ID_NGUOIDUNG' => $sv->nguoidung->ID_NGUOIDUNG,
                 'HODEM_VA_TEN' => $sv->nguoidung->HODEM_VA_TEN,
                 'MA_DINHDANH' => $sv->nguoidung->MA_DINHDANH,
                 'EMAIL' => $sv->nguoidung->EMAIL,
                 'TEN_CHUYENNGANH' => $sv->chuyennganh?->TEN_CHUYENNGANH,
            ];
         })->filter();

         return response()->json($results);
    }

    /**
 * Giai đoạn 1: Phân tích file import và trả về header + 5 dòng preview.
 * Đọc file dựa trên cấu trúc file mẫu (bỏ 9 dòng đầu).
 */
public function importAnalyze(Request $request, KehoachKhoaluan $plan)
{
    $request->validate([
        'file' => 'required|mimes:xlsx,xls,csv|max:10240' // 10MB
    ]);

    try {
        // Sử dụng toArray để lấy dữ liệu thô
        $rows = Excel::toArray(new stdClass, $request->file('file'))[0]; // Lấy sheet đầu tiên
        
        // Giả định dựa trên file mẫu "KHÓA LUẬN CỬ NHÂN.xls":
        $headerRowIndex = 9; // Dòng 10 trong file (index 9)
        $dataRowStartIndex = 10; // Dòng 11 trong file (index 10)

        if (count($rows) < $dataRowStartIndex) {
            return response()->json(['message' => 'File không có dữ liệu hoặc không đúng định dạng. Dữ liệu cần bắt đầu từ dòng 11.'], 422);
        }

        // Lấy headers
        $rawHeaders = $rows[$headerRowIndex] ?? [];
        $detectedHeaders = [];

        if (empty($rawHeaders) || !is_iterable($rawHeaders)) {
            return response()->json(['message' => "Dòng header (dòng " . ($headerRowIndex + 1) . ") bị trống hoặc không thể đọc."], 422);
        }

        foreach ($rawHeaders as $index => $header) {
            // [ĐÃ SỬA] Quay lại logic (Cột {$index})
            $headerName = $header ? trim($header) : "(Cột {$index})";
            
            // Đổi tên các cột _unnamed_ (thường do Maatwebsite tự thêm nếu header là số)
            if (preg_match('/_unnamed_(\d+)/', $headerName, $matches)) {
                // [ĐÃ SỬA] Dùng $matches[1] (là index)
                $headerName = "(Cột " . ($matches[1]) . ")";
            }
            
            // Logic chống trùng lặp tên
            $originalHeaderName = $headerName;
            $count = 2;
            while (in_array($headerName, $detectedHeaders)) {
                $headerName = "{$originalHeaderName} ({$count})";
                $count++;
            }
            $detectedHeaders[] = $headerName;
        }

        // Lấy 5 dòng preview
        $previewData = array_slice($rows, $dataRowStartIndex, 5);

        // Chuẩn hóa preview data để có số cột bằng header
        $headerCount = count($detectedHeaders);
        $normalizedPreviewData = [];

        foreach ($previewData as $row) {
            $normalizedRow = array_slice($row, 0, $headerCount);
            // Pad mảng nếu hàng dữ liệu ngắn hơn header
            if (count($normalizedRow) < $headerCount) {
                $normalizedRow = array_pad($normalizedRow, $headerCount, null);
            }
            $normalizedPreviewData[] = $normalizedRow;
        }

        return response()->json([
            'detectedHeaders' => $detectedHeaders,
            'previewData' => $normalizedPreviewData,
            'totalRows' => count($rows) - $dataRowStartIndex, // Tổng số dòng dữ liệu
            'headerRowIndex' => $headerRowIndex, // Gửi về index header
            'dataRowStartIndex' => $dataRowStartIndex,
        ]);
    } catch (\Exception $e) {
        Log::error('Import Analyze Error: ' . $e->getMessage());
        return response()->json(['message' => 'Không thể đọc file. File có thể bị hỏng hoặc sai định dạng. Lỗi: ' . $e->getMessage()], 500);
    }
}

    /**
     * Giai đoạn 2 & 3: Nhận file, mapping, defaults -> Validate và trả về Preview
     */
    public function importPreview(Request $request, KehoachKhoaluan $plan)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
            'mapping' => 'required|array',
            'mapping.ma_dinh_danh' => 'required|string',
            'mapping.ho_ten' => 'required|array|min:1',
            'mapping.ho_ten.*' => 'required|string',
            'mapping.ngay_sinh' => 'nullable|string',
            'mapping.ten_lop' => 'nullable|string',
            'mapping.nien_khoa' => 'required|array',
            'mapping.nien_khoa.source' => 'required|string', // 'ten_lop' hoặc 'default'
            'mapping.nien_khoa.value' => 'required|string', // Tên cột (nếu source=ten_lop) hoặc giá trị (nếu source=default)
            'mapping.nien_khoa.prefix' => 'nullable|string', // vd: 'K'
            'mapping.nien_khoa.length' => 'nullable|integer', // vd: 2
            'defaults' => 'required|array',
            'defaults.ID_CHUYENNGANH' => 'required|integer|exists:CHUYENNGANH,ID_CHUYENNGANH',
            'defaults.HEDAOTAO' => 'required|string',
            'defaults.ID_VAITRO' => 'required|integer|exists:VAITRO,ID_VAITRO',
            'headerRowIndex' => 'required|integer',
            'dataRowStartIndex' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Cấu hình import không hợp lệ.', 'errors' => $validator->errors()], 422);
        }

        try {
            $import = new PlanParticipantsImport(
                $plan->ID_KEHOACH,
                $request->input('mapping'),
                $request->input('defaults'),
                $request->input('headerRowIndex'),
                $request->input('dataRowStartIndex')
            );

            Excel::import($import, $request->file('file'));

            $dataToReturn = [
                'validRows' => $import->validRows,
                'invalidRows' => $import->invalidRows,
                'ignoredRows' => $import->ignoredRows,
            ];

            return response()->json($dataToReturn, 200, [], JSON_INVALID_UTF8_SUBSTITUTE);

        } catch (ValidationException $e) {
             return response()->json(['message' => 'Lỗi Validation khi import.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Import Preview Error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Lỗi máy chủ khi xem trước file: ' . $e->getMessage()], 500);
        }
    }
    
    /**
     * Giai đoạn 4: Xử lý (Process) các 'validRows' đã được duyệt
     */
    /**
 * Giai đoạn 4: Xử lý (Process) các 'validRows' đã được duyệt
 */
public function importProcess(Request $request, KehoachKhoaluan $plan)
{
    $validated = $request->validate([
        'validRows' => 'required|array',
        'validRows.*.action' => 'required|in:link,create_and_link',
        'validRows.*.data' => 'required|array', // BẮT BUỘC CÓ 'data'
        'defaults' => 'required|array',
        'defaults.ID_CHUYENNGANH' => 'required|integer|exists:CHUYENNGANH,ID_CHUYENNGANH',
        'defaults.HEDAOTAO' => 'required|string',
        'defaults.ID_VAITRO' => 'required|integer|exists:VAITRO,ID_VAITRO',
    ]);

    $validRows = $validated['validRows'];
    $defaults = $validated['defaults'];
    $countLinked = 0;
    $countCreated = 0;

    DB::beginTransaction();
    try {
        foreach ($validRows as $index => $row) {
            // === KIỂM TRA CẤU TRÚC ROW ===
            if (!isset($row['action']) || !isset($row['data']) || !is_array($row['data'])) {
                Log::warning("Invalid row structure at index {$index}", ['row' => $row]);
                continue;
            }

            $action = $row['action'];
            $data = $row['data'];

            // === XỬ LÝ LINK (sinh viên đã tồn tại) ===
            if ($action === 'link') {
                if (!isset($data['ID_SINHVIEN'])) {
                    Log::warning("Missing ID_SINHVIEN in link row", ['data' => $data]);
                    continue;
                }

                SinhvienThamgia::create([
                    'ID_KEHOACH' => $plan->ID_KEHOACH,
                    'ID_SINHVIEN' => $data['ID_SINHVIEN'],
                    'DU_DIEUKIEN' => true,
                    'NGAY_DANGKY' => now(),
                ]);
                $countLinked++;
                continue;
            }

            // === XỬ LÝ TẠO MỚI + LINK ===
            if ($action === 'create_and_link') {
                // Kiểm tra bắt buộc
                if (empty($data['MA_DINHDANH']) || empty($data['HODEM_VA_TEN'])) {
                    Log::warning("Missing required fields in create_and_link", ['data' => $data]);
                    continue;
                }

                // Tạo email nếu chưa có
                $email = $data['EMAIL'] ?? null;
                if (!$email) {
                    $email = $this->generateEmail($data['HODEM_VA_TEN'], $data['MA_DINHDANH']);
                    if (Nguoidung::where('EMAIL', $email)->exists()) {
                        $email = $this->generateEmail($data['HODEM_VA_TEN'], $data['MA_DINHDANH'], true);
                    }
                }

                // 1. Tạo Nguoidung
                $newUser = Nguoidung::create([
                    'MA_DINHDANH' => $data['MA_DINHDANH'],
                    'HODEM_VA_TEN' => $data['HODEM_VA_TEN'],
                    'EMAIL' => $email,
                    'NGAYSINH' => $data['NGAYSINH'] ?? null,
                    'MATKHAU_BAM' => Hash::make('123456'),
                    'ID_VAITRO' => $defaults['ID_VAITRO'],
                    'LA_DANGNHAP_LANDAU' => true,
                    'TRANGTHAI_KICHHOAT' => true,
                ]);

                // 2. Tạo Sinhvien
                $newSinhvien = $newUser->sinhvien()->create([
                    'ID_CHUYENNGANH' => $defaults['ID_CHUYENNGANH'],
                    'NIENKHOA' => $data['NIENKHOA'] ?? null,
                    'HEDAOTAO' => $defaults['HEDAOTAO'],
                    'TEN_LOP' => $data['TEN_LOP'] ?? null,
                ]);

                // 3. Liên kết vào kế hoạch
                SinhvienThamgia::create([
                    'ID_KEHOACH' => $plan->ID_KEHOACH,
                    'ID_SINHVIEN' => $newSinhvien->ID_SINHVIEN,
                    'DU_DIEUKIEN' => true,
                    'NGAY_DANGKY' => now(),
                ]);

                $countCreated++;
                continue;
            }

            // Action không hợp lệ
            Log::warning("Unknown action in row", ['action' => $action]);
        }

        DB::commit();

        return response()->json([
            'message' => "Import hoàn tất!",
            'description' => "Đã liên kết {$countLinked} sinh viên và tạo mới {$countCreated} sinh viên."
        ]);
    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Import Process Error: ' . $e->getMessage(), [
            'trace' => $e->getTraceAsString(),
            'request' => $request->all()
        ]);
        return response()->json([
            'message' => 'Lỗi nghiêm trọng khi lưu dữ liệu. Toàn bộ thao tác đã được hoàn tác.',
            'error' => $e->getMessage()
        ], 500);
    }
}

// === THÊM HÀM generateEmail (nếu chưa có trong controller) ===
private function generateEmail(string $hoTen, string $mssv, bool $addRandom = false): string
{
    $parts = explode(' ', $hoTen);
    $lastName = Str::slug(array_pop($parts));
    $initials = '';
    foreach ($parts as $part) {
        $initials .= mb_substr(Str::slug($part), 0, 1);
    }
    $random = $addRandom ? rand(10, 99) : '';
    return strtolower("{$lastName}{$initials}.{$mssv}{$random}@gradpro.test");
}
}