import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowUpDown, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { SubmissionRowActions } from "./row-actions";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

const statusConfig = {
  'Chờ xác nhận': {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
    icon: Clock
  },
  'Đã xác nhận': {
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700',
    icon: CheckCircle
  },
  'Yêu cầu nộp lại': {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700',
    icon: AlertCircle
  },
};

export const getColumns = ({ onViewDetails, onSuccess }) => [
  {
    accessorKey: "phancong.detai.TEN_DETAI",
    header: "Tên Đề tài / Nhóm",
    cell: ({ row }) => (
      <div className="flex flex-col space-y-1 max-w-[300px]">
        <button
          className="font-medium text-left hover:underline text-blue-600 dark:text-blue-400 line-clamp-2 text-sm"
          onClick={() => onViewDetails(row.original)}
          title={row.original.phancong?.detai?.TEN_DETAI}
        >
          {row.original.phancong?.detai?.TEN_DETAI || 'N/A'}
        </button>
        <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-muted px-1.5 rounded truncate max-w-[120px]">
                {row.original.phancong?.nhom?.TEN_NHOM || 'N/A'}
            </span>
        </div>
      </div>
    )
  },
  {
    id: "gvhd",
    header: "GV Hướng dẫn",
    cell: ({ row }) => {
      const gvhdName = row.original.phancong?.gvhd?.nguoidung?.HODEM_VA_TEN;
      return (
        <div className="text-xs text-muted-foreground max-w-[150px] truncate" title={gvhdName}>
          {gvhdName || 'Chưa phân công'}
        </div>
      );
    }
  },
  {
    accessorKey: "NGAY_NOP",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="text-xs">
        Ngày nộp <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground pl-4 whitespace-nowrap block">
        {row.original.NGAY_NOP 
          ? format(new Date(row.original.NGAY_NOP), 'HH:mm dd/MM/yyyy', { locale: vi }) 
          : 'N/A'}
      </span>
    )
  },
  {
    accessorKey: "TRANGTHAI",
    header: "Trạng thái",
    cell: ({ row }) => {
      const status = row.original.TRANGTHAI;
      const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', icon: null };
      const Icon = config.icon;
      
      return (
        <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 whitespace-nowrap flex w-fit items-center gap-1", config.color)}>
          {Icon && <Icon className="h-3 w-3" />}
          {status}
        </Badge>
      );
    }
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end">
          <SubmissionRowActions
            row={row}
            onViewDetails={onViewDetails}
            onSuccess={onSuccess}
          />
      </div>
    ),
    size: 50
  },
];