"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTableRowActions } from "./row-actions"
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, ShieldCheck, Briefcase, GraduationCap } from "lucide-react";
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

const roleConfig = {
    'Admin': { icon: ShieldCheck, color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
    'Giảng viên': { icon: Briefcase, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
    'Sinh viên': { icon: GraduationCap, color: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
};

const SortIndicator = ({ column }) => {
    const sorted = column.getIsSorted();
    if (!sorted) {
        return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sorted === "desc" ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUp className="ml-2 h-4 w-4" />;
};


export const getColumns = ({ onEdit, onSuccess, onViewDetails }) => [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")} onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)} aria-label="Select all" className="translate-y-[2px]" />
        ),
        cell: ({ row }) => (
            <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" className="translate-y-[2px]" />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "HODEM_VA_TEN",
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Người dùng 
                <SortIndicator column={column} />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="flex items-center gap-3 pl-2">
                <Avatar className="h-9 w-9">
                    <AvatarFallback>{getInitials(row.original.HODEM_VA_TEN)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <button
                        onClick={() => onViewDetails(row.original)}
                        className="max-w-[200px] truncate font-medium text-left hover:underline"
                    >
                        {row.original.HODEM_VA_TEN}
                    </button>
                    <span className="text-sm text-muted-foreground max-w-[200px] truncate">{row.original.EMAIL}</span>
                </div>
            </div>
        )
    },
    {
        accessorKey: "MA_DINHDANH",
        header: "Mã định danh",
        cell: ({ row }) => <div className="font-mono text-sm">{row.original.MA_DINHDANH}</div>
    },
    {
        id: "vai_tro",
        accessorKey: "vaitro.TEN_VAITRO",
        header: "Vai trò",
        cell: ({ row }) => {
            const roleName = row.original.vaitro.TEN_VAITRO;
            const config = roleConfig[roleName] || {};
            const Icon = config.icon || null;
            return (
                <Badge variant="outline" className={`border-0 ${config.color}`}>
                    {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
                    {roleName}
                </Badge>
            );
        },
    },
    {
        id: "unit_major",
        header: "Đơn vị / Chuyên ngành",
        cell: ({ row }) => {
            const user = row.original;
            if (user.vaitro.TEN_VAITRO === 'Sinh viên') {
                return <div className="text-xs">{user.sinhvien?.chuyennganh?.TEN_CHUYENNGANH || 'N/A'}</div>;
            }
            if (user.vaitro.TEN_VAITRO === 'Giảng viên') {
                return <div className="text-xs">{user.giangvien?.khoabomon?.TEN_KHOA_BOMON || 'N/A'}</div>;
            }
            return <div className="text-xs text-muted-foreground">N/A</div>;
        }
    },
    { id: "chuyen_nganh", accessorFn: row => String(row.original?.sinhvien?.ID_CHUYENNGANH) },
    { id: "khoa_bomon", accessorFn: row => String(row.original?.giangvien?.ID_KHOA_BOMON) },
    {
        id: "trang_thai",
        accessorKey: "TRANGTHAI_KICHHOAT",
        header: "Trạng thái",
        cell: ({ row }) => {
            const isActive = row.getValue("trang_thai");
            return (
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-muted-foreground text-xs">{isActive ? "Hoạt động" : "Vô hiệu"}</span>
                </div>
            );
        },
    },
    {
        accessorKey: "NGAYTAO",
        header: "Ngày tham gia",
        cell: ({ row }) => {
             if (!row.original.NGAYTAO) return null;
             const date = new Date(row.original.NGAYTAO);
             return (
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger>
                            <div className="text-xs text-muted-foreground cursor-help">
                                {formatDistanceToNow(date, { addSuffix: true, locale: vi })}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{format(date, 'dd/MM/yyyy HH:mm:ss')}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
             )
        }
    },
    {
        id: "actions",
        cell: ({ row }) => <DataTableRowActions row={row} onEdit={onEdit} onSuccess={onSuccess} />,
    },
]