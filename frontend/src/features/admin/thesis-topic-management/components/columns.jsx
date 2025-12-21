import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTableRowActions } from "./row-actions";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const getStatusBadge = (status) => {
    const statusConfig = {
        "Nháp": { label: "Nháp", className: "bg-gray-100 text-gray-700" },
        "Chờ duyệt": { label: "Chờ duyệt", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700" },
        "Đang chỉnh sửa": { label: "Đang chỉnh sửa", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700" },
        "Yêu cầu chỉnh sửa": { label: "Yêu cầu chỉnh sửa", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700" },
        "Đã duyệt": { label: "Đã duyệt", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700" },
        "Đã đầy": { label: "Đã đầy", className: "bg-gray-200 text-gray-800" },
        "Đã khóa": { label: "Đã khóa", className: "bg-red-200 text-red-800" },
        "Từ chối": { label: "Từ chối", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700" },
    };
    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" };
    return <Badge variant="outline" className={`px-2 py-0.5 text-xs ${config.className}`}>{config.label}</Badge>;
};

const SortIndicator = ({ column }) => {
    const sorted = column.getIsSorted();
    if (!sorted) {
        return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sorted === "desc" ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUp className="ml-2 h-4 w-4" />;
};

export const getColumns = ({ onViewDetails, onApprove, onReject, onRequestEdit, onDelete }) => [
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
        accessorKey: "TEN_DETAI",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Tên đề tài
                <SortIndicator column={column} />
            </Button>
        ),
        cell: ({ row }) => (
            <button
                onClick={() => onViewDetails(row.original.ID_DETAI)}
                className="max-w-[600px] truncate font-medium text-left hover:underline text-primary dark:text-blue-400 block"
                title={row.original.TEN_DETAI}
            >
                {row.original.TEN_DETAI}
            </button>
        ),
        size: 500,
    },
    {
        accessorKey: "ten_giang_vien",
        header: "GV Đề xuất",
        cell: ({ row }) => (
            <div className="text-sm text-muted-foreground max-w-[200px] truncate" title={row.original.ten_giang_vien}>
                {row.original.ten_giang_vien}
            </div>
        ),
        size: 150,
    },
    {
        accessorKey: "TRANGTHAI",
        header: "Trạng thái",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                {getStatusBadge(row.original.TRANGTHAI)}
                {row.original.LA_TAISUDUNG == 1 && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="shrink-0 cursor-help">
                                    <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p>Đề tài tái sử dụng</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        ),
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
        size: 140,
    },
    {
        accessorKey: "ten_bo_mon", 
        header: "Bộ môn",
        cell: ({ row }) => (
            <div className="text-xs text-muted-foreground max-w-[150px] truncate" title={row.original.ten_bo_mon}>
                {row.original.ten_bo_mon || 'N/A'}
            </div>
        ),
        size: 150,
    },
    { 
        id: "department_id",
        accessorFn: row => String(row.original?.ID_KHOA_BOMON || ''), 
        enableHiding: true, 
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <DataTableRowActions
                row={row}
                onViewDetails={onViewDetails}
                onApprove={onApprove}
                onReject={onReject}
                onRequestEdit={onRequestEdit}
                onDelete={onDelete}
            />
        ),
        size: 80,
    },
];