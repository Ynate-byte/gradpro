import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Star, Users } from "lucide-react";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { GroupRowActions } from "./row-actions";
import { cn } from "@/lib/utils"; // Import cn utility

// Status config for styling badges
const statusConfig = {
    'Đang mở': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    'Đã đủ thành viên': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    // Add other potential statuses here if needed
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
                className="font-medium text-left hover:underline pl-2 group-data-[state=full]:text-muted-foreground" // Dim text if group is full
                onClick={() => onViewDetails(row.original)}
            >
                {row.original.TEN_NHOM}
            </button>
        )
    },
    {
        accessorKey: "nhomtruong.HODEM_VA_TEN",
        header: "Nhóm trưởng",
        cell: ({ row }) => ( // Dim text if group is full
            <span className="group-data-[state=full]:text-muted-foreground">
                {row.original.nhomtruong?.HODEM_VA_TEN ?? 'N/A'}
            </span>
        ),
    },
    {
        accessorKey: "SO_THANHVIEN_HIENTAI",
        header: () => <div className="text-center">Thành viên</div>, // Center header
        cell: ({ row }) => (
            <div className="flex items-center justify-center gap-2 group-data-[state=full]:text-muted-foreground"> {/* Center content & Dim text */}
                <Users className="h-4 w-4 text-muted-foreground"/>
                <span>{row.original.SO_THANHVIEN_HIENTAI} / 4</span>
            </div>
        )
    },
    {
        // *** RE-CORRECTED STATUS COLUMN ***
        id: "trang_thai_combined", // Use a unique ID
        header: "Trạng thái",
        cell: ({ row }) => { // Directly access row.original data
            const group = row.original;
            // Determine style for the activity status badge
            const statusStyle = statusConfig[group.TRANGTHAI] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';

            return (
                <div className="flex items-center gap-2">
                    {/* Explicitly check if LA_NHOM_DACBIET is true (or 1) */}
                    {group.LA_NHOM_DACBIET === true || group.LA_NHOM_DACBIET === 1 ? (
                        <Badge variant="destructive" // Ensure this uses destructive variant
                               className="gap-1.5 pl-1.5 pr-2 py-0.5 text-xs">
                            <Star className="h-3 w-3" /> Đặc biệt
                        </Badge>
                    ) : null} {/* Render nothing if not special */}

                    {/* Render the activity status badge if TRANGTHAI exists */}
                    {group.TRANGTHAI && (
                        <Badge variant="outline" className={cn("border-0 text-xs py-0.5", statusStyle)}>
                             {group.TRANGTHAI}
                        </Badge>
                    )}
                </div>
            );
        },
        enableSorting: false,
        // *** END RE-CORRECTION ***
    },
    {
        accessorKey: "NGAYTAO",
        header: "Ngày tạo",
        cell: ({ row }) => ( // Dim text if group is full
            <span className="text-xs group-data-[state=full]:text-muted-foreground">
                 {format(new Date(row.original.NGAYTAO), 'dd/MM/yyyy', { locale: vi })}
            </span>
        )
    },
    {
        id: "actions",
        cell: ({ row }) => <GroupRowActions row={row} onEdit={onEdit} onAddStudent={onAddStudent} onSuccess={onSuccess} />,
    },
];