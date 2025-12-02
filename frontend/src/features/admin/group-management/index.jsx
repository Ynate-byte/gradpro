import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserX, SlidersHorizontal, FileDown, BookCopy, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getGroupStatistics, exportGroups } from '@/api/adminGroupService';
import { getAllPlans } from '@/api/thesisPlanService';
import { AutoGroupDialog } from './components/AutoGroupDialog';
import { InactiveStudentsDialog } from './components/InactiveStudentsDialog';
import { GroupDataTable } from './components/GroupDataTable';
import { CreateGroupDialog } from './components/CreateGroupDialog';
import { GroupDetailSheet } from './components/GroupDetailSheet';
import { UngroupedStudentsDialog } from './components/UngroupedStudentsDialog';
import { useTheme } from "@/components/theme-provider";
// Sử dụng StatCard dùng chung để đồng bộ giao diện và hiệu ứng
import StatCard from '@/components/shared/StatCard';

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
const groupColumnVisibility = { TRANGTHAI: false, LA_NHOM_DACBIET: false };

const getVariants = (shouldReduce) => {
    if (shouldReduce) {
        return {
            container: { visible: { opacity: 1 } },
            item: { visible: { opacity: 1, y: 0 } },
            table: { visible: { opacity: 1, y: 0 } }
        };
    }
    return {
        container: {
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
        },
        item: {
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 12 } }
        },
        table: {
            hidden: { opacity: 0, y: 30 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2, ease: "easeOut" } }
        }
    };
};

