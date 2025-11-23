<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\SkipsUnknownSheets;
use Illuminate\Support\Facades\Log;

class TopicsImport implements WithMultipleSheets, SkipsUnknownSheets
{
    protected $planId;
    
    /**
     * Container dùng chung để lưu kết quả từ tất cả các sheet.
     * Truyền reference object này cho các importer con.
     * @var \stdClass
     */
    public $sharedResults;

    public function __construct($planId)
    {
        $this->planId = $planId;
        
        // Khởi tạo object chứa kết quả
        $this->sharedResults = new \stdClass();
        $this->sharedResults->validRows = [];
        $this->sharedResults->invalidRows = [];
    }

    /**
     * Định nghĩa các sheet cần đọc.
     * CHỈNH SỬA: Chỉ sử dụng index để tránh lỗi "đọc trùng sheet" gây crash.
     * Hệ thống sẽ quét 2 sheet đầu tiên. Sheet nào có cấu trúc đúng sẽ được lấy dữ liệu.
     */
    public function sheets(): array
    {
        return [
            0 => new TopicSingleSheetImport($this->planId, $this->sharedResults),
            1 => new TopicSingleSheetImport($this->planId, $this->sharedResults),
        ];
    }
    
    public function onUnknownSheet($sheetName)
    {
        // Bỏ qua nếu không tìm thấy sheet (ví dụ file chỉ có 1 sheet nhưng ta cấu hình đọc cả sheet index 1)
    }

    /**
     * Lấy kết quả tổng hợp
     */
    public function getResults()
    {
        return [
            'validRows'   => $this->sharedResults->validRows ?? [],
            'invalidRows' => $this->sharedResults->invalidRows ?? []
        ];
    }
}