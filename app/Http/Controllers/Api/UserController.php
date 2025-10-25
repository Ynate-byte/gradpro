<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Nguoidung;
use App\Models\Vaitro;
use App\Models\Chuyennganh;
use App\Models\KhoaBomon;
use App\Models\Sinhvien;
use App\Models\Giangvien;
use App\Models\Nhom;
use App\Models\SinhvienThamgia; // <-- Đảm bảo đã import
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Imports\UsersImport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Throwable;

class UserController extends Controller
{
    // QUẢN LÝ NGƯỜI DÙNG (CRUD)

    /**
     * Lấy danh sách người dùng (hỗ trợ lọc, tìm kiếm, sắp xếp, phân trang).
     */
    public function index(Request $request)
    {
        // Bắt đầu query với eager loading
        $query = Nguoidung::with(['vaitro', 'sinhvien.chuyennganh', 'giangvien.khoabomon']);

        // Xử lý tìm kiếm
        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('NGUOIDUNG.HODEM_VA_TEN', 'like', "%{$searchTerm}%") // Thêm tiền tố NGUOIDUNG
                    ->orWhere('NGUOIDUNG.MA_DINHDANH', 'like', "%{$searchTerm}%") // Thêm tiền tố NGUOIDUNG
                    ->orWhere('NGUOIDUNG.EMAIL', 'like', "%{$searchTerm}%"); // Thêm tiền tố NGUOIDUNG
            });
        }

        // Xử lý lọc theo vai trò
        if ($request->filled('role') && $request->role !== 'Tất cả') {
            $query->whereHas('vaitro', function ($q) use ($request) {
                $q->where('TEN_VAITRO', $request->role);
            });
        }

        // Xử lý lọc theo trạng thái
        if ($request->filled('statuses')) {
            $statusesBool = collect($request->statuses)->map(fn($status) => filter_var($status, FILTER_VALIDATE_BOOLEAN))->all();
            if (!empty($statusesBool)) { // Chỉ whereIn nếu mảng không rỗng
                $query->whereIn('NGUOIDUNG.TRANGTHAI_KICHHOAT', $statusesBool);
            }
        }

        // Xử lý lọc theo chuyên ngành
        if ($request->filled('chuyen_nganh_ids')) {
            $query->whereHas('sinhvien', function ($q) use ($request) {
                $q->whereIn('ID_CHUYENNGANH', $request->chuyen_nganh_ids);
            });
        }

        // Xử lý lọc theo khoa/bộ môn
        if ($request->filled('khoa_bomon_ids')) {
            $query->whereHas('giangvien', function ($q) use ($request) {
                $q->whereIn('ID_KHOA_BOMON', $request->khoa_bomon_ids);
            });
        }

        // Xử lý sắp xếp
        if ($request->filled('sort')) {
            list($sortCol, $sortDir) = explode(',', $request->sort);
            $sortDir = strtolower($sortDir) === 'desc' ? 'desc' : 'asc'; 

            if ($sortCol === 'vai_tro') {
                $query->join('VAITRO as v_sort', 'NGUOIDUNG.ID_VAITRO', '=', 'v_sort.ID_VAITRO')
                      ->orderBy('v_sort.TEN_VAITRO', $sortDir)
                      ->select('NGUOIDUNG.*')
                      ->groupBy('NGUOIDUNG.ID_NGUOIDUNG');
            } elseif ($sortCol === 'unit_major') {
                $query->leftJoin('SINHVIEN as sv_sort', 'NGUOIDUNG.ID_NGUOIDUNG', '=', 'sv_sort.ID_NGUOIDUNG')
                      ->leftJoin('CHUYENNGANH as cn_sort', 'sv_sort.ID_CHUYENNGANH', '=', 'cn_sort.ID_CHUYENNGANH')
                      ->leftJoin('GIANGVIEN as gv_sort', 'NGUOIDUNG.ID_NGUOIDUNG', '=', 'gv_sort.ID_NGUOIDUNG')
                      ->leftJoin('KHOA_BOMON as kb_sort', 'gv_sort.ID_KHOA_BOMON', '=', 'kb_sort.ID_KHOA_BOMON')
                      ->orderByRaw("COALESCE(cn_sort.TEN_CHUYENNGANH, kb_sort.TEN_KHOA_BOMON) {$sortDir}")
                      ->select('NGUOIDUNG.*')
                      ->groupBy('NGUOIDUNG.ID_NGUOIDUNG');
            } else {
                // Chỉ sắp xếp nếu cột tồn tại trong bảng NGUOIDUNG
                $userColumns = Schema::getColumnListing('NGUOIDUNG');
                if (in_array($sortCol, $userColumns)) {
                    $sortColWithTable = 'NGUOIDUNG.' . $sortCol;
                    $query->orderBy($sortColWithTable, $sortDir);
                } else {
                    Log::warning("Attempted to sort by non-existent or potentially ambiguous user column: {$sortCol}");
                    $query->orderBy('NGUOIDUNG.NGAYTAO', 'desc');
                }
            }
        } else {
            $query->orderBy('NGUOIDUNG.NGAYTAO', 'desc');
        }

        $users = $query->paginate($request->per_page ?? 10);
        return response()->json($users);
    }

    /**
     * Tạo một người dùng mới.
     */
    public function store(Request $request)
    {
        $vaitroSV = Vaitro::where('TEN_VAITRO', 'Sinh viên')->first()->ID_VAITRO;
        $giangVienRoles = Vaitro::whereIn('TEN_VAITRO', ['Giảng viên', 'Giáo vụ', 'Trưởng khoa'])->pluck('ID_VAITRO')->toArray();

        // Validation data người dùng cơ bản
        $validatedData = $request->validate([
            'HODEM_VA_TEN' => 'required|string|max:100',
            'EMAIL' => 'required|email|unique:NGUOIDUNG,EMAIL',
            'MA_DINHDANH' => 'required|string|max:20|unique:NGUOIDUNG,MA_DINHDANH',
            'ID_VAITRO' => 'required|integer|exists:VAITRO,ID_VAITRO',
            'password' => 'nullable|string|min:6',
            'TRANGTHAI_KICHHOAT' => 'sometimes|boolean',
            'sinhvien_details' => 'nullable|array',
            'giangvien_details' => 'nullable|array',
        ], [
            'EMAIL.unique' => 'Email này đã được sử dụng.',
            'MA_DINHDANH.unique' => 'Mã định danh này đã tồn tại.',
            'ID_VAITRO.required' => 'Vui lòng chọn vai trò.',
            'ID_VAITRO.exists' => 'Vai trò được chọn không hợp lệ.',
        ]);

        $selectedRoleId = (int)$validatedData['ID_VAITRO'];

        // Nested validation cho details dựa trên vai trò
        $detailsValidator = null;
        if ($selectedRoleId === $vaitroSV) {
            $detailsValidator = Validator::make($request->input('sinhvien_details', []), [
                'ID_CHUYENNGANH' => 'required|integer|exists:CHUYENNGANH,ID_CHUYENNGANH',
                'NIENKHOA' => 'required|string|max:10',
                'HEDAOTAO' => 'required|string',
                'TEN_LOP' => 'nullable|string|max:50',
            ], [
                'ID_CHUYENNGANH.required' => 'Vui lòng chọn chuyên ngành cho sinh viên.',
                'ID_CHUYENNGANH.exists' => 'Chuyên ngành được chọn không hợp lệ.',
                'NIENKHOA.required' => 'Vui lòng nhập niên khóa.',
                'HEDAOTAO.required' => 'Vui lòng nhập hệ đào tạo.',
            ]);
        } elseif (in_array($selectedRoleId, $giangVienRoles)) {
            $detailsValidator = Validator::make($request->input('giangvien_details', []), [
                'ID_KHOA_BOMON' => 'required|integer|exists:KHOA_BOMON,ID_KHOA_BOMON',
                'HOCVI' => 'required|string',
                'CHUCVU' => ['nullable', 'string', Rule::in(['Trưởng khoa', 'Phó khoa', 'Giáo vụ', 'Trưởng bộ môn'])],
            ], [
                'ID_KHOA_BOMON.required' => 'Vui lòng chọn khoa/bộ môn.',
                'ID_KHOA_BOMON.exists' => 'Khoa/Bộ môn được chọn không hợp lệ.',
                'HOCVI.required' => 'Vui lòng chọn học vị.',
            ]);
        }

        if ($detailsValidator && $detailsValidator->fails()) {
            throw new ValidationException($detailsValidator);
        }

        $user = null;
        DB::transaction(function () use ($validatedData, $request, $vaitroSV, $giangVienRoles, &$user, $selectedRoleId) {
            $user = Nguoidung::create([
                'HODEM_VA_TEN' => $validatedData['HODEM_VA_TEN'],
                'EMAIL' => $validatedData['EMAIL'],
                'MA_DINHDANH' => $validatedData['MA_DINHDANH'],
                'ID_VAITRO' => $selectedRoleId,
                'MATKHAU_BAM' => Hash::make($request->input('password', '123456')),
                'LA_DANGNHAP_LANDAU' => true,
                'TRANGTHAI_KICHHOAT' => $request->input('TRANGTHAI_KICHHOAT', true),
            ]);

            if ($selectedRoleId === $vaitroSV && $request->has('sinhvien_details')) {
                $svDetails = $request->input('sinhvien_details');
                $svDetails['ID_CHUYENNGANH'] = (int)$svDetails['ID_CHUYENNGANH'];
                $user->sinhvien()->create($svDetails);
            } elseif (in_array($selectedRoleId, $giangVienRoles) && $request->has('giangvien_details')) {
                $gvDetails = $request->input('giangvien_details');
                $gvDetails['ID_KHOA_BOMON'] = (int)$gvDetails['ID_KHOA_BOMON'];
                $user->giangvien()->create($gvDetails);
            }
        });

        return response()->json($user->load(['vaitro', 'sinhvien.chuyennganh', 'giangvien.khoabomon']), 201);
    }

    /**
     * Lấy thông tin chi tiết một người dùng.
     */
    public function show($id)
    {
        $user = Nguoidung::with([
            'vaitro',
            'giangvien.khoabomon',
            'sinhvien' => function ($query) {
                $query->with([
                    'chuyennganh',
                    'cacDotThamGia' => function($thamgiaQuery) {
                        $thamgiaQuery->whereHas('kehoach', function ($planQuery) {
                            $planQuery->whereNotIn('TRANGTHAI', ['Đã hoàn thành', 'Đã hủy']);
                        })
                        ->with('kehoach');
                    }
                ]);
            },
        ])->findOrFail($id);
        return response()->json($user);
    }

    /**
     * Cập nhật thông tin người dùng.
     */
    public function update(Request $request, $id)
    {
        $user = Nguoidung::with(['sinhvien', 'giangvien'])->findOrFail($id);

        $userRoleId = $user->ID_VAITRO;
        $vaitroSV = Vaitro::where('TEN_VAITRO', 'Sinh viên')->first()->ID_VAITRO;
        $giangVienRoles = Vaitro::whereIn('TEN_VAITRO', ['Giảng viên', 'Giáo vụ', 'Trưởng khoa'])->pluck('ID_VAITRO')->toArray();

        // Validate các trường có thể cập nhật
        $validatedData = $request->validate([
            'HODEM_VA_TEN' => 'sometimes|required|string|max:100',
            'EMAIL' => ['sometimes', 'required', 'email', Rule::unique('NGUOIDUNG')->ignore($id, 'ID_NGUOIDUNG')],
            'MA_DINHDANH' => ['sometimes', 'required', 'string', 'max:20', Rule::unique('NGUOIDUNG')->ignore($id, 'ID_NGUOIDUNG')],
            'TRANGTHAI_KICHHOAT' => 'sometimes|boolean',
            'password' => 'nullable|string|min:6',
            'sinhvien_details' => 'nullable|array',
            'giangvien_details' => 'nullable|array',
        ], [
            'EMAIL.unique' => 'Email này đã được sử dụng.',
            'MA_DINHDANH.unique' => 'Mã định danh này đã tồn tại.',
        ]);

        $detailsValidator = null;
        if ($userRoleId == $vaitroSV && $request->has('sinhvien_details')) {
            $detailsValidator = Validator::make($request->input('sinhvien_details', []), [
                'ID_CHUYENNGANH' => 'required|integer|exists:CHUYENNGANH,ID_CHUYENNGANH',
                'NIENKHOA' => 'required|string|max:10',
                'HEDAOTAO' => 'required|string',
                'TEN_LOP' => 'nullable|string|max:50',
            ], [
                'ID_CHUYENNGANH.required' => 'Vui lòng chọn chuyên ngành cho sinh viên.',
                'ID_CHUYENNGANH.exists' => 'Chuyên ngành được chọn không hợp lệ.',
                'NIENKHOA.required' => 'Vui lòng nhập niên khóa.',
                'HEDAOTAO.required' => 'Vui lòng nhập hệ đào tạo.',
            ]);
        } elseif (in_array($userRoleId, $giangVienRoles) && $request->has('giangvien_details')) {
            $detailsValidator = Validator::make($request->input('giangvien_details', []), [
                'ID_KHOA_BOMON' => 'required|integer|exists:KHOA_BOMON,ID_KHOA_BOMON',
                'HOCVI' => 'required|string',
                'CHUCVU' => ['nullable', 'string', Rule::in(['Trưởng khoa', 'Phó khoa', 'Giáo vụ', 'Trưởng bộ môn'])],
            ], [
                'ID_KHOA_BOMON.required' => 'Vui lòng chọn khoa/bộ môn.',
                'ID_KHOA_BOMON.exists' => 'Khoa/Bộ môn được chọn không hợp lệ.',
                'HOCVI.required' => 'Vui lòng chọn học vị.',
            ]);
        }

        if ($detailsValidator && $detailsValidator->fails()) {
            throw new ValidationException($detailsValidator);
        }

        DB::transaction(function () use ($user, $request, $validatedData, $userRoleId, $vaitroSV, $giangVienRoles) {
            // Lọc dữ liệu chỉ dành cho bảng NGUOIDUNG
            $userOnlyData = collect($validatedData)->only([
                'HODEM_VA_TEN', 'EMAIL', 'MA_DINHDANH', 'TRANGTHAI_KICHHOAT'
            ])->filter(fn ($value) => $value !== null)->all();

            // Nếu có password mới thì hash và thêm vào
            if (!empty($validatedData['password'])) {
                $userOnlyData['MATKHAU_BAM'] = Hash::make($validatedData['password']);
                $userOnlyData['LA_DANGNHAP_LANDAU'] = true;
            }

            // Cập nhật bảng NGUOIDUNG nếu có dữ liệu
            if (!empty($userOnlyData)) {
                $user->update($userOnlyData);
            }

            // Cập nhật bảng SINHVIEN
            if ($userRoleId == $vaitroSV && $user->sinhvien && $request->has('sinhvien_details')) {
                $svDetails = $request->input('sinhvien_details');
                $svDetails['ID_CHUYENNGANH'] = (int)$svDetails['ID_CHUYENNGANH'];
                $user->sinhvien()->update($svDetails);
            }
            // Cập nhật bảng GIANGVIEN
            elseif (in_array($userRoleId, $giangVienRoles) && $user->giangvien && $request->has('giangvien_details')) {
                $gvDetails = $request->input('giangvien_details');
                $gvDetails['ID_KHOA_BOMON'] = (int)$gvDetails['ID_KHOA_BOMON'];
                $user->giangvien()->update($gvDetails);
            }
        });

        // Tải lại dữ liệu sau khi cập nhật
        $user->refresh()->load(['vaitro', 'sinhvien.chuyennganh', 'giangvien.khoabomon']);
        return response()->json($user);
    }

    /**
     * Xóa một người dùng.
     * Tự động xử lý logic trưởng nhóm.
     */
    public function destroy(Request $request, $id)
    {
        $user = Nguoidung::findOrFail($id);

        // 1. Không cho phép tự xóa
        if ($user->ID_NGUOIDUNG === $request->user()->ID_NGUOIDUNG) {
            return response()->json(['message' => 'Bạn không thể tự xóa chính mình.'], 400);
        }

        // 2. Lấy tất cả nhóm người này làm trưởng
        $ledGroups = Nhom::where('ID_NHOMTRUONG', $id)
                        ->with(['kehoach', 'thanhviens'])
                        ->get();

        $criticalGroup = $ledGroups->firstWhere(function ($nhom) {
            return $nhom->kehoach && in_array($nhom->kehoach->TRANGTHAI, ['Đang thực hiện', 'Đang chấm điểm']);
        });

        if ($criticalGroup && !$request->boolean('force')) {
            return response()->json([
                'message' => "Không thể xóa. Người dùng đang là Trưởng nhóm của nhóm '{$criticalGroup->TEN_NHOM}' trong kế hoạch '{$criticalGroup->kehoach->TEN_DOT}' đang hoạt động.",
                'data' => [
                    'conflict_type' => 'active_leader',
                    'group_name' => $criticalGroup->TEN_NHOM,
                    'plan_name' => $criticalGroup->kehoach->TEN_DOT
                ]
            ], 409);
        }

        DB::transaction(function () use ($user, $ledGroups) {
            foreach ($ledGroups as $nhom) {
                $otherMembers = $nhom->thanhviens->where('ID_NGUOIDUNG', '!=', $user->ID_NGUOIDUNG);

                if ($otherMembers->isEmpty()) {
                    $nhom->delete();
                } else {
                    $newLeader = $otherMembers->first();
                    $nhom->update(['ID_NHOMTRUONG' => $newLeader->ID_NGUOIDUNG]);
                }
            }
            $user->delete();
        });

        return response()->json(null, 204);
    }

    /**
     * Đặt lại mật khẩu của người dùng về mặc định.
     */
    public function resetPassword(Request $request, $id)
    {
        $user = Nguoidung::findOrFail($id);
        $user->MATKHAU_BAM = Hash::make('123456');
        $user->LA_DANGNHAP_LANDAU = true;
        $user->save();
        return response()->json(['message' => 'Mật khẩu đã được reset thành công về "123456".']);
    }

    // XỬ LÝ HÀNG LOẠT (BULK ACTIONS)

    /**
     * Kích hoạt hoặc vô hiệu hóa hàng loạt người dùng.
     */
    public function bulkAction(Request $request)
    {
        $validated = $request->validate([
            'action' => 'required|in:activate,deactivate',
            'userIds' => 'required|array',
            'userIds.*' => 'exists:NGUOIDUNG,ID_NGUOIDUNG',
        ]);
        $status = $validated['action'] === 'activate';
        $count = count($validated['userIds']);
        Nguoidung::whereIn('ID_NGUOIDUNG', $validated['userIds'])->update(['TRANGTHAI_KICHHOAT' => $status]);
        $actionText = $status ? 'kích hoạt' : 'vô hiệu hóa';
        return response()->json(['message' => "Đã {$actionText} thành công {$count} người dùng."]);
    }

    /**
     * Xóa hàng loạt người dùng.
     */
    public function bulkDelete(Request $request)
    {
        $validated = $request->validate([
            'userIds' => 'required|array',
            'userIds.*' => 'exists:NGUOIDUNG,ID_NGUOIDUNG',
        ]);
        
        $userIds = $validated['userIds'];
        $requestUserId = $request->user()->ID_NGUOIDUNG;

        $filteredUserIds = array_filter($userIds, fn($id) => $id != $requestUserId);
        $count = count($filteredUserIds);
        
        if ($count === 0) {
            return response()->json(['message' => 'Không có người dùng nào được xóa (đã loại trừ chính bạn).'], 400);
        }

        $criticalGroup = Nhom::whereIn('ID_NHOMTRUONG', $filteredUserIds)
                            ->whereHas('kehoach', function ($query) {
                                $query->whereIn('TRANGTHAI', ['Đang thực hiện', 'Đang chấm điểm']);
                            })
                            ->with('nhomtruong')
                            ->first();
        
        if ($criticalGroup) {
            return response()->json([
                'message' => "Không thể xóa hàng loạt. Ít nhất một người dùng ({$criticalGroup->nhomtruong->HODEM_VA_TEN}) đang là trưởng nhóm của kế hoạch đang hoạt động. Vui lòng xử lý thủ công.",
            ], 409);
        }
        
        DB::transaction(function () use ($filteredUserIds) {
            // Tìm tất cả các nhóm (kể cả không nghiêm trọng) do những người này làm trưởng
            $ledGroups = Nhom::whereIn('ID_NHOMTRUONG', $filteredUserIds)->with('thanhviens')->get();
            
            foreach ($ledGroups as $nhom) {
                $newLeader = $nhom->thanhviens
                                ->whereNotIn('ID_NGUOIDUNG', $filteredUserIds) 
                                ->first();
                if ($newLeader) {
                    $nhom->update(['ID_NHOMTRUONG' => $newLeader->ID_NGUOIDUNG]);
                } else {
                    $nhom->delete();
                }
            }
            
            // Xóa tất cả người dùng
            Nguoidung::whereIn('ID_NGUOIDUNG', $filteredUserIds)->delete();
        });

        return response()->json(['message' => "Đã xóa thành công {$count} người dùng."]);
    }

    /**
     * Đặt lại mật khẩu hàng loạt cho người dùng.
     */
    public function bulkResetPassword(Request $request)
    {
        $validated = $request->validate([
            'userIds' => 'required|array',
            'userIds.*' => 'exists:NGUOIDUNG,ID_NGUOIDUNG',
        ]);

        $count = count($validated['userIds']);
        Nguoidung::whereIn('ID_NGUOIDUNG', $validated['userIds'])->update([
            'MATKHAU_BAM' => Hash::make('123456'),
            'LA_DANGNHAP_LANDAU' => true,
        ]);

        return response()->json(['message' => "Đã reset mật khẩu cho {$count} người dùng thành công."]);
    }

    // CÁC HÀM TIỆN ÍCH (HELPERS)
    
    /**
     * Lấy danh sách vai trò.
     */
    public function getRoles() {
        return Vaitro::orderBy('TEN_VAITRO')->get();
    }

    /**
     * Lấy danh sách chuyên ngành đang hoạt động.
     */
    public function getChuyenNganhs() { return Chuyennganh::where('TRANGTHAI_KICHHOAT', true)->orderBy('TEN_CHUYENNGANH')->get(); }

    /**
     * Lấy danh sách khoa/bộ môn đang hoạt động.
     */
    public function getKhoaBomons() { return KhoaBomon::where('TRANGTHAI_KICHHOAT', true)->orderBy('TEN_KHOA_BOMON')->get(); }

    // IMPORT DỮ LIỆU TỪ FILE EXCEL
    
    /**
     * Tải về file mẫu để import người dùng.
     */
    public function downloadImportTemplate()
    {
        $path = storage_path('app/templates/import_users_template.xlsx');
        if (!File::exists($path)) {
            return response()->json(['message' => 'File mẫu không tồn tại trên server.'], 404);
        }
        return response()->download($path);
    }

    /**
     * Đọc và xác thực dữ liệu từ file Excel (chưa lưu vào DB).
     */
    public function previewImport(Request $request)
    {
        $request->validate(['file' => 'required|mimes:xlsx,xls|max:5120']);
        $import = new UsersImport;

        try {
            // Excel::import sẽ tự động gọi validation trong UsersImport
            Excel::import($import, $request->file('file'));

            return response()->json([
                'validRows' => $import->validRows,
                'invalidRows' => $import->invalidRows,
            ]);

        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            $failures = $e->failures();
            $invalidRows = [];
            // Duyệt qua từng lỗi để lấy thông tin dòng và lỗi
            foreach ($failures as $failure) {
                $rowNumber = $failure->row();
                $rowData = $failure->values();
                $rowErrors = $failure->errors();
                $attribute = $failure->attribute();

                $existingRowIndex = -1;
                foreach($invalidRows as $index => $row){
                    if(isset($row['error_row']) && $row['error_row'] === $rowNumber){
                        $existingRowIndex = $index;
                        break;
                    }
                }

                if($existingRowIndex !== -1){
                    // Nếu dòng đã tồn tại, thêm lỗi vào error_details
                    if (!isset($invalidRows[$existingRowIndex]['error_details'][$attribute])) {
                        $invalidRows[$existingRowIndex]['error_details'][$attribute] = [];
                    }
                    $invalidRows[$existingRowIndex]['error_details'][$attribute] = array_merge($invalidRows[$existingRowIndex]['error_details'][$attribute], $rowErrors);
                } else {
                    // Nếu dòng chưa tồn tại, tạo mới
                    $invalidRows[] = [
                        ...$rowData,
                        'error_row' => $rowNumber,
                        'error_details' => [$attribute => $rowErrors]
                    ];
                }
            }

            return response()->json([
                'validRows' => $import->validRows,
                'invalidRows' => $invalidRows,
            ], 422);
        } catch (Throwable $th) {
            // Bắt các lỗi khác (định dạng file sai, lỗi đọc file...)
            Log::error('Import Preview Failed: ' . $th->getMessage() . ' at ' . $th->getFile() . ':' . $th->getLine());
            return response()->json(['message' => 'Đã có lỗi xảy ra khi đọc file. Vui lòng kiểm tra lại định dạng file hoặc liên hệ quản trị viên.'], 500);
        }
    }

    /**
     * Lưu dữ liệu người dùng hợp lệ từ bước xem trước vào DB.
     */
    public function processImport(Request $request)
    {
        $validated = $request->validate([
            'validRows' => 'required|array',
            'validRows.*.ho_dem_va_ten' => 'required|string',
            'validRows.*.email' => 'required|email',
            'validRows.*.ma_dinh_danh' => 'required|string',
            'validRows.*.ID_VAITRO' => 'required|integer|exists:VAITRO,ID_VAITRO',
            'validRows.*.ten_chuyen_nganh' => 'nullable|string',
            'validRows.*.nien_khoa' => 'nullable|string',
            'validRows.*.he_dao_tao' => 'nullable|string',
            'validRows.*.ten_lop' => 'nullable|string',
            'validRows.*.ten_khoa_bomon' => 'nullable|string',
            'validRows.*.hoc_vi' => 'nullable|string',
            'validRows.*.chuc_vu' => 'nullable|string',
        ]);

        $vaitroSV = Vaitro::where('TEN_VAITRO', 'Sinh viên')->first()->ID_VAITRO;
        $giangVienRoles = Vaitro::whereIn('TEN_VAITRO', ['Giảng viên', 'Giáo vụ', 'Trưởng khoa'])->pluck('ID_VAITRO')->toArray();
        $importedCount = 0;
        $errors = [];

        $chuyenNganhMap = Chuyennganh::pluck('ID_CHUYENNGANH', 'TEN_CHUYENNGANH');
        $khoaBomonMap = KhoaBomon::pluck('ID_KHOA_BOMON', 'TEN_KHOA_BOMON');

        DB::beginTransaction();
        try {
            foreach ($validated['validRows'] as $index => $row) {
                // Kiểm tra unique trong DB trước khi tạo
                if (Nguoidung::where('EMAIL', $row['email'])->exists()) {
                    $errors[] = "Dòng " . ($index + 1) . ": Email '{$row['email']}' đã tồn tại trong hệ thống.";
                    continue;
                }
                if (Nguoidung::where('MA_DINHDANH', $row['ma_dinh_danh'])->exists()) {
                    $errors[] = "Dòng " . ($index + 1) . ": Mã định danh '{$row['ma_dinh_danh']}' đã tồn tại trong hệ thống.";
                    continue;
                }

                $user = Nguoidung::create([
                    'HODEM_VA_TEN' => $row['ho_dem_va_ten'],
                    'EMAIL' => $row['email'],
                    'MA_DINHDANH' => $row['ma_dinh_danh'],
                    'ID_VAITRO' => $row['ID_VAITRO'],
                    'MATKHAU_BAM' => Hash::make('123456'),
                    'LA_DANGNHAP_LANDAU' => true,
                    'TRANGTHAI_KICHHOAT' => true,
                ]);

                if ($row['ID_VAITRO'] == $vaitroSV) {
                    $chuyenNganhId = $chuyenNganhMap->get($row['ten_chuyen_nganh'] ?? null);
                    if (!$chuyenNganhId) {
                        $chuyenNganhId = Chuyennganh::first()?->ID_CHUYENNGANH;
                        if(!$chuyenNganhId){
                            $errors[] = "Dòng " . ($index + 1) . ": Không tìm thấy chuyên ngành '{$row['ten_chuyen_nganh']}' và không có chuyên ngành nào khác trong DB.";
                            continue;
                        }
                        Log::warning("Chuyên ngành '{$row['ten_chuyen_nganh']}' không tìm thấy cho dòng ".($index+1).". Sử dụng chuyên ngành fallback ID: {$chuyenNganhId}");
                    }
                    $user->sinhvien()->create([
                        'ID_CHUYENNGANH' => $chuyenNganhId,
                        'NIENKHOA' => $row['nien_khoa'] ?? 'N/A',
                        'HEDAOTAO' => $row['he_dao_tao'] ?? 'Cử nhân',
                        'TEN_LOP' => $row['ten_lop'] ?? null,
                    ]);
                } elseif (in_array($row['ID_VAITRO'], $giangVienRoles)) {
                    $khoaBoMonId = $khoaBomonMap->get($row['ten_khoa_bomon'] ?? null);
                    if (!$khoaBoMonId) {
                        $khoaBoMonId = KhoaBomon::first()?->ID_KHOA_BOMON;
                        if(!$khoaBoMonId){
                            $errors[] = "Dòng " . ($index + 1) . ": Không tìm thấy Khoa/BM '{$row['ten_khoa_bomon']}' và không có Khoa/BM nào khác trong DB.";
                            continue;
                        }
                        Log::warning("Khoa/BM '{$row['ten_khoa_bomon']}' không tìm thấy cho dòng ".($index+1).". Sử dụng Khoa/BM fallback ID: {$khoaBoMonId}");
                    }

                    $user->giangvien()->create([
                        'ID_KHOA_BOMON' => $khoaBoMonId,
                        'HOCVI' => $row['hoc_vi'] ?? 'Thạc sĩ',
                        'CHUCVU' => isset($row['chuc_vu']) && in_array($row['chuc_vu'], ['Trưởng khoa', 'Phó khoa', 'Giáo vụ', 'Trưởng bộ môn']) ? $row['chuc_vu'] : null,
                    ]);
                }
                $importedCount++;
            }

            if (!empty($errors)) {
                DB::rollBack();
                $errorString = implode("\n", $errors);
                return response()->json(['message' => "Import thất bại do các lỗi sau:\n" . $errorString], 422);
            }

            DB::commit();
            return response()->json(['message' => "Import thành công {$importedCount} người dùng."]);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Process Import Failed: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'Import thất bại. Đã xảy ra lỗi nghiêm trọng trong quá trình lưu dữ liệu. Toàn bộ thao tác đã được hoàn tác.'], 500);
        }
    }
}