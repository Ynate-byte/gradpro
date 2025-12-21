import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getGroups } from '@/api/adminGroupService';
import { toast } from 'sonner';
import { getColumns } from './columns';
import { AddStudentDialog } from './AddStudentDialog';
import { GroupFormDialog } from './GroupFormDialog';
import { DataTable } from '@/components/shared/data-table/DataTable';
import { AssignTopicDialog } from './AssignTopicDialog';

export function GroupDataTable({ 
    planId, 
    onSuccess, 
    onViewDetails, 
    searchTerm,
    debouncedSearchTerm,
    onSearchChange, 
    columnFilters, 
    setColumnFilters, 
    columnVisibility,
    flexLayout, 
    className
}){
    const [data, setData] = useState([]);
    const [pageCount, setPageCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState([]);
    
    // State cho các Dialog
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [isAssignTopicOpen, setIsAssignTopicOpen] = useState(false);

    // Handlers mở dialog
    const handleAddStudent = (group) => {
        setSelectedGroup(group);
        setIsAddStudentOpen(true);
    };

    const handleEdit = (group) => {
        setSelectedGroup(group);
        setIsFormOpen(true);
    };

    const handleAssignTopic = (group) => {
        setSelectedGroup(group);
        setIsAssignTopicOpen(true);
    };

    // --- [LOGIC GỌI API ĐÃ SỬA] ---
    const fetchData = useCallback(() => {
        if (!planId) {
            setLoading(false);
            setData([]);
            setPageCount(0);
            return;
        }
        setLoading(true);

        // Lấy giá trị bộ lọc
        const statuses = columnFilters.find(f => f.id === 'TRANGTHAI')?.value;
        const isSpecialRaw = columnFilters.find(f => f.id === 'LA_NHOM_DACBIET')?.value;
        const isSpecial = isSpecialRaw ? isSpecialRaw.map(v => (v === 'true' || v === 1) ? 1 : 0) : undefined;
        
        const params = {
            plan_id: planId,
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
            search: debouncedSearchTerm,
            statuses: statuses,
            is_special: isSpecial,
            sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined,
        };

        getGroups(params)
            .then(response => {
                setData(response.data);
                setPageCount(response.last_page);
            })
            .catch((error) => {
                // Không hiện lỗi nếu request bị cancel (nếu có cơ chế cancel token)
                if (error.code !== "ERR_CANCELED") {
                    console.error(error);
                    toast.error("Lỗi khi tải danh sách nhóm.");
                }
            })
            .finally(() => setLoading(false));
    
    // Dependency Array: Thay searchTerm bằng debouncedSearchTerm
    }, [planId, pagination, debouncedSearchTerm, columnFilters, sorting]); 

    // Reset về trang 1 khi filter hoặc search thay đổi
    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [debouncedSearchTerm, columnFilters, planId]); 

    // Gọi API khi các dependency thay đổi
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Cấu hình cột
    const columns = useMemo(() => getColumns({
        onEdit: handleEdit,
        onAddStudent: handleAddStudent,
        onAssignTopic: handleAssignTopic,
        onSuccess: () => { fetchData(); onSuccess(); },
        onViewDetails
    }), [onSuccess, onViewDetails, fetchData]);

    const handleDialogSuccess = () => {
        fetchData();
        onSuccess();
    };

    // Options cho bộ lọc
    const statusFilterOptions = [
        { value: "Đang mở", label: "Đang mở" },
        { value: "Đã đủ thành viên", label: "Đã đủ thành viên" },
        { value: "Đang thực hiện", label: "Đang thực hiện" },
        { value: "Đã hoàn thành", label: "Đã hoàn thành" },
        { value: "Không đạt", label: "Không đạt" },
    ];

    const typeFilterOptions = [
        { value: "true", label: "Nhóm đặc biệt" },
        { value: "false", label: "Nhóm thường" },
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
                
                // Layout & Style props
                flexLayout={flexLayout}
                className={className}
                containerClassName="h-full bg-card" 
                
                // Toolbar props
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

            {/* Các Dialog quản lý */}
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
            
            <AssignTopicDialog 
                isOpen={isAssignTopicOpen}
                setIsOpen={setIsAssignTopicOpen}
                group={selectedGroup}
                planId={planId}
                onSuccess={handleDialogSuccess}
            />
        </>
    );
}