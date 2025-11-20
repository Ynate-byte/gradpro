import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getThesisPlans, getPlanFilterOptions } from '@/api/thesisPlanService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlusCircle, Layers, Clock, Archive, FileEdit, LayoutGrid } from 'lucide-react'
import { PlanDataTable } from './components/PlanDataTable'
import { PlanDetailDialog } from './components/PlanDetailDialog'
import { TemplateSelectionDialog } from './components/TemplateSelectionDialog'
import { useAuth } from '@/contexts/AuthContext' 
import { useDebounce } from '@/hooks/useDebounce';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';

// Cấu hình các Tab và trạng thái tương ứng
const TABS = {
    ACTIVE: {
        id: 'active',
        label: 'Đang hiệu lực',
        icon: Layers,
        statuses: ['Đang thực hiện', 'Đang chấm điểm', 'Đã phê duyệt']
    },
    PENDING: {
        id: 'pending',
        label: 'Chờ duyệt',
        icon: Clock,
        statuses: ['Chờ phê duyệt', 'Chờ duyệt chỉnh sửa', 'Yêu cầu chỉnh sửa']
    },
    DRAFT: {
        id: 'draft',
        label: 'Bản nháp',
        icon: FileEdit,
        statuses: ['Bản nháp']
    },
    ARCHIVED: {
        id: 'archived',
        label: 'Lưu trữ',
        icon: Archive,
        statuses: ['Đã hoàn thành', 'Đã hủy']
    },
    ALL: {
        id: 'all',
        label: 'Tất cả',
        icon: LayoutGrid,
        statuses: [] // Mảng rỗng = không lọc
    }
};

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

export default function ThesisPlanManagementPage() {
    const [plans, setPlans] = useState([])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
    const [pageCount, setPageCount] = useState(0)
    const [loading, setLoading] = useState(true)
    
    // State cho Tabs
    const [activeTab, setActiveTab] = useState('active') // Mặc định là tab 'active'

    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [selectedPlanId, setSelectedPlanId] = useState(null)
    const [columnFilters, setColumnFilters] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [sorting, setSorting] = useState([])
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
    const navigate = useNavigate()

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const [filterOptionsData, setFilterOptionsData] = useState({ khoahoc: [], namhoc: [], hocky: [], hedaotao: [] });

    const { user } = useAuth();
    const userRoleName = user?.vaitro?.TEN_VAITRO;
    const positionCodes = user?.giangvien?.chucvus?.map(cv => cv.MA_CHUCVU) || [];

    const isAdmin = userRoleName === 'Admin';
    const isTruongKhoa = userRoleName === 'Trưởng khoa' || positionCodes.includes('TRUONG_KHOA');
    const isGiaoVu = userRoleName === 'Giáo vụ' || positionCodes.includes('GIAO_VU');

    const canCreate = isGiaoVu || isTruongKhoa || isAdmin;

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
        
        // Xác định danh sách trạng thái dựa trên Tab hiện tại
        let statusFilter = TABS[Object.keys(TABS).find(key => TABS[key].id === activeTab)]?.statuses;

        const manualStatusFilter = columnFilters.find(f => f.id === 'TRANGTHAI')?.value;

        if (activeTab === 'all') {
            statusFilter = manualStatusFilter;
        }

        const params = {
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
            search: debouncedSearchTerm, 
            statuses: statusFilter, // Gửi mảng trạng thái lên API
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
    }, [pagination, columnFilters, sorting, debouncedSearchTerm, activeTab])

    
    // Tải dữ liệu khi thay đổi bộ lọc, phân trang, sắp xếp hoặc Tab
    useEffect(() => {
        fetchData()
    }, [fetchData]) 

    const handleSuccess = () => { fetchData() }
    const handleOpenCreate = () => { setIsTemplateDialogOpen(true) }
    const handleOpenEdit = (plan) => { navigate(`/admin/thesis-plans/${plan.ID_KEHOACH}/edit`) }
    const handleViewDetails = (planId) => { setSelectedPlanId(planId); setIsDetailOpen(true); }

    // Reset trang về 0 khi đổi Tab hoặc Search
    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [debouncedSearchTerm, activeTab]); // Bỏ columnFilters khỏi đây để tránh loop nếu không cần thiết, hoặc giữ nếu muốn reset khi filter

    const hockyLabelMap = { '1': 'Học kỳ 1', '2': 'Học kỳ 2', '3': 'Học kỳ Hè' };
    const khoahocOptions = useMemo(() => (filterOptionsData.khoahoc || []).map(val => ({ label: val, value: val })), [filterOptionsData.khoahoc]);
    const namhocOptions = useMemo(() => (filterOptionsData.namhoc || []).map(val => ({ label: val, value: val })), [filterOptionsData.namhoc]);
    const hockyOptions = useMemo(() => (filterOptionsData.hocky || []).map(val => ({ label: hockyLabelMap[val] || val, value: val })), [filterOptionsData.hocky]);
    const hedaotaoOptions = useMemo(() => (filterOptionsData.hedaotao || []).map(val => ({ label: val, value: val })), [filterOptionsData.hedaotao]);

    return (
        <div className="space-y-4 p-4 md:p-8">
            {/* Header & Create Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {canCreate && (
                    <Button onClick={handleOpenCreate} className="shrink-0">
                        <PlusCircle className="mr-2 h-4 w-4" /> Tạo Kế hoạch mới
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-4">
                    {Object.values(TABS).map((tab) => (
                        <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                            <tab.icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.label.split(' ')[0]}</span> {/* Tên ngắn gọn trên mobile */}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <TabsContent value={activeTab} className="mt-0">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle>{Object.values(TABS).find(t => t.id === activeTab)?.label}</CardTitle>
                                    <CardDescription>
                                        Danh sách các kế hoạch {Object.values(TABS).find(t => t.id === activeTab)?.label.toLowerCase()}.
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
                                        
                                        // Ẩn bộ lọc trạng thái nếu không phải tab "Tất cả" để tránh xung đột logic
                                        statusOptions={activeTab === 'all' ? statusOptions : undefined}
                                        statusColumnId={activeTab === 'all' ? 'TRANGTHAI' : undefined}

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
                        </TabsContent>
                    </motion.div>
                </AnimatePresence>
            </Tabs>

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