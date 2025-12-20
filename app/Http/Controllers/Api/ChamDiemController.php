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
use App\Models\KehoachKhoaluan;
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
            'total'    => $total,
            'daCham'   => $daCham,
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
     * [UPDATED] Cập nhật tỷ trọng điểm Global VÀ Đồng bộ lại điểm
     */
    public function capNhatTyTrong(Request $request)
    {
        // 1. Kiểm tra quyền
        if (!$this->isAdmin() && !$this->isGiaoVu()) {
            return response()->json(['error' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }

        // 2. Validate
        $validated = $request->validate([
            'HUONGDAN' => 'required|numeric|min:0|max:1',
            'PHANBIEN' => 'required|numeric|min:0|max:1',
            'HOIDONG'  => 'required|numeric|min:0|max:1',
        ]);

        $tong = array_sum($validated);
        if (abs($tong - 1) > 0.001) {
            return response()->json(['error' => 'Tổng tỷ trọng phải bằng 1'], 422);
        }

        DB::beginTransaction();
        try {
            // 3. Cập nhật tỷ trọng vào bảng TYTRONG_DIEM
            TyTrongDiem::updateTyTrong(
                $validated['HUONGDAN'],
                $validated['PHANBIEN'],
                $validated['HOIDONG']
            );

            // 4. [LOGIC MỚI] Tìm các Kế hoạch đang hoạt động mà KHÔNG CÓ tỷ trọng riêng (dùng mặc định)
            // Nếu kế hoạch có tỷ trọng riêng (khác null), nó sẽ không bị ảnh hưởng bởi thay đổi global này.
            $activePlans = KehoachKhoaluan::whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm'])
                ->whereNull('TYTRONG_DIEM_QUATRINH') // Chỉ lấy kế hoạch dùng default
                ->get();

            $updatedGroupsCount = 0;

            if ($activePlans->isNotEmpty()) {
                // Lấy tất cả nhóm thuộc các kế hoạch này để tính lại điểm
                $planIds = $activePlans->pluck('ID_KEHOACH');
                
                // Chunk để tránh overload bộ nhớ nếu có quá nhiều nhóm
                Nhom::whereIn('ID_KEHOACH', $planIds)->chunk(50, function($groups) use (&$updatedGroupsCount) {
                    foreach ($groups as $group) {
                        // Gọi hàm capNhatTong để tính lại dựa trên tỷ trọng Global mới
                        $this->capNhatTong($group);
                        $updatedGroupsCount++;
                    }
                });
            }
            
            DB::commit();

            return response()->json([
                'message' => "Cập nhật tỷ trọng thành công! Đã đồng bộ lại điểm cho {$updatedGroupsCount} nhóm đang hoạt động."
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi cập nhật tỷ trọng: " . $e->getMessage());
            return response()->json(['error' => 'Lỗi máy chủ khi cập nhật tỷ trọng.'], 500);
        }
    }

    /**
     * (Chung) Lưu điểm cho một giảng viên cụ thể
     */
    private function saveDiem(Request $request, Nhom $nhom, string $loai)
    {
        // 1. Validate
        $validated = $request->validate([
            'DIEM'          => 'required|numeric|min:0|max:10',
            'NHANXET'       => 'nullable|string|max:1000',
            'IS_INDIVIDUAL' => 'boolean',
            'DIEM_CHI_TIET' => 'nullable|array',
            'DIEM_CHI_TIET.*.student_id' => 'required_with:DIEM_CHI_TIET|integer',
            'DIEM_CHI_TIET.*.score'      => 'required_with:DIEM_CHI_TIET|numeric|min:0|max:10',
        ], [
            'DIEM.required' => 'Vui lòng nhập điểm.',
            'DIEM.numeric'  => 'Điểm phải là số.',
            'DIEM.min'      => 'Điểm không được nhỏ hơn 0.',
            'DIEM.max'      => 'Điểm không được lớn hơn 10.',
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

        // Check thời gian/Feature Flag
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

        try {
            DB::beginTransaction();
            
            // 4. Xác định Model
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

            if ($request->boolean('IS_INDIVIDUAL') && !empty($validated['DIEM_CHI_TIET'])) {
                $dataToSave['DIEM_CHI_TIET'] = $validated['DIEM_CHI_TIET'];
                $dataToSave['DIEM'] = $validated['DIEM'];
            } else {
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
            
            // 7. Cập nhật điểm tổng kết cho nhóm ngay lập tức
            $this->capNhatTong($nhom);
            
            // Log & Noti
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

    public function getMyGradingTasks(Request $request)
    {
        $giangvien = $request->user()->giangvien;
        if (!$giangvien) {
            return response()->json(['error' => 'Không tìm thấy thông tin giảng viên'], 404);
        }
        $giangvienId = $giangvien->ID_GIANGVIEN;

        $addCurrentScore = function ($nhomCollection, $scoreModel) use ($giangvienId) {
            return $nhomCollection->map(function ($nhom) use ($giangvienId, $scoreModel) {
                $score = $scoreModel::where('ID_NHOM', $nhom->ID_NHOM)
                                    ->where('ID_GIANGVIEN', $giangvienId)
                                    ->first();
                
                $className = class_basename($scoreModel);
                $type = str_replace('Diem', '', $className);
                
                $nhom->{'diem_' . strtolower($type) . '_hientai'} = $score ? $score->DIEM : null;
                $nhom->{'diem_' . strtolower($type) . '_chitiet'} = $score ? $score->DIEM_CHI_TIET : null;
                
                return $nhom;
            });
        };

        // 1. Nhóm Hướng dẫn
        $nhomHuongDan = Nhom::whereHas('phancongDetaiNhom', function ($query) use ($giangvienId) {
            $query->where('ID_GVHD', $giangvienId);
        })
        ->with(['phancongDetaiNhom.detai', 'kehoach', 'thanhviens.nguoidung'])
        ->get();

        // 2. Nhóm Phản biện
        $nhomPhanBien = Nhom::whereHas('hoidongs', function ($query) use ($giangvienId) {
            $query->where('LOAI', 'phanbien')
                ->whereHas('giangviens', fn($q) => $q->where('HOIDONG_GIANGVIEN.ID_GIANGVIEN', $giangvienId));
        })
        ->with(['phancongDetaiNhom.detai', 'kehoach', 'thanhviens.nguoidung'])
        ->get();

        // 3. Nhóm Hội đồng
        $nhomHoiDong = Nhom::whereHas('hoidongs', function ($query) use ($giangvienId) {
            $query->where('LOAI', 'hoidong')
                ->whereHas('giangviens', fn($q) => $q->where('HOIDONG_GIANGVIEN.ID_GIANGVIEN', $giangvienId));
        })
        ->with(['phancongDetaiNhom.detai', 'kehoach', 'thanhviens.nguoidung'])
        ->get();
        
        $huongdanData = $addCurrentScore($nhomHuongDan, DiemHuongDan::class);
        $phanbienData = $addCurrentScore($nhomPhanBien, DiemPhanBien::class);
        $hoidongData = $addCurrentScore($nhomHoiDong, DiemHoiDong::class);

        return response()->json([
            'huongdan' => $huongdanData,
            'phanbien' => $phanbienData,
            'hoidong'  => $hoidongData,
        ]);
    }

    public function saveDiemHuongDan(Request $request, Nhom $nhom) { return $this->saveDiem($request, $nhom, 'HUONGDAN'); }
    public function saveDiemPhanBien(Request $request, Nhom $nhom) { return $this->saveDiem($request, $nhom, 'PHANBIEN'); }
    public function saveDiemHoiDong(Request $request, Nhom $nhom)  { return $this->saveDiem($request, $nhom, 'HOIDONG'); }

    public function saveCombined(Request $request, Nhom $nhom)
    {
        $data = $request->all();
        $idNhom = $nhom->ID_NHOM;

        if (!$this->isAdmin() && !$this->isGiaoVu()) {
            return response()->json(['error' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }

        try {
            DB::beginTransaction();

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
        
        $wHD    = (float)($plan->TYTRONG_DIEM_QUATRINH ?? $globalSetting->HUONGDAN);
        $wPB    = (float)($plan->TYTRONG_DIEM_PHANBIEN ?? $globalSetting->PHANBIEN);
        $wHDONG = (float)($plan->TYTRONG_DIEM_HOIDONG ?? $globalSetting->HOIDONG);

        // 3. Tính điểm trung bình thành phần
        $diemHD    = DiemHuongDan::where('ID_NHOM', $idNhom)->avg('DIEM');
        $diemPB    = DiemPhanBien::where('ID_NHOM', $idNhom)->avg('DIEM');
        $diemHDONG = DiemHoiDong::where('ID_NHOM', $idNhom)->avg('DIEM');

        // 4. Tính điểm tổng kết
        $tong = 0;
        $hasAnyScore = false;

        if ($diemHD !== null) {
            $tong += $diemHD * $wHD;
            $hasAnyScore = true;
        }

        // Logic check wPB > 0 để hỗ trợ trường hợp kế hoạch không có PB
        if ($diemPB !== null && $wPB > 0) { 
            $tong += $diemPB * $wPB;
            $hasAnyScore = true;
        }

        if ($diemHDONG !== null && $wHDONG > 0) {
            $tong += $diemHDONG * $wHDONG;
            $hasAnyScore = true;
        }

        $finalTong = null;
        if ($hasAnyScore) {
            $finalTong = round($tong, 2);
        }

        DiemTongKet::updateOrCreate(
            ['ID_NHOM' => $idNhom],
            [
                'DIEM_HD'    => $diemHD    !== null ? round($diemHD, 2) : null,
                'DIEM_PB'    => $diemPB    !== null ? round($diemPB, 2) : null,
                'DIEM_HDONG' => $diemHDONG !== null ? round($diemHDONG, 2) : null,
                'DIEM_TONG'  => $finalTong,
            ]
        );
    }

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

        if (!Gate::allows('grade-phanbien', $nhom)) {
             return response()->json(['error' => 'Bạn không phải là người phản biện cho nhóm này.'], 403);
        }
        
        try {
            DB::beginTransaction();
            
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
        $resultFilter = $request->input('result'); 
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

        if ($planId) $query->where('NHOM.ID_KEHOACH', $planId);
        
        $query->whereHas('thanhvienNhom.nhom.phancongDetaiNhom.submissions', function ($q) {
            $q->where('TRANGTHAI', 'Đã xác nhận');
        });

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('NGUOIDUNG.HODEM_VA_TEN', 'like', '%' . $search . '%')
                  ->orWhere('NGUOIDUNG.MA_DINHDANH', 'like', '%' . $search . '%');
            });
        }

        if ($resultFilter) {
            if ($resultFilter === 'passed') {
                $query->where('DIEM_TONGKET.DIEM_TONG', '>=', 4.0);
            } elseif ($resultFilter === 'failed') {
                $query->where(function($q) {
                    $q->where('DIEM_TONGKET.DIEM_TONG', '<', 4.0)
                      ->orWhere('DIEM_PHANBIEN.DIEM', '=', 0)
                      ->orWhereNull('HOIDONG_NHOM.ID_HOIDONG');
                });
            } elseif ($resultFilter === 'pending') {
                $query->whereNull('DIEM_TONGKET.DIEM_TONG')
                      ->where(function($q) {
                          $q->where('DIEM_PHANBIEN.DIEM', '!=', 0)
                            ->orWhereNull('DIEM_PHANBIEN.DIEM');
                      })
                      ->whereNotNull('HOIDONG_NHOM.ID_HOIDONG');
            }
        }

        $students = $query->orderBy('NGUOIDUNG.MA_DINHDANH', 'asc')->paginate($perPage);

        $students->getCollection()->transform(function ($student) {
            $diemTong = $student->DIEM_TONG;
            $diemPB = $student->DIEM_PB_RAW;
            $hasCouncil = !is_null($student->ID_HOIDONG);

            $student->KET_QUA = 'Chưa chấm xong';
            
            if (!$hasCouncil) {
                $student->KET_QUA = 'Rớt'; 
            } elseif ($diemTong !== null) {
                $student->KET_QUA = ($diemTong >= 4.0) ? 'Đậu' : 'Rớt';
            } elseif ($diemPB !== null && (float)$diemPB == 0) {
                $student->KET_QUA = 'Rớt';
                $student->DIEM_TONG = 0.00;
            }
            
            return $student;
        });

        return response()->json($students);
    }

    public function getStudentGradingStatistics(Request $request)
    {
        $planId = $request->input('plan_id');
        if (!$planId) return response()->json(['total' => 0, 'passed' => 0, 'failed' => 0]);

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