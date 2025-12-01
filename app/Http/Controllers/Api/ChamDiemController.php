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
use App\Services\ActivityLogger;
use Carbon\Carbon;
use App\Services\NotificationService;

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
                'ID_NGUOIDUNG' => $tv->nguoidung?->ID_NGUOIDUNG,
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

    public function getGradingStatistics(Request $request)
    {
        $planId = $request->input('plan_id');

        // Query cơ bản: Các nhóm thuộc kế hoạch (nếu có) và ĐÃ ĐƯỢC DUYỆT nộp bài
        $baseQuery = Nhom::query()
            ->whereHas('phancongDetaiNhom.submissions', function ($q) {
                $q->where('TRANGTHAI', 'Đã xác nhận');
            });

        if ($planId) {
            $baseQuery->where('ID_KEHOACH', $planId);
        }

        $total = (clone $baseQuery)->count();

        // Số nhóm đã có điểm tổng kết
        $daCham = (clone $baseQuery)
            ->whereHas('diemTongKet', function($q) {
                $q->whereNotNull('DIEM_TONG');
            })
            ->count();

        // Số nhóm chưa có điểm tổng kết
        $chuaCham = $total - $daCham;

        return response()->json([
            'total' => $total,
            'daCham' => $daCham,
            'chuaCham' => $chuaCham
        ]);
    }

    public function getGroupsForGrading(Request $request)
    {
        $planId = $request->input('plan_id');
        $search = $request->input('search');

        $query = Nhom::query()
            ->with([
                'phancongDetaiNhom.detai', 
                'phancongDetaiNhom.gvhd.nguoidung',
                'diemTongKet'
            ]);

        if ($planId) {
            $query->where('ID_KEHOACH', $planId);
        }

        $query->whereHas('phancongDetaiNhom.submissions', function ($q) {
            $q->where('TRANGTHAI', 'Đã xác nhận');
        });

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('TEN_NHOM', 'like', '%' . $search . '%')
                  ->orWhereHas('phancongDetaiNhom.detai', function ($subQ) use ($search) {
                      $subQ->where('TEN_DETAI', 'like', '%' . $search . '%');
                  });
            });
        }

        $groups = $query->orderBy('TEN_NHOM', 'asc')
                        ->paginate($request->input('per_page', 10));

        return response()->json($groups);
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
        // Cho phép nhận thêm DIEM_CHI_TIET và IS_INDIVIDUAL
        $validated = $request->validate([
            'DIEM' => 'required|numeric|min:0|max:10',
            'NHANXET' => 'nullable|string|max:1000',
            'IS_INDIVIDUAL' => 'boolean', // Cờ đánh dấu chấm riêng
            'DIEM_CHI_TIET' => 'nullable|array', // Mảng chi tiết
            'DIEM_CHI_TIET.*.student_id' => 'required_with:DIEM_CHI_TIET|integer',
            'DIEM_CHI_TIET.*.score' => 'required_with:DIEM_CHI_TIET|numeric|min:0|max:10',
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

        // 2. Tải kế hoạch để kiểm tra thời gian (Giữ nguyên logic cũ)
        $nhom->load('kehoach');
        $plan = $nhom->kehoach;

        if (!$plan) {
            return response()->json(['error' => 'Nhóm chưa thuộc kế hoạch nào.'], 404);
        }

        // ... (Giữ nguyên đoạn code Kiểm tra thời gian/Feature Flag như cũ) ...
        // --- BẮT ĐẦU ĐOẠN CHECK THỜI GIAN (COPY LẠI TỪ CODE CŨ CỦA BẠN) ---
        if (!$this->isAdmin() && !$plan->isFeatureActive('CHAM_DIEM')) {
            return response()->json(['error' => 'Cổng chấm điểm hiện đang đóng theo kế hoạch chung.'], 403);
        }
        if ($loai === 'HOIDONG') {
            $hoidong = $nhom->hoidongs()->where('LOAI', 'hoidong')->first();
            if (!$hoidong || !$hoidong->NGAY_BAOCAO) {
                 return response()->json(['error' => 'Nhóm chưa được xếp lịch hội đồng hoặc chưa có ngày báo cáo.'], 403);
            }
            $reportTime = \Carbon\Carbon::parse($hoidong->NGAY_BAOCAO)->startOfDay();
            if (now()->lt($reportTime)) {
                if (!$this->isAdmin()) {
                    $fmtDate = $reportTime->format('d/m/Y');
                    return response()->json([
                        'error' => "Chưa đến thời gian bảo vệ ($fmtDate). Bạn chưa thể chấm điểm lúc này."
                    ], 403);
                }
            }
        }
        // --- KẾT THÚC ĐOẠN CHECK THỜI GIAN ---

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

            // 5. Chuẩn bị dữ liệu lưu
            $dataToSave = [
                'NHANXET' => $validated['NHANXET'] ?? null
            ];

            // Xử lý logic Chấm riêng hay Chấm chung
            if ($request->boolean('IS_INDIVIDUAL') && !empty($validated['DIEM_CHI_TIET'])) {
                // Nếu chấm riêng: Lưu mảng chi tiết và tính điểm trung bình để lưu vào cột DIEM (cho thống kê tổng quát)
                $dataToSave['DIEM_CHI_TIET'] = $validated['DIEM_CHI_TIET'];
                $dataToSave['DIEM'] = $validated['DIEM']; // Frontend đã tính trung bình gửi lên, hoặc ta tự tính lại ở đây cũng được
            } else {
                // Nếu chấm chung: Xóa chi tiết (hoặc set null), lưu điểm vào cột DIEM
                $dataToSave['DIEM_CHI_TIET'] = null;
                $dataToSave['DIEM'] = $validated['DIEM'];
            }

            // 6. Lưu vào CSDL
            $model::updateOrCreate(
                [
                    'ID_NHOM' => $idNhom, 
                    'ID_GIANGVIEN' => $giangvienId
                ],
                $dataToSave
            );
            
            // 7. Cập nhật điểm tổng kết cho nhóm ngay lập tức (Vẫn dùng logic tính trung bình nhóm để xếp loại nhóm)
            $this->capNhatTong($nhom);
            
            // Log
            $logTitle = "Chấm điểm " . ($loai === 'HUONGDAN' ? 'Hướng dẫn' : ($loai === 'PHANBIEN' ? 'Phản biện' : 'Hội đồng'));
            $logDetail = [
                'score' => $dataToSave['DIEM'], 
                'comment' => $dataToSave['NHANXET'],
                'is_individual' => $request->boolean('IS_INDIVIDUAL')
            ];

            ActivityLogger::log(
                'GRADE_' . $loai, 
                "{$logTitle} nhóm {$nhom->TEN_NHOM}: " . ($request->boolean('IS_INDIVIDUAL') ? "Chi tiết theo SV" : "{$dataToSave['DIEM']} điểm"),
                $logDetail, 
                $idNhom,
                'Star'
            );

            // Thông báo
            $tenLoai = ($loai === 'HUONGDAN' ? 'Hướng dẫn' : ($loai === 'PHANBIEN' ? 'Phản biện' : 'Hội đồng'));
            foreach ($nhom->thanhviens as $tv) {
                NotificationService::send(
                    $tv->ID_NGUOIDUNG,
                    "Đã có điểm {$tenLoai}",
                    "Giảng viên đã nhập điểm {$tenLoai} cho nhóm bạn.",
                    'ACADEMIC',
                    '/student/dashboard/' . $nhom->ID_KEHOACH,
                    null,
                    'HIGH'
                );
            }

            DB::commit();

            return response()->json(['message' => "Lưu điểm {$loai} thành công!"]);

        } catch (\Throwable $e) {
            DB::rollBack();
            
            Log::error("Lỗi lưu điểm {$loai}: " . $e->getMessage(), [
                'id_nhom' => $idNhom, 
                'id_gv' => $giangvienId,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json(['error' => 'Lỗi máy chủ khi xử lý điểm: ' . $e->getMessage()], 500);
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

        // --- Helper để thêm điểm hiện tại vào collection ---
        $addCurrentScore = function ($nhomCollection, $scoreModel) use ($giangvienId) {
            return $nhomCollection->map(function ($nhom) use ($giangvienId, $scoreModel) {
                // Tải điểm riêng của GV này cho nhóm này
                $score = $scoreModel::where('ID_NHOM', $nhom->ID_NHOM)
                                     ->where('ID_GIANGVIEN', $giangvienId)
                                     ->first();
                
                $className = class_basename($scoreModel);
                $type = str_replace('Diem', '', $className);
                
                // Attribute điểm chung
                $nhom->{'diem_' . strtolower($type) . '_hientai'} = $score ? $score->DIEM : null;
                
                // [MỚI] Attribute điểm chi tiết (JSON)
                $nhom->{'diem_' . strtolower($type) . '_chitiet'} = $score ? $score->DIEM_CHI_TIET : null;
                
                return $nhom;
            });
        };

        // [SỬA LỖI TẠI ĐÂY]: Thêm 'thanhviens.nguoidung' vào with()

        // 1. Lấy nhóm Hướng dẫn
        $nhomHuongDan = Nhom::whereHas('phancongDetaiNhom', function ($query) use ($giangvienId) {
            $query->where('ID_GVHD', $giangvienId);
        })
        ->with(['phancongDetaiNhom.detai', 'kehoach', 'thanhviens.nguoidung']) // <--- THÊM VÀO ĐÂY
        ->get();

        // 2. Lấy nhóm Phản biện
        $nhomPhanBien = Nhom::whereHas('hoidongs', function ($query) use ($giangvienId) {
            $query->where('LOAI', 'phanbien')
                ->whereHas('giangviens', fn($q) => $q->where('HOIDONG_GIANGVIEN.ID_GIANGVIEN', $giangvienId));
        })
        ->with(['phancongDetaiNhom.detai', 'kehoach', 'thanhviens.nguoidung']) // <--- THÊM VÀO ĐÂY
        ->get();

        // 3. Lấy nhóm Hội đồng (Bảo vệ)
        $nhomHoiDong = Nhom::whereHas('hoidongs', function ($query) use ($giangvienId) {
            $query->where('LOAI', 'hoidong')
                ->whereHas('giangviens', fn($q) => $q->where('HOIDONG_GIANGVIEN.ID_GIANGVIEN', $giangvienId));
        })
        ->with(['phancongDetaiNhom.detai', 'kehoach', 'thanhviens.nguoidung']) // <--- THÊM VÀO ĐÂY
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
            
            $this->capNhatTong($nhom);
            DB::commit();

            ActivityLogger::log(
                'REJECT_REVIEW', 
                "Từ chối phản biện (0 điểm)", 
                ['reason' => 'Không chấp thuận'], 
                $nhom->ID_NHOM,
                'XCircle'
            );

            return response()->json(['message' => "Đã ghi nhận 0 điểm Phản biện thành công."]);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("Lỗi điền 0 điểm Phản biện: " . $e->getMessage());
            return response()->json(['error' => 'Lỗi xử lý điểm.'], 500);
        }
    }
    
    public function getStudentGradingList(Request $request)
    {
        $planId = $request->input('plan_id');
        $search = $request->input('search');
        $resultFilter = $request->input('result'); // 'passed', 'failed', 'pending'
        $perPage = $request->input('per_page', 10);

        $query = \App\Models\Nguoidung::query()
            ->join('SINHVIEN', 'NGUOIDUNG.ID_NGUOIDUNG', '=', 'SINHVIEN.ID_NGUOIDUNG')
            ->join('THANHVIEN_NHOM', 'NGUOIDUNG.ID_NGUOIDUNG', '=', 'THANHVIEN_NHOM.ID_NGUOIDUNG')
            ->join('NHOM', 'THANHVIEN_NHOM.ID_NHOM', '=', 'NHOM.ID_NHOM')
            ->leftJoin('PHANCONG_DETAI_NHOM', 'NHOM.ID_NHOM', '=', 'PHANCONG_DETAI_NHOM.ID_NHOM')
            ->leftJoin('DETAI', 'PHANCONG_DETAI_NHOM.ID_DETAI', '=', 'DETAI.ID_DETAI')
            ->leftJoin('DIEM_TONGKET', 'NHOM.ID_NHOM', '=', 'DIEM_TONGKET.ID_NHOM')
            ->leftJoin('DIEM_PHANBIEN', 'NHOM.ID_NHOM', '=', 'DIEM_PHANBIEN.ID_NHOM')
            ->leftJoin('HOIDONG_NHOM', 'NHOM.ID_NHOM', '=', 'HOIDONG_NHOM.ID_NHOM')
            ->select(
                'NGUOIDUNG.ID_NGUOIDUNG',
                'NGUOIDUNG.HODEM_VA_TEN',
                'NGUOIDUNG.MA_DINHDANH',
                'NHOM.TEN_NHOM',
                'NHOM.ID_NHOM',
                'DETAI.TEN_DETAI',
                'DIEM_TONGKET.DIEM_TONG',
                'DIEM_PHANBIEN.DIEM as DIEM_PB_RAW',
                'HOIDONG_NHOM.ID_HOIDONG'
            );

        // 1. Filter cơ bản
        if ($planId) $query->where('NHOM.ID_KEHOACH', $planId);
        
        // Chỉ lấy nhóm ĐÃ NỘP và ĐƯỢC DUYỆT
        $query->whereHas('thanhvienNhom.nhom.phancongDetaiNhom.submissions', function ($q) {
            $q->where('TRANGTHAI', 'Đã xác nhận');
        });

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('NGUOIDUNG.HODEM_VA_TEN', 'like', '%' . $search . '%')
                  ->orWhere('NGUOIDUNG.MA_DINHDANH', 'like', '%' . $search . '%');
            });
        }

        // 2. Filter theo KẾT QUẢ (Logic phức tạp)
        if ($resultFilter) {
            if ($resultFilter === 'passed') {
                // Đậu: Có điểm tổng và >= 4.0
                $query->where('DIEM_TONGKET.DIEM_TONG', '>=', 4.0);
            } elseif ($resultFilter === 'failed') {
                // Rớt: (Có điểm tổng và < 4.0) HOẶC (Điểm PB = 0) HOẶC (Không có hội đồng)
                $query->where(function($q) {
                    $q->where('DIEM_TONGKET.DIEM_TONG', '<', 4.0)
                      ->orWhere('DIEM_PHANBIEN.DIEM', '=', 0)
                      ->orWhereNull('HOIDONG_NHOM.ID_HOIDONG');
                });
            } elseif ($resultFilter === 'pending') {
                // Chưa chấm xong: Chưa có điểm tổng VÀ (Điểm PB != 0 hoặc null) VÀ (Có hội đồng)
                $query->whereNull('DIEM_TONGKET.DIEM_TONG')
                      ->where(function($q) {
                          $q->where('DIEM_PHANBIEN.DIEM', '!=', 0)
                            ->orWhereNull('DIEM_PHANBIEN.DIEM');
                      })
                      ->whereNotNull('HOIDONG_NHOM.ID_HOIDONG');
            }
        }

        $students = $query->orderBy('NGUOIDUNG.MA_DINHDANH', 'asc')->paginate($perPage);

        // 3. Transform hiển thị (Giống cũ)
        $students->getCollection()->transform(function ($student) {
            $diemTong = $student->DIEM_TONG;
            $diemPB = $student->DIEM_PB_RAW;
            $hasCouncil = !is_null($student->ID_HOIDONG);

            $student->KET_QUA = 'Chưa chấm xong';
            
            if (!$hasCouncil) {
                $student->KET_QUA = 'Rớt'; // Không được bảo vệ
            } elseif ($diemTong !== null) {
                $student->KET_QUA = ($diemTong >= 4.0) ? 'Đậu' : 'Rớt';
            } elseif ($diemPB !== null && (float)$diemPB == 0) {
                $student->KET_QUA = 'Rớt'; // Điểm liệt phản biện
                $student->DIEM_TONG = 0.00;
            }
            
            return $student;
        });

        return response()->json($students);
    }

    /**
     * API Thống kê riêng cho sinh viên (Stat Cards)
     */
    public function getStudentGradingStatistics(Request $request)
    {
        $planId = $request->input('plan_id');
        if (!$planId) return response()->json(['total' => 0, 'passed' => 0, 'failed' => 0]);

        // Base Query (Copy logic join để đảm bảo chính xác)
        $baseQuery = \App\Models\Nguoidung::query()
            ->join('SINHVIEN', 'NGUOIDUNG.ID_NGUOIDUNG', '=', 'SINHVIEN.ID_NGUOIDUNG')
            ->join('THANHVIEN_NHOM', 'NGUOIDUNG.ID_NGUOIDUNG', '=', 'THANHVIEN_NHOM.ID_NGUOIDUNG')
            ->join('NHOM', 'THANHVIEN_NHOM.ID_NHOM', '=', 'NHOM.ID_NHOM')
            ->leftJoin('DIEM_TONGKET', 'NHOM.ID_NHOM', '=', 'DIEM_TONGKET.ID_NHOM')
            ->leftJoin('DIEM_PHANBIEN', 'NHOM.ID_NHOM', '=', 'DIEM_PHANBIEN.ID_NHOM')
            ->leftJoin('HOIDONG_NHOM', 'NHOM.ID_NHOM', '=', 'HOIDONG_NHOM.ID_NHOM')
            ->where('NHOM.ID_KEHOACH', $planId)
            ->whereHas('thanhvienNhom.nhom.phancongDetaiNhom.submissions', function ($q) {
                $q->where('TRANGTHAI', 'Đã xác nhận');
            });

        $total = (clone $baseQuery)->count();

        $passed = (clone $baseQuery)->where('DIEM_TONGKET.DIEM_TONG', '>=', 4.0)->count();

        $failed = (clone $baseQuery)->where(function($q) {
            $q->where('DIEM_TONGKET.DIEM_TONG', '<', 4.0)
              ->orWhere('DIEM_PHANBIEN.DIEM', '=', 0)
              ->orWhereNull('HOIDONG_NHOM.ID_HOIDONG');
        })->count();

        return response()->json([
            'total' => $total,
            'passed' => $passed,
            'failed' => $failed
        ]);
    }
}