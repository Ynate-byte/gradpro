<?php

namespace App\Imports;

use App\Models\Giangvien;
use App\Models\KhoaBomon; // [THÊM] Import KhoaBomon
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

        // 1. TÌM DÒNG HEADER
        foreach ($rows->take(20) as $index => $row) {
            $rowArray = $row->toArray();
            
            $idxTenDeTai = $this->findColumnIndex($rowArray, ['tên đề tài', 'tên đề tài', 'topic name', 'đề tài']);
            $idxEmail = $this->findColumnIndex($rowArray, ['email', 'thư điện tử', 'địa chỉ email']);
            $idxTenGV = $this->findColumnIndex($rowArray, ['gv biên soạn', 'họ tên gv', 'giảng viên', 'gvhd', 'cán bộ hướng dẫn']);
            
            if ($idxTenDeTai !== false && ($idxEmail !== false || $idxTenGV !== false)) {
                $headerIndex = $index;
                
                $headerMap = [
                    'TEN_DETAI' => $idxTenDeTai,
                    'EMAIL' => $idxEmail,
                    'GIANG_VIEN' => $idxTenGV,
                    'BO_MON' => $this->findColumnIndex($rowArray, ['bộ môn', 'khoa', 'đơn vị', 'tổ bộ môn']), // [QUAN TRỌNG]
                    'YEU_CAU' => $this->findColumnIndex($rowArray, ['yêu cầu', 'nội dung', 'mô tả']),
                    'MUC_TIEU' => $this->findColumnIndex($rowArray, ['mục tiêu']),
                    'KET_QUA' => $this->findColumnIndex($rowArray, ['kết quả', 'sản phẩm']),
                    'SO_LUONG' => $this->findColumnIndex($rowArray, ['số lượng', 'sl', 'nhóm tối đa']),
                ];
                break;
            }
        }

        if ($headerIndex === null) return;

        // 2. ĐỌC DỮ LIỆU
        $dataRows = $rows->slice($headerIndex + 1);
        
        // Cache danh sách bộ môn để tra cứu cho nhanh
        $deptMap = KhoaBomon::pluck('ID_KHOA_BOMON', 'TEN_KHOA_BOMON')->mapWithKeys(function ($item, $key) {
            return [mb_strtolower($key, 'UTF-8') => $item];
        });

        foreach ($dataRows as $index => $row) {
            $rowArray = $row->toArray();
            if ($this->isEmptyRow($rowArray)) continue;

            $tenDeTai = $this->getValue($rowArray, $headerMap['TEN_DETAI']);
            if (empty($tenDeTai)) continue;

            // Check Duplicate
            $isDuplicate = false;
            if (isset($this->sharedResults->validRows)) {
                foreach ($this->sharedResults->validRows as $vRow) {
                    if ($vRow['TEN_DETAI'] === $tenDeTai) { 
                        $isDuplicate = true; 
                        break; 
                    }
                }
            }
            if ($isDuplicate) continue;

            $emailRaw = $this->getValue($rowArray, $headerMap['EMAIL']);
            $tenGVRaw = $this->getValue($rowArray, $headerMap['GIANG_VIEN']);
            $boMonRaw = $this->getValue($rowArray, $headerMap['BO_MON']);
            $yeuCau = $this->getValue($rowArray, $headerMap['YEU_CAU']);
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
                    'MOTA' => $yeuCau ?? $tenDeTai,
                    'YEUCAU' => $yeuCau,
                    'MUCTIEU' => $this->getValue($rowArray, $headerMap['MUC_TIEU']),
                    'KETQUA_MONGDOI' => $this->getValue($rowArray, $headerMap['KET_QUA']),
                    'SO_NHOM_TOIDA' => $soLuong > 0 ? $soLuong : 1,
                    'TRANGTHAI' => 'Đã duyệt',
                ],
                'errors' => []
            ];

            // 3. TÌM GIẢNG VIÊN
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
                
                // [LOGIC MỚI]: Xác định ID_KHOA_BOMON
                // Ưu tiên 1: Lấy từ cột "Bộ môn" trong Excel (nếu có)
                $foundDeptId = null;
                if (!empty($boMonRaw)) {
                    $key = mb_strtolower(trim($boMonRaw), 'UTF-8');
                    // Tìm chính xác hoặc gần đúng trong cache
                    foreach ($deptMap as $dName => $dId) {
                        if (str_contains($dName, $key) || str_contains($key, $dName)) {
                            $foundDeptId = $dId;
                            break;
                        }
                    }
                }

                // Ưu tiên 2: Nếu Excel không ghi, lấy Bộ môn của Giảng viên đó
                if (!$foundDeptId) {
                    $foundDeptId = $lecturer->ID_KHOA_BOMON;
                }

                $rowData['data']['ID_KHOA_BOMON'] = $foundDeptId; // Lưu ID Bộ môn

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

    private function getValue($row, $index) {
        if ($index === false || $index === null || !isset($row[$index])) return null;
        $val = $row[$index];
        return is_string($val) ? trim($val) : $val;
    }

    private function isEmptyRow($row) {
        $filtered = array_filter($row, function($val) { return $val !== null && trim((string)$val) !== ''; });
        return empty($filtered);
    }
    
    private function parseInt($val) {
        return is_numeric($val) ? (int)$val : 0;
    }
}