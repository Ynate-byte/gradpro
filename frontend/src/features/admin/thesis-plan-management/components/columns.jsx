import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { PlanRowActions } from "./row-actions";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils'; 

/**
 * Cấu hình màu sắc cho các trạng thái của kế hoạch.
 */
const statusConfig = {
    'Bản nháp': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    'Chờ phê duyệt': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    'Chờ duyệt chỉnh sửa': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300', 
    'Yêu cầu chỉnh sửa': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    'Đã phê duyệt': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    'Đang thực hiện': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    'Đang chấm điểm': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300', 
    'Đã hoàn thành': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    'Đã hủy': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
};


/**
 * Hàm trả về cấu hình các cột cho bảng dữ liệu kế hoạch.
 */
export const getColumns = ({ onViewDetails, onSuccess }) => [
    {
        accessorKey: "TEN_DOT",
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Tên Kế hoạch <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <button
                className="font-medium text-left hover:underline pl-2"
                onClick={() => onViewDetails(row.original.ID_KEHOACH)}
            >
                {row.original.TEN_DOT}
            </button>
        )
    },
    {
        accessorKey: "KHOAHOC",
        header: "Khóa học",
        filterFn: (row, id, value) => { 
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: "NAMHOC",
        header: "Năm học",
        cell: ({ row }) => `${row.original.NAMHOC}`,
        filterFn: (row, id, value) => { 
            return value.includes(row.getValue(id))
        },
    },
        {
        accessorKey: "HEDAOTAO",
        header: "Hệ đào tạo",
        filterFn: (row, id, value) => { // Thêm filterFn
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: "NGAY_BATDAU",
        header: "Thời gian",
        cell: ({ row }) => (
            <div className="text-xs">
                {format(new Date(row.original.NGAY_BATDAU), 'dd/MM/yyyy', { locale: vi })} - {format(new Date(row.original.NGAY_KETHUC), 'dd/MM/yyyy', { locale: vi })}
            </div>
        )
    },
    {
        accessorKey: "TRANGTHAI",
        header: "Trạng thái",
        cell: ({ row }) => {
            const status = row.original.TRANGTHAI;
            const config = statusConfig[status] || 'bg-gray-100 text-gray-800';
            return (
                <Badge variant="outline" className={cn('border-0 text-xs', config)}>
                    {status}
                </Badge>
            );
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        id: "actions",
        cell: ({ row }) => <PlanRowActions row={row} onSuccess={onSuccess} />,
    },

    // Cột ẩn để lọc
    {
        accessorKey: "HOCKY",
        enableHiding: false, 
        filterFn: (row, id, value) => { 
            return value.includes(row.getValue(id))
        },
    },
];