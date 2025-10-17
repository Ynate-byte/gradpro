import React, { useMemo } from 'react';
import { getColumns } from './columns.jsx';
import { DataTable } from '@/features/admin/user-management/components/data-table.jsx';

export function PlanDataTable({
    data,
    columnsConfig,
    pageCount,
    loading,
    pagination,
    setPagination,
    columnFilters,
    setColumnFilters,
    sorting,
    setSorting,
    // === BẮT ĐẦU SỬA LỖI: Nhận props mới và truyền xuống ===
    searchTerm,
    onSearchChange,
    // === KẾT THÚC SỬA LỖI ===
}) {

    const columns = useMemo(() => getColumns(columnsConfig), [columnsConfig]);

    return (
        <DataTable
            columns={columns}
            data={data}
            pageCount={pageCount}
            loading={loading}
            pagination={pagination}
            setPagination={setPagination}
            columnFilters={columnFilters}
            setColumnFilters={setColumnFilters}
            sorting={sorting}
            setSorting={setSorting}
            onAddUser={null}
            onImportUser={null}
            addBtnText="Thêm Kế hoạch"
            searchColumnId="TEN_DOT"
            searchPlaceholder="Tìm theo tên kế hoạch..."
            // === BẮT ĐẦU SỬA LỖI: Truyền props mới và truyền xuống ===
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            // === KẾT THÚC SỬA LỖI ===
        />
    );
}