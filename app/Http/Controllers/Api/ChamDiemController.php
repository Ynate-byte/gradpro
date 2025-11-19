<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use App\Models\Nhom;
use App\Models\TyTrongDiem;
use App\Models\DiemHuongDan;
use App\Models\DiemPhanBien;
use App\Models\DiemHoiDong;
use App\Models\DiemTongKet;
use App\Models\PhancongDetaiNhom;

class ChamDiemController extends Controller
{
    /**
     * Lấy thông tin nhóm + giảng viên (để chấm điểm)
     * Bao gồm: sinh viên, GVHD, phản biện, hội đồng bảo vệ
     */
    public function getNhom($id)
    {
        try {
            $nhom = Nhom::with([
                'thanhviens.nguoidung.sinhvien',
                'phancongDetaiNhom.detai',
                'phancongDetaiNhom.gvhd.nguoidung',
                'hoidongs.giangviens.nguoidung',
                'kehoach',
            ])->find($id);

            if (!$nhom) {
                return response()->json(['error' => 'Không tìm thấy nhóm'], 404);
            }

            // === Xử lý sinh viên ===
            $sinhviens = $nhom->thanhviens->map(fn($tv) => [
                'ID_SINHVIEN'  => $tv->nguoidung?->sinhvien?->ID_SINHVIEN,
                'MA_DINHDANH'  => $tv->nguoidung?->MA_DINHDANH ?? 'N/A',
                'HODEM_VA_TEN' => $tv->nguoidung?->HODEM_VA_TEN ?? 'Không rõ'
            ])->values();

            // === Xử lý GVHD ===
            $gvhd = $nhom->phancongDetaiNhom?->gvhd;
            $huongdan = $gvhd ? [
                'ID_GIANGVIEN' => $gvhd->ID_GIANGVIEN,
                'HOTEN'        => $gvhd->nguoidung?->HODEM_VA_TEN ?? 'Không rõ',
                'VAITRO'       => 'Hướng dẫn'
            ] : null;

            // === Tách hội đồng: Bảo vệ & Phản biện ===
            $hoidongBaoVe    = $nhom->hoidongs->firstWhere('LOAI', 'hoidong');
            $hoidongPhanBien = $nhom->hoidongs->firstWhere('LOAI', 'phanbien');

            $giangvienHoiDong  = collect();
            $giangvienPhanBien = collect();

            if ($hoidongBaoVe) {
                $giangvienHoiDong = $hoidongBaoVe->giangviens->map(fn($gv) => [
                    'ID_GIANGVIEN' => $gv->ID_GIANGVIEN,
                    'HOTEN'        => $gv->nguoidung?->HODEM_VA_TEN ?? 'Không rõ',
                    'VAITRO'       => $gv->pivot->VAITRO ?? 'Thành viên HĐ'
                ]);
            }

            if ($hoidongPhanBien) {
                $giangvienPhanBien = $hoidongPhanBien->giangviens->map(fn($gv) => [
                    'ID_GIANGVIEN' => $gv->ID_GIANGVIEN,
                    'HOTEN'        => $gv->nguoidung?->HODEM_VA_TEN ?? 'Không rõ',
                    'VAITRO'       => 'Phản biện'
                ]);
            }

            // === Gộp tất cả giảng viên ===
            $giangviens = collect([$huongdan])
                ->merge($giangvienPhanBien)
                ->merge($giangvienHoiDong)
                ->filter()
                ->values();

            return response()->json([
                'nhom' => [
                    'ID_NHOM'   => $nhom->ID_NHOM,
                    'TEN_NHOM'  => $nhom->TEN_NHOM,
                    'DETAI'     => $nhom->phancongDetaiNhom?->detai?->TEN_DETAI ?? '-',
                    'SINHVIEN'  => $sinhviens,
                    'GIANGVIEN' => $giangviens,
                    'kehoach'   => $nhom->kehoach,
                ]
            ]);

        } catch (\Throwable $e) {
            Log::error(
                "Lỗi getNhom (ChamDiemController): " . $e->getMessage(),
                ['trace' => $e->getTraceAsString()]
            );

            return response()->json(['error' => 'Lỗi máy chủ nội bộ'], 500);
        }
    }


