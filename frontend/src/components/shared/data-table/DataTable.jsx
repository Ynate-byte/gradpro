"use client"

import * as React from "react"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataTablePagination } from "./DataTablePagination"
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableToolbar } from "./DataTableToolbar"
import { cn } from "@/lib/utils";

export function DataTable({
  columns,
  data,
  pageCount,
  loading,
  pagination,
  setPagination,
  columnFilters,
  setColumnFilters,
  sorting,
  setSorting,
  onAddUser,
  onImportUser,
  onSuccess,
  searchColumnId,
  searchPlaceholder,
  statusColumnId,
  statusOptions,
  typeFilterColumnId,
  typeFilterOptions,
  addBtnText,
  searchTerm,
  onSearchChange,
  columnVisibility,
  khoahocFilterOptions,
  namhocFilterOptions,
  hockyFilterOptions,
  hedaotaoFilterOptions,
  chuyenNganhFilterColumnId,
  chuyenNganhFilterOptions,
  khoaBomonFilterColumnId,
  khoaBomonFilterOptions,
  khoaBomonFilterTitle,
  state,
  onRowSelectionChange,
  getRowProps = () => ({}),
  containerClassName,
  
  flexLayout = false, 
  className,
  bulkActions,
  
  chucVuFilterColumnId,
  chucVuFilterOptions,
}) {
  const table = useReactTable({
    data: data ?? [],
    columns,
    pageCount: pageCount ?? 0,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility: columnVisibility || {},
      rowSelection: state?.rowSelection || {},
    },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    enableRowSelection: true,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onRowSelectionChange: onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
  })

  const pageSize = table.getState().pagination.pageSize;

  return (
    <div className={cn(
      "flex flex-col gap-4 w-full", // Sử dụng flex column để layout chặt chẽ hơn
      flexLayout && "h-full", 
      className
    )}>

      {/* Toolbar nằm trên cùng, không co giãn */}
      <div className="shrink-0">
        <DataTableToolbar
          table={table}
          onAddUser={onAddUser}
          onImportUser={onImportUser}
          onSuccess={onSuccess}
          searchColumnId={searchColumnId}
          searchPlaceholder={searchPlaceholder}
          statusColumnId={statusColumnId}
          statusOptions={statusOptions}
          typeFilterColumnId={typeFilterColumnId}
          typeFilterOptions={typeFilterOptions}
          addBtnText={addBtnText}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          khoahocFilterOptions={khoahocFilterOptions}
          namhocFilterOptions={namhocFilterOptions}
          hockyFilterOptions={hockyFilterOptions}
          hedaotaoFilterOptions={hedaotaoFilterOptions}
          chuyenNganhFilterColumnId={chuyenNganhFilterColumnId}
          chuyenNganhFilterOptions={chuyenNganhFilterOptions}
          khoaBomonFilterColumnId={khoaBomonFilterColumnId}
          khoaBomonFilterTitle={khoaBomonFilterTitle}
          khoaBomonFilterOptions={khoaBomonFilterOptions}
          bulkActions={bulkActions}
          chucVuFilterColumnId={chucVuFilterColumnId}
          chucVuFilterOptions={chucVuFilterOptions}
        />
      </div>
      
      {/* Container của bảng: Chiếm phần còn lại, xử lý cuộn tại đây */}
      <div
        className={cn(
          "rounded-md border bg-card overflow-hidden flex flex-col", // bg-card để đồng bộ theme
          containerClassName,
          !containerClassName && (
            flexLayout
              ? "flex-1 min-h-0" // Nếu flexLayout, chiếm hết chiều cao và cuộn bên trong
              : "" // Nếu không, để tự nhiên (tránh set max-h cứng gây khoảng trắng)
          )
        )}
      >
        {/* Wrapper cuộn cho bảng */}
        <div className="flex-1 overflow-auto relative"> 
           <Table>
             {/* Header dính (Sticky) */}
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan} className="whitespace-nowrap">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    {columns.map((column, colIndex) => (
                      <TableCell key={`skeleton-${index}-${column.id || column.accessorKey || colIndex}`}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    {...getRowProps(row)}
                    className="group" // Thêm group để style hover actions nếu cần
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Không tìm thấy kết quả phù hợp.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Pagination nằm dưới cùng */}
      <div className="shrink-0">
         <DataTablePagination table={table} />
      </div>
    </div>
  )
}