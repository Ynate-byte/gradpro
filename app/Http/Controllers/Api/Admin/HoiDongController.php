<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Chuyennganh;
use App\Models\Hoidong;
use App\Models\KehoachKhoaluan;
use App\Models\Nhom;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class HoiDongController extends Controller
{
    /**
     * Lấy danh sách hội đồng (có tìm kiếm)
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

        // [SỬA LỖI]
        // 1. Kiểm tra xem có yêu cầu 'all' (cho trang Phân Bổ) không
        if ($request->boolean('all')) {
            $hoidongs = $query->get(); // Lấy TẤT CẢ
            // Transform cho .get()
            $hoidongs->transform(function ($hd) {
                $hd->so_thanh_vien = $hd->giangviens->count();
                $hd->so_nhom = $hd->nhoms->count();
                return $hd;
            });
            return response()->json($hoidongs); // Trả về một MẢNG
        }

        // 2. Mặc định là phân trang (cho trang List)
        $hoidongs = $query->paginate($request->per_page ?? 10);

        // Transform cho .paginate()
        $hoidongs->getCollection()->transform(function ($hd) {
            $hd->so_thanh_vien = $hd->giangviens->count();
            $hd->so_nhom = $hd->nhoms->count();
            return $hd;
        });

        return response()->json($hoidongs); // Trả về ĐỐI TƯỢNG PHÂN TRANG
    }

    /**
     * [MỚI] Lấy dữ liệu thống kê cho StatCards
     */
    public function getStatistics(Request $request)
    {
        $validated = $request->validate([
            'kehoach' => 'nullable|integer|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
        ]);

        $planId = $validated['kehoach'] ?? null;

        // Bắt đầu query
        $query = Hoidong::query();

        if ($planId) {
            $query->where('ID_KEHOACH', $planId);
        } else {
             // Nếu không có planId, chỉ lấy các kế hoạch đang hoạt động
            $query->whereHas('kehoach', function ($q) {
                $q->whereIn('TRANGTHAI', ['Đang thực hiện', 'Chờ duyệt chỉnh sửa']);
            });
        }

        // 1. Tổng số hội đồng
        $totalHoiDong = (clone $query)->count();

        // 2. Tổng số HĐ Phản Biện
        $totalPhanBien = (clone $query)->where('LOAI', 'phanbien')->count();

        // 3. Tổng số HĐ Bảo Vệ
        $totalBaoVe = (clone $query)->where('LOAI', 'hoidong')->count();

        // 4. Tổng số nhóm đã phân bổ
        $hoidongIds = (clone $query)->pluck('ID_HOIDONG');

        $nhomDaPhanBo = DB::table('HOIDONG_NHOM')
            ->whereIn('ID_HOIDONG', $hoidongIds)
            ->distinct('ID_NHOM')
            ->count('ID_NHOM');
            
        // 5. Tổng số thành viên (GV)
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

        DB::beginTransaction();
        try {
            $isManual = !$request->has('soLuong') || (int)$request->input('soLuong', 1) === 1;

            if ($isManual) {
                $this->validateHoiDongGiangviens($validated['LOAI'], $validated['giangviens'] ?? []);
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
                'message' => $isManual
                    ? 'Tạo hội đồng thành công!'
                    : "Tạo {$validated['soLuong']} hội đồng thành công!",
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
     * Helper validation logic cho giảng viên trong hội đồng
     */
    private function validateHoiDongGiangviens(string $loai, array $giangviens): void
    {
        $count = count($giangviens);

        if ($loai === 'phanbien') {
            if ($count > 1) {
                throw ValidationException::withMessages([
                    'giangviens' => 'Hội đồng phản biện chỉ được có tối đa 1 giảng viên.'
                ]);
            }
        }

        if ($loai === 'hoidong') {
            if ($count > 3) {
                throw ValidationException::withMessages([
                    'giangviens' => 'Hội đồng bảo vệ chỉ được có tối đa 3 giảng viên.'
                ]);
            }

            $roles = [];
            foreach ($giangviens as $gv) {
                $role = $gv['vaitro'] ?? 'thanhvien';

                if ($role === 'phanbien') {
                    throw ValidationException::withMessages([
                        'giangviens' => "Không thể gán vai trò 'phản biện' cho hội đồng bảo vệ."
                    ]);
                }

                if (in_array($role, ['chutich', 'thuky']) && in_array($role, $roles)) {
                    $roleName = $role === 'chutich' ? 'Chủ tịch' : 'Thư ký';
                    throw ValidationException::withMessages([
                        'giangviens' => "Vai trò '{$roleName}' đã có người đảm nhiệm. Mỗi hội đồng chỉ có 1 {$roleName}."
                    ]);
                }

                if (in_array($role, ['chutich', 'thuky'])) {
                    $roles[] = $role;
                }
            }
        }
    }

    /**
     * Hàm helper tạo 1 hội đồng
     */
    private function createSingleHoiDong(array $validated): Hoidong
    {
        if (empty($validated['TEN_HOIDONG'])) {
            $baseName = $validated['LOAI'] === 'phanbien' ? 'HĐ Phản Biện' : 'HĐ Bảo Vệ';
            $count = Hoidong::where('ID_KEHOACH', $validated['ID_KEHOACH'])->count() + 1;
            $validated['TEN_HOIDONG'] = "{$baseName} {$count}";
        }

        $exists = Hoidong::where('TEN_HOIDONG', $validated['TEN_HOIDONG'])
            ->where('ID_KEHOACH', $validated['ID_KEHOACH'])
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'TEN_HOIDONG' => 'Tên hội đồng này đã tồn tại trong kế hoạch này.'
            ]);
        }

        $giangviens = $validated['giangviens'] ?? [];
        $hoidongData = collect($validated)->except(['giangviens', 'soLuong'])->all();

        $hoidong = Hoidong::create($hoidongData);

        if (!empty($giangviens)) {
            $syncData = [];
            foreach ($giangviens as $gv) {
                $idGV = $gv['id'] ?? null;
                if ($idGV) {
                    $vaitro = $validated['LOAI'] === 'phanbien'
                        ? 'phanbien'
                        : ($gv['vaitro'] ?? 'thanhvien');
                    $syncData[$idGV] = ['VAITRO' => $vaitro];
                }
            }
            $hoidong->giangviens()->sync($syncData);
        }

        return $hoidong;
    }

    /**
     * Lấy chi tiết 1 hội đồng
     */
    public function show($id)
    {
        $hoidong = Hoidong::with([
            'giangviens.nguoidung',
            'giangviens.khoabomon:ID_KHOA_BOMON,TEN_KHOA_BOMON',
            'kehoach',
            'chuyennganh',
            'nhoms.phancongDetaiNhom.detai',
            'nhoms.phancongDetaiNhom.gvhd.nguoidung'
        ])->find($id);

        if (!$hoidong) {
            return response()->json(['error' => 'Không tìm thấy hội đồng'], 404);
        }

        return response()->json($hoidong);
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
                        $vaitro = $loai === 'phanbien'
                            ? 'phanbien'
                            : ($gv['vaitro'] ?? 'thanhvien');
                        $syncData[$idGV] = ['VAITRO' => $vaitro];
                    }
                }
                $hoidong->giangviens()->sync($syncData);
            }

            DB::commit();
            $hoidong->load(['giangviens.nguoidung', 'kehoach', 'chuyennganh']);

            return response()->json([
                'message' => 'Cập nhật hội đồng thành công!',
                'hoidong' => $hoidong,
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
     * [MỚI] Cập nhật nhanh phòng (Inline Edit)
     */
    public function updatePhong(Request $request, $id)
    {
        $hoidong = Hoidong::find($id);
        if (!$hoidong) {
            return response()->json(['error' => 'Không tìm thấy hội đồng'], 404);
        }

        $validated = $request->validate([
            'PHONG' => 'nullable|string|max:50',
        ]);

        try {
            $hoidong->update(['PHONG' => $validated['PHONG'] ?? null]);
            return response()->json([
                'message' => 'Cập nhật phòng thành công!',
                'PHONG' => $hoidong->PHONG
            ]);
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
        if (!$hoidong) {
            return response()->json(['error' => 'Không tìm thấy hội đồng'], 404);
        }

        DB::beginTransaction();
        try {
            $hoidong->giangviens()->detach();
            $hoidong->nhoms()->detach();
            $hoidong->delete();

            DB::commit();
            return response()->json(['message' => 'Đã xóa hội đồng']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi xóa hội đồng: " . $e->getMessage());
            return response()->json(['error' => 'Không thể xóa hội đồng, đã có lỗi xảy ra.'], 500);
        }
    }

    /**
     * XÓA PHÂN BỔ NHÓM KHỎI HỘI ĐỒNG
     */
    public function xoaPhanBoNhom($idHoiDong, $idNhom)
    {
        $hoidong = Hoidong::find($idHoiDong);
        if (!$hoidong) {
            return response()->json(['error' => 'Không tìm thấy hội đồng'], 404);
        }

        $nhom = Nhom::find($idNhom);
        if (!$nhom) {
            return response()->json(['error' => 'Không tìm thấy nhóm'], 404);
        }

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
     * Lấy các tùy chọn (Kế hoạch)
     */
    public function getKeHoachOptions()
    {
        $statuses = ['Đang thực hiện', 'Chờ duyệt chỉnh sửa'];

        return response()->json(
            KehoachKhoaluan::select('ID_KEHOACH', 'TEN_DOT', 'NAMHOC', 'HOCKY')
                ->whereIn('TRANGTHAI', $statuses)
                ->orderBy('NGAYTAO', 'desc')
                ->get()
        );
    }

    /**
     * Lấy các tùy chọn (Chuyên ngành)
     */
    public function getChuyenNganhOptions()
    {
        return response()->json(
            Chuyennganh::select('ID_CHUYENNGANH', 'TEN_CHUYENNGANH')
                ->where('TRANGTHAI_KICHHOAT', true)
                ->get()
        );
    }

    /**
     * Lấy danh sách nhóm theo kế hoạch
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
            Log::error("Lỗi tại getNhomTheoKeHoach: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Không thể tải dữ liệu nhóm',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lưu phân bổ nhóm vào hội đồng
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
                if (!isset($item['ID_NHOM'])) {
                    continue;
                }

                $nhom = Nhom::find($item['ID_NHOM']);
                if (!$nhom) {
                    continue;
                }

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
     * Lấy danh sách hội đồng của 1 giảng viên (Dùng cho giảng viên)
     */
    public function getHoiDongByGiangVien()
    {
        try {
            $giangvien = auth()->user()->giangvien;
            if (!$giangvien) {
                return response()->json(['error' => 'Không tìm thấy thông tin giảng viên cho tài khoản này.'], 404);
            }

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
            return response()->json([
                'error' => 'Không thể tải danh sách hội đồng cho giảng viên này',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}