<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Nguoidung;
use App\Models\Vaitro;
use App\Models\Chuyennganh;
use App\Models\KhoaBomon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Imports\UsersImport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;
use Throwable;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = Nguoidung::with(['vaitro', 'sinhvien.chuyennganh', 'giangvien.khoabomon']);

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('HODEM_VA_TEN', 'like', "%{$searchTerm}%")
                    ->orWhere('MA_DINHDANH', 'like', "%{$searchTerm}%")
                    ->orWhere('EMAIL', 'like', "%{$searchTerm}%");
            });
        }
        
        if ($request->filled('role') && $request->role !== 'Tất cả') {
            $query->whereHas('vaitro', function ($q) use ($request) {
                $q->where('TEN_VAITRO', $request->role);
            });
        }

        if ($request->filled('statuses')) {
            $query->whereIn('TRANGTHAI_KICHHOAT', $request->statuses);
        }
        
        if ($request->filled('chuyen_nganh_ids')) {
            $query->whereHas('sinhvien', function ($q) use ($request) {
                $q->whereIn('ID_CHUYENNGANH', $request->chuyen_nganh_ids);
            });
        }

        if ($request->filled('khoa_bomon_ids')) {
            $query->whereHas('giangvien', function ($q) use ($request) {
                $q->whereIn('ID_KHOA_BOMON', $request->khoa_bomon_ids);
            });
        }

        if ($request->filled('sort')) {
            list($sortCol, $sortDir) = explode(',', $request->sort);
            if ($sortCol === 'vai_tro') {
                 $query->join('VAITRO', 'NGUOIDUNG.ID_VAITRO', '=', 'VAITRO.ID_VAITRO')
                       ->orderBy('VAITRO.TEN_VAITRO', $sortDir)
                       ->select('NGUOIDUNG.*');
            } else {
                $query->orderBy($sortCol, $sortDir);
            }
        } else {
            $query->orderBy('NGUOIDUNG.NGAYTAO', 'desc');
        }

        $users = $query->paginate($request->per_page ?? 10);
        return response()->json($users);
    }

    public function store(Request $request)
    {
        $vaitroSV = Vaitro::where('TEN_VAITRO', 'Sinh viên')->first()->ID_VAITRO;
        $vaitroGV = Vaitro::where('TEN_VAITRO', 'Giảng viên')->first()->ID_VAITRO;

        $validatedData = $request->validate([
            'HODEM_VA_TEN' => 'required|string|max:100',
            'EMAIL' => 'required|email|unique:NGUOIDUNG,EMAIL',
            'MA_DINHDANH' => 'required|string|max:20|unique:NGUOIDUNG,MA_DINHDANH',
            'ID_VAITRO' => 'required|exists:VAITRO,ID_VAITRO',
            'password' => 'nullable|string|min:6',
            
            'sinhvien_details.ID_CHUYENNGANH' => "required_if:ID_VAITRO,{$vaitroSV}|nullable|exists:CHUYENNGANH,ID_CHUYENNGANH",
            'sinhvien_details.NIENKHOA' => "required_if:ID_VAITRO,{$vaitroSV}|nullable|string|max:10",
            'sinhvien_details.HEDAOTAO' => "required_if:ID_VAITRO,{$vaitroSV}|nullable|string",
            'sinhvien_details.TEN_LOP' => 'nullable|string|max:50',

            'giangvien_details.ID_KHOA_BOMON' => "required_if:ID_VAITRO,{$vaitroGV}|nullable|exists:KHOA_BOMON,ID_KHOA_BOMON",
            'giangvien_details.HOCVI' => "required_if:ID_VAITRO,{$vaitroGV}|nullable|string",
        ]);
        
        $user = null;
        DB::transaction(function () use ($validatedData, &$user, $request, $vaitroSV, $vaitroGV) {
            $user = Nguoidung::create([
                'HODEM_VA_TEN' => $validatedData['HODEM_VA_TEN'],
                'EMAIL' => $validatedData['EMAIL'],
                'MA_DINHDANH' => $validatedData['MA_DINHDANH'],
                'ID_VAITRO' => $validatedData['ID_VAITRO'],
                'MATKHAU_BAM' => Hash::make($request->input('password', '123456')),
                'LA_DANGNHAP_LANDAU' => true,
            ]);

            if ($request->ID_VAITRO == $vaitroSV) {
                $user->sinhvien()->create($request->input('sinhvien_details'));
            } elseif ($request->ID_VAITRO == $vaitroGV) {
                $user->giangvien()->create($request->input('giangvien_details'));
            }
        });

        return response()->json($user->load(['vaitro', 'sinhvien.chuyennganh', 'giangvien.khoabomon']), 201);
    }

    public function show($id)
    {
        $user = Nguoidung::with(['vaitro', 'sinhvien.chuyennganh', 'giangvien.khoabomon'])->findOrFail($id);
        return response()->json($user);
    }

    public function update(Request $request, $id)
    {
        $user = Nguoidung::findOrFail($id);
        
        $validatedData = $request->validate([
            'HODEM_VA_TEN' => 'sometimes|required|string|max:100',
            'EMAIL' => ['sometimes', 'required', 'email', Rule::unique('NGUOIDUNG')->ignore($id, 'ID_NGUOIDUNG')],
            'MA_DINHDANH' => ['sometimes', 'required', 'string', 'max:20', Rule::unique('NGUOIDUNG')->ignore($id, 'ID_NGUOIDUNG')],
            'TRANGTHAI_KICHHOAT' => 'sometimes|boolean',
            
            'sinhvien_details.ID_CHUYENNGANH' => 'sometimes|required|exists:CHUYENNGANH,ID_CHUYENNGANH',
            'sinhvien_details.NIENKHOA' => 'sometimes|required|string|max:10',
            'sinhvien_details.HEDAOTAO' => 'sometimes|required|string',
            'sinhvien_details.TEN_LOP' => 'nullable|string|max:50',

            'giangvien_details.ID_KHOA_BOMON' => 'sometimes|required|exists:KHOA_BOMON,ID_KHOA_BOMON',
            'giangvien_details.HOCVI' => 'sometimes|required|string',
        ]);

        $user->update($validatedData);

        if ($user->vaitro->TEN_VAITRO === 'Sinh viên' && $request->has('sinhvien_details')) {
             $user->sinhvien()->update($request->input('sinhvien_details'));
        }
        if ($user->vaitro->TEN_VAITRO === 'Giảng viên' && $request->has('giangvien_details')) {
             $user->giangvien()->update($request->input('giangvien_details'));
        }

        return response()->json($user->load(['vaitro', 'sinhvien.chuyennganh', 'giangvien.khoabomon']));
    }

    public function destroy($id)
    {
        $user = Nguoidung::findOrFail($id);
        $user->delete();
        return response()->json(null, 204);
    }

    public function resetPassword(Request $request, $id)
    {
        $user = Nguoidung::findOrFail($id);
        $user->MATKHAU_BAM = Hash::make('123456');
        $user->LA_DANGNHAP_LANDAU = true;
        $user->save();
        return response()->json(['message' => 'Mật khẩu đã được reset thành công.']);
    }

    public function bulkAction(Request $request)
    {
        $validated = $request->validate([
            'action' => 'required|in:activate,deactivate',
            'userIds' => 'required|array',
            'userIds.*' => 'exists:NGUOIDUNG,ID_NGUOIDUNG',
        ]);
        $status = $validated['action'] === 'activate';
        Nguoidung::whereIn('ID_NGUOIDUNG', $validated['userIds'])->update(['TRANGTHAI_KICHHOAT' => $status]);
        return response()->json(['message' => 'Cập nhật trạng thái thành công.']);
    }

    public function bulkDelete(Request $request)
    {
        $validated = $request->validate([
            'userIds' => 'required|array',
            'userIds.*' => 'exists:NGUOIDUNG,ID_NGUOIDUNG',
        ]);

        $count = count($validated['userIds']);
        Nguoidung::whereIn('ID_NGUOIDUNG', $validated['userIds'])->delete();

        return response()->json(['message' => "Đã xóa thành công {$count} người dùng."]);
    }

    public function getRoles() { return Vaitro::where('TEN_VAITRO', '!=', 'Admin')->get(); }
    public function getChuyenNganhs() { return Chuyennganh::where('TRANGTHAI_KICHHOAT', true)->get(); }
    public function getKhoaBomons() { return KhoaBomon::where('TRANGTHAI_KICHHOAT', true)->get(); }
    
    public function downloadImportTemplate()
    {
        $path = storage_path('app/templates/import_users_template.xlsx');
        if (!File::exists($path)) {
            return response()->json(['message' => 'File mẫu không tồn tại trên server.'], 404);
        }
        return response()->download($path);
    }

    public function previewImport(Request $request)
    {
        $request->validate(['file' => 'required|mimes:xlsx,xls']);
        $import = new UsersImport;
        try {
            Excel::import($import, $request->file('file'));
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
             $failures = $e->failures();
             $invalidRows = [];
             foreach ($failures as $failure) {
                 $rowArray = $failure->values();
                 $rowArray['error_details'] = [$failure->attribute() => $failure->errors()];
                 $rowArray['error_row'] = $failure->row();
                 $invalidRows[] = $rowArray;
             }
             return response()->json([
                'validRows' => [],
                'invalidRows' => $invalidRows,
            ], 422);
        } catch (Throwable $th) {
            Log::error('Import Preview Failed: ' . $th->getMessage());
            return response()->json(['message' => 'Đã có lỗi xảy ra khi đọc file. Vui lòng kiểm tra lại định dạng file.'], 500);
        }
        return response()->json([
            'validRows' => $import->validRows,
            'invalidRows' => $import->invalidRows,
        ]);
    }

    public function processImport(Request $request)
    {
        $validated = $request->validate([
            'validRows' => 'required|array',
            'validRows.*.ho_dem_va_ten' => 'required|string',
            'validRows.*.email' => 'required|email',
            'validRows.*.ma_dinh_danh' => 'required|string',
            'validRows.*.ID_VAITRO' => 'required|integer',
        ]);

        $vaitroSV = Vaitro::where('TEN_VAITRO', 'Sinh viên')->first()->ID_VAITRO;
        $vaitroGV = Vaitro::where('TEN_VAITRO', 'Giảng viên')->first()->ID_VAITRO;
        $importedCount = 0;

        DB::beginTransaction();
        try {
            foreach ($validated['validRows'] as $row) {
                $user = Nguoidung::create([
                    'HODEM_VA_TEN' => $row['ho_dem_va_ten'],
                    'EMAIL' => $row['email'],
                    'MA_DINHDANH' => $row['ma_dinh_danh'],
                    'ID_VAITRO' => $row['ID_VAITRO'],
                    'MATKHAU_BAM' => Hash::make('123456'),
                    'LA_DANGNHAP_LANDAU' => true,
                ]);

                if ($row['ID_VAITRO'] == $vaitroSV) {
                    $chuyenNganhId = DB::table('CHUYENNGANH')->inRandomOrder()->value('ID_CHUYENNGANH');
                    $user->sinhvien()->create([
                        'ID_CHUYENNGANH' => $chuyenNganhId,
                        'NIENKHOA' => 'N/A',
                        'HEDAOTAO' => 'Cử nhân'
                    ]);
                } elseif ($row['ID_VAITRO'] == $vaitroGV) {
                    $khoaBoMonId = DB::table('KHOA_BOMON')->inRandomOrder()->value('ID_KHOA_BOMON');
                    $user->giangvien()->create([
                        'ID_KHOA_BOMON' => $khoaBoMonId,
                        'HOCVI' => 'Thạc sĩ'
                    ]);
                }
                $importedCount++;
            }
            DB::commit();
            return response()->json(['message' => "Import thành công {$importedCount} người dùng."]);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Process Import Failed: ' . $e->getMessage());
            return response()->json(['message' => 'Import thất bại. Đã xảy ra lỗi trong quá trình lưu dữ liệu. Toàn bộ thao tác đã được hoàn tác.'], 500);
        }
    }
}