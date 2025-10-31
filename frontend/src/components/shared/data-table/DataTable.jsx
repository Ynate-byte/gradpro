"use client"

import * as React from "react"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataTablePagination } from "./DataTablePagination"
import { Skeleton } from "@/components/ui/skeleton"; // <-- ĐÃ THÊM IMPORT
import { DataTableToolbar } from "./DataTableToolbar"

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

  // Lấy số hàng mỗi trang từ state của table
  const pageSize = table.getState().pagination.pageSize;

  return (
    <div className="space-y-4">
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
      <div className="rounded-md border max-h-[calc(100vh-25rem)] overflow-y-auto relative">
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
            {/* ----- SỬA ĐỔI CHÍNH Ở ĐÂY ----- */}
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