import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getGroups } from '@/api/adminGroupService';
import { toast } from 'sonner';
import { getColumns } from './columns';
import { DataTable } from '@/components/shared/data-table/DataTable';
import { AddStudentDialog } from './AddStudentDialog';
import { GroupFormDialog } from './GroupFormDialog';

// No need to import TableRow if DataTable handles row rendering internally

export function GroupDataTable({ planId, onSuccess, onViewDetails }) {
    const [data, setData] = useState([]);
    const [pageCount, setPageCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [columnFilters, setColumnFilters] = useState([]); // For potential future column-specific filters
    const [sorting, setSorting] = useState([]); // For sorting state

    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); // State for the main search input

    // Handler to open the Add Student dialog
    const handleAddStudent = (group) => {
        setSelectedGroup(group);
        setIsAddStudentOpen(true);
    };

    // Handler to open the Edit Group dialog
    const handleEdit = (group) => {
        setSelectedGroup(group);
        setIsFormOpen(true);
    };

    // Function to fetch group data from the API
    const fetchData = useCallback(() => {
        // Prevent fetching if planId is not set
        if (!planId) {
            setLoading(false);
            setData([]); // Ensure data is cleared
            setPageCount(0);
            return;
        }
        setLoading(true);
        // Prepare parameters for the API request
        const params = {
            plan_id: planId,
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
            search: searchTerm, // Use the direct search term state
            // Example for specific column filter (if needed later)
            // is_special: columnFilters.find(f => f.id === 'trang_thai_combined')?.value,
            sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined,
        };
        // Call the API
        getGroups(params)
            .then(response => {
                setData(response.data);
                setPageCount(response.last_page);
            })
            .catch(() => toast.error("Lỗi khi tải danh sách nhóm."))
            .finally(() => setLoading(false));
    // Include all state variables that trigger a refetch
    }, [planId, pagination, searchTerm, columnFilters, sorting]);

    // Reset pagination to the first page when search term, filters, or planId change
    useEffect(() => {
         setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [searchTerm, columnFilters, planId]) // Add planId dependency here

    // Fetch data whenever the fetchData function reference changes (due to its dependencies changing)
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Define table columns using the imported function, memoize for performance
    const columns = useMemo(() => getColumns({
        onEdit: handleEdit,
        onAddStudent: handleAddStudent,
        onSuccess: () => { fetchData(); onSuccess(); }, // Refresh local data AND call parent onSuccess
        onViewDetails
    // Dependencies: only include functions from props if they might change
    }), [onSuccess, onViewDetails, fetchData]); // Add fetchData dependency

    // Local success handler to refresh data after dialog actions
    const handleDialogSuccess = () => {
         fetchData(); // Refetch data in this component
         onSuccess(); // Call the success handler passed from the parent
    };


    return (
        <>
            {/* Render the DataTable component with necessary props */}
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
                // No direct add/import user actions on this specific table toolbar
                onAddUser={null}
                onImportUser={null}
                // Props for the DataTableToolbar's search input
                searchColumnId="TEN_NHOM" // ID for potential column filter connection
                searchPlaceholder="Tìm theo tên nhóm..."
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm} // Pass the setter directly to the toolbar
                // AddBtnText is handled by the parent component, not DataTableToolbar here
                // statusColumnId="trang_thai_combined" // Pass if you add status filtering to toolbar
                // statusOptions={...} // Pass if you add status filtering to toolbar

                // Function to pass props to each row component
                getRowProps={(row) => ({
                    // Add data-state attribute for CSS targeting based on group status
                    'data-state': row.original.TRANGTHAI === 'Đã đủ thành viên' ? 'full' : undefined,
                    // Apply CSS classes for styling (e.g., dimming full groups)
                    // The 'group' class is added to allow group-hover effects within cells
                    className: row.original.TRANGTHAI === 'Đã đủ thành viên' ? 'opacity-70 group' : 'group',
                })}
            />

            {/* Render dialogs, passing the local success handler */}
            <AddStudentDialog
                isOpen={isAddStudentOpen}
                setIsOpen={setIsAddStudentOpen}
                group={selectedGroup}
                onSuccess={handleDialogSuccess} // Use local handler
                planId={planId} // Pass planId down
            />
            <GroupFormDialog
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                editingGroup={selectedGroup}
                onSuccess={handleDialogSuccess} // Use local handler
            />
        </>
    );
}