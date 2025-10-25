import React, { useMemo } from 'react';
import { getColumns } from './columns.jsx';
import { DataTable } from '@/components/shared/data-table/DataTable.jsx';

/**
 * Component hiển thị bảng dữ liệu các kế hoạch khóa luận.
 */
export function PlanDataTable({
    data,
    columnsConfig,
    pageCount,
    loading,
    pagination,
    setPagination,
    columnFilters,
    setColumnFilters,
    statusOptions,
    khoahocFilterOptions,
    namhocFilterOptions,
    hockyFilterOptions,
    hedaotaoFilterOptions,
    columnVisibility,
    sorting,
    setSorting,
    searchTerm,
    onSearchChange,
}) {
    // Ghi nhớ cấu hình cột để tránh render lại không cần thiết
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
            statusColumnId="TRANGTHAI"
            statusOptions={statusOptions} 
            khoahocFilterOptions={khoahocFilterOptions}
            namhocFilterOptions={namhocFilterOptions}
            hockyFilterOptions={hockyFilterOptions}
            hedaotaoFilterOptions={hedaotaoFilterOptions}
            columnVisibility={columnVisibility}
            sorting={sorting}
            setSorting={setSorting}
            onAddUser={null}
            onImportUser={null}
            addBtnText="" 
            searchColumnId="TEN_DOT"
            searchPlaceholder="Tìm theo tên kế hoạch..."
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
        />
    );
}