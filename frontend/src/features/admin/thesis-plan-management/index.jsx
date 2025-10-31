import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getThesisPlans, getPlanFilterOptions } from '@/api/thesisPlanService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import { PlanDataTable } from './components/PlanDataTable'
import { PlanDetailDialog } from './components/PlanDetailDialog'
import { TemplateSelectionDialog } from './components/TemplateSelectionDialog'
import { useAuth } from '@/contexts/AuthContext' 
import { useDebounce } from '@/hooks/useDebounce';

const statusOptions = [
    { value: 'Đang thực hiện', label: 'Đang thực hiện' },
    { value: 'Đã phê duyệt', label: 'Đã phê duyệt' },
    { value: 'Chờ phê duyệt', label: 'Chờ phê duyệt' },
    { value: 'Chờ duyệt chỉnh sửa', label: 'Chờ duyệt chỉnh sửa' },
    { value: 'Yêu cầu chỉnh sửa', label: 'Yêu cầu chỉnh sửa' },
    { value: 'Đang chấm điểm', label: 'Đang chấm điểm' },
    { value: 'Bản nháp', label: 'Bản nháp' },
    { value: 'Đã hoàn thành', label: 'Đã hoàn thành' },
].sort((a,b) => a.label.localeCompare(b.label));

const columnVisibility = { 
    HOCKY: false, 
};


// Trang quản lý kế hoạch khóa luận
export default function ThesisPlanManagementPage() {
    const [plans, setPlans] = useState([])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
    const [pageCount, setPageCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [selectedPlanId, setSelectedPlanId] = useState(null)
    const [columnFilters, setColumnFilters] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [sorting, setSorting] = useState([])
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
    const navigate = useNavigate()

    // ----- 2. SỬ DỤNG HOOK -----
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    // ----- KẾT THÚC SỬA ĐỔI -----

    const [filterOptionsData, setFilterOptionsData] = useState({ khoahoc: [], namhoc: [], hocky: [], hedaotao: [] });

    const { user } = useAuth();
    const userRole = user?.giangvien?.CHUCVU; 
    const isAdmin = user?.vaitro?.TEN_VAITRO === 'Admin';
    const canCreate = userRole === 'Giáo vụ' || userRole === 'Trưởng khoa' || isAdmin;  

    // ... (useEffect tải filter options không đổi)
    useEffect(() => {
        getPlanFilterOptions()
            .then(data => {
                setFilterOptionsData(data); 
            })
            .catch(() => {
                toast.error("Không thể tải các tùy chọn cho bộ lọc.");
            });
    }, []); 


    // Tải danh sách kế hoạch
    const fetchData = useCallback(() => {
        setLoading(true)
        
        const params = {
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
            search: debouncedSearchTerm, 
            statuses: columnFilters.find(f => f.id === 'TRANGTHAI')?.value,
            khoahoc: columnFilters.find(f => f.id === 'KHOAHOC')?.value,
            namhoc: columnFilters.find(f => f.id === 'NAMHOC')?.value,
            hocky: columnFilters.find(f => f.id === 'HOCKY')?.value,
            hedaotao: columnFilters.find(f => f.id === 'HEDAOTAO')?.value,
            sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined
        }

        getThesisPlans(params)
            .then(response => {
                setPlans(response.data)
                setPageCount(response.last_page)
            })
            .catch(() => toast.error("Lỗi khi tải danh sách kế hoạch."))
            .finally(() => setLoading(false))
    }, [pagination, columnFilters, sorting, debouncedSearchTerm]) // (Thay searchTerm bằng debouncedSearchTerm)

    
    // Tải dữ liệu khi thay đổi bộ lọc, phân trang hoặc sắp xếp
    useEffect(() => {
        fetchData()
    }, [fetchData]) 

    const handleSuccess = () => { fetchData() }
    const handleOpenCreate = () => { setIsTemplateDialogOpen(true) }
    const handleOpenEdit = (plan) => { navigate(`/admin/thesis-plans/${plan.ID_KEHOACH}/edit`) }
    const handleViewDetails = (planId) => { setSelectedPlanId(planId); setIsDetailOpen(true); }

    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [debouncedSearchTerm, columnFilters]); // (Thay searchTerm bằng debouncedSearchTerm)

    const hockyLabelMap = { '1': 'Học kỳ 1', '2': 'Học kỳ 2', '3': 'Học kỳ Hè' };
    const khoahocOptions = useMemo(() => (filterOptionsData.khoahoc || []).map(val => ({ label: val, value: val })), [filterOptionsData.khoahoc]);
    const namhocOptions = useMemo(() => (filterOptionsData.namhoc || []).map(val => ({ label: val, value: val })), [filterOptionsData.namhoc]);
    const hockyOptions = useMemo(() => (filterOptionsData.hocky || []).map(val => ({ label: hockyLabelMap[val] || val, value: val })), [filterOptionsData.hocky]);
    const hedaotaoOptions = useMemo(() => (filterOptionsData.hedaotao || []).map(val => ({ label: val, value: val })), [filterOptionsData.hedaotao]);


    return (
        <div className="space-y-3 p-4 md:p-8">
            <div className="flex items-center justify-between">
                {canCreate ? (
                    <Button onClick={handleOpenCreate}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Tạo Kế hoạch mới
                    </Button>
                ) : (
                    <div></div> 
                )}
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Danh sách Kế hoạch</CardTitle>
                    <CardDescription>
                        Toàn bộ các kế hoạch đã và đang được triển khai.
                    </CardDescription>
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
                        statusOptions={statusOptions}
                        khoahocFilterOptions={khoahocOptions}
                        namhocFilterOptions={namhocOptions} 
                        hockyFilterOptions={hockyOptions}
                        hedaotaoFilterOptions={hedaotaoOptions}
                        columnVisibility={columnVisibility} 
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
            <TemplateSelectionDialog
                isOpen={isTemplateDialogOpen}
                setIsOpen={setIsTemplateDialogOpen}
            />
        </div>
    )
}