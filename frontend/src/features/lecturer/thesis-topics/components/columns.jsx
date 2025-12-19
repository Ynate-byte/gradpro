import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, Send, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTableRowActions } from "./row-actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { size } from 'zod';

// === Badge trạng thái ===
const getStatusBadge = (status) => {
    const statusConfig = {
        'Nháp': { label: "Nháp", className: "bg-gray-100 text-gray-700 border-gray-200" },
        'Chờ duyệt': { label: "Chờ duyệt", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700" },
        'Đang chỉnh sửa': { label: "Đang chỉnh sửa", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700" },
        'Yêu cầu chỉnh sửa': { label: "Yêu cầu chỉnh sửa", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700" },
        'Đã duyệt': { label: "Đã duyệt", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700" },
        'Đã đầy': { label: "Đã đầy", className: "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300" },
        'Đã khóa': { label: "Đã khóa", className: "bg-red-200 text-red-800 border-red-300" },
        'Từ chối': { label: "Từ chối", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" };
    return (
        <Badge variant="outline" className={cn("px-2 py-0.5 text-xs font-medium", config.className)}>
            {config.label}
        </Badge>
    );
};

const SortIndicator = ({ column }) => {
    const sorted = column.getIsSorted();
    if (!sorted) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground opacity-50" />;
    return sorted === "desc" ? (
        <ArrowDown className="ml-2 h-4 w-4 text-primary" />
    ) : (
        <ArrowUp className="ml-2 h-4 w-4 text-primary" />
    );
};

export const getColumns = ({
    currentUserId,
    onEdit,
    onDelete,
    onSubmit,
    onViewDetails,
    onAddSuggestion,
    onViewRegisteredGroups,
    isReviewTab = false,
    canSubmitApproval = false,
}) => [
    {
        accessorKey: "TEN_DETAI",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="h-8 px-0 font-medium hover:bg-transparent"
            >
                Tên đề tài
                <SortIndicator column={column} />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="flex flex-col">
                <button
                    onClick={() => onViewDetails(row.original.ID_DETAI)}
                    className="max-w-[500px] xl:max-w-sm truncate font-medium text-left text-primary hover:underline dark:text-blue-400 focus:outline-none"
                    title={row.original.TEN_DETAI}
                >
                    {row.original.TEN_DETAI}
                </button>
                <span className="text-[10px] text-muted-foreground">{row.original.MA_DETAI}</span>
            </div>
        ),
        size: 500,
    },
    {
        accessorKey: "ten_giang_vien",
        header: "GV Đề xuất",
        cell: ({ row }) => {
            const isOwner = String(row.original.ID_NGUOI_DEXUAT) === String(currentUserId);
            return (
                <div
                    className={cn(
                        "text-sm max-w-[150px] truncate",
                        isOwner
                            ? "font-semibold text-indigo-600 dark:text-indigo-400"
                            : "text-muted-foreground"
                    )}
                    title={isOwner ? "Bạn là người đề xuất" : row.original.ten_giang_vien}
                >
                    {isOwner ? "Của tôi" : row.original.ten_giang_vien}
                </div>
            );
        },
    },
    {
        accessorKey: "TRANGTHAI",
        header: "Trạng thái",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                {getStatusBadge(row.original.TRANGTHAI)}
                {/* [MỚI] Icon Tái sử dụng hiển thị cạnh trạng thái */}
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
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    
    {
        accessorKey: "ten_bo_mon",
        header: "Bộ môn",
        cell: ({ row }) => (
            <div className="text-xs text-muted-foreground max-w-[150px] truncate" title={row.original.ten_bo_mon}>
                {row.original.ten_bo_mon || "N/A"}
            </div>
        ),
    },
    {
        id: "department_id",
        accessorFn: (row) => String(row.original?.ID_KHOA_BOMON || ""),
        enableHiding: true,
    },

    {
        accessorKey: "SO_NHOM_HIENTAI",
        header: () => <div className="text-center">Đã ĐK</div>,
        cell: ({ row }) => {
            const current = row.original.SO_NHOM_HIENTAI || 0;
            const max = row.original.SO_NHOM_TOIDA || 0;
            const isFull = current >= max;
            return (
                <div className="text-center font-medium">
                    <span className={cn(isFull ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                        {current}
                    </span>
                    <span className="text-muted-foreground text-xs"> / {max}</span>
                </div>
            );
        },
    },
    
    ...(isReviewTab ? [{
        id: "contribution_status",
        header: "Trạng thái góp ý",
        cell: ({ row }) => {
            const topic = row.original;
            const assignments = topic.phancong_nguoi_gop_y || [];
            const myAssignment = assignments.find(a => 
                String(a.ID_GIANGVIEN) === String(currentUserId)
            );
            const isCompleted = myAssignment?.TRANGTHAI === 'Hoàn thành';

            return (
                <Badge
                    variant="outline"
                    className={cn(
                        "px-2 py-0.5 text-xs",
                        isCompleted
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700"
                    )}
                >
                    {isCompleted ? "Đã góp ý" : "Chưa góp ý"}
                </Badge>
            );
        },
    }] : []),

    {
        id: "actions",
        cell: ({ row }) => {
            const topic = row.original;
            const isOwner = String(topic.ID_NGUOI_DEXUAT) === String(currentUserId);
            const showSubmit = ['Nháp', 'Yêu cầu chỉnh sửa', 'Đang chỉnh sửa'].includes(topic.TRANGTHAI) && isOwner;

            return (
                <div className="flex items-center gap-1 justify-end">
                    {showSubmit && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span tabIndex={-1} className="inline-block">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className={cn(
                                                "h-8 w-8",
                                                !canSubmitApproval 
                                                    ? "opacity-50 cursor-not-allowed text-muted-foreground" 
                                                    : "text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (canSubmitApproval) onSubmit(topic.ID_DETAI);
                                            }}
                                            disabled={!canSubmitApproval}
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{canSubmitApproval ? "Gửi duyệt đề tài ngay" : "Hết thời gian gửi duyệt"}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    <DataTableRowActions
                        row={row}
                        currentUserId={currentUserId}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onSubmit={onSubmit}
                        onViewDetails={onViewDetails}
                        onAddSuggestion={onAddSuggestion}
                        onViewRegisteredGroups={onViewRegisteredGroups}
                        canSubmitApproval={canSubmitApproval}
                    />
                </div>
            );
        },
    },
];