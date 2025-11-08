<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
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
            ])->find($id);

            if (!$nhom) {
                return response()->json(['error' => 'Không tìm thấy nhóm'], 404);
            }

            // === Xử lý sinh viên ===
            $sinhviens = $nhom->thanhviens->map(fn($tv) => [
                'ID_SINHVIEN'   => $tv->nguoidung?->sinhvien?->ID_SINHVIEN,
                'MA_DINHDANH'   => $tv->nguoidung?->MA_DINHDANH ?? 'N/A',
                'HODEM_VA_TEN'  => $tv->nguoidung?->HODEM_VA_TEN ?? 'Không rõ'
            ])->values();

            // === Xử lý GVHD ===
            $gvhd = $nhom->phancongDetaiNhom?->gvhd;
            $huongdan = $gvhd ? [
                'ID_GIANGVIEN' => $gvhd->ID_GIANGVIEN,
                'HOTEN'        => $gvhd->nguoidung?->HODEM_VA_TEN ?? 'Không rõ',
                'VAITRO'       => 'Hướng dẫn'
            ] : null;

            // === Tách hội đồng: Bảo vệ & Phản biện ===
            $hoidongBaoVe   = $nhom->hoidongs->firstWhere('LOAI', 'hoidong');
            $hoidongPhanBien = $nhom->hoidongs->firstWhere('LOAI', 'phanbien');

            $giangvienHoiDong = collect();
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
                    'ID_NHOM'     => $nhom->ID_NHOM,
                    'TEN_NHOM'    => $nhom->TEN_NHOM,
                    'DETAI'       => $nhom->phancongDetaiNhom?->detai?->TEN_DETAI ?? '-',
                    'SINHVIEN'    => $sinhviens,
                    'GIANGVIEN'   => $giangviens
                ]
            ]);

        } catch (\Throwable $e) {
            Log::error("Lỗi getNhom (ChamDiemController): " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Lỗi máy chủ nội bộ'], 500);
        }
    }

    /**
     * Lấy tỷ trọng điểm hiện hành
     */
    public function getTyTrong()
    {
        $tytrong = TyTrongDiem::getCurrent() 
            ?? TyTrongDiem::first() 
            ?? (object)['HUONGDAN' => 0.4, 'PHANBIEN' => 0.3, 'HOIDONG' => 0.3];

        return response()->json($tytrong);
    }

    /**
     * Cập nhật tỷ trọng điểm (Chỉ Admin/Giáo vụ)
     */
    public function capNhatTyTrong(Request $request)
    {
        // Ghi chú: Quyền đã được kiểm tra ở routes/api.php
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
     */
    private function saveDiem(Request $request, Nhom $nhom, string $loai)
    {
        // [CẬP NHẬT] Thêm 'NHANXET' vào validation
        $validated = $request->validate([
            'DIEM' => 'required|numeric|min:0|max:10',
            'NHANXET' => 'nullable|string|max:1000'
        ]);
        
        $giangvienId = Auth::user()->giangvien->ID_GIANGVIEN;
        $idNhom = $nhom->ID_NHOM;

        try {
            DB::beginTransaction();
            
            $modelMap = [
                'HUONGDAN' => DiemHuongDan::class,
                'PHANBIEN' => DiemPhanBien::class,
                'HOIDONG'  => DiemHoiDong::class,
            ];
            $model = $modelMap[$loai];

            $model::updateOrCreate(
                ['ID_NHOM' => $idNhom, 'ID_GIANGVIEN' => $giangvienId],
                [
                    'DIEM' => $validated['DIEM'],
                    'NHANXET' => $validated['NHANXET'] ?? null // [CẬP NHẬT] Lưu nhận xét
                ]
            );
            
            $this->capNhatTong($nhom);
            DB::commit();

            return response()->json(['message' => "Lưu điểm {$loai} thành công!"]);

        } catch (\Throwable $e) {
            DB::rollBack(); // [CẬP NHẬT] Đảm bảo rollback
            Log::error("Lỗi lưu điểm {$loai}: " . $e->getMessage(), ['id_nhom' => $idNhom, 'id_gv' => $giangvienId]);
            return response()->json(['error' => 'Lỗi xử lý điểm'], 500);
        }
    }
    public function getMyGradingTasks(Request $request)
    {
        $giangvien = $request->user()->giangvien;
        if (!$giangvien) {
            return response()->json(['error' => 'Không tìm thấy thông tin giảng viên'], 404);
        }
        $giangvienId = $giangvien->ID_GIANGVIEN;

        // 1. Lấy nhóm Hướng dẫn
        // (Tải quan hệ lồng: nhóm -> phancong -> detai)
        $nhomHuongDan = Nhom::whereHas('phancongDetaiNhom', function ($query) use ($giangvienId) {
            $query->where('ID_GVHD', $giangvienId);
        })
        ->with(['phancongDetaiNhom.detai'])
        ->get();

        // 2. Lấy nhóm Phản biện
        $nhomPhanBien = Nhom::whereHas('hoidongs', function ($query) use ($giangvienId) {
            $query->where('LOAI', 'phanbien')
                  ->whereHas('giangviens', fn($q) => $q->where('GIANGVIEN.ID_GIANGVIEN', $giangvienId));
        })
        ->with(['phancongDetaiNhom.detai']) // Tải đề tài của nhóm
        ->get();

        // 3. Lấy nhóm Hội đồng
        $nhomHoiDong = Nhom::whereHas('hoidongs', function ($query) use ($giangvienId) {
            $query->where('LOAI', 'hoidong')
                  ->whereHas('giangviens', fn($q) => $q->where('GIANGVIEN.ID_GIANGVIEN', $giangvienId));
        })
        ->with(['phancongDetaiNhom.detai']) // Tải đề tài của nhóm
        ->get();

        return response()->json([
            'huongdan' => $nhomHuongDan,
            'phanbien' => $nhomPhanBien,
            'hoidong' => $nhomHoiDong,
        ]);
    }

    // === CÁC HÀM MỚI CHO GIẢNG VIÊN ===
    public function saveDiemHuongDan(Request $request, Nhom $nhom) { return $this->saveDiem($request, $nhom, 'HUONGDAN'); }
    public function saveDiemPhanBien(Request $request, Nhom $nhom) { return $this->saveDiem($request, $nhom, 'PHANBIEN'); }
    public function saveDiemHoiDong(Request $request, Nhom $nhom)  { return $this->saveDiem($request, $nhom, 'HOIDONG'); }


    /**
     * (Admin) Lưu điểm tổng hợp
     * Ghi chú: Quyền 'can:access-grading-admin' đã được kiểm tra ở route.
     */
    public function saveCombined(Request $request, Nhom $nhom)
    {
        $data = $request->all();
        $idNhom = $nhom->ID_NHOM;
        Log::info("Admin/Giáo vụ lưu tổng hợp điểm nhóm #{$idNhom}", $data);

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
                    // Ném lỗi để rollback transaction
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
     * Cập nhật điểm tổng kết cho nhóm
     * [ĐÃ NÂNG CẤP] - Đồng bộ logic với frontend useMemo
     */
    private function capNhatTong(Nhom $nhom)
    {
        $idNhom = $nhom->ID_NHOM;
        $tytrong = TyTrongDiem::getCurrent() 
            ?? TyTrongDiem::firstOrCreate([], [
                'HUONGDAN' => 0.4, 'PHANBIEN' => 0.3, 'HOIDONG' => 0.3
            ]);

        // 1. Tính điểm trung bình đơn giản cho cả 3 loại
        $diemHD = DiemHuongDan::where('ID_NHOM', $idNhom)->avg('DIEM');
        $diemPB = DiemPhanBien::where('ID_NHOM', $idNhom)->avg('DIEM');
        $diemHDONG = DiemHoiDong::where('ID_NHOM', $idNhom)->avg('DIEM'); // <-- Đổi sang logic TB cộng

        // 2. Kiểm tra nhóm này thuộc loại hình nào
        $hasHoiDong = $nhom->hoidongs()->where('LOAI', 'hoidong')->exists();
        $hasPhanBien = $nhom->hoidongs()->where('LOAI', 'phanbien')->exists();

        // 3. Lấy tỷ trọng gốc
        $wHD = (float)($tytrong->HUONGDAN ?? 0);
        $wPB = (float)($tytrong->PHANBIEN ?? 0);
        $wHDONG = (float)($tytrong->HOIDONG ?? 0);

        $tong = null;
        $final_wHD = 0;
        $final_wPB = 0;
        $final_wHDONG = 0;

        // 4. Áp dụng logic phân bổ trọng số (giống hệt frontend)

        // Kịch bản 1: Có Hội đồng (ưu tiên) -> Bỏ qua Phản biện
        if ($hasHoiDong && $diemHDONG !== null) {
            $final_wHD = $wHD;
            $final_wPB = 0;
            $final_wHDONG = $wPB + $wHDONG; // Cộng dồn trọng số PB vào HĐ
            
            // Chỉ tính tổng nếu có điểm HD và HĐ
            if ($diemHD !== null) {
                 $tong = ($diemHD * $final_wHD) + ($diemHDONG * $final_wHDONG);
            }
        } 
        // Kịch bản 2: Chỉ có Phản biện -> Bỏ qua Hội đồng
        else if ($hasPhanBien && $diemPB !== null) {
            $final_wHD = $wHD;
            $final_wPB = $wPB + $wHDONG; // Cộng dồn trọng số HĐ vào PB
            $final_wHDONG = 0;

            // Chỉ tính tổng nếu có điểm HD và PB
            if ($diemHD !== null) {
                $tong = ($diemHD * $final_wHD) + ($diemPB * $final_wPB);
            }
        }
        // Kịch bản 3: Chỉ có Hướng dẫn (chưa gán PB/HĐ)
        else if ($diemHD !== null) {
            $tong = $diemHD; // Chỉ có điểm HD
        }

        // 5. Chuẩn hóa và làm tròn
        $finalTong = null;
        if ($tong !== null) {
             // Logic chuẩn hóa (phòng trường hợp tổng trọng số không phải là 1)
            $totalWeight = $final_wHD + $final_wPB + $final_wHDONG;
            if ($totalWeight > 0 && $totalWeight < 1.1 && $totalWeight != 1.0) {
                $tong = $tong / $totalWeight;
            }
            $finalTong = round($tong, 2);
        }

        // 6. Lưu vào CSDL
        DiemTongKet::updateOrCreate(
            ['ID_NHOM' => $idNhom],
            [
                'DIEM_HD'     => $diemHD !== null ? round($diemHD, 2) : null,
                'DIEM_PB'     => $diemPB !== null ? round($diemPB, 2) : null,
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
}