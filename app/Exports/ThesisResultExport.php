<?php

namespace App\Exports;

use App\Models\KehoachKhoaluan;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithEvents; // [MỚI] Dùng để xử lý sự kiện merge
use Maatwebsite\Excel\Events\AfterSheet;   // [MỚI] Sự kiện sau khi tạo sheet
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use Illuminate\Support\Facades\DB;

class ThesisResultExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles, WithEvents
{
    protected $planId;
    protected $rowNumber = 0;
    protected $plan;
    
    // Biến để lưu trữ thông tin phục vụ việc merge
    protected $groupData = []; 
    protected $dataCount = 0;

    public function __construct($planId)
    {
        $this->planId = $planId;
        $this->plan = KehoachKhoaluan::find($planId);
    }

    /**
     * Lấy dữ liệu từ Database
     */
    public function collection()
    {
        $data = DB::table('NGUOIDUNG')
            ->join('SINHVIEN', 'NGUOIDUNG.ID_NGUOIDUNG', '=', 'SINHVIEN.ID_NGUOIDUNG')
            ->join('THANHVIEN_NHOM', 'NGUOIDUNG.ID_NGUOIDUNG', '=', 'THANHVIEN_NHOM.ID_NGUOIDUNG')
            ->join('NHOM', 'THANHVIEN_NHOM.ID_NHOM', '=', 'NHOM.ID_NHOM')
            ->leftJoin('PHANCONG_DETAI_NHOM', 'NHOM.ID_NHOM', '=', 'PHANCONG_DETAI_NHOM.ID_NHOM')
            ->leftJoin('DETAI', 'PHANCONG_DETAI_NHOM.ID_DETAI', '=', 'DETAI.ID_DETAI')
            ->leftJoin('GIANGVIEN', 'PHANCONG_DETAI_NHOM.ID_GVHD', '=', 'GIANGVIEN.ID_GIANGVIEN')
            ->leftJoin('NGUOIDUNG as GV_USER', 'GIANGVIEN.ID_NGUOIDUNG', '=', 'GV_USER.ID_NGUOIDUNG')
            ->leftJoin('DIEM_TONGKET', 'NHOM.ID_NHOM', '=', 'DIEM_TONGKET.ID_NHOM')
            ->leftJoin('HOIDONG_NHOM', 'NHOM.ID_NHOM', '=', 'HOIDONG_NHOM.ID_NHOM')
            ->where('NHOM.ID_KEHOACH', $this->planId)
            
            // Lọc các nhóm đã được xác nhận nộp bài (Đủ điều kiện chấm)
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                      ->from('NOP_SANPHAM')
                      ->whereColumn('NOP_SANPHAM.ID_PHANCONG', 'PHANCONG_DETAI_NHOM.ID_PHANCONG')
                      ->where('NOP_SANPHAM.TRANGTHAI', 'Đã xác nhận');
            })

            ->select(
                'NGUOIDUNG.MA_DINHDANH',
                'NGUOIDUNG.HODEM_VA_TEN',
                'DETAI.TEN_DETAI',
                'GV_USER.HODEM_VA_TEN as GVHD_TEN',
                'DIEM_TONGKET.DIEM_TONG',
                'HOIDONG_NHOM.ID_HOIDONG',
                'NHOM.ID_NHOM' // [MỚI] Lấy ID Nhóm để group
            )
            // [QUAN TRỌNG] Sắp xếp theo ID Nhóm trước để các thành viên nằm cạnh nhau
            ->orderBy('NHOM.ID_NHOM', 'asc') 
            ->orderBy('NGUOIDUNG.MA_DINHDANH', 'asc') // Sau đó sắp xếp theo tên/mssv trong nhóm
            ->get();

        $this->dataCount = $data->count();

        // Tính toán các khoảng merge (Gộp ô)
        // Ví dụ: Nhóm 1 có 3 người (dòng 2,3,4) -> Merge từ dòng 2 đến 4
        $currentGroupId = null;
        $startRow = 2; // Dữ liệu bắt đầu từ dòng 2 (sau header)
        
        foreach ($data as $index => $row) {
            $excelRow = $index + 2;

            if ($currentGroupId !== $row->ID_NHOM) {
                // Nếu chuyển sang nhóm mới và không phải dòng đầu tiên -> Lưu lại nhóm trước đó
                if ($currentGroupId !== null) {
                    $this->groupData[] = [
                        'start' => $startRow,
                        'end' => $excelRow - 1
                    ];
                }
                $currentGroupId = $row->ID_NHOM;
                $startRow = $excelRow;
            }
        }
        // Lưu nhóm cuối cùng
        if ($currentGroupId !== null) {
            $this->groupData[] = [
                'start' => $startRow,
                'end' => $this->dataCount + 1
            ];
        }

        return $data;
    }

    /**
     * Định nghĩa tiêu đề các cột
     */
    public function headings(): array
    {
        return [
            'STT',
            'Mã số sinh viên',
            'Họ và',          // Cột C
            'Tên',            // Cột D
            'Tên Khóa luận tốt nghiệp', // Cột E (Sẽ merge)
            'Người hướng dẫn Khóa luận tốt nghiệp', // Cột F (Sẽ merge)
            'Điểm',
            'Kết quả',
            'Ghi chú'
        ];
    }

    /**
     * Map dữ liệu từng dòng
     */
    public function map($row): array
    {
        $this->rowNumber++;

        // Tách Họ tên
        $fullName = trim($row->HODEM_VA_TEN);
        $parts = explode(' ', $fullName);
        $ten = array_pop($parts);
        $hoLot = implode(' ', $parts);

        // Logic Kết quả
        $isPlanEnded = $this->plan && $this->plan->TRANGTHAI === 'Đã hoàn thành';
        $diem = $row->DIEM_TONG;
        $ketQua = '';
        $ghiChu = '';
        
        if ($diem !== null) {
            $ketQua = ($diem >= 4.0) ? 'Đậu' : 'Rớt';
        } else {
            if ($isPlanEnded) {
                $ketQua = 'Rớt';
                if (!$row->ID_HOIDONG) {
                     $ghiChu = 'Không có HĐ';
                } else {
                     $ghiChu = 'Chưa nhập điểm';
                }
            } else {
                $ketQua = '';
            }
        }

        return [
            $this->rowNumber,
            $row->MA_DINHDANH,
            $hoLot, // Cột C
            $ten,   // Cột D
            $row->TEN_DETAI ?? 'Chưa đăng ký đề tài', // Cột E
            $row->GVHD_TEN ?? '',                     // Cột F
            $diem,
            $ketQua,
            $ghiChu
        ];
    }

    /**
     * Style cơ bản
     */
    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true, 'size' => 12],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                    'wrapText' => true
                ]
            ],
        ];
    }

    /**
     * [MỚI] Xử lý sự kiện để Merge Cells và Kẻ bảng
     */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastRow = $this->dataCount + 1;

                // 1. Thực hiện Merge Cells dựa trên ID nhóm đã tính toán
                foreach ($this->groupData as $range) {
                    if ($range['start'] < $range['end']) {
                        // Merge cột Tên Đề tài (Cột E = 5)
                        $sheet->mergeCells("E{$range['start']}:E{$range['end']}");
                        
                        // Merge cột GVHD (Cột F = 6)
                        $sheet->mergeCells("F{$range['start']}:F{$range['end']}");
                    }
                }

                // 2. Định dạng toàn bộ bảng
                $styleArray = [
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['argb' => '000000'],
                        ],
                    ],
                    'alignment' => [
                        'vertical' => Alignment::VERTICAL_CENTER,
                    ],
                    'font' => [
                        'name' => 'Times New Roman',
                        'size' => 12
                    ]
                ];

                // Áp dụng border cho toàn bộ vùng dữ liệu
                $sheet->getStyle("A1:I{$lastRow}")->applyFromArray($styleArray);

                // 3. Căn chỉnh từng cột cụ thể cho giống ảnh
                // Cột A (STT): Center
                $sheet->getStyle("A2:A{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                // Cột B (MSSV): Center
                $sheet->getStyle("B2:B{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                // Cột C (Họ lót): Left
                $sheet->getStyle("C2:C{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                // Cột D (Tên): Left
                $sheet->getStyle("D2:D{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                
                // Cột E (Tên Đề tài): Justify (hoặc Left) + Wrap Text
                $sheet->getStyle("E2:E{$lastRow}")->getAlignment()->setWrapText(true);
                $sheet->getStyle("E2:E{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                
                // Cột F (GVHD): Left + Wrap Text
                $sheet->getStyle("F2:F{$lastRow}")->getAlignment()->setWrapText(true);
                $sheet->getStyle("F2:F{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);

                // Cột G (Điểm): Center
                $sheet->getStyle("G2:G{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                // Cột H (Kết quả): Center
                $sheet->getStyle("H2:H{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                // 4. Set độ rộng cột (tương đối)
                $sheet->getColumnDimension('A')->setWidth(5);  // STT
                $sheet->getColumnDimension('B')->setWidth(15); // MSSV
                $sheet->getColumnDimension('C')->setWidth(20); // Họ
                $sheet->getColumnDimension('D')->setWidth(10); // Tên
                $sheet->getColumnDimension('E')->setWidth(50); // Tên đề tài (Rộng nhất)
                $sheet->getColumnDimension('F')->setWidth(25); // GVHD
                $sheet->getColumnDimension('G')->setWidth(8);  // Điểm
                $sheet->getColumnDimension('H')->setWidth(10); // KQ
                $sheet->getColumnDimension('I')->setWidth(15); // Ghi chú
            },
        ];
    }
}