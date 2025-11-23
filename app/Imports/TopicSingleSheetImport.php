<?php

namespace App\Imports;

use App\Models\Giangvien;
use App\Models\Chuyennganh;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Illuminate\Support\Facades\Log;

class TopicSingleSheetImport implements ToCollection
{
    protected $planId;
    protected $sharedResults; // Tham chiếu đến object kết quả chung của cha

    public function __construct($planId, $sharedResults)
    {
        $this->planId = $planId;
        $this->sharedResults = $sharedResults;
    }

    /**
     * Xử lý dữ liệu từ Collection (toàn bộ sheet)
     */
    public function collection(Collection $rows)
    {
        $headerIndex = null;
        $headerMap = [];

        // 1. TÌM DÒNG HEADER (Quét 20 dòng đầu tiên để tìm dòng tiêu đề)
        // Chỉ cần tìm thấy dòng chứa 'Tên đề tài' VÀ ('Email' HOẶC 'Tên GV') là xác nhận đúng sheet
        foreach ($rows->take(20) as $index => $row) {
            // Chuyển row thành mảng và lọc bỏ các giá trị null/rỗng để kiểm tra nhanh
            $rowArray = $row->toArray();
            
            $idxTenDeTai = $this->findColumnIndex($rowArray, ['tên đề tài', 'tên đề tài', 'topic name', 'đề tài']);
            $idxEmail = $this->findColumnIndex($rowArray, ['email', 'thư điện tử', 'địa chỉ email']);
            $idxTenGV = $this->findColumnIndex($rowArray, ['gv biên soạn', 'họ tên gv', 'giảng viên', 'gvhd', 'cán bộ hướng dẫn']);
            
            // Điều kiện: Phải tìm thấy "Tên đề tài" VÀ ("Email" HOẶC "Tên GV")
            if ($idxTenDeTai !== false && ($idxEmail !== false || $idxTenGV !== false)) {
                $headerIndex = $index;
                
                // Lưu lại vị trí các cột để map dữ liệu
                $headerMap = [
                    'TEN_DETAI' => $idxTenDeTai,
                    'EMAIL' => $idxEmail,
                    'GIANG_VIEN' => $idxTenGV,
                    'BO_MON' => $this->findColumnIndex($rowArray, ['bộ môn', 'khoa', 'đơn vị']),
                    'YEU_CAU' => $this->findColumnIndex($rowArray, ['yêu cầu', 'nội dung', 'mô tả']),
                    'MUC_TIEU' => $this->findColumnIndex($rowArray, ['mục tiêu']),
                    'KET_QUA' => $this->findColumnIndex($rowArray, ['kết quả', 'sản phẩm']),
                    'SO_LUONG' => $this->findColumnIndex($rowArray, ['số lượng', 'sl', 'nhóm tối đa']),
                ];
                break;
            }
        }

        // Nếu không tìm thấy header, return ngay (bỏ qua sheet này, coi như sheet rác/thống kê)
        if ($headerIndex === null) {
            return; 
        }

        // 2. ĐỌC DỮ LIỆU (Bắt đầu từ dòng ngay sau header)
        $dataRows = $rows->slice($headerIndex + 1);
        
        foreach ($dataRows as $index => $row) {
            $rowArray = $row->toArray();
            
            // Bỏ qua dòng trống hoàn toàn
            if ($this->isEmptyRow($rowArray)) continue;

            // Lấy tên đề tài
            $tenDeTai = $this->getValue($rowArray, $headerMap['TEN_DETAI']);
            
            // Nếu dòng này không có tên đề tài, bỏ qua
            if (empty($tenDeTai)) continue;

            // Kiểm tra trùng lặp trong kết quả đã quét (Tránh duplicate nếu lỡ quét trùng nội dung từ sheet khác)
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

            // Lấy các thông tin khác
            $emailRaw = $this->getValue($rowArray, $headerMap['EMAIL']);
            $tenGVRaw = $this->getValue($rowArray, $headerMap['GIANG_VIEN']);
            $yeuCau = $this->getValue($rowArray, $headerMap['YEU_CAU']);
            $soLuong = $this->parseInt($this->getValue($rowArray, $headerMap['SO_LUONG']));

            $rowData = [
                'row' => $index + 1, // Số dòng tương đối trong Excel
                'data' => [
                    'Tên đề tài' => $tenDeTai,
                    'Email' => $emailRaw,
                    'Giảng viên' => $tenGVRaw,
                    
                    // Dữ liệu chuẩn bị để insert DB
                    'ID_KEHOACH' => $this->planId,
                    'TEN_DETAI' => $tenDeTai,
                    'MA_DETAI_GOC' => null, 
                    'MOTA' => $yeuCau ?? $tenDeTai, // Nếu không có mô tả, dùng tên đề tài hoặc yêu cầu
                    'YEUCAU' => $yeuCau,
                    'MUCTIEU' => $this->getValue($rowArray, $headerMap['MUC_TIEU']),
                    'KETQUA_MONGDOI' => $this->getValue($rowArray, $headerMap['KET_QUA']),
                    'SO_NHOM_TOIDA' => $soLuong > 0 ? $soLuong : 1,
                    //'TRANGTHAI' => 'Đã duyệt',
                    'TRANGTHAI' => 'Chờ duyệt',
                ],
                'errors' => []
            ];

            // 3. TÌM GIẢNG VIÊN (Validation)
            $lecturer = null;
            
            // Ưu tiên tìm theo Email
            if (!empty($emailRaw)) {
                $lecturer = Giangvien::whereHas('nguoidung', function($q) use ($emailRaw) {
                    $q->where('EMAIL', trim($emailRaw));
                })->first();
            }
            
            // Fallback: Tìm theo Tên (chấp nhận gần đúng)
            if (!$lecturer && !empty($tenGVRaw)) {
                $lecturer = Giangvien::whereHas('nguoidung', function($q) use ($tenGVRaw) {
                    $q->where('HODEM_VA_TEN', 'like', "%" . trim($tenGVRaw) . "%");
                })->first();
            }

            if ($lecturer) {
                $rowData['data']['ID_NGUOI_DEXUAT'] = $lecturer->ID_GIANGVIEN;
                $rowData['data']['GV_TEN'] = $lecturer->nguoidung->HODEM_VA_TEN ?? $tenGVRaw;
                
                // Gán chuyên ngành mặc định (Lấy chuyên ngành đầu tiên của khoa)
                $chuyenNganh = Chuyennganh::where('ID_KHOA_BOMON', $lecturer->ID_KHOA_BOMON)->first();
                $rowData['data']['ID_CHUYENNGANH'] = $chuyenNganh ? $chuyenNganh->ID_CHUYENNGANH : null;
            } else {
                $info = array_filter([$emailRaw, $tenGVRaw]);
                $infoStr = implode(' - ', $info);
                $rowData['errors'][] = "Không tìm thấy giảng viên trong hệ thống: " . ($infoStr ?: 'Không có thông tin');
            }

            // 4. PHÂN LOẠI VÀ LƯU VÀO KẾT QUẢ CHUNG
            if (empty($rowData['errors'])) {
                $this->sharedResults->validRows[] = $rowData['data'];
            } else {
                $this->sharedResults->invalidRows[] = $rowData;
            }
        }
    }

    /**
     * Helper: Tìm vị trí cột dựa trên danh sách từ khóa (không phân biệt hoa thường)
     */
    private function findColumnIndex($row, $keywords) {
        foreach ($row as $index => $cell) {
            if (is_string($cell)) {
                $cellLower = mb_strtolower(trim($cell), 'UTF-8');
                foreach ($keywords as $keyword) {
                    if (str_contains($cellLower, $keyword)) {
                        return $index;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Helper: Lấy giá trị an toàn từ mảng
     */
    private function getValue($row, $index) {
        if ($index === false || $index === null || !isset($row[$index])) return null;
        $val = $row[$index];
        return is_string($val) ? trim($val) : $val;
    }

    /**
     * Helper: Kiểm tra dòng trống
     */
    private function isEmptyRow($row) {
        $filtered = array_filter($row, function($val) { 
            return $val !== null && trim((string)$val) !== ''; 
        });
        return empty($filtered);
    }
    
    /**
     * Helper: Parse số nguyên an toàn
     */
    private function parseInt($val) {
        return is_numeric($val) ? (int)$val : 0;
    }
}