import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getAdminThesisPlanTemplates } from '@/api/thesisPlanService'; // Use admin version
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react'; // Import Loader2
import { DataTable } from '@/components/shared/data-table/DataTable'; // Reuse DataTable
import { getColumns } from './components/columns'; // Columns specifically for templates

export default function TemplateManagementPage() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    // Basic pagination/sorting state for client-side handling
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); // For client-side filtering

    const fetchData = useCallback(() => {
        setLoading(true);
        getAdminThesisPlanTemplates()
            .then(response => {
                setTemplates(response || []); // Ensure it's an array
            })
            .catch(() => toast.error("Lỗi khi tải danh sách bản mẫu."))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        fetchData(); // Refresh data after create/edit/delete
    };

    const handleOpenCreate = () => {
        navigate('/admin/templates/create');
    };

    const handleOpenEdit = (template) => {
        navigate(`/admin/templates/${template.ID_MAU}/edit`);
    };

    // Filter data client-side based on searchTerm
    const filteredTemplates = useMemo(() => {
        if (!searchTerm) return templates;
        return templates.filter(template =>
            template.TEN_MAU.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [templates, searchTerm]);

    // Simple client-side pagination calculation
    const pageCount = Math.ceil(filteredTemplates.length / pagination.pageSize);
    const paginatedData = useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        const end = start + pagination.pageSize;
        // Apply sorting before slicing
        const sortedData = [...filteredTemplates].sort((a, b) => {
            if (sorting.length > 0) {
                const { id, desc } = sorting[0];
                // Handle nested access or simple access
                const valA = id.split('.').reduce((o, i) => (o ? o[i] : undefined), a);
                const valB = id.split('.').reduce((o, i) => (o ? o[i] : undefined), b);

                if (valA == null) return 1; // Handle nulls
                if (valB == null) return -1;

                if (typeof valA === 'number' && typeof valB === 'number') {
                     return desc ? valB - valA : valA - valB;
                }
                
                if (typeof valA === 'string' && typeof valB === 'string') {
                    return desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
                }
                
                // Fallback for other types
                if (valA < valB) return desc ? 1 : -1;
                if (valA > valB) return desc ? -1 : 1;
            }
            return 0; // Default: no sort or equal
        });
        return sortedData.slice(start, end);
    }, [filteredTemplates, pagination, sorting]);


    const columns = useMemo(() => getColumns({
        onEdit: handleOpenEdit,
        onSuccess: handleSuccess,
    }), [handleSuccess]); // Dependency


    return (
        <div className="space-y-8 p-4 md:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                 <h1 className="text-3xl font-bold">Quản lý Kế hoạch Mẫu</h1>
                 <Button onClick={handleOpenCreate}>
                     <PlusCircle className="mr-2 h-4 w-4" /> Tạo Bản mẫu mới
                 </Button>
             </div>

            <Card>
                <CardHeader>
                    <CardTitle>Danh sách Bản mẫu</CardTitle>
                    <CardDescription>Các bản mẫu kế hoạch khóa luận có sẵn để sử dụng.</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={paginatedData} // Use paginated data
                        pageCount={pageCount} // Use calculated page count
                        loading={loading}
                        pagination={pagination}
                        setPagination={setPagination} // Allow pagination change
                        // Filters are handled client-side via searchTerm state
                        columnFilters={[]} // Not used directly for server-side filtering here
                        setColumnFilters={() => {}} // No-op
                        sorting={sorting} // Use state for sorting
                        setSorting={setSorting} // Allow sorting change
                        manualPagination={false} // Indicate client-side pagination
                        manualFiltering={false} // Indicate client-side filtering
                        manualSorting={false} // Indicate client-side sorting
                        onAddUser={null}
                        onImportUser={null}
                        // Search handled via searchTerm state
                        searchPlaceholder="Tìm theo tên bản mẫu..."
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        addBtnText="" // Hide default add button from toolbar
                    />
                </CardContent>
            </Card>
        </div>
    );
}