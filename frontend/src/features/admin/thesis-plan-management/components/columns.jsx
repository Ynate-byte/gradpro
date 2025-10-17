import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PlanRowActions } from "./row-actions";

const statusConfig = {
    'Bản nháp': 'bg-gray-100 text-gray-800',
    'Chờ phê duyệt': 'bg-yellow-100 text-yellow-800',
    'Yêu cầu chỉnh sửa': 'bg-orange-100 text-orange-800',
    'Đã phê duyệt': 'bg-sky-100 text-sky-800',
    'Đang thực hiện': 'bg-blue-100 text-blue-800',
    'Đã hoàn thành': 'bg-green-100 text-green-800',
    'Đã hủy': 'bg-red-100 text-red-800',
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
            const config = statusConfig[status] || 'bg-gray-100 text-gray-800';
            return (
                <Badge variant="outline" className={`border-0 ${config}`}>{status}</Badge>
            );
        }
    },
    {
        accessorKey: "NGAYTAO",
        header: "Ngày tạo",
        cell: ({ row }) => format(new Date(row.original.NGAYTAO), 'dd/MM/yyyy', { locale: vi })
    },
    {
        id: "actions",
        cell: ({ row }) => <PlanRowActions row={row} onEdit={onEdit} onSuccess={onSuccess} />,
    },
];