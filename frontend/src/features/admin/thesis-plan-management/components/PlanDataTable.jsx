import React, { useMemo } from 'react';
import { getColumns } from './columns.jsx';
// ĐÃ SỬA ĐỔI: Cập nhật đường dẫn import đến vị trí mới
import { DataTable } from '@/components/shared/data-table/DataTable.jsx';

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
    searchTerm,
    onSearchChange,
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
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
        />
    );
}