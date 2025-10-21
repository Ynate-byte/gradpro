import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getGroups } from '@/api/adminGroupService';
import { toast } from 'sonner';
import { getColumns } from './columns';
import { DataTable } from '@/components/shared/data-table/DataTable';
import { AddStudentDialog } from './AddStudentDialog';
import { GroupFormDialog } from './GroupFormDialog';

/**
 * Component hiển thị bảng dữ liệu các nhóm.
 */
export function GroupDataTable({ planId, onSuccess, onViewDetails }) {
    const [data, setData] = useState([]);
    const [pageCount, setPageCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [columnFilters, setColumnFilters] = useState([]);
    const [sorting, setSorting] = useState([]);
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    /**
     * Mở dialog thêm sinh viên vào nhóm.
     */
    const handleAddStudent = (group) => {
        setSelectedGroup(group);
        setIsAddStudentOpen(true);
    };

    /**
     * Mở dialog chỉnh sửa thông tin nhóm.
     */
    const handleEdit = (group) => {
        setSelectedGroup(group);
        setIsFormOpen(true);
    };

    /**
     * Lấy dữ liệu danh sách nhóm từ API.
     */
    const fetchData = useCallback(() => {
        if (!planId) {
            setLoading(false);
            setData([]);
            setPageCount(0);
            return;
        }
        setLoading(true);
        const params = {
            plan_id: planId,
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
            search: searchTerm,
            sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined,
        };
        getGroups(params)
            .then(response => {
                setData(response.data);
                setPageCount(response.last_page);
            })
            .catch(() => toast.error("Lỗi khi tải danh sách nhóm."))
            .finally(() => setLoading(false));
    }, [planId, pagination, searchTerm, columnFilters, sorting]);

    /**
     * Reset phân trang về trang đầu tiên khi có thay đổi trong tìm kiếm, bộ lọc hoặc planId.
     */
    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [searchTerm, columnFilters, planId]);

    /**
     * Gọi lại hàm fetchData khi các dependency của nó thay đổi.
     */
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /**
     * Khởi tạo và ghi nhớ cấu hình các cột của bảng.
     */
    const columns = useMemo(() => getColumns({
        onEdit: handleEdit,
        onAddStudent: handleAddStudent,
        onSuccess: () => { fetchData(); onSuccess(); },
        onViewDetails
    }), [onSuccess, onViewDetails, fetchData]);

    /**
     * Xử lý sau khi một hành động trong dialog (thêm, sửa) thành công.
     */
    const handleDialogSuccess = () => {
        fetchData();
        onSuccess();
    };

    return (
        <>
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
                searchColumnId="TEN_NHOM"
                searchPlaceholder="Tìm theo tên nhóm..."
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                getRowProps={(row) => ({
                    'data-state': row.original.TRANGTHAI === 'Đã đủ thành viên' ? 'full' : undefined,
                    className: row.original.TRANGTHAI === 'Đã đủ thành viên' ? 'opacity-70 group' : 'group',
                })}
            />

            <AddStudentDialog
                isOpen={isAddStudentOpen}
                setIsOpen={setIsAddStudentOpen}
                group={selectedGroup}
                onSuccess={handleDialogSuccess}
                planId={planId}
            />
            
            <GroupFormDialog
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                editingGroup={selectedGroup}
                onSuccess={handleDialogSuccess}
            />
        </>
    );
}
