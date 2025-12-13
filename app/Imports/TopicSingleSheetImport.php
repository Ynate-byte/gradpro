<?php

namespace App\Imports;

use App\Models\Giangvien;
use App\Models\KhoaBomon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Illuminate\Support\Facades\Log;

class TopicSingleSheetImport implements ToCollection
{
    protected $planId;
    protected $sharedResults;

    public function __construct($planId, $sharedResults)
    {
        $this->planId = $planId;
        $this->sharedResults = $sharedResults;
    }

    public function collection(Collection $rows)
    {
        $headerIndex = null;
        $headerMap = [];

        // Quét 20 dòng đầu tiên để tìm dòng chứa tiêu đề cột
        foreach ($rows->take(20) as $index => $row) {
            $rowArray = $row->toArray();
            
            $idxTenDeTai = $this->findColumnIndex($rowArray, ['tên đề tài', 'tên đề tài', 'topic name', 'đề tài']);
            $idxEmail = $this->findColumnIndex($rowArray, ['email', 'thư điện tử', 'địa chỉ email']);
            $idxTenGV = $this->findColumnIndex($rowArray, ['gv biên soạn', 'họ tên gv', 'giảng viên', 'gvhd', 'cán bộ hướng dẫn']);
            
            // Điều kiện tối thiểu: Phải có cột Tên đề tài VÀ (Email HOẶC Tên giảng viên)
            if ($idxTenDeTai !== false && ($idxEmail !== false || $idxTenGV !== false)) {
                $headerIndex = $index;
                $headerMap = [
                    'TEN_DETAI' => $idxTenDeTai,
                    'EMAIL' => $idxEmail,
                    'GIANG_VIEN' => $idxTenGV,
                    'BO_MON' => $this->findColumnIndex($rowArray, ['bộ môn', 'khoa', 'đơn vị', 'tổ bộ môn']),
                    
                    // [QUAN TRỌNG] Tách riêng cột Yêu cầu và Mô tả
                    'YEU_CAU' => $this->findColumnIndex($rowArray, ['yêu cầu', 'kiến thức', 'kỹ năng']),
                    'MO_TA' => $this->findColumnIndex($rowArray, ['mô tả', 'nội dung', 'chi tiết']),
                    
                    'MUC_TIEU' => $this->findColumnIndex($rowArray, ['mục tiêu']),
                    'KET_QUA' => $this->findColumnIndex($rowArray, ['kết quả', 'sản phẩm']),
                    'SO_LUONG' => $this->findColumnIndex($rowArray, ['số lượng', 'sl', 'nhóm tối đa']),
                ];
                break;
            }
        }

        if ($headerIndex === null) return;

        $dataRows = $rows->slice($headerIndex + 1);

        $deptMapLowerCase = KhoaBomon::pluck('ID_KHOA_BOMON', 'TEN_KHOA_BOMON')->mapWithKeys(function ($item, $key) {
            return [mb_strtolower($key, 'UTF-8') => $item];
        });

        $deptIdToNameMap = KhoaBomon::pluck('TEN_KHOA_BOMON', 'ID_KHOA_BOMON');

        foreach ($dataRows as $index => $row) {
            $rowArray = $row->toArray();
            if ($this->isEmptyRow($rowArray)) continue;

            $tenDeTai = $this->getValue($rowArray, $headerMap['TEN_DETAI']);
            if (empty($tenDeTai)) continue;

            $isDuplicate = false;
            if (isset($this->sharedResults->validRows)) {
                foreach ($this->sharedResults->validRows as $vRow) {
                    if ($vRow['TEN_DETAI'] === $tenDeTai) { 
                        $isDuplicate = true; break; 
                    }
                }
            }
            if ($isDuplicate) continue;

            $emailRaw = $this->getValue($rowArray, $headerMap['EMAIL']);
            $tenGVRaw = $this->getValue($rowArray, $headerMap['GIANG_VIEN']);
            $boMonRaw = $this->getValue($rowArray, $headerMap['BO_MON']);
            $yeuCau = $this->getValue($rowArray, $headerMap['YEU_CAU']);
            $moTa = $this->getValue($rowArray, $headerMap['MO_TA']);
            
            $soLuong = $this->parseInt($this->getValue($rowArray, $headerMap['SO_LUONG']));

            $rowData = [
                'row' => $index + 1,
                'data' => [
                    'Tên đề tài' => $tenDeTai,
                    'Email' => $emailRaw,
                    'Giảng viên' => $tenGVRaw,
                    
                    'ID_KEHOACH' => $this->planId,
                    'TEN_DETAI' => $tenDeTai,
                    'MA_DETAI_GOC' => null, 
                    
                    'MOTA' => !empty($moTa) ? $moTa : $tenDeTai,
                    
                    'YEUCAU' => $yeuCau,
                    'MUCTIEU' => $this->getValue($rowArray, $headerMap['MUC_TIEU']),
                    'KETQUA_MONGDOI' => $this->getValue($rowArray, $headerMap['KET_QUA']),
                    'SO_NHOM_TOIDA' => $soLuong > 0 ? $soLuong : 1,
                    'TRANGTHAI' => 'Đã duyệt',
                ],
                'errors' => []
            ];

            // 3. TÌM GIẢNG VIÊN & BỘ MÔN
            $lecturer = null;
            if (!empty($emailRaw)) {
                $lecturer = Giangvien::whereHas('nguoidung', function($q) use ($emailRaw) {
                    $q->where('EMAIL', trim($emailRaw));
                })->first();
            }
            if (!$lecturer && !empty($tenGVRaw)) {
                $lecturer = Giangvien::whereHas('nguoidung', function($q) use ($tenGVRaw) {
                    $q->where('HODEM_VA_TEN', 'like', "%" . trim($tenGVRaw) . "%");
                })->first();
            }

            if ($lecturer) {
                $rowData['data']['ID_NGUOI_DEXUAT'] = $lecturer->ID_GIANGVIEN;
                $rowData['data']['GV_TEN'] = $lecturer->nguoidung->HODEM_VA_TEN ?? $tenGVRaw;

                $foundDeptId = null;
                if (!empty($boMonRaw)) {
                    $key = mb_strtolower(trim($boMonRaw), 'UTF-8');
                    foreach ($deptMapLowerCase as $dName => $dId) {
                        if (str_contains($dName, $key) || str_contains($key, $dName)) {
                            $foundDeptId = $dId;
                            break;
                        }
                    }
                }

                if (!$foundDeptId) {
                    $foundDeptId = $lecturer->ID_KHOA_BOMON;
                }

                $rowData['data']['ID_KHOA_BOMON'] = $foundDeptId;
                $rowData['data']['TEN_KHOA_BOMON'] = $deptIdToNameMap[$foundDeptId] ?? 'Không xác định';

            } else {
                $info = array_filter([$emailRaw, $tenGVRaw]);
                $infoStr = implode(' - ', $info);
                $rowData['errors'][] = "Không tìm thấy giảng viên: " . ($infoStr ?: 'N/A');
            }

            if (empty($rowData['errors'])) {
                $this->sharedResults->validRows[] = $rowData['data'];
            } else {
                $this->sharedResults->invalidRows[] = $rowData;
            }
        }
    }

    /**
     * Tìm index của cột dựa trên mảng từ khóa
     */
    private function findColumnIndex($row, $keywords) {
        foreach ($row as $index => $cell) {
            if (is_string($cell)) {
                $cellLower = mb_strtolower(trim($cell), 'UTF-8');
                foreach ($keywords as $keyword) {
                    if (str_contains($cellLower, $keyword)) return $index;
                }
            }
        }
        return false;
    }

    /**
     * Lấy giá trị an toàn từ mảng row
     */
    private function getValue($row, $index) {
        if ($index === false || $index === null || !isset($row[$index])) return null;
        $val = $row[$index];
        return is_string($val) ? trim($val) : $val;
    }

    /**
     * Kiểm tra dòng trống
     */
    private function isEmptyRow($row) {
        $filtered = array_filter($row, function($val) { return $val !== null && trim((string)$val) !== ''; });
        return empty($filtered);
    }
    
    private function parseInt($val) {
        return is_numeric($val) ? (int)$val : 0;
    }
}