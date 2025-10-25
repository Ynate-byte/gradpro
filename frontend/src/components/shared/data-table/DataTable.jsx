"use client"

import * as React from "react"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataTablePagination } from "./DataTablePagination"
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
}) {
  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility: columnVisibility || {}, 
      // ----- SỬA LỖI: Cung cấp giá trị mặc định cho rowSelection -----
      rowSelection: state?.rowSelection || {}, // (Sử dụng prop hoặc một object rỗng)
      // ----- KẾT THÚC SỬA LỖI -----
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

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        onAddUser={onAddUser}
        onImportUser={onImportUser}
        // filterOptions={filterOptions} // (Đã xóa)
        // activeTab={activeTab} // (Đã xóa)
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
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
                  {loading ? "Đang tải..." : "Không tìm thấy kết quả."}
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