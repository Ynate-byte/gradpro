<?php

namespace App\Exports;

use App\Models\Nhom;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class GroupsExport implements FromCollection, WithHeadings, WithMapping
{
    protected $planId;

    public function __construct(int $planId)
    {
        $this->planId = $planId;
    }

    public function collection()
    {
        // Tải trước các relationship và lọc theo ID_KEHOACH
        return Nhom::where('ID_KEHOACH', $this->planId)
                    ->with('nhomtruong', 'thanhviens.nguoidung')
                    ->get();
    }

    public function headings(): array
    {
        return [
            'ID Nhóm',
            'Tên Nhóm',
            'Nhóm Trưởng',
            'Số Thành Viên',
            'Tên Thành Viên',
            'Mã Định Danh Thành Viên',
            'Email Thành Viên',
        ];
    }

    public function map($nhom): array
    {
        $rows = [];

        if ($nhom->thanhviens->isEmpty()) {
            // Xử lý trường hợp nhóm không có thành viên
            return [[
                $nhom->ID_NHOM,
                $nhom->TEN_NHOM,
                $nhom->nhomtruong?->HODEM_VA_TEN ?? 'N/A', // Sử dụng null-safe operator
                $nhom->SO_THANHVIEN_HIENTAI,
                '(Nhóm trống)', '', '',
            ]];
        }

        foreach ($nhom->thanhviens as $index => $thanhvien) {
            // Sử dụng null-safe operator (?->) và null coalescing operator (??) để an toàn
            $memberName = $thanhvien->nguoidung?->HODEM_VA_TEN ?? 'Không xác định';
            $memberCode = $thanhvien->nguoidung?->MA_DINHDANH ?? 'N/A';
            $memberEmail = $thanhvien->nguoidung?->EMAIL ?? 'N/A';

            if ($index === 0) {
                // Dòng đầu tiên chứa thông tin nhóm
                $rows[] = [
                    $nhom->ID_NHOM,
                    $nhom->TEN_NHOM,
                    $nhom->nhomtruong?->HODEM_VA_TEN ?? 'N/A',
                    $nhom->SO_THANHVIEN_HIENTAI,
                    $memberName,
                    $memberCode,
                    $memberEmail,
                ];
            } else {
                // Các dòng tiếp theo chỉ chứa thông tin thành viên
                $rows[] = [
                    '', '', '', '', // Bỏ trống
                    $memberName,
                    $memberCode,
                    $memberEmail,
                ];
            }
        }
        return $rows;
    }
}
