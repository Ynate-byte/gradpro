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
export function GroupDataTable({ planId, onSuccess, onViewDetails, searchTerm, onSearchChange, columnFilters, setColumnFilters, columnVisibility }){
    const [data, setData] = useState([]);
    const [pageCount, setPageCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState([]);
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);

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

        const statuses = columnFilters.find(f => f.id === 'TRANGTHAI')?.value;
        const isSpecialRaw = columnFilters.find(f => f.id === 'LA_NHOM_DACBIET')?.value;
        const isSpecial = isSpecialRaw ? isSpecialRaw.map(v => (v === 'true' || v === 1) ? 1 : 0) : undefined;
        
        const params = {
            plan_id: planId,
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
            search: searchTerm,
            statuses: statuses,
            is_special: isSpecial,
            sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined,
        };

        getGroups(params)
            .then(response => {
                setData(response.data);
                setPageCount(response.last_page);
            })
            .catch(() => toast.error("Lỗi khi tải danh sách nhóm."))
            .finally(() => setLoading(false));
    }, [planId, pagination, searchTerm, columnFilters, sorting]); // Cập nhật dependencies

    /**
     * Reset phân trang về trang đầu tiên khi có thay đổi trong tìm kiếm, bộ lọc hoặc planId.
     */
    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [searchTerm, columnFilters, planId]); // Cập nhật dependencies

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
    }), [onSuccess, onViewDetails, fetchData]); // fetchData đã được useCallback

    /**
     * Xử lý sau khi một hành động trong dialog (thêm, sửa) thành công.
     */
    const handleDialogSuccess = () => {
        fetchData();
        onSuccess();
    };

    const statusFilterOptions = [
        { value: "Đang mở", label: "Đang mở" },
        { value: "Đã đủ thành viên", label: "Đã đủ thành viên" },
    ];

    const typeFilterOptions = [
        { value: "true", label: "Nhóm đặc biệt" }, // Gửi 'true'
        { value: "false", label: "Nhóm thường" }, // Gửi 'false'
    ];

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
                searchColumnId="search"
                searchPlaceholder="Tìm theo tên nhóm / tên thành viên..."
                searchTerm={searchTerm}
                onSearchChange={onSearchChange}
                addBtnText=""
                
                statusColumnId="TRANGTHAI"
                statusOptions={statusFilterOptions}
                
                typeFilterColumnId="LA_NHOM_DACBIET"
                typeFilterOptions={typeFilterOptions}
                columnVisibility={columnVisibility}
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