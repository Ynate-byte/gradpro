import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Star, Users } from "lucide-react";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { GroupRowActions } from "./row-actions";

export const getColumns = ({ onEdit, onAddStudent, onSuccess, onViewDetails }) => [
    {
        accessorKey: "TEN_NHOM",
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Tên Nhóm <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <button 
                className="font-medium text-left hover:underline pl-2"
                onClick={() => onViewDetails(row.original)}
            >
                {row.original.TEN_NHOM}
            </button>
        )
    },
    {
        accessorKey: "nhomtruong.HODEM_VA_TEN",
        header: "Nhóm trưởng",
    },
    {
        accessorKey: "SO_THANHVIEN_HIENTAI",
        header: "Thành viên",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground"/>
                <span>{row.original.SO_THANHVIEN_HIENTAI} / 4</span>
            </div>
        )
    },
    {
        accessorKey: "LA_NHOM_DACBIET",
        header: "Trạng thái",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                {row.original.LA_NHOM_DACBIET && (
                    <Badge variant="destructive" className="gap-1.5 pl-2">
                        <Star className="h-3 w-3" /> Đặc biệt
                    </Badge>
                )}
                {row.original.TRANGTHAI === 'Đã đủ thành viên' && (
                    <Badge variant="secondary">{row.original.TRANGTHAI}</Badge>
                )}
                 {row.original.TRANGTHAI === 'Đang mở' && (
                    <Badge variant="outline">{row.original.TRANGTHAI}</Badge>
                )}
            </div>
        ),
        filterFn: (row, id, value) => {
             return value.includes(String(row.getValue(id) ? 1 : 0));
        },
    },
    {
        accessorKey: "NGAYTAO",
        header: "Ngày tạo",
        cell: ({ row }) => format(new Date(row.original.NGAYTAO), 'dd/MM/yyyy', { locale: vi })
    },
    {
        id: "actions",
        cell: ({ row }) => <GroupRowActions row={row} onEdit={onEdit} onAddStudent={onAddStudent} onSuccess={onSuccess} />,
    },
];