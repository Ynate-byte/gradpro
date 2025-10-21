import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PlanRowActions } from "./row-actions";
import { cn } from "@/lib/utils"; // Import cn

// Định nghĩa màu sắc cho từng trạng thái
const statusConfig = {
    'Bản nháp': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    'Chờ phê duyệt': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    'Yêu cầu chỉnh sửa': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    'Đã phê duyệt': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    'Đang thực hiện': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    'Đã hoàn thành': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    'Đã hủy': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};


export const getColumns = ({ onEdit, onSuccess, onViewDetails }) => [
    {
        accessorKey: "TEN_DOT",
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Tên Kế hoạch <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            // Cho phép nhấn vào tên để xem chi tiết
            <button
                className="font-medium text-left hover:underline pl-2"
                onClick={() => onViewDetails(row.original.ID_KEHOACH)}
            >
                {row.original.TEN_DOT}
            </button>
        )
    },
    {
        accessorKey: "NAMHOC",
        header: "Năm học",
    },
    {
        accessorKey: "HOCKY",
        header: "Học kỳ",
    },
    {
        accessorKey: "TRANGTHAI",
        header: "Trạng thái",
        cell: ({ row }) => {
            const status = row.original.TRANGTHAI;
            // Lấy màu sắc tương ứng hoặc màu mặc định
            const config = statusConfig[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
            return (
                <Badge variant="outline" className={cn("border-0 text-xs", config)}>
                    {status}
                </Badge>
            );
        }
    },
    {
        accessorKey: "NGAYTAO",
        header: ({ column }) => ( // Thêm sorting cho ngày tạo
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Ngày tạo <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
             <span className="pl-2 text-xs text-muted-foreground">
                {format(new Date(row.original.NGAYTAO), 'dd/MM/yyyy HH:mm', { locale: vi })}
             </span>
        )
    },
    {
        id: "actions",
        header: () => <div className="text-right">Hành động</div>, // Căn lề phải header
        cell: ({ row }) => (
             <div className="text-right"> {/* Căn lề phải cell */}
                <PlanRowActions row={row} onEdit={onEdit} onSuccess={onSuccess} />
             </div>
        )
    },
];