    /**
     * Lấy tỷ trọng điểm hiện hành (Global)
     */
    public function getTyTrong()
    {
        $tytrong = TyTrongDiem::getCurrent() 
            ?? TyTrongDiem::first() 
            ?? (object)['HUONGDAN' => 0.4, 'PHANBIEN' => 0.3, 'HOIDONG' => 0.3];

        return response()->json($tytrong);
    }

    /**
     * Cập nhật tỷ trọng điểm Global (Chỉ Admin/Giáo vụ)
     */
    public function capNhatTyTrong(Request $request)
    {
        // [CẬP NHẬT] Bổ sung kiểm tra quyền Admin/Giáo vụ
        if (!$this->isAdmin() && !$this->isGiaoVu()) {
            return response()->json(['error' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }

        $validated = $request->validate([
            'HUONGDAN'  => 'required|numeric|min:0|max:1',
            'PHANBIEN'  => 'required|numeric|min:0|max:1',
            'HOIDONG'   => 'required|numeric|min:0|max:1',
        ]);

        $tong = array_sum($validated);

        if (abs($tong - 1) > 0.001) {
            return response()->json(['error' => 'Tổng tỷ trọng phải bằng 1'], 422);
        }

        TyTrongDiem::updateTyTrong(
            $validated['HUONGDAN'],
            $validated['PHANBIEN'],
            $validated['HOIDONG']
        );

        return response()->json(['message' => 'Cập nhật tỷ trọng thành công!']);
    }

    /**
     * (Chung) Lưu điểm cho một giảng viên cụ thể
     * Hàm này xử lý logic kiểm tra thời gian, quyền hạn và tính toán lại điểm tổng.
     */
    private function saveDiem(Request $request, Nhom $nhom, string $loai)
    {
        // 1. Validate dữ liệu đầu vào
        $validated = $request->validate([
            'DIEM' => 'required|numeric|min:0|max:10',
            'NHANXET' => 'nullable|string|max:1000'
        ], [
            'DIEM.required' => 'Vui lòng nhập điểm.',
            'DIEM.numeric' => 'Điểm phải là số.',
            'DIEM.min' => 'Điểm không được nhỏ hơn 0.',
            'DIEM.max' => 'Điểm không được lớn hơn 10.',
        ]);

        $giangvien = Auth::user()->giangvien;
        if (!$giangvien) {
            return response()->json(['error' => 'Tài khoản không phải là giảng viên.'], 403);
        }
        $giangvienId = $giangvien->ID_GIANGVIEN;
        $idNhom = $nhom->ID_NHOM;

        // 2. Tải kế hoạch để kiểm tra thời gian
        $nhom->load('kehoach');
        $plan = $nhom->kehoach;

        if (!$plan) {
            return response()->json(['error' => 'Nhóm chưa thuộc kế hoạch nào.'], 404);
        }

        // 3. LOGIC KIỂM TRA THỜI GIAN (Feature Flag & Date Check)
        if ($loai === 'HOIDONG') {
            // --- Đối với Hội đồng: Chỉ cho phép chấm đúng NGAY_BAOCAO ---
            
            // Tìm hội đồng bảo vệ của nhóm này
            $hoidong = $nhom->hoidongs()->where('LOAI', 'hoidong')->first();
            
            if (!$hoidong || !$hoidong->NGAY_BAOCAO) {
                 return response()->json(['error' => 'Nhóm chưa được xếp lịch hội đồng hoặc chưa có ngày báo cáo.'], 403);
            }

            $today = now()->format('Y-m-d');
            $reportDate = \Carbon\Carbon::parse($hoidong->NGAY_BAOCAO)->format('Y-m-d');

            // So sánh ngày hiện tại với ngày báo cáo
            if ($today !== $reportDate) {
                // Cho phép admin chấm bù (tùy chọn), nhưng mặc định chặn giảng viên
                if (!$this->isAdmin()) {
                    return response()->json([
                        'error' => "Chức năng chấm hội đồng chỉ mở vào ngày báo cáo ($reportDate). Hôm nay là $today."
                    ], 403);
                }
            }
        } else {
            // --- Đối với HD và PB: Theo cấu hình chung 'CHAM_DIEM' trong Settings ---
            if (!$plan->isFeatureActive('CHAM_DIEM')) {
                return response()->json(['error' => 'Thời gian chấm điểm (Hướng dẫn/Phản biện) hiện đang đóng.'], 403);
            }
        }

        try {
            DB::beginTransaction();
            
            // 4. Xác định Model tương ứng
            $modelMap = [
                'HUONGDAN' => DiemHuongDan::class,
                'PHANBIEN' => DiemPhanBien::class,
                'HOIDONG'  => DiemHoiDong::class,
            ];
            
            if (!isset($modelMap[$loai])) {
                throw new \Exception("Loại điểm không hợp lệ: $loai");
            }
            
            $model = $modelMap[$loai];

            // 5. Lưu điểm vào CSDL
            $model::updateOrCreate(
                [
                    'ID_NHOM' => $idNhom, 
                    'ID_GIANGVIEN' => $giangvienId
                ],
                [
                    'DIEM' => $validated['DIEM'],
                    'NHANXET' => $validated['NHANXET'] ?? null
                ]
            );
            
            // 6. Cập nhật điểm tổng kết cho nhóm ngay lập tức
            $this->capNhatTong($nhom);
            
            DB::commit();

            return response()->json(['message' => "Lưu điểm {$loai} thành công!"]);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("Lỗi lưu điểm {$loai}: " . $e->getMessage(), [
                'id_nhom' => $idNhom, 
                'id_gv' => $giangvienId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Lỗi máy chủ khi xử lý điểm.'], 500);
        }
    }

    /**
     * Lấy danh sách nhiệm vụ chấm điểm của giảng viên
     */
    public function getMyGradingTasks(Request $request)
    {
        $giangvien = $request->user()->giangvien;
        if (!$giangvien) {
            return response()->json(['error' => 'Không tìm thấy thông tin giảng viên'], 404);
        }
        $giangvienId = $giangvien->ID_GIANGVIEN;

        // --- Helper để thêm điểm hiện tại ---
        $addCurrentScore = function ($nhomCollection, $scoreModel) use ($giangvienId) {
            return $nhomCollection->map(function ($nhom) use ($giangvienId, $scoreModel) {
                // Tải điểm riêng của GV này cho nhóm này
                $score = $scoreModel::where('ID_NHOM', $nhom->ID_NHOM)
                                     ->where('ID_GIANGVIEN', $giangvienId)
                                     ->first();
                
                // Gắn điểm vào thuộc tính mới (diem_phanbien_hientai, diem_huongdan_hientai, etc.)
                $attributeName = 'diem_' . strtolower(str_replace('App\Models\Diem', '', $scoreModel)) . '_hientai';
                $nhom->{$attributeName} = $score ? $score->DIEM : null;
                return $nhom;
            });
        };

        // 1. Lấy nhóm Hướng dẫn
        $nhomHuongDan = Nhom::whereHas('phancongDetaiNhom', function ($query) use ($giangvienId) {
            $query->where('ID_GVHD', $giangvienId);
        })
        ->with(['phancongDetaiNhom.detai'])
        ->get();

        // 2. Lấy nhóm Phản biện
        $nhomPhanBien = Nhom::whereHas('hoidongs', function ($query) use ($giangvienId) {
            $query->where('LOAI', 'phanbien')
                ->whereHas('giangviens', fn($q) => $q->where('HOIDONG_GIANGVIEN.ID_GIANGVIEN', $giangvienId));
        })
        ->with(['phancongDetaiNhom.detai'])
        ->get();

        // 3. Lấy nhóm Hội đồng
        $nhomHoiDong = Nhom::whereHas('hoidongs', function ($query) use ($giangvienId) {
            $query->where('LOAI', 'hoidong')
                ->whereHas('giangviens', fn($q) => $q->where('HOIDONG_GIANGVIEN.ID_GIANGVIEN', $giangvienId));
        })
        ->with(['phancongDetaiNhom.detai'])
        ->get();
        
        // 4. Gắn điểm hiện tại vào từng Collection
        $huongdanData = $addCurrentScore($nhomHuongDan, DiemHuongDan::class);
        $phanbienData = $addCurrentScore($nhomPhanBien, DiemPhanBien::class);
        $hoidongData = $addCurrentScore($nhomHoiDong, DiemHoiDong::class);


        return response()->json([
            'huongdan' => $huongdanData,
            'phanbien' => $phanbienData,
            'hoidong' => $hoidongData,
        ]);
    }

    // === CÁC HÀM MỚI CHO GIẢNG VIÊN ===
    public function saveDiemHuongDan(Request $request, Nhom $nhom) { return $this->saveDiem($request, $nhom, 'HUONGDAN'); }
    public function saveDiemPhanBien(Request $request, Nhom $nhom) { return $this->saveDiem($request, $nhom, 'PHANBIEN'); }
    public function saveDiemHoiDong(Request $request, Nhom $nhom)  { return $this->saveDiem($request, $nhom, 'HOIDONG'); }


    /**
     * (Admin) Lưu điểm tổng hợp (Nhập hộ)
     */
    public function saveCombined(Request $request, Nhom $nhom)
    {
        $data = $request->all();
        $idNhom = $nhom->ID_NHOM;
        Log::info("Admin/Giáo vụ lưu tổng hợp điểm nhóm #{$idNhom}", $data);

        if (!$this->isAdmin() && !$this->isGiaoVu()) {
            return response()->json(['error' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }

        try {
            DB::beginTransaction();

            // Hàm helper để validate và lưu
            $saveScores = function($diemData, $modelClass) use ($idNhom) {
                if (empty($diemData) || !is_array($diemData)) return;

                $validator = Validator::make($diemData, [
                    '*.ID_GIANGVIEN' => 'required|integer|exists:GIANGVIEN,ID_GIANGVIEN',
                    '*.DIEM'         => 'required|numeric|min:0|max:10',
                ]);
                
                if ($validator->fails()) {
                    throw new \Exception("Dữ liệu điểm không hợp lệ: " . $validator->errors()->first());
                }

                foreach ($validator->validated() as $row) {
                    $modelClass::updateOrCreate(
                        ['ID_NHOM' => $idNhom, 'ID_GIANGVIEN' => $row['ID_GIANGVIEN']],
                        ['DIEM' => $row['DIEM']]
                    );
                }
            };

            $saveScores($data['diem_huongdan'] ?? null, DiemHuongDan::class);
            $saveScores($data['diem_phanbien'] ?? null, DiemPhanBien::class);
            $saveScores($data['diem_hoidong'] ?? null, DiemHoiDong::class);

            $this->capNhatTong($nhom);
            DB::commit();

            return response()->json(['message' => 'Lưu dữ liệu điểm thành công!']);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("Lỗi saveCombined: " . $e->getMessage(), ['id' => $idNhom, 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Lỗi xử lý dữ liệu tổng hợp: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Cập nhật điểm tổng kết cho nhóm (Ưu tiên tỷ trọng của Kế hoạch)
     */
    private function capNhatTong(Nhom $nhom)
    {
        $idNhom = $nhom->ID_NHOM;
        
        // 1. Tải kế hoạch của nhóm để lấy tỷ trọng riêng
        $nhom->load('kehoach');
        $plan = $nhom->kehoach;

        // 2. Xác định tỷ trọng (Ưu tiên Plan -> Fallback sang Global Setting)
        $globalSetting = TyTrongDiem::getCurrent() ?? (object)[
            'HUONGDAN' => 0.4,
            'PHANBIEN' => 0.3,
            'HOIDONG'  => 0.3
        ];
        
        // Trọng số chính
        $wHD    = (float)($plan->TYTRONG_DIEM_QUATRINH ?? $globalSetting->HUONGDAN);
        $wPB    = (float)($plan->TYTRONG_DIEM_PHANBIEN ?? $globalSetting->PHANBIEN);
        $wHDONG = (float)($plan->TYTRONG_DIEM_HOIDONG ?? $globalSetting->HOIDONG);

        // 3. Tính điểm trung bình thành phần
        $diemHD    = DiemHuongDan::where('ID_NHOM', $idNhom)->avg('DIEM');
        $diemPB    = DiemPhanBien::where('ID_NHOM', $idNhom)->avg('DIEM');
        $diemHDONG = DiemHoiDong::where('ID_NHOM', $idNhom)->avg('DIEM');

        // 4. LOGIC TÍNH ĐIỂM TỔNG KẾT ĐỘC LẬP (ĐÃ SỬA - BỎ CHUẨN HÓA)
        $tong = 0;
        $hasAnyScore = false; // Biến kiểm tra xem có điểm nào được chấm chưa

        // Tính điểm Hướng dẫn
        if ($diemHD !== null) {
            $tong += $diemHD * $wHD;
            $hasAnyScore = true;
        }

        // Tính điểm Phản biện
        if ($diemPB !== null && $wPB > 0) { // Vẫn kiểm tra wPB > 0 phòng trường hợp kế hoạch không có PB
            $tong += $diemPB * $wPB;
            $hasAnyScore = true;
        }

        // Tính điểm Hội đồng
        if ($diemHDONG !== null && $wHDONG > 0) { // Vẫn kiểm tra wHDONG > 0
            $tong += $diemHDONG * $wHDONG;
            $hasAnyScore = true;
        }

        $finalTong = null;

        // 5. Làm tròn
        // Chỉ gán điểm tổng nếu có ít nhất 1 điểm thành phần đã được chấm
        if ($hasAnyScore) {
            $finalTong = round($tong, 2);
        }

        // 6. Lưu vào CSDL (Giữ nguyên)
        DiemTongKet::updateOrCreate(
            ['ID_NHOM' => $idNhom],
            [
                'DIEM_HD'     => $diemHD    !== null ? round($diemHD, 2) : null,
                'DIEM_PB'     => $diemPB    !== null ? round($diemPB, 2) : null,
                'DIEM_HDONG'  => $diemHDONG !== null ? round($diemHDONG, 2) : null,
                'DIEM_TONG'   => $finalTong,
            ]
        );
    }


    /**
     * Lấy điểm tổng kết nhóm
     */
    public function getTong($id)
    {
        $tongket = DiemTongKet::with([
            'diemHuongDan', 
            'diemPhanBien', 
            'diemHoiDong'
        ])->where('ID_NHOM', $id)->first();
        
        return response()->json($tongket);
    }

    public function submitZeroPhanBien(Request $request, Nhom $nhom)
    {
        $giangvien = Auth::user()->giangvien;
        
        if (!$giangvien) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $giangvienId = $giangvien->ID_GIANGVIEN;
        $idNhom = $nhom->ID_NHOM;

        // 1. Kiểm tra GV có phải là người phản biện của nhóm này không (sử dụng Gate)
        if (!Gate::allows('grade-phanbien', $nhom)) {
             return response()->json(['error' => 'Bạn không phải là người phản biện cho nhóm này.'], 403);
        }
        
        try {
            DB::beginTransaction();
            
            // 2. Lưu 0 điểm và nhận xét
            DiemPhanBien::updateOrCreate(
                ['ID_NHOM' => $idNhom, 'ID_GIANGVIEN' => $giangvienId],
                [
                    'DIEM' => 0.0,
                    'NHANXET' => 'Không chấp thuận đề tài/kết quả thực hiện của nhóm.'
                ]
            );
            
            // 3. Cập nhật điểm tổng (nếu đủ điều kiện)
            $this->capNhatTong($nhom);
            
            DB::commit();

            return response()->json(['message' => "Đã ghi nhận 0 điểm Phản biện thành công."]);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("Lỗi điền 0 điểm Phản biện: " . $e->getMessage());
            return response()->json(['error' => 'Lỗi xử lý điểm.'], 500);
        }
    }
}