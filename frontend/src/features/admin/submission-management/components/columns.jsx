import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { SubmissionRowActions } from "./row-actions";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

const statusConfig = {
  'Chờ xác nhận': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
  'Đã xác nhận': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700',
  'Yêu cầu nộp lại': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700',
};

export const getColumns = ({ onViewDetails, onSuccess }) => [
  {
    accessorKey: "phancong.detai.TEN_DETAI",
    header: "Tên Đề tài",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <button
          className="font-medium text-left hover:underline text-blue-600 dark:text-blue-400 line-clamp-1"
          onClick={() => onViewDetails(row.original)}
          title={row.original.phancong?.detai?.TEN_DETAI}
        >
          {row.original.phancong?.detai?.TEN_DETAI || 'N/A'}
        </button>
        {/* Hiển thị tên nhóm nhỏ ở dưới để dễ nhận biết */}
        <span className="text-xs text-muted-foreground">
          Nhóm: {row.original.phancong?.nhom?.TEN_NHOM || 'N/A'}
        </span>
      </div>
    )
  },
  {
    id: "gvhd",
    header: "GV Hướng dẫn",
    cell: ({ row }) => {
      const gvhdName = row.original.phancong?.gvhd?.nguoidung?.HODEM_VA_TEN;
      return (
        <span className="text-sm font-medium">
          {gvhdName || 'Chưa phân công'}
        </span>
      );
    }
  },
  {
    accessorKey: "NGAY_NOP",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Ngày nộp <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground pl-4">
        {row.original.NGAY_NOP 
          ? format(new Date(row.original.NGAY_NOP), 'dd/MM/yyyy HH:mm', { locale: vi }) 
          : 'N/A'}
      </span>
    )
  },
  {
    accessorKey: "TRANGTHAI",
    header: "Trạng thái",
    cell: ({ row }) => {
      const status = row.original.TRANGTHAI;
      const statusStyle = statusConfig[status] || 'bg-gray-100 text-gray-800';
      return (
        <Badge variant="outline" className={cn("text-xs py-0.5 whitespace-nowrap", statusStyle)}>
          {status}
        </Badge>
      );
    }
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <SubmissionRowActions
        row={row}
        onViewDetails={onViewDetails}
        onSuccess={onSuccess}
      />
    ),
  },
];