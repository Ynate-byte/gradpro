import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Star, Users } from "lucide-react";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { GroupRowActions } from "./row-actions";
import { cn } from "@/lib/utils";

const statusConfig = {
    'Đang mở': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    'Đã đủ thành viên': 'bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400 border-gray-200 dark:border-gray-700/60',
    'Đang thực hiện': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700',
    'Đã hoàn thành': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-700',
    'Không đạt': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700',
};

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
                className="font-medium text-left hover:underline pl-2 group-data-[state=full]:text-muted-foreground text-blue-600 dark:text-blue-400"
                onClick={() => onViewDetails(row.original)}
            >
                {row.original.TEN_NHOM}
            </button>
        )
    },

    {
        accessorKey: "nhomtruong.HODEM_VA_TEN",
        header: "Nhóm trưởng",
        cell: ({ row }) => (
            <span className="group-data-[state=full]:text-muted-foreground">
                {row.original.nhomtruong?.HODEM_VA_TEN ?? 'N/A'}
            </span>
        ),
    },

    {
        accessorKey: "SO_THANHVIEN_HIENTAI",
        header: () => <div className="text-center">Thành viên</div>,
        cell: ({ row }) => (
            <div className="flex items-center justify-center gap-2 group-data-[state=full]:text-muted-foreground">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{row.original.SO_THANHVIEN_HIENTAI} / {row.original.SO_THANHVIEN_TOIDA || 4}</span>
            </div>
        )
    },

    {
        id: "trang_thai_combined",
        header: "Trạng thái",
        cell: ({ row }) => {
            const group = row.original;
            const submissionStatus = group.phancong_detai_nhom?.TRANGTHAI;
            let displayStatus = submissionStatus;

            if (!displayStatus) {
                displayStatus = group.TRANGTHAI;
            }

            const statusStyle = statusConfig[displayStatus] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';

            return (
                <div className="flex items-center gap-2 flex-wrap">
                    {(group.LA_NHOM_DACBIET === true || group.LA_NHOM_DACBIET === 1) && (
                        <Badge variant="destructive"
                            className="gap-1.5 pl-1.5 pr-2 py-0.5 text-xs">
                            <Star className="h-3 w-3" /> Đặc biệt
                        </Badge>
                    )}

                    {displayStatus && (
                        <Badge variant="outline" className={cn("text-xs py-0.5", statusStyle)}>
                            {displayStatus}
                        </Badge>
                    )}
                </div>
            );
        },
        enableSorting: false,
    },

    {
        accessorKey: "NGAYTAO",
        header: "Ngày tạo",
        cell: ({ row }) => (
            <span className="text-xs group-data-[state=full]:text-muted-foreground">
                {format(new Date(row.original.NGAYTAO), 'dd/MM/yyyy', { locale: vi })}
            </span>
        )
    },

    {
        id: "actions",
        cell: ({ row }) => <GroupRowActions row={row} onEdit={onEdit} onAddStudent={onAddStudent} onSuccess={onSuccess} />,
    },

    {
        accessorKey: "TRANGTHAI",
        header: "Trạng thái (Filter)",
        enableHiding: true,
    },
    {
        accessorKey: "LA_NHOM_DACBIET",
        header: "Loại (Filter)",
        enableHiding: true,
    },
];
