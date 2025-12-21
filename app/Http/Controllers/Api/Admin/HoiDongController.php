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
use App\Services\NotificationService;
use App\Services\ActivityLogger;

class HoiDongController extends Controller
{
    /**
     * Lấy danh sách hội đồng (phân trang, lọc, sắp xếp ngày giờ)
     */
    public function index(Request $request)
    {
        $query = Hoidong::with(['kehoach', 'khoaBomon'])
            ->with(['nhoms' => function ($q) {
                $q->withCount(['diemPhanBien', 'diemHoiDong']);
            }])
            ->withCount('giangviens');

        // 2. Các Bộ Lọc (Filters)

        // Mặc định: Nếu không chọn kế hoạch cụ thể và không lấy tất cả -> Chỉ lấy kế hoạch đang chạy
        if (!$request->filled('kehoach') && !$request->boolean('all')) {
            $query->whereHas('kehoach', function ($q) {
                $q->whereIn('TRANGTHAI', ['Đang thực hiện', 'Chờ duyệt chỉnh sửa', 'Đang chấm điểm']);
            });
        }

        // Tìm kiếm theo tên
        if ($request->filled('search')) {
            $query->where('TEN_HOIDONG', 'like', '%' . $request->input('search') . '%');
        }

        // Lọc theo ID Kế hoạch
        if ($request->filled('kehoach')) {
            $query->where('ID_KEHOACH', $request->input('kehoach'));
        }

        // Lọc theo ID Khoa/Bộ môn
        if ($request->filled('khoa_bomon_id')) {
            $query->where('ID_KHOA_BOMON', $request->input('khoa_bomon_id'));
        }

        // Lọc theo Loại hội đồng (hoidong, hoidong5, phanbien)
        if ($request->filled('loai')) {
            $query->whereIn('LOAI', $request->input('loai'));
        }

        // 3. Logic Sắp Xếp (Sorting)
        $sort = $request->input('sort', 'NGAY_BAOCAO');
        $dir = $request->input('dir', 'desc');

        if ($sort === 'NGAY_BAOCAO') {
            // Nếu sắp xếp cột Ngày:
            $query->orderBy('NGAY_BAOCAO', $dir)
                  ->orderBy('GIO_BAOCAO', 'asc');
        } else {
            // Các cột khác sắp xếp bình thường
            $query->orderBy($sort, $dir);
        }

        // 4. Helper tính trạng thái chấm điểm (Closure)
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
                    // Kiểm tra đủ điểm chưa dựa trên loại hội đồng
                    if ($hd->LOAI === 'phanbien' && $nhom->diem_phan_bien_count < $totalMembers) {
                        $allGraded = false;
                        break;
                    } elseif (($hd->LOAI === 'hoidong' || $hd->LOAI === 'hoidong5') && $nhom->diem_hoi_dong_count < $totalMembers) {
                        $allGraded = false;
                        break;
                    }
                }
                $hd->trang_thai_cham_diem = $allGraded ? 'da_cham_diem' : 'chua_cham_diem';
            }
            return $hd;
        };

        // 5. Trả về dữ liệu

        // Trường hợp 1: Lấy tất cả
        if ($request->boolean('all')) {
            $hoidongs = $query->with(['giangviens.nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN'])->get();
            $hoidongs->transform($calculateStatus);
            return response()->json($hoidongs->values());
        }

        // Trường hợp 2: Phân trang (Pagination)
        $allMatchingHoidongs = $query->get(); 
        $allMatchingHoidongs->transform($calculateStatus);

        // Lọc theo trạng thái chấm điểm (nếu có)
        if ($request->filled('trang_thai_cham_diem')) {
            $allMatchingHoidongs = $allMatchingHoidongs->whereIn('trang_thai_cham_diem', $request->input('trang_thai_cham_diem'));
        }

        // Thực hiện phân trang thủ công trên Collection
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

    /**
     * Lấy thống kê tổng quan cho màn hình quản lý Hội đồng
     */
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
        
        // Đếm cả hoidong (3) và hoidong5 (5) là Bảo vệ
        $totalBaoVe = (clone $queryHoiDong)->whereIn('LOAI', ['hoidong', 'hoidong5'])->count();

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

    /**
     * Tạo mới Hội đồng (Đơn lẻ hoặc Hàng loạt).
     */
    public function create(Request $request)
    {
        // 1. Validate dữ liệu đầu vào
        $validated = $request->validate([
            'TEN_HOIDONG'    => 'nullable|string|max:255',
            'LOAI'           => 'required|string|in:phanbien,hoidong,hoidong5', // Thêm hoidong5
            'ID_KEHOACH'     => 'required|integer|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            
            'ID_KHOA_BOMON'  => 'required|integer|exists:KHOA_BOMON,ID_KHOA_BOMON',
            
            'NGAY_BAOCAO'    => 'nullable|date',
            'GIO_BAOCAO'     => 'nullable',
            'PHONG'          => 'nullable|string|max:50',
            
            'giangviens'     => 'nullable|array',
            'giangviens.*.id'      => 'required_with:giangviens|integer|exists:GIANGVIEN,ID_GIANGVIEN',
            'giangviens.*.vaitro' => 'nullable|string|in:chutich,thuky,thanhvien,phanbien',
            
            'soLuong' => 'nullable|integer|min:1',
        ]);

        $this->validateCouncilTypeAllowed($validated['ID_KEHOACH'], $validated['LOAI']);

        DB::beginTransaction();
        try {
            $isManual = !$request->has('soLuong') || (int)$request->input('soLuong', 1) === 1;
            $createdCouncils = [];

            if ($isManual) {
                if (!empty($validated['giangviens'])) {
                    $this->validateHoiDongGiangviens($validated['LOAI'], $validated['giangviens']);
                }
                $createdCouncils[] = $this->createSingleHoiDong($validated);
            } 
            else {
                $soLuong = (int)$validated['soLuong'];
                for ($i = 0; $i < $soLuong; $i++) {
                    $baseName = $validated['TEN_HOIDONG'] ?? ($validated['LOAI'] === 'phanbien' ? 'HĐ Phản Biện' : 'HĐ Bảo Vệ');
                    $tenHoiDong = trim("{$baseName} " . ($i + 1));
                    
                    // Check trùng tên
                    $exists = Hoidong::where('TEN_HOIDONG', $tenHoiDong)
                            ->where('ID_KEHOACH', $validated['ID_KEHOACH'])
                            ->exists();
                    
                    if ($exists) {
                        $tenHoiDong = "{$tenHoiDong} (" . uniqid() . ")";
                    }
                    
                    $payload = $validated;
                    $payload['TEN_HOIDONG'] = $tenHoiDong;
                    $payload['giangviens'] = [];
                    
                    $createdCouncils[] = $this->createSingleHoiDong($payload);
                }
            }

            // Gửi thông báo
            foreach ($createdCouncils as $hoidong) {
                $hoidong->load('giangviens.nguoidung'); 
                
                foreach ($hoidong->giangviens as $gv) {
                    if ($gv->nguoidung) {
                        $roleName = match($gv->pivot->VAITRO) {
                            'chutich' => 'Chủ tịch',
                            'thuky' => 'Thư ký',
                            'phanbien' => 'Phản biện',
                            default => 'Thành viên'
                        };

                        NotificationService::send(
                            $gv->nguoidung->ID_NGUOIDUNG,
                            "Phân công Hội đồng",
                            "Bạn được phân công vào hội đồng '{$hoidong->TEN_HOIDONG}' với vai trò: {$roleName}.",
                            'ACADEMIC',
                            '/lecturer/council',
                            ['council_id' => $hoidong->ID_HOIDONG],
                            'HIGH'
                        );
                    }
                }
            }

            DB::commit();
            return response()->json([
                'message' => $isManual ? 'Tạo hội đồng thành công!' : "Đã tạo {$validated['soLuong']} hội đồng thành công!",
                'data' => $createdCouncils 
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            if ($e instanceof ValidationException) {
                return response()->json(['errors' => $e->errors()], 422);
            }
            Log::error("Lỗi tạo hội đồng: " . $e->getMessage());
            return response()->json(['error' => 'Đã xảy ra lỗi khi tạo hội đồng: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Cập nhật thông tin hội đồng
     */
    public function update(Request $request, $id)
    {
        $hoidong = Hoidong::find($id);
        if (!$hoidong) {
            return response()->json(['error' => 'Không tìm thấy hội đồng'], 404);
        }

        // Lưu thông tin cũ
        $oldDate = $hoidong->NGAY_BAOCAO;
        $oldTime = $hoidong->GIO_BAOCAO;
        $oldRoom = $hoidong->PHONG;
        $oldMemberIds = $hoidong->giangviens()->pluck('GIANGVIEN.ID_GIANGVIEN')->toArray();

        $validated = $request->validate([
            'TEN_HOIDONG'    => 'nullable|string|max:255',
            'NGAY_BAOCAO'    => 'nullable|date',
            'GIO_BAOCAO'     => 'nullable',
            'PHONG'          => 'nullable|string|max:100',
            'ID_KEHOACH'     => 'nullable|integer|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            
            'ID_KHOA_BOMON'  => 'nullable|integer|exists:KHOA_BOMON,ID_KHOA_BOMON',
            
            'LOAI'           => 'nullable|string|in:phanbien,hoidong,hoidong5',
            'giangviens'     => 'nullable|array',
            'giangviens.*.id'      => 'required_with:giangviens|integer|exists:GIANGVIEN,ID_GIANGVIEN',
            'giangviens.*.vaitro' => 'nullable|string|in:chutich,thuky,thanhvien,phanbien',
        ]);

        DB::beginTransaction();
        try {
            $loai = $validated['LOAI'] ?? $hoidong->LOAI;
            if (isset($validated['giangviens'])) {
                $this->validateHoiDongGiangviens($loai, $validated['giangviens']);
            }

            $hoidong->update([
                'TEN_HOIDONG'    => $validated['TEN_HOIDONG'] ?? $hoidong->TEN_HOIDONG,
                'NGAY_BAOCAO'    => $validated['NGAY_BAOCAO'] ?? $hoidong->NGAY_BAOCAO,
                'GIO_BAOCAO'     => $validated['GIO_BAOCAO'] ?? $hoidong->GIO_BAOCAO,
                'PHONG'          => $validated['PHONG'] ?? $hoidong->PHONG,
                'ID_KEHOACH'     => $validated['ID_KEHOACH'] ?? $hoidong->ID_KEHOACH,
                'ID_KHOA_BOMON'  => $validated['ID_KHOA_BOMON'] ?? $hoidong->ID_KHOA_BOMON,
                'LOAI'           => $loai,
            ]);

            // Cập nhật thành viên
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

                // Thông báo thành viên mới
                $newMemberIds = array_keys($syncData);
                $addedMemberIds = array_diff($newMemberIds, $oldMemberIds);
                if (!empty($addedMemberIds)) {
                    $newLecturers = Giangvien::whereIn('ID_GIANGVIEN', $addedMemberIds)->with('nguoidung')->get();
                    foreach ($newLecturers as $gv) {
                        if ($gv->nguoidung) {
                            $roleName = match($syncData[$gv->ID_GIANGVIEN]['VAITRO']) {
                                'chutich' => 'Chủ tịch', 'thuky' => 'Thư ký', 'phanbien' => 'Phản biện', default => 'Thành viên'
                            };
                            NotificationService::send($gv->nguoidung->ID_NGUOIDUNG, "Phân công Hội đồng", "Bạn vừa được thêm vào hội đồng '{$hoidong->TEN_HOIDONG}' với vai trò {$roleName}.", 'ACADEMIC', '/lecturer/council', ['council_id' => $hoidong->ID_HOIDONG], 'HIGH');
                        }
                    }
                }
            }

            $isRescheduled = ($validated['NGAY_BAOCAO'] ?? $oldDate) != $oldDate 
                          || ($validated['GIO_BAOCAO'] ?? $oldTime) != $oldTime
                          || ($validated['PHONG'] ?? $oldRoom) != $oldRoom;

            if ($isRescheduled) {
                $timeStr = ($hoidong->NGAY_BAOCAO ? date('d/m/Y', strtotime($hoidong->NGAY_BAOCAO)) : '...') 
                          . ' lúc ' . ($hoidong->GIO_BAOCAO ?? '...');
                $this->notifyCouncilChange($hoidong, "Thay đổi lịch hội đồng", "Lịch/Địa điểm của hội đồng '{$hoidong->TEN_HOIDONG}' đã thay đổi. Mới: {$timeStr} tại {$hoidong->PHONG}.", 'URGENT');
            }

            DB::commit();
            return response()->json(['message' => 'Cập nhật hội đồng thành công!', 'hoidong' => $hoidong->load(['giangviens.nguoidung', 'kehoach', 'khoaBomon'])]);

        } catch (\Exception $e) {
            DB::rollBack();
            if ($e instanceof ValidationException) return response()->json(['errors' => $e->errors()], 422);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cập nhật nhanh tên hội đồng
     */
    public function updateTenHoiDong(Request $request, $id)
    {
        $hoidong = Hoidong::find($id);
        if (!$hoidong) return response()->json(['error' => 'Không tìm thấy hội đồng'], 404);

        $validated = $request->validate([
            'TEN_HOIDONG' => 'required|string|max:255',
        ]);

        $oldName = $hoidong->TEN_HOIDONG;

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

            if ($oldName !== $validated['TEN_HOIDONG']) {
                $this->notifyCouncilChange(
                    $hoidong,
                    "Cập nhật tên Hội đồng",
                    "Hội đồng bạn tham gia đã được đổi tên từ '{$oldName}' thành '{$hoidong->TEN_HOIDONG}'.",
                    'HIGH'
                );
            }

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
     * Cập nhật nhanh phòng hội đồng
     */
    public function updatePhong(Request $request, $id)
    {
        $hoidong = Hoidong::find($id);
        if (!$hoidong) return response()->json(['error' => 'Không tìm thấy hội đồng'], 404);
        
        $validated = $request->validate(['PHONG' => 'nullable|string|max:50']);
        
        $oldRoom = $hoidong->PHONG;
        $newRoom = $validated['PHONG'] ?? 'Chưa cập nhật';

        try {
            $hoidong->update(['PHONG' => $validated['PHONG'] ?? null]);
            
            if ($oldRoom !== $newRoom) {
                $timeStr = $hoidong->NGAY_BAOCAO 
                    ? \Carbon\Carbon::parse($hoidong->NGAY_BAOCAO)->format('d/m/Y') 
                    : '...';
                
                $this->notifyCouncilChange(
                    $hoidong,
                    "Thay đổi địa điểm Hội đồng",
                    "Địa điểm bảo vệ của hội đồng '{$hoidong->TEN_HOIDONG}' (Ngày $timeStr) đã thay đổi từ '{$oldRoom}' sang '{$newRoom}'.",
                    'URGENT'
                );
            }

            return response()->json(['message' => 'Cập nhật phòng thành công!', 'PHONG' => $hoidong->PHONG]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Cập nhật thất bại: ' . $e->getMessage()], 500);
        }
    }

    public function updateGio(Request $request, $id)
    {
        $hoidong = Hoidong::find($id);
        if (!$hoidong) return response()->json(['error' => 'Không tìm thấy hội đồng'], 404);
        
        $validated = $request->validate([
            'GIO_BAOCAO' => 'nullable',
        ]);
        
        $gio = $validated['GIO_BAOCAO'];

        try {
            $hoidong->update(['GIO_BAOCAO' => $gio]);
            return response()->json(['message' => 'Cập nhật giờ báo cáo thành công!', 'GIO_BAOCAO' => $hoidong->GIO_BAOCAO]);
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

            foreach ($hoidong->giangviens as $gv) {
                if ($gv->nguoidung) {
                    NotificationService::send(
                        $gv->nguoidung->ID_NGUOIDUNG,
                        "Hủy Hội đồng",
                        "Hội đồng '{$hoidong->TEN_HOIDONG}' mà bạn tham gia đã bị hủy bỏ.",
                        'ACADEMIC',
                        '/lecturer/council',
                        null,
                        'URGENT'
                    );
                }
            }

            foreach ($hoidong->nhoms as $nhom) {
                foreach ($nhom->thanhviens as $tv) {
                    NotificationService::send(
                        $tv->ID_NGUOIDUNG,
                        "Hủy lịch hội đồng",
                        "Lịch hội đồng '{$hoidong->TEN_HOIDONG}' của nhóm bạn đã bị hủy. Vui lòng chờ cập nhật mới.",
                        'ACADEMIC',
                        '/student/dashboard/' . $hoidong->ID_KEHOACH,
                        null,
                        'URGENT'
                    );
                }
            }

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
     * Nâng cấp Hội đồng Phản biện lên Hội đồng Bảo vệ
     */
    public function upgradePhanBienToHoiDong(Request $request, $id)
    {
        // [UPDATED] Validate target_type
        $request->validate([
            'target_type' => 'required|in:hoidong,hoidong5'
        ]);

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

            // [UPDATED] Cập nhật loại theo lựa chọn
            $hoidong->update([
                'LOAI' => $request->target_type,
            ]);

            // Giảng viên phản biện cũ trở thành thành viên hội đồng
            $hoidong->giangviens()->sync([
                $currentReviewerId => ['VAITRO' => 'thanhvien']
            ]);

            DB::commit();
            
            $count = $request->target_type === 'hoidong5' ? 4 : 2;

            return response()->json([
                'message' => "Nâng cấp thành công! Vui lòng thêm $count thành viên còn lại.",
                'hoidong' => $hoidong->load('giangviens.nguoidung')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi nâng cấp Hội đồng: " . $e->getMessage());
            return response()->json(['error' => 'Xảy ra lỗi trong quá trình nâng cấp.'], 500);
        }
    }

    /**
     * Nâng cấp hàng loạt Hội đồng
     */
    public function bulkUpgrade(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:HOIDONG,ID_HOIDONG',
            'target_type' => 'required|in:hoidong,hoidong5'
        ]);

        $targetType = $validated['target_type'];
        $upgradedCount = 0;
        $failedCount = 0;
        $failedMessages = [];

        DB::beginTransaction();
        try {
            foreach ($validated['ids'] as $id) {
                $hoidong = Hoidong::with('giangviens')->find($id);

                if (!$hoidong) {
                    $failedCount++; continue;
                }

                if ($hoidong->LOAI !== 'phanbien') {
                    $failedCount++; continue;
                }

                $currentReviewer = $hoidong->giangviens->first();
                if (!$currentReviewer) {
                    $failedCount++; continue;
                }

                $hoidong->update(['LOAI' => $targetType]);
                $hoidong->giangviens()->sync([
                    $currentReviewer->ID_GIANGVIEN => ['VAITRO' => 'thanhvien']
                ]);

                $upgradedCount++;
            }

            DB::commit();

            $message = "Nâng cấp hoàn tất: $upgradedCount hội đồng thành công.";
            if ($failedCount > 0) {
                $message .= " $failedCount thất bại.";
            }

            return response()->json([
                'message' => $message,
                'upgraded' => $upgradedCount,
                'failed' => $failedCount,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
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
            'kehoach', 
            'khoaBomon',
            'giangviens.nguoidung', 
            'giangviens.khoabomon', 
            'nhoms.thanhviens.nguoidung', 
            'nhoms.diemHoiDong',
            'nhoms.phancongDetaiNhom.detai', 
            'nhoms.phancongDetaiNhom.gvhd.nguoidung' 
        ])->findOrFail($id);

        return response()->json($hoidong);
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
                            ->with('detai:ID_DETAI,TEN_DETAI,ID_KHOA_BOMON'); // Load ID_KHOA_BOMON
                    },
                    'phancongDetaiNhom.gvhd',
                    'chuyennganh:ID_CHUYENNGANH,TEN_CHUYENNGANH', 
                    'khoabomon:ID_KHOA_BOMON,TEN_KHOA_BOMON'
                ])
                ->distinct()
                ->get()
                ->map(function ($nhom) {
                    $hoidong = $nhom->hoidongs->first();
                    
                    // Lấy Bộ môn từ Đề tài (chính xác nhất) hoặc từ GVHD
                    $deptId = $nhom->phancongDetaiNhom?->detai?->ID_KHOA_BOMON 
                           ?? $nhom->phancongDetaiNhom?->gvhd?->ID_KHOA_BOMON;
                    
                    // Tên Bộ môn
                    $deptName = $nhom->khoabomon?->TEN_KHOA_BOMON; 
                    
                    return [
                        'ID_NHOM' => $nhom->ID_NHOM,
                        'TEN_NHOM' => $nhom->TEN_NHOM,
                        'ID_KEHOACH' => $nhom->ID_KEHOACH,
                        'TEN_DETAI' => $nhom->phancongDetaiNhom?->detai?->TEN_DETAI ?? 'Chưa đăng ký đề tài',
                        'ID_HOIDONG' => $hoidong?->ID_HOIDONG ?? null,
                        'TEN_HOIDONG' => $hoidong?->TEN_HOIDONG ?? null,
                        
                        'ID_CHUYENNGANH' => $nhom->ID_CHUYENNGANH,
                        'TEN_CHUYENNGANH' => $nhom->chuyennganh?->TEN_CHUYENNGANH,
                        'ID_KHOA_BOMON' => $deptId, 
                        'TEN_KHOA_BOMON' => $deptName,
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

                    $hoidong = Hoidong::find($item['ID_HOIDONG']);
                    if ($hoidong) {
                        $loaiText = $hoidong->LOAI === 'phanbien' ? 'Phản biện' : 'Bảo vệ';
                        foreach ($nhom->thanhviens as $tv) {
                            NotificationService::send(
                                $tv->ID_NGUOIDUNG,
                                "Đã xếp lịch {$loaiText}",
                                "Nhóm của bạn đã được xếp vào hội đồng: {$hoidong->TEN_HOIDONG}. Ngày: " . ($hoidong->NGAY_BAOCAO ?? 'Chưa chốt'),
                                'ACADEMIC',
                                '/student/dashboard',
                                ['council_id' => $hoidong->ID_HOIDONG],
                                'HIGH'
                            );

                            ActivityLogger::log(
                                'ASSIGN_COUNCIL',
                                "Nhóm được xếp vào hội đồng: {$hoidong->TEN_HOIDONG}",
                                [
                                    'council_name' => $hoidong->TEN_HOIDONG,
                                    'time' => $hoidong->NGAY_BAOCAO . ' ' . $hoidong->GIO_BAOCAO,
                                    'room' => $hoidong->PHONG
                                ],
                                $nhom->ID_NHOM, 
                                'GraduationCap'
                            );
                        }
                    }
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
                ->with(['kehoach', 'khoaBomon', 'giangviens.nguoidung'])
                ->orderBy('ID_KEHOACH', 'desc')
                ->get();

            $result = $hoidongs->map(fn($hd) => [
                'ID_HOIDONG' => $hd->ID_HOIDONG,
                'TEN_HOIDONG' => $hd->TEN_HOIDONG,
                'LOAI' => $hd->LOAI,
                'NGAY_BAOCAO' => $hd->NGAY_BAOCAO,
                'GIO_BAOCAO' => $hd->GIO_BAOCAO,
                'PHONG' => $hd->PHONG,
                'ID_KEHOACH' => $hd->ID_KEHOACH,
                'ID_KHOA_BOMON' => $hd->ID_KHOA_BOMON,

                'TEN_KEHOACH' => $hd->kehoach->TEN_DOT ?? 'N/A',
                'TEN_KHOA_BOMON' => $hd->khoaBomon->TEN_KHOA_BOMON ?? 'N/A',
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

        // 1. Query Nhóm đủ điều kiện
        $groups = Nhom::where('ID_KEHOACH', $planId)
            // Chưa có hội đồng loại này
            ->whereDoesntHave('hoidongs', function($q) use ($type) {
                $q->where('LOAI', $type);
            })
            // [QUAN TRỌNG] Phải có bài nộp ĐÃ XÁC NHẬN
            ->whereHas('phancongDetaiNhom.submissions', function ($q) {
                $q->where('TRANGTHAI', 'Đã xác nhận');
            })
            ->with([
                'phancongDetaiNhom.detai.khoaBomon' // Load Bộ môn
            ])
            // [QUAN TRỌNG] Ngăn chặn duplicate nếu 1 nhóm nộp nhiều file
            ->distinct()
            ->get();

        // 2. Gom nhóm theo Bộ môn của Đề tài
        $grouped = $groups->groupBy(function ($group) {
            return $group->phancongDetaiNhom?->detai?->ID_KHOA_BOMON ?? 'UNKNOWN';
        });
        
        $stats = [];
        foreach ($grouped as $deptId => $groupList) {
            if ($deptId === 'UNKNOWN') continue;

            // Lấy thông tin bộ môn
            $firstGroup = $groupList->first();
            $dept = $firstGroup->phancongDetaiNhom->detai->khoaBomon 
                 ?? KhoaBomon::find($deptId);

            if (!$dept) continue;

            // Đếm số lượng nhóm (Unique)
            $count = $groupList->unique('ID_NHOM')->count();
            
            $stats[] = [
                'ID_KHOA_BOMON' => $deptId,
                'TEN_KHOA_BOMON' => $dept->TEN_KHOA_BOMON,
                'MA_KHOA_BOMON' => $dept->MA_KHOA_BOMON,
                'group_count' => $count,
                'suggested_councils' => ceil($count / 5),
                'prefix_name' => "HĐ " . ($type == 'hoidong' ? "BV" : ($type == 'hoidong5' ? "BV(5)" : "PB")) . " - " . $dept->MA_KHOA_BOMON 
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
            'LOAI' => 'required|in:hoidong,phanbien,hoidong5',
            'items' => 'required|array',
            'items.*.ID_KHOA_BOMON' => 'required|exists:KHOA_BOMON,ID_KHOA_BOMON',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.prefix' => 'required|string',
        ]);

        DB::beginTransaction();
        try {
            $totalCreated = 0;
            
            foreach ($validated['items'] as $item) {
                $qty = $item['quantity'];
                $prefix = $item['prefix'];
                $deptId = $item['ID_KHOA_BOMON'];

                for ($i = 1; $i <= $qty; $i++) {
                    $name = "{$prefix} {$i}";
                    while (Hoidong::where('ID_KEHOACH', $validated['ID_KEHOACH'])->where('TEN_HOIDONG', $name)->exists()) {
                        $name .= " (" . rand(10, 99) . ")";
                    }

                    Hoidong::create([
                        'TEN_HOIDONG' => $name,
                        'LOAI' => $validated['LOAI'],
                        'ID_KEHOACH' => $validated['ID_KEHOACH'],
                        'ID_KHOA_BOMON' => $deptId,
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

    /**
     * Tự động phân công thành viên Hội đồng (Greedy Algorithm)
     * Hỗ trợ: hoidong (3), hoidong5 (5), phanbien (1)
     */
    public function autoAssignMembers(Request $request)
    {
        // 1. Validate dữ liệu đầu vào
        $validated = $request->validate([
            'ID_KEHOACH' => 'required|integer|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'LOAI' => 'required|in:phanbien,hoidong,hoidong5',
            'replaceExisting' => 'boolean', // True: Xóa người cũ xếp lại, False: Chỉ điền vào chỗ trống
        ]);

        $planId = $validated['ID_KEHOACH'];
        $councilType = $validated['LOAI'];
        $replaceExisting = $validated['replaceExisting'] ?? false;

        // Xác định số lượng thành viên cần thiết
        $requiredMemberCount = match ($councilType) {
            'hoidong' => 3,
            'hoidong5' => 5,
            'phanbien' => 1,
            default => 0
        };

        // 2. Lấy danh sách hội đồng cần xếp
        $councils = Hoidong::where('ID_KEHOACH', $planId)
            ->where('LOAI', $councilType)
            ->with(['nhoms.phancongDetaiNhom']) // Eager load để check conflict GVHD
            ->get();

        if ($councils->isEmpty()) {
            return response()->json(['message' => 'Không có Hội đồng nào thuộc loại này để phân công.'], 400);
        }

        // 3. Chuẩn bị dữ liệu Giảng viên & Tải công việc
        // Lấy tất cả giảng viên (kèm user để gửi thông báo và chức vụ để tính rank)
        $allLecturers = Giangvien::with(['nguoidung', 'chucvus'])->get()->keyBy('ID_GIANGVIEN');

        // Tính tải công việc hiện tại (Số lượng hội đồng đã tham gia trong kế hoạch này)
        // Logic: Load ban đầu từ DB + Biến tạm để cộng dồn ngay lập tức khi gán
        $currentLoads = DB::table('HOIDONG_GIANGVIEN')
            ->join('HOIDONG', 'HOIDONG_GIANGVIEN.ID_HOIDONG', '=', 'HOIDONG.ID_HOIDONG')
            ->where('HOIDONG.ID_KEHOACH', $planId)
            ->groupBy('ID_GIANGVIEN')
            ->select('ID_GIANGVIEN', DB::raw('COUNT(HOIDONG_GIANGVIEN.ID_HOIDONG) as load_count'))
            ->pluck('load_count', 'ID_GIANGVIEN')
            ->toArray(); // Chuyển về array để dễ thao tác

        // Lấy thành viên hiện tại (để giữ lại nếu không chọn replaceExisting)
        $allCouncilIds = $councils->pluck('ID_HOIDONG');
        $currentCouncilMembers = DB::table('HOIDONG_GIANGVIEN')
            ->whereIn('ID_HOIDONG', $allCouncilIds)
            ->get()
            ->groupBy('ID_HOIDONG')
            ->map(fn($group) => $group->pluck('ID_GIANGVIEN'));

        $totalAssignmentsMade = 0;

        DB::beginTransaction();
        try {
            foreach ($councils as $council) {
                // A. Lọc giảng viên phù hợp
                // 1. Phải thuộc cùng Bộ môn với Hội đồng
                $lecturersInDept = $this->filterLecturersByDepartment($council, $allLecturers);
                
                if ($lecturersInDept->isEmpty()) {
                    Log::warning("Hội đồng ID {$council->ID_HOIDONG}: Không tìm thấy giảng viên cùng bộ môn.");
                    continue;
                }

                // 2. Loại bỏ những người có xung đột (GVHD của nhóm trong hội đồng này)
                $conflictLecturerIds = $this->getConflictLecturers($council);
                
                $availableLecturers = $lecturersInDept->filter(function ($gv) use ($conflictLecturerIds) {
                    return !$conflictLecturerIds->contains($gv->ID_GIANGVIEN);
                });

                if ($availableLecturers->isEmpty()) {
                    Log::warning("Hội đồng ID {$council->ID_HOIDONG}: Tất cả giảng viên bộ môn đều bị conflict.");
                    continue;
                }

                // B. Xác định thành viên cũ (nếu giữ lại)
                $existingMemberIds = collect();
                if (!$replaceExisting) {
                    $existingMemberIds = $currentCouncilMembers->get($council->ID_HOIDONG, collect());
                    
                    // Nếu đã đủ người rồi thì bỏ qua
                    if ($existingMemberIds->count() >= $requiredMemberCount) {
                        continue;
                    }
                }

                // C. Chạy thuật toán tham lam (Greedy) để chọn người tốt nhất
                $finalAssignmentsMap = $this->runGreedyAssignment(
                    $council,
                    $availableLecturers,
                    $currentLoads, // Truyền array workload
                    $requiredMemberCount,
                    $existingMemberIds
                );

                // D. Lưu vào DB và Gửi thông báo
                if (!empty($finalAssignmentsMap)) {
                    $syncData = [];
                    $newlyAssignedIds = [];

                    foreach ($finalAssignmentsMap as $member) {
                        $syncData[$member['id']] = ['VAITRO' => $member['role']];
                        
                        // Chỉ tính là mới gán nếu không nằm trong danh sách cũ
                        if (!$existingMemberIds->contains($member['id'])) {
                            $newlyAssignedIds[] = $member['id'];
                        }
                    }

                    // Sync dữ liệu (Ghi đè danh sách thành viên cho hội đồng này)
                    $council->giangviens()->sync($syncData);

                    // [QUAN TRỌNG] Cập nhật biến đếm load ngay lập tức 
                    // để thuật toán biết người này vừa nhận việc, tránh gán tiếp vào hội đồng sau
                    foreach ($newlyAssignedIds as $id) {
                        if (!isset($currentLoads[$id])) {
                            $currentLoads[$id] = 0;
                        }
                        $currentLoads[$id]++;
                        $totalAssignmentsMade++;

                        // Gửi thông báo
                        $this->sendAssignmentNotification($allLecturers->get($id), $council, $syncData[$id]['VAITRO']);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => "Phân công tự động hoàn tất. Đã gán tổng cộng $totalAssignmentsMade vị trí mới.",
                'total_assigned' => $totalAssignmentsMade
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi phân công Hội đồng tự động: " . $e->getMessage());
            return response()->json(['error' => 'Lỗi server khi phân công tự động: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Tự động phân bổ nhóm vào hội đồng (Auto Assign Groups)
     */
    public function autoAssignGroups(Request $request)
    {
        $request->validate([
            'ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'LOAI' => 'nullable|in:hoidong,hoidong5,phanbien'
        ]);

        $planId = $request->ID_KEHOACH;
        $loai = $request->input('LOAI', 'hoidong');

        // 1. Lấy nhóm cần phân bổ
        $unassignedGroups = Nhom::where('ID_KEHOACH', $planId)
            ->whereDoesntHave('hoidongs', function($q) use ($loai) {
                $q->where('LOAI', $loai);
            })
            ->where('TRANGTHAI', '!=', 'Đã hủy')
            // [QUAN TRỌNG] Chỉ lấy nhóm đã có bài nộp ĐƯỢC XÁC NHẬN
            ->whereHas('phancongDetaiNhom.submissions', function ($q) {
                $q->where('TRANGTHAI', 'Đã xác nhận');
            })
            ->with(['phancongDetaiNhom.detai']) // Load đề tài để lấy ID_KHOA_BOMON
            ->distinct()
            ->get();

        if ($unassignedGroups->isEmpty()) {
            return response()->json(['message' => 'Không còn nhóm nào đủ điều kiện (đã nộp bài & được duyệt) để phân bổ.'], 200);
        }

        // 2. Lấy danh sách hội đồng
        $councils = Hoidong::where('ID_KEHOACH', $planId)
            ->where('LOAI', $loai)
            ->withCount('nhoms')
            ->get(); 

        if ($councils->isEmpty()) {
            return response()->json(['message' => "Chưa có Hội đồng nào được tạo."], 400);
        }

        DB::beginTransaction();
        try {
            $countAssigned = 0;
            foreach ($unassignedGroups as $group) {
                // Lấy bộ môn từ đề tài
                $topicDeptId = $group->phancongDetaiNhom->detai->ID_KHOA_BOMON;

                if (!$topicDeptId) continue;

                // Tìm hội đồng thuộc cùng bộ môn
                $matchingCouncils = $councils->where('ID_KHOA_BOMON', $topicDeptId);

                if ($matchingCouncils->isEmpty()) continue;

                // Chọn hội đồng vắng nhất
                $bestCouncil = $matchingCouncils->sortBy('nhoms_count')->first();

                if ($bestCouncil) {
                    // Kiểm tra double-check để không gán trùng
                    if (!$bestCouncil->nhoms()->where('HOIDONG_NHOM.ID_NHOM', $group->ID_NHOM)->exists()) {
                        
                        $bestCouncil->nhoms()->attach($group->ID_NHOM);
                        
                        // Cập nhật số lượng giả lập để vòng lặp sau cân bằng đúng
                        $councils->transform(function ($c) use ($bestCouncil) {
                            if ($c->ID_HOIDONG == $bestCouncil->ID_HOIDONG) {
                                $c->nhoms_count++;
                            }
                            return $c;
                        });
                        $countAssigned++;
                        
                        // Gửi thông báo
                        foreach ($group->thanhviens as $tv) {
                             NotificationService::send(
                                $tv->ID_NGUOIDUNG,
                                "Đã xếp lịch " . ($loai === 'phanbien' ? 'Phản biện' : 'Bảo vệ') . " (Tự động)",
                                "Nhóm của bạn đã được phân công vào hội đồng: {$bestCouncil->TEN_HOIDONG}.",
                                'ACADEMIC',
                                '/student/dashboard',
                                ['council_id' => $bestCouncil->ID_HOIDONG]
                            );
                        }
                    }
                }
            }

            DB::commit();
            
            if ($countAssigned === 0) {
                return response()->json(['message' => "Không phân bổ được nhóm nào (Có thể do thiếu Hội đồng thuộc Bộ môn tương ứng)."], 200);
            }

            return response()->json(['message' => "Đã phân bổ thành công {$countAssigned} nhóm vào hội đồng theo Bộ môn."]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Lỗi phân bổ: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Lấy thống kê tải công việc của giảng viên
     */
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
            if ($count > 3) throw ValidationException::withMessages(['giangviens' => 'Hội đồng bảo vệ (3 người) chỉ được có tối đa 3 thành viên.']);
        }

        if ($loai === 'hoidong5') {
            if ($count > 5) throw ValidationException::withMessages(['giangviens' => 'Hội đồng bảo vệ (5 người) chỉ được có tối đa 5 thành viên.']);
        }

        if (in_array($loai, ['hoidong', 'hoidong5'])) {
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

    private function notifyCouncilChange(Hoidong $hoidong, string $title, string $message, string $priority)
    {
        // Chỉ gửi nếu người sửa là Quản lý
        if (!$this->isAdmin() && !$this->isGiaoVu() && !$this->isTruongKhoa()) {
            return;
        }

        // 1. Gửi cho Giảng viên trong hội đồng
        $hoidong->loadMissing('giangviens.nguoidung');
        foreach ($hoidong->giangviens as $gv) {
            if ($gv->nguoidung) {
                NotificationService::send(
                    $gv->nguoidung->ID_NGUOIDUNG,
                    $title,
                    $message,
                    'ACADEMIC',
                    '/lecturer/council',
                    ['council_id' => $hoidong->ID_HOIDONG],
                    $priority
                );
            }
        }

        // 2. Gửi cho Sinh viên các nhóm thuộc hội đồng (Chỉ gửi nếu là URGENT hoặc HIGH)
        if (in_array($priority, ['URGENT', 'HIGH'])) {
            $hoidong->loadMissing('nhoms.thanhviens');
            foreach ($hoidong->nhoms as $nhom) {
                foreach ($nhom->thanhviens as $tv) {
                    NotificationService::send(
                        $tv->ID_NGUOIDUNG,
                        $title,
                        $message,
                        'ACADEMIC',
                        '/student/dashboard/' . $hoidong->ID_KEHOACH,
                        ['council_id' => $hoidong->ID_HOIDONG],
                        $priority
                    );
                }
            }
        }
    }

    /**
     * Lọc giảng viên thuộc cùng bộ môn với hội đồng
     */
    private function filterLecturersByDepartment(Hoidong $council, Collection $allLecturers): Collection
    {
        $requiredKhoaBomonId = $council->ID_KHOA_BOMON;

        if (!$requiredKhoaBomonId) {
            // Nếu hội đồng không gán bộ môn (trường hợp hiếm), trả về rỗng để an toàn
            return collect(); 
        }

        return $allLecturers->filter(function ($gv) use ($requiredKhoaBomonId) {
            return $gv->ID_KHOA_BOMON == $requiredKhoaBomonId;
        });
    }

    /**
     * Lấy danh sách ID giảng viên bị xung đột (là GVHD của nhóm trong hội đồng)
     */
    private function getConflictLecturers(Hoidong $council)
    {
        $conflictIds = collect();
        foreach ($council->nhoms as $nhom) {
            $assignment = $nhom->phancongDetaiNhom;
            if ($assignment && $assignment->ID_GVHD) {
                $conflictIds->push($assignment->ID_GVHD);
            }
        }
        return $conflictIds->unique();
    }

    /**
     * Thuật toán Greedy để chọn thành viên
     */
    private function runGreedyAssignment(
        Hoidong $council, 
        Collection $candidates, // Danh sách GV khả dụng (đã lọc bộ môn & conflict)
        array $currentLoads,    // Array workload hiện tại [id => count]
        int $requiredCount, 
        Collection $existingIds
    ): array
    {
        $finalAssignments = collect();

        // 1. Giữ lại thành viên cũ (nếu có)
        if ($existingIds->isNotEmpty()) {
            // Lấy role hiện tại từ DB
            $existingRoles = DB::table('HOIDONG_GIANGVIEN')
                ->where('ID_HOIDONG', $council->ID_HOIDONG)
                ->whereIn('ID_GIANGVIEN', $existingIds)
                ->pluck('VAITRO', 'ID_GIANGVIEN');

            foreach ($existingIds as $id) {
                // Chỉ giữ lại nếu người cũ vẫn nằm trong danh sách candidate (cùng bộ môn, ko conflict)
                $gv = $candidates->get($id); 
                if ($gv) {
                    $load = $currentLoads[$id] ?? 0;
                    $rank = $this->getLecturerRank($gv, $load); // Tính lại rank theo load hiện tại
                    
                    $finalAssignments->push([
                        'id' => $id,
                        'role' => $existingRoles->get($id) ?? 'thanhvien',
                        'lecturer' => $gv,
                        'rank' => $rank,
                        'load' => $load
                    ]);
                }
            }
        }

        // Nếu đã đủ người từ danh sách cũ
        if ($finalAssignments->count() >= $requiredCount) {
            return $finalAssignments->take($requiredCount)->map(fn($i) => ['id' => $i['id'], 'role' => $i['role']])->all();
        }

        // 2. Tìm ứng viên mới cho các vị trí còn thiếu
        $assignedIds = $finalAssignments->pluck('id')->toArray();
        
        $potentialCandidates = $candidates->whereNotIn('ID_GIANGVIEN', $assignedIds)
            ->map(function ($gv) use ($currentLoads) {
                $load = $currentLoads[$gv->ID_GIANGVIEN] ?? 0;
                return [
                    'id' => $gv->ID_GIANGVIEN,
                    'lecturer' => $gv,
                    'load' => $load,
                    'rank' => $this->getLecturerRank($gv, $load), // Rank cao = Học vị cao + Load thấp
                ];
            });

        // 3. Logic phân vai trò cho Hội đồng Bảo vệ (3 hoặc 5 người)
        if (in_array($council->LOAI, ['hoidong', 'hoidong5'])) {
            
            // Tìm CHỦ TỊCH (Nếu chưa có)
            if (!$finalAssignments->firstWhere('role', 'chutich')) {
                $bestForPresident = $potentialCandidates->sortByDesc('rank')->first();
                
                if ($bestForPresident) {
                    $chutich = ['role' => 'chutich'] + $bestForPresident;
                    $finalAssignments->push($chutich);
                    $potentialCandidates = $potentialCandidates->where('id', '!=', $chutich['id']);
                }
            }

            // Tìm THƯ KÝ (Nếu chưa có)
            if (!$finalAssignments->firstWhere('role', 'thuky')) {
                $bestForSecretary = $potentialCandidates->sortByDesc('rank')->first();
                
                if ($bestForSecretary) {
                    $thuky = ['role' => 'thuky'] + $bestForSecretary;
                    $finalAssignments->push($thuky);
                    $potentialCandidates = $potentialCandidates->where('id', '!=', $thuky['id']);
                }
            }

            // Tìm THÀNH VIÊN còn thiếu
            $needed = $requiredCount - $finalAssignments->count();
            if ($needed > 0) {
                $members = $potentialCandidates->sortByDesc('rank')->take($needed);
                foreach ($members as $mem) {
                    $finalAssignments->push(['role' => 'thanhvien'] + $mem);
                }
            }
        } 
        // 4. Logic cho Hội đồng Phản biện (1 người)
        elseif ($council->LOAI === 'phanbien') {
            if ($finalAssignments->isEmpty()) {
                $reviewer = $potentialCandidates->sortByDesc('rank')->first();
                if ($reviewer) {
                    $finalAssignments->push(['role' => 'phanbien'] + $reviewer);
                }
            }
        }

        return $finalAssignments->map(fn($item) => [
            'id' => $item['id'], 
            'role' => $item['role']
        ])->values()->all();
    }

    /**
     * Tính điểm ưu tiên cho giảng viên
     * Rank càng cao càng dễ được chọn
     */
    private function getLecturerRank($lecturer, $currentLoad = 0): int
    {
        $rank = 0;
        // Ưu tiên Học vị
        if ($lecturer->HOCVI === 'Giáo sư') $rank += 10;
        elseif ($lecturer->HOCVI === 'Phó Giáo sư') $rank += 8;
        elseif ($lecturer->HOCVI === 'Tiến sĩ') $rank += 5;
        elseif ($lecturer->HOCVI === 'Thạc sĩ') $rank += 2;

        // Ưu tiên Chức vụ quản lý
        if ($lecturer->hasChucVu('TRUONG_KHOA')) $rank += 4;
        elseif ($lecturer->hasChucVu('TRUONG_BOMON')) $rank += 3;

        // Trừ điểm theo tải công việc
        $rank -= ($currentLoad * 2);

        return $rank;
    }

    private function sendAssignmentNotification($lecturer, $council, $roleCode)
    {
        if ($lecturer && $lecturer->nguoidung) {
            $roleName = match($roleCode) {
                'chutich' => 'Chủ tịch',
                'thuky' => 'Thư ký',
                'phanbien' => 'Phản biện',
                default => 'Thành viên'
            };

            NotificationService::send(
                $lecturer->nguoidung->ID_NGUOIDUNG,
                "Phân công Hội đồng (Tự động)",
                "Hệ thống đã xếp bạn vào hội đồng '{$council->TEN_HOIDONG}' với vai trò: {$roleName}.",
                'ACADEMIC',
                '/lecturer/council',
                ['council_id' => $council->ID_HOIDONG],
                'HIGH'
            );
        }
    }

    // app/Http/Controllers/Api/Admin/HoiDongController.php

public function exportSchedulePdf($planId)
    {
        try {
            // 1. Lấy kế hoạch kèm thông tin người phê duyệt và chức vụ của họ
            $plan = KehoachKhoaluan::with(['nguoiPheDuyet.giangvien.chucvus'])
                ->findOrFail($planId);

            // 2. Lấy danh sách hội đồng (như cũ)
            $hoidongs = Hoidong::where('ID_KEHOACH', $planId)
                ->with(['nhoms.chuyennganh']) 
                ->orderBy('NGAY_BAOCAO', 'asc')
                ->orderBy('GIO_BAOCAO', 'asc')
                ->get();

            // Gom nhóm hội đồng (như cũ)
            $groupedCouncils = $hoidongs->groupBy(function ($item) {
                $firstGroup = $item->nhoms->first();
                if ($firstGroup && $firstGroup->chuyennganh) {
                    $tenChuyenNganh = $firstGroup->chuyennganh->TEN_CHUYENNGANH;
                    if (!\Illuminate\Support\Str::startsWith($tenChuyenNganh, 'Ngành')) {
                        return "Ngành " . $tenChuyenNganh;
                    }
                    return $tenChuyenNganh;
                }
                return 'Các Hội đồng chưa phân nhóm';
            })->sortKeys();

            // 3. XỬ LÝ THÔNG TIN NGƯỜI KÝ (ĐỘNG)
            $signerName = "...................................";
            $signerHeader = "TRƯỞNG KHOA"; // Mặc định
            $signerRole = "";

            if ($plan->nguoiPheDuyet) {
                $signerName = $plan->nguoiPheDuyet->HODEM_VA_TEN;
                
                // Lấy danh sách mã chức vụ của người duyệt
                $positionCodes = [];
                if ($plan->nguoiPheDuyet->giangvien && $plan->nguoiPheDuyet->giangvien->chucvus) {
                    $positionCodes = $plan->nguoiPheDuyet->giangvien->chucvus->pluck('MA_CHUCVU')->toArray();
                }

                // Logic hiển thị chức vụ
                if (in_array('TRUONG_KHOA', $positionCodes)) {
                    $signerHeader = "TRƯỞNG KHOA";
                    $signerRole = ""; // Trưởng khoa ký trực tiếp thì không cần dòng 2
                } elseif (in_array('PHO_KHOA', $positionCodes)) {
                    $signerHeader = "KT. TRƯỞNG KHOA";
                    $signerRole = "PHÓ TRƯỞNG KHOA";
                } else {
                    // Trường hợp khác (VD: Thư ký, hoặc chưa set chức vụ)
                    $signerHeader = "TL. TRƯỞNG KHOA"; // Thừa lệnh
                    // Lấy tên chức vụ đầu tiên tìm thấy hoặc để trống
                    $firstRole = $plan->nguoiPheDuyet->giangvien->chucvus->first();
                    $signerRole = $firstRole ? mb_strtoupper($firstRole->TEN_CHUCVU, 'UTF-8') : "GIẢNG VIÊN";
                }
            }

            $data = [
                'plan' => $plan,
                'groupedCouncils' => $groupedCouncils,
                'today' => \Carbon\Carbon::now(),
                'planNumber' => $plan->ID_KEHOACH . '/KH-KCNTT',
                
                // Truyền biến người ký xuống View
                'signerName' => $signerName,
                'signerHeader' => $signerHeader,
                'signerRole' => $signerRole
            ];

            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('documents.council_schedule', $data);
            $pdf->setPaper('A4', 'portrait');

            return $pdf->download('Ke-hoach-bao-ve-' . $plan->KHOAHOC . '.pdf');

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Export PDF Error: " . $e->getMessage());
            return response()->json(['message' => 'Xuất file thất bại: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Xuất danh sách sinh viên bảo vệ theo Hội đồng (PDF)
     */
    public function exportStudentListPdf($planId)
    {
        try {
            $plan = KehoachKhoaluan::findOrFail($planId);

            // 1. [LOGIC MỚI] LẤY TÊN TRƯỞNG KHOA
            // Chỉ tìm trong bảng GIANGVIEN cột CHUC_VU
            $truongKhoaName = '';

            try {
                // Tìm giảng viên có chức vụ chứa từ "Trưởng khoa" (VD: "Trưởng khoa CNTT")
                $truongKhoa = \App\Models\Giangvien::where('CHUC_VU', 'LIKE', '%Trưởng khoa%')
                    ->with('nguoidung') // Load quan hệ để lấy tên
                    ->first();

                if ($truongKhoa && $truongKhoa->nguoidung) {
                    $truongKhoaName = $truongKhoa->nguoidung->HODEM_VA_TEN;
                } else {
                    // Fallback: Nếu không tìm thấy trong DB thì lấy tên người đang đăng nhập (nếu cần)
                    // $truongKhoaName = auth()->user()->HODEM_VA_TEN ?? '';
                }
            } catch (\Exception $ex) {
                // Nếu lỡ bảng GIANGVIEN cũng không có cột CHUC_VU thì log lại để debug
                \Illuminate\Support\Facades\Log::warning("Lỗi tìm Trưởng khoa: " . $ex->getMessage());
            }

            // Nếu vẫn trống thì điền dấu chấm để người dùng tự điền
            if (empty($truongKhoaName)) {
                $truongKhoaName = "........................................";
            }


            // 2. Lấy dữ liệu Hội đồng (Giữ nguyên logic cũ)
            $hoidongs = Hoidong::where('ID_KEHOACH', $planId)
                ->with([
                    'nhoms' => function($q) {
                        $q->with([
                            'thanhviens.nguoidung',           
                            'phancongDetaiNhom.detai',        
                            'phancongDetaiNhom.gvhd.nguoidung' 
                        ]);
                    }
                ])
                // Sắp xếp số tự nhiên: Hội đồng 1, 2, 10...
                ->orderByRaw('CAST(REGEXP_REPLACE(TEN_HOIDONG, "[^0-9]+", "") AS UNSIGNED) ASC')
                ->get();


            // 3. Chế biến dữ liệu (Mapping)
            $processedCouncils = [];

            foreach ($hoidongs as $hd) {
                $topicsMap = [];

                foreach ($hd->nhoms as $nhom) {
                    $phanCong = $nhom->phancongDetaiNhom;
                    $detai = $phanCong?->detai;
                    
                    // Key gom nhóm
                    $key = $detai ? 'DT_' . $detai->ID_DETAI : 'NHOM_' . $nhom->ID_NHOM;

                    if (!isset($topicsMap[$key])) {
                        $topicsMap[$key] = [
                            'ten_detai' => $detai ? $detai->TEN_DETAI : ($nhom->TEN_NHOM ?? 'Chưa đăng ký đề tài'),
                            'gvhd' => $phanCong?->gvhd?->nguoidung?->HODEM_VA_TEN ?? '',
                            'sinh_viens' => []
                        ];
                    }

                    foreach ($nhom->thanhviens as $tv) {
                        $user = $tv->nguoidung;
                        if (!$user) continue;

                        // Tách Họ - Tên
                        $fullName = trim($user->HODEM_VA_TEN);
                        $parts = explode(' ', $fullName);
                        $ten = array_pop($parts);
                        $hoLot = implode(' ', $parts);

                        $topicsMap[$key]['sinh_viens'][] = [
                            'mssv' => $user->MA_DINHDANH ?? $user->MA_SINHVIEN,
                            'ho_lot' => $hoLot,
                            'ten' => $ten,
                        ];
                    }
                }

                // Sắp xếp SV theo tên A-Z trong nhóm
                foreach ($topicsMap as &$topicData) {
                    usort($topicData['sinh_viens'], function($a, $b) {
                        return strcmp($a['ten'], $b['ten']);
                    });
                }

                if (!empty($topicsMap)) {
                    $processedCouncils[] = [
                        'ten_hoi_dong' => mb_strtoupper($hd->TEN_HOIDONG, 'UTF-8'),
                        'topics' => array_values($topicsMap)
                    ];
                }
            }

            // 4. Render PDF
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('documents.student_list_schedule', [
                'plan' => $plan,
                'councils' => $processedCouncils,
                'truongKhoaName' => $truongKhoaName, // Truyền biến này sang View
            ]);
            
            $pdf->setPaper('A4', 'landscape');

            $fileName = 'DS-Hoi-dong-' . \Illuminate\Support\Str::slug($plan->TEN_DOT) . '.pdf';

            return $pdf->download($fileName);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Export PDF Error: " . $e->getMessage());
            return response()->json(['message' => 'Lỗi xuất file PDF: ' . $e->getMessage()], 500);
        }
    }
}