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
      "space-y-4",
      flexLayout && "h-full flex flex-col space-y-2", 
      className
    )}>

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
      
      <div
        className={cn(
          // [SỬA LẠI]: Luôn giữ rounded-md và border để có viền sát bảng
          "rounded-md border relative",
          
          containerClassName,
          !containerClassName && (
            flexLayout
              // flex-1 để giãn chiều cao, overflow để cuộn bên trong viền
              ? "flex-1 min-h-0 w-full overflow-y-auto" 
              : "max-h-[calc(100vh-25rem)] overflow-y-auto"
          )
        )}
      >
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              // [SỬA LẠI]: Bỏ border-t-0 để giữ style mặc định của shadcn
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
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
                  {columns.map((column) => (
                    <TableCell key={`skeleton-${index}-${column.id || column.accessorKey}`}>
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
                  className="h-24 text-center"
                >
                  Không tìm thấy kết quả.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="shrink-0 py-1">
         <DataTablePagination table={table} />
      </div>
    </div>
  )
}