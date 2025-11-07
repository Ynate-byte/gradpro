<?php
namespace App\Imports;
use App\Models\Nguoidung;
use App\Models\Sinhvien;
use App\Models\SinhvienThamgia;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class PlanParticipantsImport implements ToCollection
{
    public array $validRows = [];
    public array $invalidRows = [];
    public array $ignoredRows = [];
    private int $planId;
    private array $mapping;
    private array $defaults;
    private int $headerRowIndex;
    private int $dataRowStartIndex;
    private $processedMssv = [];

    public function __construct(int $planId, array $mapping, array $defaults, int $headerRowIndex, int $dataRowStartIndex)
    {
        $this->planId = $planId;
        $this->mapping = $mapping;
        $this->defaults = $defaults;
        $this->headerRowIndex = $headerRowIndex;
        $this->dataRowStartIndex = $dataRowStartIndex;
    }

    public function collection(Collection $rows)
    {
        if ($rows->count() <= $this->headerRowIndex) {
            throw ValidationException::withMessages([
                'file' => "File không hợp lệ. Không tìm thấy dòng header (dòng " . ($this->headerRowIndex + 1) . "). File chỉ có " . $rows->count() . " dòng."
            ]);
        }

        $rawHeadersCollection = $rows[$this->headerRowIndex];
        $detectedHeaders = [];

        if (empty($rawHeadersCollection) || !is_iterable($rawHeadersCollection)) {
            throw ValidationException::withMessages([
                'file' => "Dòng header (dòng " . ($this->headerRowIndex + 1) . ") bị trống hoặc không thể đọc."
            ]);
        }

        $rawHeadersArray = $rawHeadersCollection->toArray();

        foreach ($rawHeadersArray as $index => $header) {
            $headerName = $header ? $this->getValue($rawHeadersArray, $index) : "(Cột {$index})";
            if (preg_match('/_unnamed_(\d+)/', $headerName, $matches)) {
                $headerName = "(Cột " . $matches[1] . ")";
            }
            $originalHeaderName = $headerName;
            $count = 2;
            while (in_array($headerName, $detectedHeaders)) {
                $headerName = "{$originalHeaderName} ({$count})";
                $count++;
            }
            $detectedHeaders[] = $headerName;
        }

        $getIndex = function ($colName) use ($detectedHeaders) {
            $index = array_search($colName, $detectedHeaders);
            return $index !== false ? $index : null;
        };

        $mapIndices = [
            'ma_dinh_danh' => $getIndex($this->mapping['ma_dinh_danh']),
            'ho_ten'       => array_filter(
                array_map($getIndex, $this->mapping['ho_ten']),
                fn($value) => $value !== null
            ),
            'ngay_sinh'    => $getIndex($this->mapping['ngay_sinh']),
            'ten_lop'      => $getIndex($this->mapping['ten_lop']),
        ];

        if ($mapIndices['ma_dinh_danh'] === null) {
            throw ValidationException::withMessages(['file' => "Không tìm thấy cột '{$this->mapping['ma_dinh_danh']}' (Mã định danh)."]);
        }

        if (empty($mapIndices['ho_ten'])) {
            throw ValidationException::withMessages(['file' => "Không tìm thấy bất kỳ cột nào trong danh sách Họ tên."]);
        }

        $nienKhoaColName = $this->mapping['nien_khoa']['value'];
        $nienKhoaColIndex = $getIndex($nienKhoaColName);

        if ($this->mapping['nien_khoa']['source'] === 'ten_lop' && $nienKhoaColIndex === null) {
            throw ValidationException::withMessages(['file' => "Không tìm thấy cột '{$nienKhoaColName}' (để trích xuất Niên khóa)."]);
        }

        $dataRows = $rows->slice($this->dataRowStartIndex);

        if ($dataRows->isEmpty()) {
            throw ValidationException::withMessages([
                'file' => "Không tìm thấy dòng dữ liệu nào để import (dữ liệu cần bắt đầu từ dòng " . ($this->dataRowStartIndex + 1) . ")."
            ]);
        }

        foreach ($dataRows as $rowIndex => $row) {
            $rowArray = $row->toArray();
            $excelRowNum = $rowIndex + $this->dataRowStartIndex + 1;
            $mssv = $this->getValue($rowArray, $mapIndices['ma_dinh_danh']);
            $tenLop = $this->getValue($rowArray, $mapIndices['ten_lop']);
            $ngaySinhRaw = $this->getValue($rowArray, $mapIndices['ngay_sinh']);
            $hoTenParts = array_map(fn($idx) => $this->getValue($rowArray, $idx), $mapIndices['ho_ten']);
            $hoTen = trim(implode(' ', array_filter($hoTenParts)));
            $nienKhoa = $this->extractNienKhoa(
                $this->getValue($rowArray, $nienKhoaColIndex),
                $this->mapping['nien_khoa']
            );
            $ngaySinh = $this->parseDate($ngaySinhRaw);

            $processedData = [
                'MA_DINHDANH' => $mssv,
                'HODEM_VA_TEN' => $hoTen,
                'NGAYSINH' => $ngaySinh,
                'TEN_LOP' => $tenLop,
                'NIENKHOA' => $nienKhoa,
                'row_index' => $excelRowNum,
            ];

            if (empty($mssv)) {
                $this->invalidRows[] = ['data' => $processedData, 'error' => "Thiếu Mã SV (cột '{$this->mapping['ma_dinh_danh']}')"];
                continue;
            }

            if (empty($hoTen)) {
                $this->invalidRows[] = ['data' => $processedData, 'error' => "Thiếu Họ Tên"];
                continue;
            }

            if (in_array($mssv, $this->processedMssv)) {
                $this->ignoredRows[] = ['data' => $processedData, 'reason' => "MSSV bị trùng lặp trong file."];
                continue;
            }

            $this->processedMssv[] = $mssv;

            $user = Nguoidung::where('MA_DINHDANH', $mssv)->with('sinhvien')->first();

            if ($user) {
                if (!$user->sinhvien) {
                    $this->invalidRows[] = ['data' => $processedData, 'error' => "Tồn tại Nguoidung nhưng không phải Sinhvien."];
                    continue;
                }

                $existsInPlan = SinhvienThamgia::where('ID_SINHVIEN', $user->sinhvien->ID_SINHVIEN)
                    ->where('ID_KEHOACH', $this->planId)
                    ->exists();

                if ($existsInPlan) {
                    $this->ignoredRows[] = ['data' => $processedData, 'reason' => "Đã có trong kế hoạch."];
                    continue;
                }

                $processedData['ID_NGUOIDUNG'] = $user->ID_NGUOIDUNG;
                $processedData['ID_SINHVIEN'] = $user->sinhvien->ID_SINHVIEN;
                $this->validRows[] = ['action' => 'link', 'data' => $processedData];
            } else {
                $email = $this->generateEmail($hoTen, $mssv);
                if (Nguoidung::where('EMAIL', $email)->exists()) {
                    $email = $this->generateEmail($hoTen, $mssv, true);
                }
                $processedData['EMAIL'] = $email;
                $this->validRows[] = ['action' => 'create_and_link', 'data' => $processedData];
            }
        }
    }

    private function getValue($row, $index)
    {
        if ($index === false || $index === null || !isset($row[$index])) {
            return null;
        }
        $value = $row[$index];
        if (is_string($value)) {
            $converted = @iconv('Windows-1252', 'UTF-8//IGNORE', $value);
            if ($converted === false) {
                $converted = @iconv('Windows-1258', 'UTF-8//IGNORE', $value);
            }
            if ($converted === false) {
                $converted = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
            }
            $value = $converted !== false ? $converted : $value;
        }
        return trim($value);
    }

    private function parseDate($value)
    {
        if (empty($value)) return null;
        try {
            if (is_numeric($value)) {
                return Carbon::instance(Date::excelToDateTimeObject($value))->format('Y-m-d');
            }
            return Carbon::parse(str_replace('/', '-', $value))->format('Y-m-d');
        } catch (\Exception $e) {
            return null;
        }
    }

    private function extractNienKhoa($sourceValue, $rule)
    {
        if ($rule['source'] === 'default') {
            return $rule['value'];
        }
        if ($rule['source'] === 'ten_lop' && $sourceValue) {
            $prefix = $rule['prefix'] ?? '';
            $length = $rule['length'] ?? 2;
            return $prefix . substr($sourceValue, 0, $length);
        }
        return null;
    }

    private function generateEmail(string $hoTen, string $mssv, bool $addRandom = false)
    {
        $parts = explode(' ', $hoTen);
        $lastName = Str::slug(array_pop($parts));
        $initials = '';
        foreach ($parts as $part) {
            $initials .= mb_substr(Str::slug($part), 0, 1);
        }
        $random = $addRandom ? rand(10, 99) : '';
        return strtolower("{$lastName}{$initials}.{$mssv}{$random}@gradpro.test");
    }
}