export default function GroupAdminPage() {
    const [allPlans, setAllPlans] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [stats, setStats] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isAutoGroupOpen, setIsAutoGroupOpen] = useState(false);
    const [isInactiveStudentOpen, setIsInactiveStudentOpen] = useState(false);
    const [isUngroupedStudentOpen, setIsUngroupedStudentOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(false);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
    const [viewingGroup, setViewingGroup] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [columnFilters, setColumnFilters] = useState([]);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme();
    const isReduced = reduceMotion || shouldReduceMotion;
    const variants = useMemo(() => getVariants(isReduced), [isReduced]);

    const currentPlan = useMemo(() => {
        return allPlans.find(p => String(p.ID_KEHOACH) === String(selectedPlanId));
    }, [allPlans, selectedPlanId]);
    const maxMemberLimit = currentPlan?.SO_THANHVIEN_TOIDA || 3;

    useEffect(() => {
        getAllPlans()
            .then(data => {
                setAllPlans(data);
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
            });
    }, []);

    const handleSuccess = () => { setRefreshTrigger(prev => !prev); fetchStats(); };
    
    const fetchStats = useCallback(() => {
        if (!selectedPlanId) { setStats(null); setIsLoadingStats(false); return; }
        setIsLoadingStats(true);
        getGroupStatistics(selectedPlanId)
            .then(setStats)
            .catch(() => toast.error("Lỗi khi tải thống kê."))
            .finally(() => setIsLoadingStats(false));
    }, [selectedPlanId]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const handleViewDetails = (group) => { setViewingGroup(group); setIsDetailSheetOpen(true); };
    
    const handleExport = async () => {
        if (!selectedPlanId) {
            toast.warning("Vui lòng chọn một kế hoạch để xuất file.");
            return;
        }
        toast.info("Đang chuẩn bị file, vui lòng đợi...");
        try {
            const blob = await exportGroups(selectedPlanId);
            const planName = allPlans.find(p => p.ID_KEHOACH == selectedPlanId)?.TEN_DOT || 'plan';
            const fileName = `danh-sach-nhom-${planName.replace(/\s/g, '_')}.xlsx`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Tải file thành công!");
        } catch (error) {
            toast.error("Không thể xuất file. Vui lòng thử lại.");
        }
    };

    useEffect(() => { setSearchTerm(''); setColumnFilters([]); }, [selectedPlanId]);

    return (
        <motion.div
            className="flex flex-col h-full space-y-4 p-4 md:p-6 overflow-hidden"
            initial={isReduced ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
                 <div className="flex flex-wrap items-center gap-2">
                     <Button onClick={() => setIsCreateGroupOpen(true)} disabled={!selectedPlanId} className="shadow-sm">
                         <PlusCircle className="mr-2 h-4 w-4" /> Tạo nhóm mới
                     </Button>
                     <Button variant="outline" onClick={() => setIsAutoGroupOpen(true)} disabled={!selectedPlanId} className="shadow-sm">
                         <SlidersHorizontal className="mr-2 h-4 w-4" /> Ghép nhóm tự động
                     </Button>
                     <Button variant="outline" onClick={handleExport} disabled={!selectedPlanId} className="shadow-sm">
                         <FileDown className="mr-2 h-4 w-4" /> Xuất danh sách
                     </Button>
                 </div>

                 <div className="flex items-center gap-2 w-full md:w-auto">
                     <BookCopy className="h-5 w-5 text-muted-foreground shrink-0" />
                     <Select onValueChange={setSelectedPlanId} value={selectedPlanId}>
                         <SelectTrigger className="w-full md:w-[400px] shadow-sm">
                             <SelectValue placeholder="Chọn một kế hoạch..." />
                         </SelectTrigger>
                         <SelectContent>
                             {allPlans.length > 0 ? (
                                 allPlans.map(plan => {
                                     const config = statusConfig[plan.TRANGTHAI] || 'bg-gray-100 text-gray-800';
                                     return (
                                         <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                             <div className="flex items-center justify-between w-full gap-2">
                                                 <span className="truncate">{plan.TEN_DOT}</span>
                                                 <Badge variant="outline" className={cn('border-0 text-[10px] h-5 px-1.5', config)}>
                                                     {plan.TRANGTHAI}
                                                 </Badge>
                                             </div>
                                         </SelectItem>
                                     );
                                 })
                             ) : (
                                 <div className="p-4 text-center text-sm text-muted-foreground">Không tìm thấy kế hoạch nào.</div>
                             )}
                         </SelectContent>
                     </Select>
                 </div>
            </div>

            {/* Stats Cards */}
            <motion.div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 shrink-0"
                variants={variants.container}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={variants.item} className="h-full">
                    <StatCard
                        icon={Users}
                        title="SV chưa có nhóm"
                        value={stats?.studentsWithoutGroup}
                        onClick={() => setIsUngroupedStudentOpen(true)}
                        iconBgClass="bg-yellow-100 dark:bg-yellow-900/30"
                        iconColorClass="text-yellow-600 dark:text-yellow-400"
                        isLoading={isLoadingStats}
                    />
                </motion.div>
                <motion.div variants={variants.item} className="h-full">
                    <StatCard
                        icon={UserX}
                        title="SV chưa đăng nhập"
                        value={stats?.inactiveStudents}
                        onClick={() => setIsInactiveStudentOpen(true)}
                        iconBgClass="bg-orange-100 dark:bg-orange-900/30"
                        iconColorClass="text-orange-600 dark:text-orange-400"
                        isLoading={isLoadingStats}
                    />
                </motion.div>
                <motion.div variants={variants.item} className="h-full">
                     <StatCard
                         icon={Users}
                         title="Tổng số nhóm"
                         value={stats?.totalGroups}
                         iconBgClass="bg-blue-100 dark:bg-blue-900/30"
                         iconColorClass="text-blue-600 dark:text-blue-400"
                         isLoading={isLoadingStats}
                     />
                 </motion.div>
                <motion.div variants={variants.item} className="h-full">
                     <StatCard
                         icon={Users}
                         title="Nhóm đã đủ TV"
                         value={stats?.fullGroups}
                         iconBgClass="bg-green-100 dark:bg-green-900/30"
                         iconColorClass="text-green-600 dark:text-green-400"
                         hasStatusDot={stats?.fullGroups > 0}
                         isLoading={isLoadingStats}
                     />
                 </motion.div>
            </motion.div>

            {/* Main Table Content */}
            <motion.div
                className="flex-1 min-h-0 flex flex-col"
                variants={variants.table}
                initial="hidden"
                animate="visible"
            >
                {selectedPlanId ? (
                    <GroupDataTable
                        flexLayout={true}
                        className="h-full" 
                        key={`${selectedPlanId}-${refreshTrigger}`}
                        planId={selectedPlanId}
                        onSuccess={handleSuccess}
                        onViewDetails={handleViewDetails}
                        searchTerm={searchTerm}
                        debouncedSearchTerm={debouncedSearchTerm}
                        onSearchChange={setSearchTerm}
                        columnFilters={columnFilters}
                        setColumnFilters={setColumnFilters}
                        columnVisibility={groupColumnVisibility}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground p-8 border rounded-lg bg-muted/10 border-dashed">
                        {allPlans.length > 0 ? "Vui lòng chọn một kế hoạch để xem danh sách nhóm." : "Không có kế hoạch nào để hiển thị."}
                    </div>
                )}
            </motion.div>

            {/* Dialogs */}
            <AnimatePresence>
                {isInactiveStudentOpen && (
                    <InactiveStudentsDialog
                        isOpen={isInactiveStudentOpen}
                        setIsOpen={setIsInactiveStudentOpen}
                        onSuccess={handleSuccess}
                        planId={selectedPlanId}
                    />
                )}
                {isAutoGroupOpen && (
                    <AutoGroupDialog
                        isOpen={isAutoGroupOpen}
                        setIsOpen={setIsAutoGroupOpen}
                        onSuccess={handleSuccess}
                        planId={selectedPlanId}
                        maxAllowed={maxMemberLimit}
                    />
                )}
                {isCreateGroupOpen && (
                    <CreateGroupDialog
                        isOpen={isCreateGroupOpen}
                        setIsOpen={setIsCreateGroupOpen}
                        onSuccess={handleSuccess}
                        planId={selectedPlanId}
                    />
                )}
                {isDetailSheetOpen && (
                    <GroupDetailSheet
                        group={viewingGroup}
                        isOpen={isDetailSheetOpen}
                        setIsOpen={setIsDetailSheetOpen}
                    />
                )}
                {isUngroupedStudentOpen && (
                    <UngroupedStudentsDialog
                        isOpen={isUngroupedStudentOpen}
                        setIsOpen={setIsUngroupedStudentOpen}
                        planId={selectedPlanId}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}