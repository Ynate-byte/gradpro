<?php

namespace App\Imports;

use App\Models\Nguoidung;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\Vaitro;

class UsersImport implements ToCollection, WithHeadingRow
{
    public array $validRows = [];
    public array $invalidRows = [];
    public array $errors = [];
    private $sinhVienRoleId;
    private $giangVienRoleId;

    public function __construct()
    {
        $this->sinhVienRoleId = Vaitro::where('TEN_VAITRO', 'Sinh viên')->value('ID_VAITRO');
        $this->giangVienRoleId = Vaitro::where('TEN_VAITRO', 'Giảng viên')->value('ID_VAITRO');
    }

    public function collection(Collection $rows)
    {
        foreach ($rows as $rowIndex => $row) {
            $validator = Validator::make($row->toArray(), [
                'ho_dem_va_ten' => 'required|string|max:100',
                'email' => 'required|email|unique:NGUOIDUNG,EMAIL',
                'ma_dinh_danh' => 'required|string|max:20|unique:NGUOIDUNG,MA_DINHDANH',
                'vai_tro' => ['required', Rule::in(['Sinh viên', 'Giảng viên'])],
            ]);

            if ($validator->fails()) {
                $rowArray = $row->toArray();
                $rowArray['error_details'] = $validator->errors()->messages();
                $this->invalidRows[] = $rowArray;
            } else {
                $rowArray = $row->toArray();
                $roleId = $row['vai_tro'] === 'Sinh viên' ? $this->sinhVienRoleId : $this->giangVienRoleId;
                $rowArray['ID_VAITRO'] = $roleId;
                $this->validRows[] = $rowArray;
            }
        }
    }

    public function getValidationErrors(): array
    {
        return $this->errors;
    }
}