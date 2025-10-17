"use client"

import * as React from "react"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataTablePagination } from "./data-table-pagination"
import { DataTableToolbar } from "./data-table-toolbar"

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
    filterOptions,
    activeTab,
    onSuccess,
    searchColumnId,
    searchPlaceholder,
    statusColumnId,
    statusOptions,
    addBtnText,
    // === BẮT ĐẦU SỬA LỖI: Nhận props cho search term ===
    searchTerm,
    onSearchChange,
    // === KẾT THÚC SỬA LỖI ===
}) {
  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility: {
        chuyen_nganh: false,
        khoa_bomon: false,
      },
    },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    enableRowSelection: true,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      <DataTableToolbar 
        table={table} 
        onAddUser={onAddUser}
        onImportUser={onImportUser}
        filterOptions={filterOptions}
        activeTab={activeTab}
        onSuccess={onSuccess}
        searchColumnId={searchColumnId}
        searchPlaceholder={searchPlaceholder}
        statusColumnId={statusColumnId}
        statusOptions={statusOptions}
        addBtnText={addBtnText}
        // === BẮT ĐẦU SỬA LỖI: Truyền props xuống toolbar ===
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        // === KẾT THÚC SỬA LỖI ===
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