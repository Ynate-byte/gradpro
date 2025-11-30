import React from 'react'
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"
import { TemplateRowActions } from "./row-actions"
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Badge } from "@/components/ui/badge";

export const getColumns = ({ onEdit, onSuccess }) => [
  {
    accessorKey: "TEN_MAU",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-3" // Căn lề trái header
      >
        Tên Bản mẫu <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center h-full">
          <button
            className="font-medium text-left hover:underline text-blue-600 dark:text-blue-400 truncate max-w-[300px]"
            onClick={() => onEdit(row.original)}
          >
            {row.original.TEN_MAU}
          </button>
      </div>
    )
  },
  {
    accessorKey: "HEDAOTAO_MACDINH",
    header: "Hệ ĐT Mặc định",
    cell: ({ row }) => (
        <div className="flex items-center h-full">
             <Badge variant="secondary" className="font-normal">
                {row.original.HEDAOTAO_MACDINH}
             </Badge>
        </div>
    )
  },
  {
    accessorKey: "SO_TUAN_MACDINH",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="w-full justify-center"
      >
        Số Tuần <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center h-full font-mono text-sm">
          {row.original.SO_TUAN_MACDINH}
      </div>
    )
  },
  {
    accessorKey: "NGAYTAO",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-3"
      >
        Ngày tạo <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center h-full text-xs text-muted-foreground">
        {format(new Date(row.original.NGAYTAO), 'dd/MM/yyyy HH:mm', { locale: vi })}
      </div>
    )
  },
  {
    id: "actions",
    header: () => <div className="text-center">Hành động</div>,
    cell: ({ row }) => (
      <div className="flex items-center justify-center h-full">
        <TemplateRowActions row={row} onEdit={onEdit} onSuccess={onSuccess} />
      </div>
    ),
    enableSorting: false,
    enableHiding: false
  }
]