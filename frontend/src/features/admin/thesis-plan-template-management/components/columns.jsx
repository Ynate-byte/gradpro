import React from 'react'
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"
import { TemplateRowActions } from "./row-actions"
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

// Định nghĩa các cột cho bảng bản mẫu
export const getColumns = ({ onEdit, onSuccess }) => [
  {
    accessorKey: "TEN_MAU",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Tên Bản mẫu <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <button
        className="font-medium text-left hover:underline pl-2"
        onClick={() => onEdit(row.original)}
      >
        {row.original.TEN_MAU}
      </button>
    )
  },
  {
    accessorKey: "HEDAOTAO_MACDINH",
    header: "Hệ ĐT Mặc định"
  },
  {
    accessorKey: "SO_TUAN_MACDINH",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="justify-center w-full"
      >
        Số Tuần <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center">{row.original.SO_TUAN_MACDINH}</div>
    )
  },
  {
    accessorKey: "NGAYTAO",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Ngày tạo <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="pl-2 text-xs text-muted-foreground">
        {format(new Date(row.original.NGAYTAO), 'dd/MM/yyyy HH:mm', { locale: vi })}
      </span>
    )
  },
  {
    id: "actions",
    header: () => <div className="text-right">Hành động</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <TemplateRowActions row={row} onEdit={onEdit} onSuccess={onSuccess} />
      </div>
    ),
    enableSorting: false,
    enableHiding: false
  }
]