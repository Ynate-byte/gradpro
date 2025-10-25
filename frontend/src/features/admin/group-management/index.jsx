import React, { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce' // <-- 1. IMPORT
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, UserX, SlidersHorizontal, FileDown, BookCopy, Loader2, PlusCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getGroupStatistics, exportGroups } from '@/api/adminGroupService'
import { getAllPlans } from '@/api/thesisPlanService'
import { AutoGroupDialog } from './components/AutoGroupDialog'
import { InactiveStudentsDialog } from './components/InactiveStudentsDialog'
import { GroupDataTable } from './components/GroupDataTable'
import { CreateGroupDialog } from './components/CreateGroupDialog'
import { GroupDetailSheet } from './components/GroupDetailSheet'
import { UngroupedStudentsDialog } from './components/UngroupedStudentsDialog'

const statusConfig = {
    'Bản nháp': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    'Chờ phê duyệt': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    'Chờ duyệt chỉnh sửa': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    'Yêu cầu chỉnh sửa': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    'Đã phê duyệt': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    'Đang thực hiện': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    'Đang chấm điểm': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    'Đã hoàn thành': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    'Đã hủy': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
};

const groupColumnVisibility = {
    TRANGTHAI: false,
    LA_NHOM_DACBIET: false,
};

const StatCard = ({ icon: Icon, title, value, onAction, actionLabel = "Xem danh sách" }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {onAction && (
                <Button variant="link" size="sm" className="px-0 h-auto -mt-2" onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </CardContent>
    </Card>
)

export default function GroupAdminPage() {
    const [allPlans, setAllPlans] = useState([])
    const [selectedPlanId, setSelectedPlanId] = useState('')
    const [stats, setStats] = useState(null)
    const [isLoadingStats, setIsLoadingStats] = useState(true)
    const [isAutoGroupOpen, setIsAutoGroupOpen] = useState(false)
    const [isInactiveStudentOpen, setIsInactiveStudentOpen] = useState(false)
    const [isUngroupedStudentOpen, setIsUngroupedStudentOpen] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(false)
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
    const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
    const [viewingGroup, setViewingGroup] = useState(null)
    
    const [searchTerm, setSearchTerm] = useState('');
    const [columnFilters, setColumnFilters] = useState([]);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    useEffect(() => {
        getAllPlans()
            .then(data => {
                setAllPlans(data)
                if (data.length > 0) {
                    const activePlan = data.find(p => p.TRANGTHAI === 'Đang thực hiện');
                    if (activePlan) {
                        setSelectedPlanId(String(activePlan.ID_KEHOACH));
                    } else {
                        setSelectedPlanId(String(data[0].ID_KEHOACH)); 
                    }
                } else {
                    setIsLoadingStats(false); 
                }
            })
            .catch(() => {
                toast.error("Không thể tải danh sách kế hoạch.");
                setIsLoadingStats(false);
            })
    }, [])

    const handleSuccess = () => {
        setRefreshTrigger(prev => !prev)
        fetchStats()
    }

    const fetchStats = useCallback(() => {
        if (!selectedPlanId) {
            setStats(null); 
            setIsLoadingStats(false);
            return;
        }
        setIsLoadingStats(true)
        getGroupStatistics(selectedPlanId)
            .then(setStats)
            .catch(() => toast.error("Lỗi khi tải thống kê."))
            .finally(() => setIsLoadingStats(false))
    }, [selectedPlanId])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    const handleViewDetails = (group) => {
        setViewingGroup(group)
        setIsDetailSheetOpen(true)
    }

    // ... (handleExport không đổi)
    const handleExport = async () => {
        if (!selectedPlanId) {
            toast.warning("Vui lòng chọn một kế hoạch để xuất file.")
            return
        }
        toast.info("Đang chuẩn bị file, vui lòng đợi...")
        try {
            const blob = await exportGroups(selectedPlanId)
            const planName = allPlans.find(p => p.ID_KEHOACH == selectedPlanId)?.TEN_DOT || 'plan'
            const fileName = `danh-sach-nhom-${planName.replace(/\s/g, '_')}.xlsx`

            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url);
            toast.success("Tải file thành công!")
        } catch (error) {
            toast.error("Không thể xuất file. Vui lòng thử lại.")
        }
    }

    useEffect(() => {
        setSearchTerm('');
        setColumnFilters([]);
    }, [selectedPlanId]);

    return (
        <div className="space-y-6 p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={() => setIsCreateGroupOpen(true)} disabled={!selectedPlanId}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Tạo nhóm mới
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setIsAutoGroupOpen(true)}
                        disabled={!selectedPlanId}
                    >
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        Ghép nhóm tự động
                    </Button>
                    <Button variant="outline" onClick={handleExport} disabled={!selectedPlanId}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Xuất danh sách
                    </Button>
                </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <BookCopy className="h-5 w-5 text-muted-foreground shrink-0" />
                <Select onValueChange={setSelectedPlanId} value={selectedPlanId}>
                    <SelectTrigger className="w-full sm:w-[500px]">
                        <SelectValue placeholder="Chọn một kế hoạch..." />
                    </SelectTrigger>
                    <SelectContent>
                        {allPlans.length > 0 ? (
                            allPlans.map(plan => {
                                const config = statusConfig[plan.TRANGTHAI] || 'bg-gray-100 text-gray-800';
                                return (
                                    <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                        <div className="flex items-center justify-between w-full">
                                            <span>{plan.TEN_DOT}</span>
                                            <Badge variant="outline" className={cn('border-0 text-xs ml-4', config)}>
                                                {plan.TRANGTHAI}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                )
                            })
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">Không tìm thấy kế hoạch nào.</div>
                        )}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <StatCard
                    icon={Users}
                    title="SV chưa có nhóm"
                    value={
                        isLoadingStats ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            stats?.studentsWithoutGroup ?? 0
                        )
                    }
                    onAction={() => setIsUngroupedStudentOpen(true)}
                />
                <StatCard
                    icon={UserX}
                    title="SV chưa đăng nhập"
                    value={
                        isLoadingStats ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            stats?.inactiveStudents ?? 0
                        )
                    }
                    onAction={() => setIsInactiveStudentOpen(true)}
                />
                <StatCard
                    icon={Users}
                    title="Tổng số nhóm"
                    value={
                        isLoadingStats ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            stats?.totalGroups ?? 0
                        )
                    }
                />
                <StatCard
                    icon={Users}
                    title="Nhóm đã đủ TV"
                    value={
                        isLoadingStats ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            stats?.fullGroups ?? 0
                        )
                    }
                />
            </div>

            <div className="space-y-4">
                {selectedPlanId ? (
                    <GroupDataTable
                        key={`${selectedPlanId}-${refreshTrigger}`}
                        planId={selectedPlanId}
                        onSuccess={handleSuccess}
                        onViewDetails={handleViewDetails}
                        // ----- 3. TRUYỀN PROPS -----
                        searchTerm={searchTerm} // (searchTerm cho input)
                        debouncedSearchTerm={debouncedSearchTerm} // (debouncedSearchTerm cho API)
                        onSearchChange={setSearchTerm}
                        columnFilters={columnFilters}
                        setColumnFilters={setColumnFilters}
                        columnVisibility={groupColumnVisibility}
                        // ----- KẾT THÚC SỬA ĐỔI -----
                    />
                ) : (
                    <div className="text-center text-muted-foreground p-8 border rounded-lg">
                        {allPlans.length > 0 ? "Vui lòng chọn một kế hoạch để xem danh sách nhóm." : "Không có kế hoạch nào để hiển thị."}
                    </div>
                )}
            </div>
            
            {/* ... (Các Dialogs không đổi) ... */}
            <InactiveStudentsDialog
                isOpen={isInactiveStudentOpen}
                setIsOpen={setIsInactiveStudentOpen}
                onSuccess={handleSuccess}
                planId={selectedPlanId}
            />
            <AutoGroupDialog
                isOpen={isAutoGroupOpen}
                setIsOpen={setIsAutoGroupOpen}
                onSuccess={handleSuccess}
                planId={selectedPlanId}
            />
            <CreateGroupDialog
                isOpen={isCreateGroupOpen}
                setIsOpen={setIsCreateGroupOpen}
                onSuccess={handleSuccess}
                planId={selectedPlanId}
            />
            <GroupDetailSheet
                group={viewingGroup}
                isOpen={isDetailSheetOpen}
                setIsOpen={setIsDetailSheetOpen}
            />
            <UngroupedStudentsDialog
                isOpen={isUngroupedStudentOpen}
                setIsOpen={setIsUngroupedStudentOpen}
                planId={selectedPlanId}
            />
        </div>
    )
}