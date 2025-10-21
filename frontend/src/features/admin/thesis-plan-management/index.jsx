import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getThesisPlans } from '@/api/thesisPlanService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { PlanDataTable } from './components/PlanDataTable';
import { PlanDetailDialog } from './components/PlanDetailDialog';
import { TemplateSelectionDialog } from './components/TemplateSelectionDialog'; // Thêm import

export default function ThesisPlanManagementPage() {
    const [plans, setPlans] = useState([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [pageCount, setPageCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const navigate = useNavigate();
    const [columnFilters, setColumnFilters] = useState([]);
    const [sorting, setSorting] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false); // State cho dialog chọn template

    const fetchData = useCallback(() => {
        setLoading(true);
        const params = {
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
            search: columnFilters.find(f => f.id === 'TEN_DOT')?.value,
            sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined,
        };
        getThesisPlans(params)
            .then(response => {
                setPlans(response.data);
                setPageCount(response.last_page);
            })
            .catch(() => toast.error("Lỗi khi tải danh sách kế hoạch."))
            .finally(() => setLoading(false));
    }, [pagination, columnFilters, sorting]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setColumnFilters(prev => {
                const existingFilter = prev.find(f => f.id === 'TEN_DOT');
                if (searchTerm) {
                    if (existingFilter) {
                        return prev.map(f => f.id === 'TEN_DOT' ? { ...f, value: searchTerm } : f);
                    }
                    return [...prev, { id: 'TEN_DOT', value: searchTerm }];
                }
                return prev.filter(f => f.id !== 'TEN_DOT');
            });
        }, 500);

        return () => {
            clearTimeout(timer);
        };
    }, [searchTerm]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        fetchData();
    };

    const handleOpenCreate = () => {
        // Mở dialog chọn template thay vì navigate trực tiếp
        setIsTemplateDialogOpen(true);
    };

    const handleOpenEdit = (plan) => {
        navigate(`/admin/thesis-plans/${plan.ID_KEHOACH}/edit`);
    };
    
    const handleViewDetails = (planId) => {
        setSelectedPlanId(planId);
        setIsDetailOpen(true);
    };

    return (
        <div className="space-y-8 p-4 md:p-8">
            <div className="flex items-center justify-between">
                <Button onClick={handleOpenCreate}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Tạo Kế hoạch mới
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Danh sách Kế hoạch</CardTitle>
                    <CardDescription>Toàn bộ các kế hoạch đã và đang được triển khai.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PlanDataTable
                        data={plans}
                        columnsConfig={{ 
                            onEdit: handleOpenEdit, 
                            onSuccess: handleSuccess, 
                            onViewDetails: handleViewDetails 
                        }}
                        pageCount={pageCount}
                        loading={loading}
                        pagination={pagination}
                        setPagination={setPagination}
                        columnFilters={columnFilters}
                        setColumnFilters={setColumnFilters}
                        sorting={sorting}
                        setSorting={setSorting}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                    />
                </CardContent>
            </Card>
            
            <PlanDetailDialog
                planId={selectedPlanId}
                isOpen={isDetailOpen}
                setIsOpen={setIsDetailOpen}
            />
            
            {/* Thêm Dialog chọn template vào cuối component */}
            <TemplateSelectionDialog
                isOpen={isTemplateDialogOpen}
                setIsOpen={setIsTemplateDialogOpen}
            />
        </div>
    );
}
