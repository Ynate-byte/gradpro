import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getGroups } from '@/api/adminGroupService';
import { toast } from 'sonner';
import { getColumns } from './columns';
import { DataTable } from '@/components/shared/data-table/DataTable';
import { AddStudentDialog } from './AddStudentDialog';
import { GroupFormDialog } from './GroupFormDialog';

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

    const handleAddStudent = (group) => {
        setSelectedGroup(group);
        setIsAddStudentOpen(true);
    };

    const handleEdit = (group) => {
        setSelectedGroup(group);
        setIsFormOpen(true);
    };

    const fetchData = useCallback(() => {
        if (!planId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const params = {
            plan_id: planId,
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
            search: columnFilters.find(f => f.id === 'TEN_NHOM')?.value,
            is_special: columnFilters.find(f => f.id === 'LA_NHOM_DACBIET')?.value,
            sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined,
        };
        getGroups(params)
            .then(response => {
                setData(response.data);
                setPageCount(response.last_page);
            })
            .catch(() => toast.error("Lỗi khi tải danh sách nhóm."))
            .finally(() => setLoading(false));
    }, [pagination, columnFilters, sorting, planId]);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setColumnFilters(prev => {
                const existingFilter = prev.find(f => f.id === 'TEN_NHOM');
                if (searchTerm) {
                    if (existingFilter) {
                        return prev.map(f => f.id === 'TEN_NHOM' ? { ...f, value: searchTerm } : f);
                    }
                    return [...prev, { id: 'TEN_NHOM', value: searchTerm }];
                }
                return prev.filter(f => f.id !== 'TEN_NHOM');
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const columns = useMemo(() => getColumns({ 
        onEdit: handleEdit, 
        onAddStudent: handleAddStudent, 
        onSuccess, 
        onViewDetails 
    }), [onSuccess, onViewDetails]);
    
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
                searchColumnId="TEN_NHOM"
                searchPlaceholder="Tìm theo tên nhóm..."
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
            />
            <AddStudentDialog 
                isOpen={isAddStudentOpen} 
                setIsOpen={setIsAddStudentOpen} 
                group={selectedGroup} 
                onSuccess={onSuccess}
            />
            <GroupFormDialog
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                editingGroup={selectedGroup}
                onSuccess={onSuccess}
            />
        </>
    );
}