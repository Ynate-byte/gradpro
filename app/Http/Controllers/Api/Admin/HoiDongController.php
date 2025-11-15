<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Chuyennganh;
use App\Models\Hoidong;
use App\Models\KehoachKhoaluan;
use App\Models\Nhom;
use App\Models\TyTrongDiem;
use App\Models\Giangvien;
use App\Models\DiemPhanBien;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class HoiDongController extends Controller
{
    /**
     * Lấy danh sách hội đồng (có tìm kiếm, phân trang, lọc)
     */
    public function index(Request $request)
    {
        $query = Hoidong::with(['giangviens', 'kehoach', 'chuyennganh', 'nhoms'])
            ->orderBy($request->input('sort', 'NGAY_BAOCAO'), $request->input('dir', 'desc'));

        // Lọc hội đồng theo trạng thái kế hoạch
        $query->whereHas('kehoach', function ($q) {
            $q->whereIn('TRANGTHAI', ['Đang thực hiện', 'Chờ duyệt chỉnh sửa']);
        });

        if ($request->filled('search')) {
            $query->where('TEN_HOIDONG', 'like', '%' . $request->input('search') . '%');
        }

        if ($request->filled('kehoach')) {
            $query->where('ID_KEHOACH', $request->input('kehoach'));
        }

        if ($request->filled('chuyennganh')) {
            $query->where('ID_CHUYENNGANH', $request->input('chuyennganh'));
        }

        // 1. Kiểm tra xem có yêu cầu 'all' (cho trang Phân Bổ) không
        if ($request->boolean('all')) {
            $hoidongs = $query->get();
            $hoidongs->transform(function ($hd) {
                $hd->so_thanh_vien = $hd->giangviens->count();
                $hd->so_nhom = $hd->nhoms->count();
                return $hd;
            });
            return response()->json($hoidongs);
        }

        // 2. Mặc định là phân trang (cho trang List)
        $hoidongs = $query->paginate($request->per_page ?? 10);
        $hoidongs->getCollection()->transform(function ($hd) {
            $hd->so_thanh_vien = $hd->giangviens->count();
            $hd->so_nhom = $hd->nhoms->count();
            return $hd;
        });

        return response()->json($hoidongs);
    }

    /**
     * Lấy dữ liệu thống kê cho StatCards
     */
    public function getStatistics(Request $request)
    {
        $validated = $request->validate([
            'kehoach' => 'nullable|integer|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
        ]);

        $planId = $validated['kehoach'] ?? null;
        $query = Hoidong::query();

        if ($planId) {
            $query->where('ID_KEHOACH', $planId);
        } else {
            $query->whereHas('kehoach', function ($q) {
                $q->whereIn('TRANGTHAI', ['Đang thực hiện', 'Chờ duyệt chỉnh sửa']);
            });
        }

        $totalHoiDong = (clone $query)->count();
        $totalPhanBien = (clone $query)->where('LOAI', 'phanbien')->count();
        $totalBaoVe = (clone $query)->where('LOAI', 'hoidong')->count();

        $hoidongIds = (clone $query)->pluck('ID_HOIDONG');
        $nhomDaPhanBo = DB::table('HOIDONG_NHOM')
            ->whereIn('ID_HOIDONG', $hoidongIds)
            ->distinct('ID_NHOM')
            ->count('ID_NHOM');
            
        $totalThanhVien = DB::table('HOIDONG_GIANGVIEN')
             ->whereIn('ID_HOIDONG', $hoidongIds)
             ->distinct('ID_GIANGVIEN')
             ->count('ID_GIANGVIEN');

        return response()->json([
            'totalHoiDong' => $totalHoiDong,
            'totalPhanBien' => $totalPhanBien,
            'totalBaoVe' => $totalBaoVe,
            'nhomDaPhanBo' => $nhomDaPhanBo,
            'totalThanhVien' => $totalThanhVien,
        ]);
    }

    /**
     * Tạo hội đồng (tự động hoặc thủ công)
     */
    public function create(Request $request)
    {
        $validated = $request->validate([
            'TEN_HOIDONG' => 'nullable|string|max:255',
            'LOAI' => 'required|string|in:phanbien,hoidong',
            'ID_KEHOACH' => 'required|integer|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'ID_CHUYENNGANH' => 'required|integer|exists:CHUYENNGANH,ID_CHUYENNGANH',
            'NGAY_BAOCAO' => 'nullable|date',
            'GIO_BAOCAO' => 'nullable|date_format:H:i,H:i:s',
            'PHONG' => 'nullable|string|max:50',
            'giangviens' => 'nullable|array',
            'giangviens.*.id' => 'required_with:giangviens|integer|exists:GIANGVIEN,ID_GIANGVIEN',
            'giangviens.*.vaitro' => 'nullable|string|in:chutich,thuky,thanhvien,phanbien',
            'soLuong' => 'nullable|integer|min:1',
        ]);

        $this->validateCouncilTypeAllowed($validated['ID_KEHOACH'], $validated['LOAI']);

        DB::beginTransaction();
        try {
            $isManual = !$request->has('soLuong') || (int)$request->input('soLuong', 1) === 1;

            if ($isManual) {
                // CHỈ validate nếu mảng giangviens KHÔNG RỖNG
                if (!empty($validated['giangviens'])) {
                    $this->validateHoiDongGiangviens($validated['LOAI'], $validated['giangviens']);
                }
                $this->createSingleHoiDong($validated);
            } else {
                $soLuong = (int)$validated['soLuong'];
                for ($i = 0; $i < $soLuong; $i++) {
                    $tenHoiDong = trim("{$validated['TEN_HOIDONG']} " . ($i + 1));
                    $exists = Hoidong::where('TEN_HOIDONG', $tenHoiDong)
                        ->where('ID_KEHOACH', $validated['ID_KEHOACH'])
                        ->exists();

                    if ($exists) {
                        $tenHoiDong = "{$tenHoiDong} (" . uniqid() . ")";
                    }

                    $payload = $validated;
                    $payload['TEN_HOIDONG'] = $tenHoiDong;
                    $payload['giangviens'] = [];

                    $this->createSingleHoiDong($payload);
                }
            }

            DB::commit();

            return response()->json([
                'message' => $isManual ? 'Tạo hội đồng thành công!' : "Tạo {$validated['soLuong']} hội đồng thành công!",
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            if ($e instanceof ValidationException) {
                return response()->json(['errors' => $e->errors()], 422);
            }
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cập nhật hội đồng
     */
    public function update(Request $request, $id)
    {
        $hoidong = Hoidong::find($id);
        if (!$hoidong) {
            return response()->json(['error' => 'Không tìm thấy hội đồng'], 404);
        }

        $validated = $request->validate([
            'TEN_HOIDONG' => 'nullable|string|max:255',
            'NGAY_BAOCAO' => 'nullable|date',
            'GIO_BAOCAO' => 'nullable|date_format:H:i,H:i:s',
            'PHONG' => 'nullable|string|max:100',
            'ID_KEHOACH' => 'nullable|integer|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'ID_CHUYENNGANH' => 'nullable|integer|exists:CHUYENNGANH,ID_CHUYENNGANH',
            'LOAI' => 'nullable|string|in:phanbien,hoidong',
            'giangviens' => 'nullable|array',
            'giangviens.*.id' => 'required_with:giangviens|integer|exists:GIANGVIEN,ID_GIANGVIEN',
            'giangviens.*.vaitro' => 'nullable|string|in:chutich,thuky,thanhvien,phanbien',
        ]);

        $newPlanId = $validated['ID_KEHOACH'] ?? $hoidong->ID_KEHOACH;
        $newType = $validated['LOAI'] ?? $hoidong->LOAI;
        if ($newPlanId != $hoidong->ID_KEHOACH || $newType != $hoidong->LOAI) {
             $this->validateCouncilTypeAllowed($newPlanId, $newType);
        }

        DB::beginTransaction();
        try {
            $loai = $validated['LOAI'] ?? $hoidong->LOAI;

            if (isset($validated['giangviens'])) {
                $this->validateHoiDongGiangviens($loai, $validated['giangviens']);
            }

            if (!empty($validated['TEN_HOIDONG'])) {
                $kehoachId = $validated['ID_KEHOACH'] ?? $hoidong->ID_KEHOACH;
                $exists = Hoidong::where('TEN_HOIDONG', $validated['TEN_HOIDONG'])
                    ->where('ID_KEHOACH', $kehoachId)
                    ->where('ID_HOIDONG', '!=', $hoidong->ID_HOIDONG)
                    ->exists();

                if ($exists) {
                    throw ValidationException::withMessages([
                        'TEN_HOIDONG' => 'Tên hội đồng đã tồn tại trong kế hoạch này.'
                    ]);
                }
            }

            $hoidong->update([
                'TEN_HOIDONG' => $validated['TEN_HOIDONG'] ?? $hoidong->TEN_HOIDONG,
                'NGAY_BAOCAO' => $validated['NGAY_BAOCAO'] ?? $hoidong->NGAY_BAOCAO,
                'GIO_BAOCAO' => $validated['GIO_BAOCAO'] ?? $hoidong->GIO_BAOCAO,
                'PHONG' => $validated['PHONG'] ?? $hoidong->PHONG,
                'ID_KEHOACH' => $validated['ID_KEHOACH'] ?? $hoidong->ID_KEHOACH,
                'ID_CHUYENNGANH' => $validated['ID_CHUYENNGANH'] ?? $hoidong->ID_CHUYENNGANH,
                'LOAI' => $loai,
            ]);

            if (isset($validated['giangviens'])) {
                $syncData = [];
                foreach ($validated['giangviens'] as $gv) {
                    $idGV = $gv['id'] ?? null;
                    if ($idGV) {
                        $vaitro = $loai === 'phanbien' ? 'phanbien' : ($gv['vaitro'] ?? 'thanhvien');
                        $syncData[$idGV] = ['VAITRO' => $vaitro];
                    }
                }
                $hoidong->giangviens()->sync($syncData);
            }

            DB::commit();
            return response()->json([
                'message' => 'Cập nhật hội đồng thành công!',
                'hoidong' => $hoidong->load(['giangviens.nguoidung', 'kehoach', 'chuyennganh']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            if ($e instanceof ValidationException) {
                return response()->json(['errors' => $e->errors()], 422);
            }
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cập nhật nhanh tên hội đồng (Inline Edit)
     */
    public function updateTenHoiDong(Request $request, $id)
    {
        $hoidong = Hoidong::find($id);
        if (!$hoidong) return response()->json(['error' => 'Không tìm thấy hội đồng'], 404);
        
        $validated = $request->validate([
            'TEN_HOIDONG' => 'required|string|max:255',
        ]);

        try {
            // Kiểm tra tên có bị trùng trong cùng một kế hoạch không (trừ chính nó)
            $exists = Hoidong::where('TEN_HOIDONG', $validated['TEN_HOIDONG'])
                ->where('ID_KEHOACH', $hoidong->ID_KEHOACH)
                ->where('ID_HOIDONG', '!=', $hoidong->ID_HOIDONG)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'TEN_HOIDONG' => 'Tên hội đồng đã tồn tại trong kế hoạch này.'
                ]);
            }

            $hoidong->update(['TEN_HOIDONG' => $validated['TEN_HOIDONG']]);
            
            return response()->json([
                'message' => 'Cập nhật tên hội đồng thành công!', 
                'TEN_HOIDONG' => $hoidong->TEN_HOIDONG
            ]);
            
        } catch (ValidationException $e) {
             return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Cập nhật thất bại: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Cập nhật nhanh phòng (Inline Edit)
     */
    public function updatePhong(Request $request, $id)
    {
        $hoidong = Hoidong::find($id);
        if (!$hoidong) return response()->json(['error' => 'Không tìm thấy hội đồng'], 404);
        $validated = $request->validate(['PHONG' => 'nullable|string|max:50']);
        try {
            $hoidong->update(['PHONG' => $validated['PHONG'] ?? null]);
            return response()->json(['message' => 'Cập nhật phòng thành công!', 'PHONG' => $hoidong->PHONG]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Cập nhật thất bại: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Xóa hội đồng
     */
    public function destroy($id)
    {
        $hoidong = Hoidong::find($id);
        if (!$hoidong) return response()->json(['error' => 'Không tìm thấy hội đồng'], 404);
        DB::beginTransaction();
        try {
            $hoidong->giangviens()->detach();
            $hoidong->nhoms()->detach();
            $hoidong->delete();
            DB::commit();
            return response()->json(['message' => 'Đã xóa hội đồng']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Lỗi xóa hội đồng'], 500);
        }
    }
    
    /**
     * Nâng cấp Hội đồng Phản biện (1 thành viên) lên Hội đồng Bảo vệ (3 thành viên).
     */
    /**
 * Nâng cấp Hội đồng Phản biện (1 thành viên) lên Hội đồng Bảo vệ (3 thành viên).
 */
    public function upgradePhanBienToHoiDong(Request $request, $id)
    {
        // Tải thêm nhóm và điểm để kiểm tra
        $hoidong = Hoidong::with(['giangviens', 'nhoms.diemPhanBien'])->find($id);

        // 1. Kiểm tra điều kiện nâng cấp
        if (!$hoidong) {
            return response()->json(['error' => 'Không tìm thấy Hội đồng.'], 404);
        }

        if ($hoidong->LOAI !== 'phanbien') {
            return response()->json(['error' => 'Chỉ có thể nâng cấp Hội đồng Phản biện.'], 400);
        }

        $currentReviewer = $hoidong->giangviens->first();

        if (!$currentReviewer) {
            return response()->json(['error' => 'Hội đồng Phản biện chưa có thành viên để nâng cấp.'], 400);
        }

        // [ĐÃ XÓA RÀNG BUỘC ĐIỂM]
        // Theo logic mới (3 điểm độc lập), không cần kiểm tra điểm > 0 khi nâng cấp.
        // Nâng cấp chỉ là hành động workflow để chuyển đổi loại hội đồng.

        // 2. Bắt đầu Transaction
        DB::beginTransaction();
        try {
            $currentReviewerId = $currentReviewer->ID_GIANGVIEN;

            // 3. Cập nhật loại Hội đồng
            $hoidong->update([
                'LOAI' => 'hoidong', // Nâng cấp lên Hội đồng Bảo vệ
            ]);

            // 4. Giữ nguyên ID_GIANGVIEN nhưng cập nhật VAITRO trong bảng pivot HOIDONG_GIANGVIEN
            // Giảng viên phản biện cũ trở thành thành viên hội đồng
            $hoidong->giangviens()->sync([
                $currentReviewerId => ['VAITRO' => 'thanhvien']
            ]);

            // NOTE: Sau khi nâng cấp, logic tính tổng kết (đã sửa) sẽ tự động sử dụng 3 thành phần (HD, PB, HĐ)
            // với các điểm đã có và tỷ trọng độc lập.

            DB::commit();

            return response()->json([
                'message' => 'Nâng cấp Hội đồng thành công! Vui lòng thêm 2 thành viên còn lại (Chủ tịch, Thư ký).',
                'hoidong' => $hoidong->load('giangviens.nguoidung')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi nâng cấp Hội đồng: " . $e->getMessage());
            return response()->json(['error' => 'Xảy ra lỗi trong quá trình nâng cấp.'], 500);
        }
    }

    /**
     * Lấy các tùy chọn (Kế hoạch) - Giữ nguyên
     */
    public function getKeHoachOptions()
    {
        $statuses = ['Đang thực hiện', 'Chờ duyệt chỉnh sửa'];
        $globalSetting = TyTrongDiem::getCurrent();
        $defaultPhanBien = $globalSetting ? (float)$globalSetting->PHANBIEN : 0.3;

        $plans = KehoachKhoaluan::select('ID_KEHOACH', 'TEN_DOT', 'NAMHOC', 'HOCKY', 'TYTRONG_DIEM_PHANBIEN')
            ->whereIn('TRANGTHAI', $statuses)
            ->orderBy('NGAYTAO', 'desc')
            ->get();

        $plans->transform(function ($plan) use ($defaultPhanBien) {
            $tyTrongPB = $plan->TYTRONG_DIEM_PHANBIEN ?? $defaultPhanBien;
            $plan->allow_phanbien = $tyTrongPB > 0;
            return $plan;
        });

        return response()->json($plans);
    }

    /**
     * Lấy các tùy chọn (Chuyên ngành) - Giữ nguyên
     */
    public function getChuyenNganhOptions()
    {
        return response()->json(Chuyennganh::select('ID_CHUYENNGANH', 'TEN_CHUYENNGANH')->where('TRANGTHAI_KICHHOAT', true)->get());
    }

    /**
     * Lấy chi tiết 1 hội đồng - Giữ nguyên
     */
    public function show($id)
    {
        $hoidong = Hoidong::with(['giangviens.nguoidung', 'giangviens.khoabomon', 'kehoach', 'chuyennganh', 'nhoms.phancongDetaiNhom.detai', 'nhoms.phancongDetaiNhom.gvhd.nguoidung'])->find($id);
        return $hoidong ? response()->json($hoidong) : response()->json(['error' => 'Không tìm thấy'], 404);
    }

    /**
     * XÓA PHÂN BỔ NHÓM KHỎI HỘI ĐỒNG - Giữ nguyên
     */
    public function xoaPhanBoNhom($idHoiDong, $idNhom)
    {
        $hoidong = Hoidong::find($idHoiDong);
        if (!$hoidong) return response()->json(['error' => 'Không tìm thấy hội đồng'], 404);
        $nhom = Nhom::find($idNhom);
        if (!$nhom) return response()->json(['error' => 'Không tìm thấy nhóm'], 404);

        DB::beginTransaction();
        try {
            $hoidong->nhoms()->detach($idNhom);
            DB::commit();
            return response()->json(['message' => 'Đã xóa nhóm khỏi hội đồng']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi xóa phân bổ nhóm: " . $e->getMessage());
            return response()->json(['error' => 'Không thể xóa nhóm khỏi hội đồng'], 500);
        }
    }

    /**
     * Lấy danh sách nhóm theo kế hoạch - Giữ nguyên
     */
    public function getNhomTheoKeHoach($idKeHoach)
    {
        try {
            $nhoms = Nhom::where('ID_KEHOACH', $idKeHoach)
                ->with([
                    'hoidongs:ID_HOIDONG,TEN_HOIDONG',
                    'phancongDetaiNhom' => function ($query) {
                        $query->select('ID_PHANCONG', 'ID_NHOM', 'ID_DETAI')
                            ->with('detai:ID_DETAI,TEN_DETAI');
                    },
                    'phancongDetaiNhom.gvhd'
                ])
                ->get()
                ->map(function ($nhom) {
                    $hoidong = $nhom->hoidongs->first();
                    return [
                        'ID_NHOM' => $nhom->ID_NHOM,
                        'TEN_NHOM' => $nhom->TEN_NHOM,
                        'ID_KEHOACH' => $nhom->ID_KEHOACH,
                        'TEN_DETAI' => $nhom->phancongDetaiNhom?->detai?->TEN_DETAI ?? 'Chưa đăng ký đề tài',
                        'ID_HOIDONG' => $hoidong?->ID_HOIDONG ?? null,
                        'TEN_HOIDONG' => $hoidong?->TEN_HOIDONG ?? null,
                    ];
                });

            return response()->json($nhoms);
        } catch (\Exception $e) {
            Log::error("Lỗi tại getNhomTheoKeHoach: " . $e->getMessage());
            return response()->json(['error' => 'Không thể tải dữ liệu nhóm', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Lưu phân bổ nhóm vào hội đồng - Giữ nguyên
     */
    public function phanBoNhom(Request $request)
    {
        $items = $request->all();
        if (empty($items) || !is_array($items)) {
            return response()->json(['error' => 'Dữ liệu gửi lên không hợp lệ!'], 422);
        }

        DB::beginTransaction();
        try {
            foreach ($items as $item) {
                if (!isset($item['ID_NHOM'])) continue;
                $nhom = Nhom::find($item['ID_NHOM']);
                if (!$nhom) continue;
                if (!empty($item['ID_HOIDONG'])) {
                    $nhom->hoidongs()->sync([$item['ID_HOIDONG']]);
                } else {
                    $nhom->hoidongs()->detach();
                }
            }
            DB::commit();
            return response()->json(['message' => 'Phân bổ hội đồng thành công!']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi phân bổ hội đồng: " . $e->getMessage());
            return response()->json(['error' => 'Lỗi khi lưu phân bổ: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Lấy danh sách hội đồng của 1 giảng viên (Dùng cho giảng viên) - Giữ nguyên
     */
    public function getHoiDongByGiangVien()
    {
        try {
            $giangvien = auth()->user()->giangvien;
            if (!$giangvien) return response()->json(['error' => 'Không tìm thấy thông tin giảng viên'], 404);

            $id_gv = $giangvien->ID_GIANGVIEN;
            $hoidongs = Hoidong::whereHas('giangviens', fn($q) => $q->where('GIANGVIEN.ID_GIANGVIEN', $id_gv))
                ->with(['kehoach', 'chuyennganh', 'giangviens.nguoidung'])
                ->get();

            $result = $hoidongs->map(fn($hd) => [
                'ID_HOIDONG' => $hd->ID_HOIDONG,
                'TEN_HOIDONG' => $hd->TEN_HOIDONG,
                'LOAI' => $hd->LOAI,
                'NGAY_BAOCAO' => $hd->NGAY_BAOCAO,
                'GIO_BAOCAO' => $hd->GIO_BAOCAO,
                'PHONG' => $hd->PHONG,
                'TEN_KEHOACH' => $hd->kehoach->TEN_DOT ?? 'N/A',
                'TEN_CHUYENNGANH' => $hd->chuyennganh->TEN_CHUYENNGANH ?? 'N/A',
                'giangviens' => $hd->giangviens->map(fn($gv) => [
                    'ID_GIANGVIEN' => $gv->ID_GIANGVIEN,
                    'TEN_GIANGVIEN' => $gv->nguoidung->HODEM_VA_TEN ?? 'N/A',
                    'VAITRO' => $gv->pivot->VAITRO ?? null,
                ])->toArray(),
            ]);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Lỗi tải danh sách hội đồng', 'message' => $e->getMessage()], 500);
        }
    }


    /**
     * Helper: Kiểm tra loại hội đồng có hợp lệ với kế hoạch không
     */
    private function validateCouncilTypeAllowed($planId, $type)
    {
        if ($type !== 'phanbien') return;
        $plan = KehoachKhoaluan::find($planId);
        if (!$plan) return;
        $globalSetting = TyTrongDiem::getCurrent();
        $defaultPhanBien = $globalSetting ? (float)$globalSetting->PHANBIEN : 0.3;
        $tyTrongPB = $plan->TYTRONG_DIEM_PHANBIEN ?? $defaultPhanBien;

        if ($tyTrongPB <= 0) {
            throw ValidationException::withMessages(['LOAI' => 'Kế hoạch này không yêu cầu phản biện.']);
        }
    }

    /**
     * Helper: Validate giảng viên trong hội đồng
     */
    private function validateHoiDongGiangviens(string $loai, array $giangviens): void
    {
        $count = count($giangviens);
        if ($loai === 'phanbien' && $count > 1) {
            throw ValidationException::withMessages(['giangviens' => 'Hội đồng phản biện chỉ được có tối đa 1 giảng viên.']);
        }
        if ($loai === 'hoidong') {
            if ($count > 3) throw ValidationException::withMessages(['giangviens' => 'Hội đồng bảo vệ chỉ được có tối đa 3 giảng viên.']);
            $roles = [];
            foreach ($giangviens as $gv) {
                $role = $gv['vaitro'] ?? 'thanhvien';
                if ($role === 'phanbien') throw ValidationException::withMessages(['giangviens' => "Không thể gán vai trò 'phản biện' cho hội đồng bảo vệ."]);
                if (in_array($role, ['chutich', 'thuky']) && in_array($role, $roles)) {
                    throw ValidationException::withMessages(['giangviens' => "Vai trò '{$role}' đã có người đảm nhiệm."]);
                }
                if (in_array($role, ['chutich', 'thuky'])) $roles[] = $role;
            }
        }
    }

    private function createSingleHoiDong(array $validated): Hoidong
    {
        if (empty($validated['TEN_HOIDONG'])) {
            $baseName = $validated['LOAI'] === 'phanbien' ? 'HĐ Phản Biện' : 'HĐ Bảo Vệ';
            $count = Hoidong::where('ID_KEHOACH', $validated['ID_KEHOACH'])->count() + 1;
            $validated['TEN_HOIDONG'] = "{$baseName} {$count}";
        }
        if (Hoidong::where('TEN_HOIDONG', $validated['TEN_HOIDONG'])->where('ID_KEHOACH', $validated['ID_KEHOACH'])->exists()) {
            throw ValidationException::withMessages(['TEN_HOIDONG' => 'Tên hội đồng đã tồn tại trong kế hoạch này.']);
        }
        $hoidong = Hoidong::create(collect($validated)->except(['giangviens', 'soLuong'])->all());
        if (!empty($validated['giangviens'])) {
            $syncData = [];
            foreach ($validated['giangviens'] as $gv) {
                if (isset($gv['id'])) {
                    $syncData[$gv['id']] = ['VAITRO' => $validated['LOAI'] === 'phanbien' ? 'phanbien' : ($gv['vaitro'] ?? 'thanhvien')];
                }
            }
            $hoidong->giangviens()->sync($syncData);
        }
        return $hoidong;
    }

    /**
     * Tự động phân công thành viên vào các Hội đồng (Chủ tịch, Thư ký, Thành viên).
     */
    public function autoAssignMembers(Request $request)
    {
        $validated = $request->validate([
            'ID_KEHOACH' => 'required|integer|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'LOAI' => 'required|in:phanbien,hoidong',
            'replaceExisting' => 'boolean', 
        ]);

        $planId = $validated['ID_KEHOACH'];
        $councilType = $validated['LOAI'];
        $replaceExisting = $validated['replaceExisting'] ?? false;
        
        $councils = Hoidong::where('ID_KEHOACH', $planId)
            ->where('LOAI', $councilType)
            ->with(['nhoms.phancongDetaiNhom', 'chuyennganh.khoabomon']) // Không cần load giangviens ở đây
            ->get();

        if ($councils->isEmpty()) {
            return response()->json(['message' => 'Không có Hội đồng nào để phân công.'], 400);
        }

        $allLecturers = Giangvien::with('nguoidung', 'khoabomon')->get(); 
        
        // Tải hiện tại của mỗi GV (tổng số HĐ đã tham gia TRONG KẾ HOẠCH)
        $currentLoads = DB::table('HOIDONG_GIANGVIEN')
            ->join('HOIDONG', 'HOIDONG_GIANGVIEN.ID_HOIDONG', '=', 'HOIDONG.ID_HOIDONG')
            ->where('HOIDONG.ID_KEHOACH', $planId)
            // [SỬA] Chỉ đếm tải cho loại hội đồng đang phân công
            ->where('HOIDONG.LOAI', $councilType) 
            ->groupBy('ID_GIANGVIEN')
            ->select('ID_GIANGVIEN', DB::raw('COUNT(HOIDONG_GIANGVIEN.ID_HOIDONG) as load_count'))
            ->pluck('load_count', 'ID_GIANGVIEN');

        // Tải tất cả thành viên hiện tại của các hội đồng đang xét
        $allCouncilIdsInPlan = $councils->pluck('ID_HOIDONG');
        $currentCouncilMembers = DB::table('HOIDONG_GIANGVIEN')
                                ->whereIn('ID_HOIDONG', $allCouncilIdsInPlan)
                                ->get()
                                ->groupBy('ID_HOIDONG')
                                ->map(fn($group) => $group->pluck('ID_GIANGVIEN'));

        $requiredMemberCount = $councilType === 'hoidong' ? 3 : 1; 
        $totalAssignmentsMade = 0; // Đếm số lần gán mới

        DB::beginTransaction();
        try {
            foreach ($councils as $council) {
                
                $conflictLecturers = $this->getConflictLecturers($council);
                $availableLecturers = $allLecturers->filter(function($gv) use ($conflictLecturers) {
                    return !$conflictLecturers->contains($gv->ID_GIANGVIEN);
                });
                
                $filteredLecturers = $this->filterLecturersByMajor($council, $availableLecturers);
                
                // Lấy ID thành viên cũ của hội đồng NÀY
                $existingMemberIds = collect();
                if (!$replaceExisting) {
                    $existingMemberIds = $currentCouncilMembers->get($council->ID_HOIDONG, collect());
                }

                $finalAssignmentsMap = $this->runGreedyAssignment(
                    $council, 
                    $filteredLecturers, 
                    $currentLoads, 
                    $requiredMemberCount,
                    $existingMemberIds // Truyền ID người cũ (hoặc rỗng nếu ghi đè)
                );
        
                if (!empty($finalAssignmentsMap)) {
                    $syncData = [];
                    $newlyAssignedIds = collect(); 
                    
                    foreach ($finalAssignmentsMap as $member) {
                        $syncData[$member['id']] = ['VAITRO' => $member['role']];
                        $newlyAssignedIds->push($member['id']);
                    }

                    // Lấy ID cũ (từ $currentCouncilMembers, không phải $council->giangviens)
                    $oldIds = $currentCouncilMembers->get($council->ID_HOIDONG, collect());

                    $removedIds = $oldIds->diff($newlyAssignedIds);
                    $addedIds = $newlyAssignedIds->diff($oldIds);

                    // Cập nhật tải (load)
                    foreach ($removedIds as $id) {
                        if ($currentLoads->has($id) && $currentLoads[$id] > 0) {
                            $currentLoads[$id]--;
                        }
                    }
                    foreach ($addedIds as $id) {
                        $currentLoads[$id] = ($currentLoads[$id] ?? 0) + 1;
                        $totalAssignmentsMade++;
                    }
                    
                    // Cập nhật lại $currentCouncilMembers để vòng lặp sau dùng (nếu 1 GV bị xóa ở HĐ này và gán ở HĐ khác)
                    $currentCouncilMembers[$council->ID_HOIDONG] = $newlyAssignedIds;

                    // Ghi đè (sync) thành viên cho hội đồng này
                    $council->giangviens()->sync($syncData); 
                }
            }

            DB::commit();
            return response()->json([
                'message' => "Phân công tự động hoàn tất. Đã gán $totalAssignmentsMade vai trò mới.",
                'total_assigned' => $totalAssignmentsMade
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi phân công Hội đồng tự động: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Lỗi server khi phân công tự động: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Helper: Lọc Giảng viên theo Khoa/Bộ môn của Chuyên ngành Hội đồng
     */
    private function filterLecturersByMajor(Hoidong $council, Collection $availableLecturers): Collection
    {
        $chuyennganh = $council->chuyennganh; 
        
        // Cần ID Khoa/Bộ môn của Chuyên ngành Hội đồng
        $requiredKhoaBomonId = $chuyennganh?->ID_KHOA_BOMON; 

        if (!$requiredKhoaBomonId) {
             // Bỏ qua lọc chuyên môn nếu không có dữ liệu ánh xạ
             return $availableLecturers;
        }
        
        // Lọc cứng: GV phải thuộc Khoa/Bộ môn trùng với Khoa/Bộ môn của Chuyên ngành Hội đồng
        return $availableLecturers->filter(function($gv) use ($requiredKhoaBomonId) {
            return $gv->ID_KHOA_BOMON === $requiredKhoaBomonId;
        });
    }

    /**
     * Helper: Lấy danh sách GV xung đột (HD/PB của nhóm thuộc Hội đồng)
     */
    private function getConflictLecturers(Hoidong $council)
    {
        $conflictIds = collect();
        foreach ($council->nhoms as $nhom) {
            $assignment = $nhom->phancongDetaiNhom;
            if ($assignment) {
                // Thêm GVHD vào danh sách xung đột
                if ($assignment->ID_GVHD) {
                    $conflictIds->push($assignment->ID_GVHD);
                }
                
                // Thêm GVPB vào danh sách xung đột 
                $phanBien = $nhom->hoidongs->firstWhere('LOAI', 'phanbien');
                if ($phanBien) {
                    $phanBien->giangviens->pluck('ID_GIANGVIEN')->each(fn($id) => $conflictIds->push($id));
                }
            }
        }
        return $conflictIds->unique()->filter();
    }
    
    /**
     * Helper: Thuật toán Greedy để gán thành viên cho 1 Hội đồng
     */
    private function runGreedyAssignment(Hoidong $council, Collection $availableLecturers, Collection $currentLoads, int $requiredMemberCount, Collection $existingMemberIds): array
    {
        // 1. Lấy thông tin chi tiết thành viên hiện có (nếu có)
        $finalAssignments = collect();
        if ($existingMemberIds->isNotEmpty()) {
            $existingLecturers = Giangvien::with('nguoidung')
                                ->whereIn('ID_GIANGVIEN', $existingMemberIds)
                                ->get()
                                ->keyBy('ID_GIANGVIEN');

            // Lấy vai trò hiện tại của họ
            $existingRoles = DB::table('HOIDONG_GIANGVIEN')
                                ->where('ID_HOIDONG', $council->ID_HOIDONG)
                                ->whereIn('ID_GIANGVIEN', $existingMemberIds)
                                ->pluck('VAITRO', 'ID_GIANGVIEN');

            foreach ($existingMemberIds as $id) {
                if (isset($existingLecturers[$id])) {
                    $gv = $existingLecturers[$id];
                    // Gán vai trò cũ (nếu là 'chutich'/'thuky') hoặc 'thanhvien' (nếu là HĐPB nâng cấp)
                    $role = $existingRoles->get($id) ?? 'thanhvien';
                    $finalAssignments->push([
                        'id' => $id,
                        'role' => $role,
                        'lecturer' => $gv,
                        'rank' => $this->getLecturerRank($gv),
                        'load' => $currentLoads->get($id, 0),
                    ]);
                }
            }
        }
        
        // Lọc ra các ứng viên mới (chưa có trong hội đồng)
        $newCandidates = $availableLecturers
            ->whereNotIn('ID_GIANGVIEN', $existingMemberIds)
            ->map(fn($gv) => [
                'id' => $gv->ID_GIANGVIEN,
                'lecturer' => $gv,
                'rank' => $this->getLecturerRank($gv),
                'load' => $currentLoads->get($gv->ID_GIANGVIEN, 0),
            ]);

        // 2. Xử lý logic cho HỘI ĐỒNG BẢO VỆ (3 người)
        if ($council->LOAI === 'hoidong' && $requiredMemberCount === 3) {
            
            // Pool ứng viên để lấp chỗ trống (bao gồm người cũ chưa có vai trò và người mới)
            $candidatesPool = $finalAssignments
                                ->whereNotIn('role', ['chutich', 'thuky'])
                                ->merge($newCandidates);

            // 2a. Đảm bảo có Chủ tịch
            $chutich = $finalAssignments->firstWhere('role', 'chutich');
            if (!$chutich) {
                $bestCandidate = $candidatesPool->sortByDesc('rank')->first();
                if ($bestCandidate) {
                    $chutich = ['role' => 'chutich'] + $bestCandidate;
                    $finalAssignments = $finalAssignments->where('id', '!=', $chutich['id']); // Xóa người cũ (nếu có)
                    $finalAssignments->push($chutich);
                    // Xóa khỏi pool ứng viên
                    $candidatesPool = $candidatesPool->where('id', '!=', $chutich['id']);
                }
            }
            
            // 2b. Đảm bảo có Thư ký
            $thuky = $finalAssignments->firstWhere('role', 'thuky');
            if (!$thuky) {
                $bestCandidate = $candidatesPool->sortByDesc('rank')->first();
                if ($bestCandidate) {
                    $thuky = ['role' => 'thuky'] + $bestCandidate;
                    $finalAssignments = $finalAssignments->where('id', '!=', $thuky['id']);
                    $finalAssignments->push($thuky);
                    $candidatesPool = $candidatesPool->where('id', '!=', $thuky['id']);
                }
            }

            // 2c. Gán lại vai trò 'thanhvien' cho những người cũ còn lại (nếu họ không được chọn)
            $finalAssignments = $finalAssignments->map(function($item) {
                if (!in_array($item['role'], ['chutich', 'thuky'])) {
                    $item['role'] = 'thanhvien';
                }
                return $item;
            });

            // 2d. Lấp đầy các vị trí 'thanhvien' còn thiếu
            $membersNeeded = $requiredMemberCount - $finalAssignments->count();
            if ($membersNeeded > 0) {
                $lowestLoadCandidates = $candidatesPool->sortBy('load')->take($membersNeeded);
                foreach ($lowestLoadCandidates as $candidate) {
                    $finalAssignments->push(['role' => 'thanhvien'] + $candidate);
                }
            }

            // Chỉ trả về mảng id/role, đảm bảo đúng 3 người
            return $finalAssignments->map(fn($item) => ['id' => $item['id'], 'role' => $item['role']])
                        ->unique('id') // Đảm bảo không trùng lặp
                        ->take($requiredMemberCount)
                        ->values()
                        ->all();

        } 
        // 3. Xử lý logic cho HỘI ĐỒNG PHẢN BIỆN (1 người)
        elseif ($council->LOAI === 'phanbien' && $requiredMemberCount === 1) {
            // Ưu tiên người cũ
            $candidate = $finalAssignments->first();
            if (!$candidate) {
                // Nếu không có, lấy người mới tải thấp nhất
                $candidate = $newCandidates->sortBy('load')->first();
            }

            if ($candidate) {
                return [['id' => $candidate['id'], 'role' => 'phanbien']];
            }
        }

        return []; // Rỗng nếu không xử lý được
    }
    
    /**
     * Helper: Xếp hạng giảng viên cho vai trò Chủ tịch/Thư ký
     */
    private function getLecturerRank($lecturer): int
    {
        $rank = 0;
        // Học vị cao sẽ có rank cao hơn
        if (str_contains($lecturer->HOCVI, 'Giáo sư')) $rank += 10;
        elseif (str_contains($lecturer->HOCVI, 'Phó giáo sư')) $rank += 8;
        elseif (str_contains($lecturer->HOCVI, 'Tiến sĩ')) $rank += 5;
        elseif (str_contains($lecturer->HOCVI, 'Thạc sĩ')) $rank += 3;
        
        // Chức vụ quản lý cũng được ưu tiên
        if (str_contains($lecturer->CHUCVU, 'Trưởng khoa')) $rank += 4;
        elseif (str_contains($lecturer->CHUCVU, 'Trưởng bộ môn')) $rank += 2;

        return $rank;
    }
}