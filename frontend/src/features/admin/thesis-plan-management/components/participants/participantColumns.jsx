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
    },
    {
        accessorKey: "sinhvien.nguoidung.HODEM_VA_TEN",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Sinh viên <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <button
                className="flex items-center gap-3 pl-2 text-left"
                onClick={() => onViewDetails(row.original)}
            >
                <Avatar className="h-9 w-9">
                    <AvatarFallback>{getInitials(row.original.sinhvien.nguoidung.HODEM_VA_TEN)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="max-w-[200px] truncate font-medium hover:underline">
                        {row.original.sinhvien.nguoidung.HODEM_VA_TEN}
                    </span>
                    <span className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {row.original.sinhvien.nguoidung.EMAIL}
                    </span>
                </div>
            </button>
        )
    },
    {
        accessorKey: "sinhvien.nguoidung.MA_DINHDANH",
        header: "MSSV",
        cell: ({ row }) => <div className="font-mono text-sm">{row.original.sinhvien.nguoidung.MA_DINHDANH}</div>
    },
    {
        accessorKey: "sinhvien.chuyennganh.TEN_CHUYENNGANH",
        header: "Chuyên ngành",
        cell: ({ row }) => row.original.sinhvien.chuyennganh?.TEN_CHUYENNGANH || 'N/A'
    },
    {
        accessorKey: "DU_DIEUKIEN",
        header: "Đủ điều kiện",
        cell: ({ row }) => {
            const isEligible = row.getValue("DU_DIEUKIEN");
            return (
                <Badge variant={isEligible ? "secondary" : "destructive"} className={isEligible ? "bg-green-100 text-green-800 border-0" : ""}>
                    {isEligible ? <ShieldCheck className="mr-1 h-3.5 w-3.5" /> : <ShieldOff className="mr-1 h-3.5 w-3.5" />}
                    {isEligible ? "Đủ" : "Không đủ"}
                </Badge>
            );
        },
        filterFn: (row, id, value) => {
            const rowValue = String(!!row.getValue(id)); // "true" hoặc "false"
            return value.includes(rowValue);
        },
    },
    {
        accessorKey: "NGAY_DANGKY",
        header: "Ngày ĐK/Thêm",
        cell: ({ row }) => (
            <span className="text-xs text-muted-foreground">
                {row.original.NGAY_DANGKY ? format(new Date(row.original.NGAY_DANGKY), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}
            </span>
        )
    },
    {
        id: "actions",
        cell: ({ row }) => <ParticipantRowActions row={row} onSuccess={onSuccess} />,
    },
    {
        id: "chuyen_nganh_id", // ID này sẽ được `DataTableToolbar` tìm kiếm
        accessorKey: "sinhvien.ID_CHUYENNGANH",
        enableHiding: false,
        filterFn: (row, id, value) => {
            return value.includes(String(row.getValue(id)))
        },
    },
];