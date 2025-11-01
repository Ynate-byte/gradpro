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
  state,
  onRowSelectionChange,
  getRowProps = () => ({}),
  containerClassName,
  flexLayout = false,
  className, // <-- THÊM PROP MỚI
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
    // ----- SỬA ĐỔI CHÍNH 1 -----
    <div className={cn(
      "space-y-4",
      flexLayout && "flex h-full flex-col",
      className // <-- ÁP DỤNG className TÙY CHỈNH TẠI ĐÂY
    )}>
    {/* ----- KẾT THÚC SỬA ĐỔI 1 ----- */}

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
        khoaBomonFilterOptions={khoaBomonFilterOptions}
      />
      
      <div
        className={cn(
          "rounded-md border overflow-y-auto relative",
          containerClassName,
          !containerClassName && (
            flexLayout
              ? "flex-1 min-h-0" // Dùng flex-1 để co giãn
              : "max-h-[calc(100vh-25rem)]" // Mặc định cho toàn trang
          )
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
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
      <DataTablePagination table={table} />
    </div>
  )
}