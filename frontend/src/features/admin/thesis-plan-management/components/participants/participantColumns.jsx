import React from 'react';
import { Checkbox } from "@/components/ui/checkbox"; 
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ShieldCheck, ShieldOff } from "lucide-react";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ParticipantRowActions } from "./ParticipantRowActions";

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export const getParticipantColumns = ({ onSuccess, onViewDetails }) => [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
                className="translate-y-[2px]"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className="translate-y-[2px]"
            />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
    },
    {
        accessorKey: "sinhvien.nguoidung.HODEM_VA_TEN",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="-ml-3" // Căn lề trái header
            >
                Sinh viên <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            // [FIX] Căn giữa dọc
            <div className="flex items-center h-full w-full">
                <button
                    className="flex items-center gap-3 text-left w-full"
                    onClick={() => onViewDetails(row.original)}
                >
                    <Avatar className="h-9 w-9 border">
                        <AvatarFallback>{getInitials(row.original.sinhvien.nguoidung.HODEM_VA_TEN)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                        <span className="truncate font-medium hover:underline text-blue-600 dark:text-blue-400">
                            {row.original.sinhvien.nguoidung.HODEM_VA_TEN}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                            {row.original.sinhvien.nguoidung.EMAIL}
                        </span>
                    </div>
                </button>
            </div>
        ),
        minSize: 250,
    },
    {
        accessorKey: "sinhvien.nguoidung.MA_DINHDANH",
        header: "MSSV",
        cell: ({ row }) => (
            <div className="flex items-center h-full font-mono text-sm text-muted-foreground">
                {row.original.sinhvien.nguoidung.MA_DINHDANH}
            </div>
        ),
        size: 120,
    },
    {
        accessorKey: "sinhvien.chuyennganh.TEN_CHUYENNGANH",
        header: "Chuyên ngành",
        cell: ({ row }) => (
            <div className="flex items-center h-full text-sm">
                {row.original.sinhvien.chuyennganh?.TEN_CHUYENNGANH || 'N/A'}
            </div>
        ),
        minSize: 200,
    },
    {
        accessorKey: "DU_DIEUKIEN",
        header: "Đủ điều kiện",
        cell: ({ row }) => {
            const isEligible = row.getValue("DU_DIEUKIEN");
            return (
                <div className="flex items-center h-full">
                    <Badge 
                        variant={isEligible ? "outline" : "destructive"} 
                        className={isEligible 
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" 
                            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                        }
                    >
                        {isEligible ? <ShieldCheck className="mr-1 h-3 w-3" /> : <ShieldOff className="mr-1 h-3 w-3" />}
                        {isEligible ? "Đủ" : "Không đủ"}
                    </Badge>
                </div>
            );
        },
        filterFn: (row, id, value) => {
            const rowValue = String(!!row.getValue(id)); 
            return value.includes(rowValue);
        },
        size: 140,
    },
    {
        accessorKey: "NGAY_DANGKY",
        header: "Ngày ĐK/Thêm",
        cell: ({ row }) => (
            <div className="flex items-center h-full text-xs text-muted-foreground">
                {row.original.NGAY_DANGKY ? format(new Date(row.original.NGAY_DANGKY), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}
            </div>
        ),
        size: 150,
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="flex items-center justify-center h-full">
                <ParticipantRowActions row={row} onSuccess={onSuccess} />
            </div>
        ),
        size: 60,
    },
    {
        id: "chuyen_nganh_id", 
        accessorKey: "sinhvien.ID_CHUYENNGANH",
        enableHiding: false,
        filterFn: (row, id, value) => {
            return value.includes(String(row.getValue(id)))
        },
    },
];