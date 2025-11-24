<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Chuyennganh;
use App\Models\Hoidong;
use App\Models\KehoachKhoaluan;
use App\Models\Nhom;
use App\Models\TyTrongDiem;
use App\Models\Giangvien;
use App\Models\KhoaBomon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class HoiDongController extends Controller
{
    public function index(Request $request)
    {
        $query = Hoidong::with(['kehoach', 'chuyennganh'])
            ->with(['nhoms' => function ($q) {
                $q->withCount(['diemPhanBien', 'diemHoiDong']);
            }])
            ->withCount('giangviens')
            ->orderBy($request->input('sort', 'NGAY_BAOCAO'), $request->input('dir', 'desc'));

        $query->whereHas('kehoach', function ($q) {
            $q->whereIn('TRANGTHAI', ['Đang thực hiện', 'Chờ duyệt chỉnh sửa', 'Đang chấm điểm']);
        });

        if ($request->filled('search')) {
            $query->where('TEN_HOIDONG', 'like', '%' . $request->input('search') . '%');
        }

        if ($request->filled('kehoach')) {
            $query->where('ID_KEHOACH', $request->input('kehoach'));
        }

        if ($request->filled('chuyennganh')) {
            $query->whereIn('ID_CHUYENNGANH', $request->input('chuyennganh'));
        }

        if ($request->filled('loai')) {
            $query->whereIn('LOAI', $request->input('loai'));
        }

        $calculateStatus = function ($hd) {
            $hd->so_thanh_vien = $hd->giangviens_count;
            $hd->so_nhom = $hd->nhoms->count();

            if ($hd->so_nhom === 0) {
                $hd->trang_thai_cham_diem = 'chua_phan_bo';
            } else {
                $allGraded = true;
                $totalMembers = $hd->so_thanh_vien;
                if ($totalMembers == 0) {
                    $hd->trang_thai_cham_diem = 'chua_cham_diem';
                    return $hd;
                }

                foreach ($hd->nhoms as $nhom) {
                    if ($hd->LOAI === 'phanbien' && $nhom->diem_phan_bien_count < $totalMembers) {
                        $allGraded = false;
                        break;
                    } elseif ($hd->LOAI === 'hoidong' && $nhom->diem_hoi_dong_count < $totalMembers) {
                        $allGraded = false;
                        break;
                    }
                }
                $hd->trang_thai_cham_diem = $allGraded ? 'da_cham_diem' : 'chua_cham_diem';
            }
            return $hd;
        };

        if ($request->boolean('all')) {
            $hoidongs = $query->with(['giangviens.nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN'])->get();
            
            $hoidongs->transform($calculateStatus);

            if ($request->filled('trang_thai_cham_diem')) {
                $hoidongs = $hoidongs->whereIn('trang_thai_cham_diem', $request->input('trang_thai_cham_diem'));
            }
            return response()->json($hoidongs->values());
        }

        $allMatchingHoidongs = $query->get();
        $allMatchingHoidongs->transform($calculateStatus);

        if ($request->filled('trang_thai_cham_diem')) {
            $allMatchingHoidongs = $allMatchingHoidongs->whereIn('trang_thai_cham_diem', $request->input('trang_thai_cham_diem'));
        }

        $perPage = $request->per_page ?? 10;
        $page = $request->page ?? 1;
        $paginatedItems = $allMatchingHoidongs->slice(($page - 1) * $perPage, $perPage)->values();

        $hoidongs = new \Illuminate\Pagination\LengthAwarePaginator(
            $paginatedItems,
            $allMatchingHoidongs->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return response()->json($hoidongs);
    }

    public function getStatistics(Request $request)
    {
        $validated = $request->validate([
            'kehoach' => 'nullable|integer|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
        ]);

        $planId = $validated['kehoach'] ?? null;

        $queryHoiDong = Hoidong::query();
        if ($planId) {
            $queryHoiDong->where('ID_KEHOACH', $planId);
        } else {
            $queryHoiDong->whereHas('kehoach', function ($q) {
                $q->whereIn('TRANGTHAI', ['Đang thực hiện', 'Chờ duyệt chỉnh sửa', 'Đang chấm điểm']);
            });
        }

        $totalHoiDong = (clone $queryHoiDong)->count();
        $totalPhanBien = (clone $queryHoiDong)->where('LOAI', 'phanbien')->count();
        $totalBaoVe = (clone $queryHoiDong)->where('LOAI', 'hoidong')->count();

        $hoidongIds = (clone $queryHoiDong)->pluck('ID_HOIDONG');

        $totalThanhVien = DB::table('HOIDONG_GIANGVIEN')
            ->whereIn('ID_HOIDONG', $hoidongIds)
            ->distinct('ID_GIANGVIEN')
            ->count('ID_GIANGVIEN');

        $nhomDaPhanBo = DB::table('HOIDONG_NHOM')
            ->whereIn('ID_HOIDONG', $hoidongIds)
            ->distinct('ID_NHOM')
            ->count('ID_NHOM');

        $queryGroupsNeed = Nhom::query();
        if ($planId) {
            $queryGroupsNeed->where('ID_KEHOACH', $planId);
        } else {
            $queryGroupsNeed->whereHas('kehoach', function ($q) {
                $q->whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm']);
            });
        }

        $nhomCanPhanBo = $queryGroupsNeed
            ->whereDoesntHave('hoidongs')
            ->whereHas('phancongDetaiNhom.submissions', function ($q) {
                $q->where('TRANGTHAI', 'Đã xác nhận');
            })
            ->count();

        return response()->json([
            'totalHoiDong' => $totalHoiDong,
            'totalPhanBien' => $totalPhanBien,
            'totalBaoVe' => $totalBaoVe,
            'nhomDaPhanBo' => $nhomDaPhanBo,
            'totalThanhVien' => $totalThanhVien,
            'nhomCanPhanBo' => $nhomCanPhanBo,
        ]);
    }

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

    public function updateTenHoiDong(Request $request, $id)
    {
        $hoidong = Hoidong::find($id);
        if (!$hoidong) return response()->json(['error' => 'Không tìm thấy hội đồng'], 404);

        $validated = $request->validate([
            'TEN_HOIDONG' => 'required|string|max:255',
        ]);

        try {
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

    public function upgradePhanBienToHoiDong(Request $request, $id)
    {
        $hoidong = Hoidong::with(['giangviens', 'nhoms.diemPhanBien'])->find($id);

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

        DB::beginTransaction();
        try {
            $currentReviewerId = $currentReviewer->ID_GIANGVIEN;

            $hoidong->update([
                'LOAI' => 'hoidong',
            ]);

            // Giảng viên phản biện cũ trở thành thành viên hội đồng
            $hoidong->giangviens()->sync([
                $currentReviewerId => ['VAITRO' => 'thanhvien']
            ]);

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

    public function bulkUpgrade(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:HOIDONG,ID_HOIDONG',
        ]);

        $upgradedCount = 0;
        $failedCount = 0;
        $failedMessages = [];

        DB::beginTransaction();
        try {
            foreach ($validated['ids'] as $id) {
                $hoidong = Hoidong::with('giangviens')->find($id);

                if (!$hoidong) {
                    $failedCount++;
                    $failedMessages[] = "ID $id: Không tìm thấy.";
                    continue;
                }

                if ($hoidong->LOAI !== 'phanbien') {
                    $failedCount++;
                    $failedMessages[] = "ID $id ({$hoidong->TEN_HOIDONG}): Không phải HĐ Phản biện.";
                    continue;
                }

                $currentReviewer = $hoidong->giangviens->first();
                if (!$currentReviewer) {
                    $failedCount++;
                    $failedMessages[] = "ID $id ({$hoidong->TEN_HOIDONG}): HĐ Phản biện không có thành viên.";
                    continue;
                }

                $hoidong->update(['LOAI' => 'hoidong']);
                $hoidong->giangviens()->sync([
                    $currentReviewer->ID_GIANGVIEN => ['VAITRO' => 'thanhvien']
                ]);

                $upgradedCount++;
            }

            DB::commit();

            $message = "Nâng cấp hoàn tất: $upgradedCount hội đồng thành công.";
            if ($failedCount > 0) {
                $message .= " $failedCount thất bại.";
                Log::warning('Bulk upgrade HĐ thất bại chi tiết: ' . implode('; ', $failedMessages));
            }

            return response()->json([
                'message' => $message,
                'upgraded' => $upgradedCount,
                'failed' => $failedCount,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi bulk upgrade Hội đồng: " . $e->getMessage());
            return response()->json(['error' => 'Xảy ra lỗi server trong quá trình nâng cấp.'], 500);
        }
    }

    public function getKeHoachOptions()
    {
        $statuses = ['Đang thực hiện', 'Chờ duyệt chỉnh sửa', 'Đang chấm điểm'];
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

    public function getChuyenNganhOptions()
    {
        return response()->json(Chuyennganh::select('ID_CHUYENNGANH', 'TEN_CHUYENNGANH')->where('TRANGTHAI_KICHHOAT', true)->get());
    }

    public function show($id)
    {
        $hoidong = Hoidong::with([
            'giangviens.nguoidung',
            'giangviens.khoabomon',
            'kehoach',
            'chuyennganh',
            'nhoms' => function($q) {
                $q->with([
                    'phancongDetaiNhom.detai',
                    'phancongDetaiNhom.gvhd.nguoidung',
                    'thanhviens.nguoidung',
                    'diemHoiDong'
                ]);
            }
        ])->find($id);

        return $hoidong ? response()->json($hoidong) : response()->json(['error' => 'Không tìm thấy'], 404);
    }

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

    public function getNhomTheoKeHoach($idKeHoach)
    {
        try {
            $nhoms = Nhom::where('ID_KEHOACH', $idKeHoach)
                ->whereHas('phancongDetaiNhom', function ($q) {
                    $q->whereIn('TRANGTHAI', ['Đang thực hiện', 'Đã hoàn thành']);
                })
                ->whereHas('phancongDetaiNhom.submissions', function ($q) {
                    $q->where('TRANGTHAI', 'Đã xác nhận');
                })
                ->with([
                    'hoidongs:ID_HOIDONG,TEN_HOIDONG',
                    'phancongDetaiNhom' => function ($query) {
                        $query->select('ID_PHANCONG', 'ID_NHOM', 'ID_DETAI')
                            ->with('detai:ID_DETAI,TEN_DETAI');
                    },
                    'phancongDetaiNhom.gvhd',
                    // [CẬP NHẬT] Load thêm thông tin để lọc
                    'chuyennganh:ID_CHUYENNGANH,TEN_CHUYENNGANH', 
                    'khoabomon:ID_KHOA_BOMON,TEN_KHOA_BOMON'
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
                        
                        // [CẬP NHẬT] Thêm trường để frontend lọc
                        'ID_CHUYENNGANH' => $nhom->ID_CHUYENNGANH,
                        'TEN_CHUYENNGANH' => $nhom->chuyennganh?->TEN_CHUYENNGANH,
                        'ID_KHOA_BOMON' => $nhom->ID_KHOA_BOMON,
                        'TEN_KHOA_BOMON' => $nhom->khoabomon?->TEN_KHOA_BOMON,
                    ];
                });

            return response()->json($nhoms);
        } catch (\Exception $e) {
            Log::error("Lỗi tại getNhomTheoKeHoach: " . $e->getMessage());
            return response()->json(['error' => 'Không thể tải dữ liệu nhóm', 'message' => $e->getMessage()], 500);
        }
    }

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

    public function getHoiDongByGiangVien()
    {
        try {
            $giangvien = auth()->user()->giangvien;
            if (!$giangvien) return response()->json(['error' => 'Không tìm thấy thông tin giảng viên'], 404);

            $id_gv = $giangvien->ID_GIANGVIEN;
            $hoidongs = Hoidong::whereHas('giangviens', fn($q) => $q->where('GIANGVIEN.ID_GIANGVIEN', $id_gv))
                ->with(['kehoach', 'chuyennganh', 'giangviens.nguoidung'])
                ->orderBy('ID_KEHOACH', 'desc')
                ->get();

            $result = $hoidongs->map(fn($hd) => [
                'ID_HOIDONG' => $hd->ID_HOIDONG,
                'TEN_HOIDONG' => $hd->TEN_HOIDONG,
                'LOAI' => $hd->LOAI,
                'NGAY_BAOCAO' => $hd->NGAY_BAOCAO,
                'GIO_BAOCAO' => $hd->GIO_BAOCAO,
                'PHONG' => $hd->PHONG,
                
                // Thêm 2 trường này để Frontend lọc được
                'ID_KEHOACH' => $hd->ID_KEHOACH,
                'ID_CHUYENNGANH' => $hd->ID_CHUYENNGANH,

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

    public function getAutoCreateStats(Request $request)
    {
        $planId = $request->input('plan_id');
        $type = $request->input('type', 'hoidong'); 

        if (!$planId) return response()->json([]);

        // 1. Lấy các nhóm đủ điều kiện NGHIÊM NGẶT
        $groups = Nhom::where('ID_KEHOACH', $planId)
            // Điều kiện: Chưa có hội đồng loại này
            ->whereDoesntHave('hoidongs', function($q) use ($type) {
                $q->where('LOAI', $type);
            })
            // Điều kiện QUAN TRỌNG: Phải có bài nộp ĐÃ ĐƯỢC DUYỆT
            ->whereHas('phancongDetaiNhom.submissions', function ($q) {
                $q->where('TRANGTHAI', 'Đã xác nhận');
            })
            // Eager load để lấy thông tin Bộ môn từ Đề tài -> GV Đề xuất
            ->with([
                'phancongDetaiNhom.detai.nguoiDexuat', // Để lấy ID_KHOA_BOMON từ GV ra đề
                'phancongDetaiNhom.gvhd' // Fallback nếu cần
            ])
            ->get();

        // 2. Nhóm các group theo ID_KHOA_BOMON (Lấy từ Đề tài)
        // Bước này quan trọng để fix lỗi không hiện nhóm nếu bảng NHOM thiếu ID_KHOA_BOMON
        $grouped = $groups->groupBy(function ($group) {
            // Ưu tiên 1: Lấy bộ môn của Người đề xuất đề tài (Chính xác nhất)
            if ($group->phancongDetaiNhom?->detai?->nguoiDexuat?->ID_KHOA_BOMON) {
                return $group->phancongDetaiNhom->detai->nguoiDexuat->ID_KHOA_BOMON;
            }
            // Ưu tiên 2: Lấy bộ môn của GVHD
            if ($group->phancongDetaiNhom?->gvhd?->ID_KHOA_BOMON) {
                return $group->phancongDetaiNhom->gvhd->ID_KHOA_BOMON;
            }
            // Ưu tiên 3: Lấy trực tiếp từ nhóm (nếu có set)
            return $group->ID_KHOA_BOMON ?? 'UNKNOWN';
        });
        
        $stats = [];
        foreach ($grouped as $deptId => $groupList) {
            if ($deptId === 'UNKNOWN') continue; // Bỏ qua nếu không xác định được bộ môn

            $dept = KhoaBomon::find($deptId);
            if (!$dept) continue;

            $count = $groupList->count();
            
            // Tìm chuyên ngành mặc định của bộ môn này để gán cho Hội đồng
            $defaultMajor = Chuyennganh::where('ID_KHOA_BOMON', $deptId)
                                        ->where('TRANGTHAI_KICHHOAT', true)
                                        ->first();

            $stats[] = [
                'ID_KHOA_BOMON' => $deptId,
                'TEN_KHOA_BOMON' => $dept->TEN_KHOA_BOMON,
                'MA_KHOA_BOMON' => $dept->MA_KHOA_BOMON, 
                'group_count' => $count,
                'suggested_councils' => 0, // Frontend sẽ tính
                'default_major_id' => $defaultMajor ? $defaultMajor->ID_CHUYENNGANH : null,
                'prefix_name' => "" 
            ];
        }

        return response()->json($stats);
    }

    /**
     * [MỚI] Tạo hội đồng hàng loạt theo từng bộ môn
     */
    public function createBulkByDepartment(Request $request)
    {
        $validated = $request->validate([
            'ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'LOAI' => 'required|in:hoidong,phanbien',
            'items' => 'required|array', // Danh sách các bộ môn cần tạo
            'items.*.ID_KHOA_BOMON' => 'required',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.prefix' => 'required|string',
            'items.*.major_id' => 'nullable'
        ]);

        DB::beginTransaction();
        try {
            $totalCreated = 0;
            
            foreach ($validated['items'] as $item) {
                $qty = $item['quantity'];
                $prefix = $item['prefix'];
                $majorId = $item['major_id'];

                // Nếu không có chuyên ngành cụ thể, bỏ qua hoặc gán null (tùy DB constraint)
                if (!$majorId) {
                     $defaultMajor = Chuyennganh::where('ID_KHOA_BOMON', $item['ID_KHOA_BOMON'])->first();
                     $majorId = $defaultMajor ? $defaultMajor->ID_CHUYENNGANH : null;
                }

                // Tạo N hội đồng cho bộ môn này
                for ($i = 1; $i <= $qty; $i++) {
                    // Tạo tên: "HĐ Bảo vệ - CNTT 1", "HĐ Bảo vệ - CNTT 2"...
                    $name = "{$prefix} {$i}";
                    
                    // Check trùng tên để thêm hậu tố nếu cần
                    while (Hoidong::where('ID_KEHOACH', $validated['ID_KEHOACH'])
                        ->where('TEN_HOIDONG', $name)->exists()) {
                        $name .= " (" . rand(10, 99) . ")";
                    }

                    Hoidong::create([
                        'TEN_HOIDONG' => $name,
                        'LOAI' => $validated['LOAI'],
                        'ID_KEHOACH' => $validated['ID_KEHOACH'],
                        'ID_CHUYENNGANH' => $majorId,
                        // Các trường khác để null chờ cập nhật sau
                    ]);
                    $totalCreated++;
                }
            }

            DB::commit();
            return response()->json(['message' => "Đã tạo thành công {$totalCreated} hội đồng."]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Lỗi tạo hội đồng: ' . $e->getMessage()], 500);
        }
    }

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
            ->with(['nhoms.phancongDetaiNhom', 'chuyennganh'])
            ->get();

        if ($councils->isEmpty()) {
            return response()->json(['message' => 'Không có Hội đồng nào để phân công.'], 400);
        }

        $allLecturers = Giangvien::with(['nguoidung', 'chucvus'])->get();

        $currentLoads = DB::table('HOIDONG_GIANGVIEN')
            ->join('HOIDONG', 'HOIDONG_GIANGVIEN.ID_HOIDONG', '=', 'HOIDONG.ID_HOIDONG')
            ->where('HOIDONG.ID_KEHOACH', $planId)
            ->groupBy('ID_GIANGVIEN')
            ->select('ID_GIANGVIEN', DB::raw('COUNT(HOIDONG_GIANGVIEN.ID_HOIDONG) as load_count'))
            ->pluck('load_count', 'ID_GIANGVIEN');

        $allCouncilIdsInPlan = $councils->pluck('ID_HOIDONG');
        $currentCouncilMembers = DB::table('HOIDONG_GIANGVIEN')
            ->whereIn('ID_HOIDONG', $allCouncilIdsInPlan)
            ->get()
            ->groupBy('ID_HOIDONG')
            ->map(fn($group) => $group->pluck('ID_GIANGVIEN'));

        $requiredMemberCount = $councilType === 'hoidong' ? 3 : 1;
        $totalAssignmentsMade = 0;

        DB::beginTransaction();
        try {
            foreach ($councils as $council) {

                $conflictLecturers = $this->getConflictLecturers($council);
                $availableLecturers = $allLecturers->filter(function ($gv) use ($conflictLecturers) {
                    return !$conflictLecturers->contains($gv->ID_GIANGVIEN);
                });

                $filteredLecturers = $this->filterLecturersByMajor($council, $availableLecturers);

                if ($filteredLecturers->isEmpty()) {
                    Log::warning("Skipping Council {$council->ID_HOIDONG}: No suitable lecturers found.");
                    continue;
                }

                $existingMemberIds = collect();
                if (!$replaceExisting) {
                    $existingMemberIds = $currentCouncilMembers->get($council->ID_HOIDONG, collect());
                }

                $finalAssignmentsMap = $this->runGreedyAssignment(
                    $council,
                    $filteredLecturers,
                    $currentLoads,
                    $requiredMemberCount,
                    $existingMemberIds
                );

                if (!empty($finalAssignmentsMap)) {
                    $syncData = [];
                    $newlyAssignedIds = collect();

                    foreach ($finalAssignmentsMap as $member) {
                        $syncData[$member['id']] = ['VAITRO' => $member['role']];
                        $newlyAssignedIds->push($member['id']);
                    }

                    $oldIds = $currentCouncilMembers->get($council->ID_HOIDONG, collect());
                    $removedIds = $oldIds->diff($newlyAssignedIds);
                    $addedIds = $newlyAssignedIds->diff($oldIds);

                    foreach ($removedIds as $id) {
                        if ($currentLoads->has($id) && $currentLoads[$id] > 0) {
                            $currentLoads[$id]--;
                        }
                    }
                    foreach ($addedIds as $id) {
                        $currentLoads[$id] = ($currentLoads[$id] ?? 0) + 1;
                        $totalAssignmentsMade++;
                    }

                    $currentCouncilMembers[$council->ID_HOIDONG] = $newlyAssignedIds;
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

    private function filterLecturersByMajor(Hoidong $council, Collection $availableLecturers): Collection
    {
        $chuyennganh = $council->chuyennganh;
        $requiredKhoaBomonId = $chuyennganh?->ID_KHOA_BOMON;

        if (!$requiredKhoaBomonId) {
            Log::warning("AutoAssignMembers: Chuyên ngành ID {$council->ID_CHUYENNGANH} chưa gán Bộ môn. Sử dụng tất cả giảng viên khả dụng.");
            return $availableLecturers;
        }

        $filtered = $availableLecturers->filter(function ($gv) use ($requiredKhoaBomonId) {
            return $gv->ID_KHOA_BOMON === $requiredKhoaBomonId;
        });

        if ($filtered->isEmpty()) {
            Log::info("AutoAssignMembers: Không tìm thấy GV thuộc bộ môn {$requiredKhoaBomonId} đang rảnh. Mở rộng tìm kiếm.");
            return $availableLecturers;
        }

        return $filtered;
    }

    private function getConflictLecturers(Hoidong $council)
    {
        $conflictIds = collect();
        foreach ($council->nhoms as $nhom) {
            $assignment = $nhom->phancongDetaiNhom;
            if ($assignment) {
                if ($assignment->ID_GVHD) {
                    $conflictIds->push($assignment->ID_GVHD);
                }
                $phanBien = $nhom->hoidongs->firstWhere('LOAI', 'phanbien');
                if ($phanBien) {
                    $phanBien->giangviens->pluck('ID_GIANGVIEN')->each(fn($id) => $conflictIds->push($id));
                }
            }
        }
        return $conflictIds->unique()->filter();
    }

    private function runGreedyAssignment(Hoidong $council, Collection $availableLecturers, Collection $currentLoads, int $requiredMemberCount, Collection $existingMemberIds): array
    {
        $finalAssignments = collect();
        if ($existingMemberIds->isNotEmpty()) {
            $existingLecturers = Giangvien::with(['nguoidung', 'chucvus'])
                ->whereIn('ID_GIANGVIEN', $existingMemberIds)
                ->get()
                ->keyBy('ID_GIANGVIEN');

            $existingRoles = DB::table('HOIDONG_GIANGVIEN')
                ->where('ID_HOIDONG', $council->ID_HOIDONG)
                ->whereIn('ID_GIANGVIEN', $existingMemberIds)
                ->pluck('VAITRO', 'ID_GIANGVIEN');

            foreach ($existingMemberIds as $id) {
                if (isset($existingLecturers[$id])) {
                    $gv = $existingLecturers[$id];
                    $load = $currentLoads->get($id, 0);
                    $rank = $this->getLecturerRank($gv, $load);

                    $finalAssignments->push([
                        'id' => $id,
                        'role' => $existingRoles->get($id) ?? 'thanhvien',
                        'lecturer' => $gv,
                        'rank' => $rank,
                        'load' => $load,
                    ]);
                }
            }
        }

        $newCandidates = $availableLecturers
            ->whereNotIn('ID_GIANGVIEN', $existingMemberIds)
            ->map(function ($gv) use ($currentLoads) {
                $load = $currentLoads->get($gv->ID_GIANGVIEN, 0);
                return [
                    'id' => $gv->ID_GIANGVIEN,
                    'lecturer' => $gv,
                    'load' => $load,
                    'rank' => $this->getLecturerRank($gv, $load),
                ];
            });

        if ($council->LOAI === 'hoidong' && $requiredMemberCount === 3) {

            $candidatesPool = $finalAssignments
                ->whereNotIn('role', ['chutich', 'thuky'])
                ->merge($newCandidates);

            $chutich = $finalAssignments->firstWhere('role', 'chutich');
            if (!$chutich) {
                $bestCandidate = $candidatesPool->sortByDesc('rank')->first();
                if ($bestCandidate) {
                    $chutich = ['role' => 'chutich'] + $bestCandidate;
                    $finalAssignments = $finalAssignments->where('id', '!=', $chutich['id']);
                    $finalAssignments->push($chutich);
                    $candidatesPool = $candidatesPool->where('id', '!=', $chutich['id']);
                }
            }

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

            $finalAssignments = $finalAssignments->map(function ($item) {
                if (!in_array($item['role'], ['chutich', 'thuky'])) {
                    $item['role'] = 'thanhvien';
                }
                return $item;
            });

            $membersNeeded = $requiredMemberCount - $finalAssignments->count();
            if ($membersNeeded > 0) {
                $lowestLoadCandidates = $candidatesPool->sortBy('load')->take($membersNeeded);
                foreach ($lowestLoadCandidates as $candidate) {
                    $finalAssignments->push(['role' => 'thanhvien'] + $candidate);
                }
            }

            return $finalAssignments->map(fn($item) => ['id' => $item['id'], 'role' => $item['role']])
                ->unique('id')
                ->take($requiredMemberCount)
                ->values()
                ->all();

        } elseif ($council->LOAI === 'phanbien' && $requiredMemberCount === 1) {
            $candidate = $finalAssignments->first();
            if (!$candidate) {
                $candidate = $newCandidates->sortBy('load')->first();
            }

            if ($candidate) {
                return [['id' => $candidate['id'], 'role' => 'phanbien']];
            }
        }

        return [];
    }

    private function getLecturerRank($lecturer, $currentLoad = 0): int
    {
        $rank = 0;
        if (str_contains($lecturer->HOCVI, 'Giáo sư')) $rank += 10;
        elseif (str_contains($lecturer->HOCVI, 'Phó giáo sư')) $rank += 8;
        elseif (str_contains($lecturer->HOCVI, 'Tiến sĩ')) $rank += 5;
        elseif (str_contains($lecturer->HOCVI, 'Thạc sĩ')) $rank += 3;

        if ($lecturer->hasChucVu('TRUONG_KHOA')) $rank += 4;
        elseif ($lecturer->hasChucVu('TRUONG_BOMON')) $rank += 2;

        $rank -= ($currentLoad * 2);

        return $rank;
    }

    public function getLecturerWorkload(Request $request)
    {
        $planId = $request->input('plan_id');
        if (!$planId) return response()->json([]);

        $lecturers = \App\Models\Giangvien::with([
            'nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN,MA_DINHDANH',
            'khoabomon:ID_KHOA_BOMON,TEN_KHOA_BOMON',
            'hoidongs' => function ($q) use ($planId) {
                $q->where('HOIDONG.ID_KEHOACH', $planId);
            },
        ])->get();

        $quotas = \App\Models\QuotaGiangvien::where('ID_KEHOACH', $planId)->pluck('SO_DETAI_QUOTA', 'ID_GIANGVIEN');

        $stats = $lecturers->map(function ($gv) use ($quotas) {
            $hoidongs = $gv->hoidongs;

            return [
                'id' => $gv->ID_GIANGVIEN,
                'ma_gv' => $gv->nguoidung->MA_DINHDANH,
                'ho_ten' => $gv->nguoidung->HODEM_VA_TEN,
                'don_vi' => $gv->khoabomon->TEN_KHOA_BOMON,
                'total_hoidong' => $hoidongs->count(),
                'role_chutich' => $hoidongs->where('pivot.VAITRO', 'chutich')->count(),
                'role_thuky' => $hoidongs->where('pivot.VAITRO', 'thuky')->count(),
                'role_thanhvien' => $hoidongs->where('pivot.VAITRO', 'thanhvien')->count(),
                'role_phanbien' => $hoidongs->where('pivot.VAITRO', 'phanbien')->count(),
                'quota_huongdan' => $quotas[$gv->ID_GIANGVIEN] ?? 0,
            ];
        });

        $sortedStats = $stats->sortByDesc('total_hoidong')->values();

        return response()->json($sortedStats);
    }

    public function autoAssignGroups(Request $request)
    {
        $request->validate([
            'ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'LOAI' => 'nullable|in:hoidong,phanbien'
        ]);

        $planId = $request->ID_KEHOACH;
        $loai = $request->input('LOAI', 'hoidong');

        $unassignedGroups = Nhom::where('ID_KEHOACH', $planId)
            ->whereDoesntHave('hoidongs')
            ->where('TRANGTHAI', '!=', 'Đã hủy')
            ->whereHas('phancongDetaiNhom.submissions', function ($q) {
                $q->where('TRANGTHAI', 'Đã xác nhận');
            })
            ->get();

        if ($unassignedGroups->isEmpty()) {
            return response()->json(['message' => 'Không còn nhóm nào đủ điều kiện (đã nộp bài & được duyệt) để phân bổ.'], 200);
        }

        $councils = Hoidong::where('ID_KEHOACH', $planId)
            ->where('LOAI', $loai)
            ->withCount('nhoms')
            ->get();

        if ($councils->isEmpty()) {
            $loaiText = $loai === 'phanbien' ? 'Phản biện' : 'Bảo vệ';
            return response()->json(['message' => "Chưa có Hội đồng $loaiText nào được tạo."], 400);
        }

        DB::beginTransaction();
        try {
            $countAssigned = 0;

            foreach ($unassignedGroups as $group) {
                $matchingCouncils = $councils->where('ID_CHUYENNGANH', $group->ID_CHUYENNGANH);

                if ($matchingCouncils->isEmpty()) {
                    $candidateCouncils = $councils;
                } else {
                    $candidateCouncils = $matchingCouncils;
                }

                $bestCouncil = $candidateCouncils->sortBy('nhoms_count')->first();

                if ($bestCouncil) {
                    $bestCouncil->nhoms()->attach($group->ID_NHOM);
                    $bestCouncil->nhoms_count++;

                    $councils = $councils->map(function ($c) use ($bestCouncil) {
                        if ($c->ID_HOIDONG == $bestCouncil->ID_HOIDONG) {
                            $c->nhoms_count = $bestCouncil->nhoms_count;
                        }
                        return $c;
                    });

                    $countAssigned++;
                }
            }

            DB::commit();
            return response()->json(['message' => "Đã phân bổ tự động thành công {$countAssigned} nhóm."]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Lỗi phân bổ: ' . $e->getMessage()], 500);
        }
    }
}