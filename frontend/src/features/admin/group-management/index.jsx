import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserX, SlidersHorizontal, FileDown, BookCopy, Loader2, PlusCircle, Circle } from 'lucide-react'; // Thêm Circle
import { toast } from 'sonner';
import { getGroupStatistics, exportGroups } from '@/api/adminGroupService';
import { getAllPlans } from '@/api/thesisPlanService';
import { AutoGroupDialog } from './components/AutoGroupDialog';
import { InactiveStudentsDialog } from './components/InactiveStudentsDialog';
import { GroupDataTable } from './components/GroupDataTable';
import { CreateGroupDialog } from './components/CreateGroupDialog';
import { GroupDetailSheet } from './components/GroupDetailSheet';
import { UngroupedStudentsDialog } from './components/UngroupedStudentsDialog';

// --- (statusConfig, groupColumnVisibility không đổi) ---
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

// --- NÂNG CẤP StatCard với animation ---
const StatCard = ({ icon: Icon, title, value, onAction, actionLabel = "Xem danh sách", iconBgClass = "bg-primary/10", iconColorClass = "text-primary", hasStatusDot }) => (
    <motion.div // Thay Card bằng motion.div
        className="bg-card text-card-foreground p-4 rounded-lg shadow-sm border flex items-center gap-4 transition-shadow hover:shadow-lg" // Tăng padding nhẹ
        whileHover={{ y: -4, scale: 1.02 }} // Hiệu ứng hover
        transition={{ type: "spring", stiffness: 300, damping: 15 }} // Transition mượt
    >
        <motion.div
            className={cn("p-3 rounded-lg flex-shrink-0", iconBgClass)} // Thêm flex-shrink-0
            initial={false} // Không animate ban đầu nếu không loading
            animate={{
                scale: value === 'loading' ? [1, 1.1, 1] : 1, // Hiệu ứng scale nhẹ khi loading
            }}
            transition={{
                duration: 1.5,
                repeat: value === 'loading' ? Infinity : 0,
                ease: "easeInOut"
            }}
        >
            <Icon className={cn("h-6 w-6", iconColorClass)} /> {/* Tăng kích thước icon */}
        </motion.div>
        <div className="flex-1 min-w-0"> {/* Thêm min-w-0 */}
            <h3 className="text-sm font-medium text-muted-foreground truncate">{title}</h3>
            {/* Animate giá trị thay đổi */}
            <div className="flex items-baseline gap-2 h-8 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={value} // Key là giá trị để trigger animation khi thay đổi
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="flex items-baseline gap-2" // Đưa flex vào đây
                    >
                        {value === 'loading' ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                        ) : (
                            <>
                                <p className="text-2xl font-bold">{value?.toLocaleString('vi-VN') ?? '0'}</p> {/* Thêm toLocaleString */}
                                {hasStatusDot && ( /* Optional dot indicator */
                                     <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring" }}>
                                         <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500" />
                                     </motion.div>
                                )}
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
            {onAction && (
                <Button variant="link" size="sm" className="px-0 h-auto -mt-1 text-xs" onClick={onAction}> {/* Giảm mt */}
                    {actionLabel}
                </Button>
            )}
        </div>
    </motion.div>
);

// --- Định nghĩa variants cho animation container và item ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08, // Thời gian delay giữa các item con
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
             type: "spring", // Tạo hiệu ứng nảy nhẹ
             stiffness: 100,
             damping: 12
        }
    }
};

const tableVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: 0.2, ease: "easeOut" } // Delay nhẹ sau khi stats hiện
    }
};


export default function GroupAdminPage() {
    // --- (Các state không đổi) ---
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

    // --- (useEffect và các hàm xử lý không đổi) ---
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
    const handleSuccess = () => { setRefreshTrigger(prev => !prev); fetchStats(); }
    const fetchStats = useCallback(() => {
        if (!selectedPlanId) { setStats(null); setIsLoadingStats(false); return; }
        setIsLoadingStats(true)
        getGroupStatistics(selectedPlanId)
            .then(setStats)
            .catch(() => toast.error("Lỗi khi tải thống kê."))
            .finally(() => setIsLoadingStats(false))
    }, [selectedPlanId])
    useEffect(() => { fetchStats() }, [fetchStats])
    const handleViewDetails = (group) => { setViewingGroup(group); setIsDetailSheetOpen(true); }
    const handleExport = async () => { /* ... */
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
    useEffect(() => { setSearchTerm(''); setColumnFilters([]); }, [selectedPlanId]);


    return (
        // --- THÊM motion.div bao ngoài cùng cho animation fade-in ---
        <motion.div
            className="space-y-6 p-4 md:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* --- (Phần Buttons và Select không đổi nhiều, có thể thêm animation nhẹ nếu muốn) --- */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                 <div className="flex flex-wrap items-center gap-2">
                     <Button onClick={() => setIsCreateGroupOpen(true)} disabled={!selectedPlanId}>
                         <PlusCircle className="mr-2 h-4 w-4" /> Tạo nhóm mới
                     </Button>
                     <Button variant="outline" onClick={() => setIsAutoGroupOpen(true)} disabled={!selectedPlanId}>
                         <SlidersHorizontal className="mr-2 h-4 w-4" /> Ghép nhóm tự động
                     </Button>
                     <Button variant="outline" onClick={handleExport} disabled={!selectedPlanId}>
                         <FileDown className="mr-2 h-4 w-4" /> Xuất danh sách
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


            {/* --- ÁP DỤNG ANIMATION CHO GRID STATS --- */}
            <motion.div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Wrap mỗi StatCard bằng motion.div */}
                <motion.div variants={itemVariants}>
                    <StatCard
                        icon={Users}
                        title="SV chưa có nhóm"
                        value={isLoadingStats ? 'loading' : stats?.studentsWithoutGroup}
                        onAction={() => setIsUngroupedStudentOpen(true)}
                        iconBgClass="bg-yellow-100 dark:bg-yellow-900/30"
                        iconColorClass="text-yellow-600 dark:text-yellow-400"
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <StatCard
                        icon={UserX}
                        title="SV chưa đăng nhập"
                        value={isLoadingStats ? 'loading' : stats?.inactiveStudents}
                        onAction={() => setIsInactiveStudentOpen(true)}
                        iconBgClass="bg-orange-100 dark:bg-orange-900/30"
                        iconColorClass="text-orange-600 dark:text-orange-400"
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                     <StatCard
                         icon={Users}
                         title="Tổng số nhóm"
                         value={isLoadingStats ? 'loading' : stats?.totalGroups}
                         iconBgClass="bg-blue-100 dark:bg-blue-900/30"
                         iconColorClass="text-blue-600 dark:text-blue-400"
                     />
                 </motion.div>
                <motion.div variants={itemVariants}>
                     <StatCard
                         icon={Users}
                         title="Nhóm đã đủ TV"
                         value={isLoadingStats ? 'loading' : stats?.fullGroups}
                         iconBgClass="bg-green-100 dark:bg-green-900/30"
                         iconColorClass="text-green-600 dark:text-green-400"
                         hasStatusDot={stats?.fullGroups > 0} // Ví dụ thêm dot nếu có nhóm đủ
                     />
                 </motion.div>
            </motion.div>

            {/* --- ÁP DỤNG ANIMATION CHO DATATABLE --- */}
            <motion.div
                className="space-y-4"
                variants={tableVariants}
                initial="hidden"
                animate="visible"
            >
                {selectedPlanId ? (
                    <GroupDataTable
                        key={`${selectedPlanId}-${refreshTrigger}`}
                        planId={selectedPlanId}
                        onSuccess={handleSuccess}
                        onViewDetails={handleViewDetails}
                        searchTerm={searchTerm}
                        debouncedSearchTerm={debouncedSearchTerm} // Pass debounced for API
                        onSearchChange={setSearchTerm}
                        columnFilters={columnFilters}
                        setColumnFilters={setColumnFilters}
                        columnVisibility={groupColumnVisibility}
                    />
                ) : (
                    <div className="text-center text-muted-foreground p-8 border rounded-lg">
                        {allPlans.length > 0 ? "Vui lòng chọn một kế hoạch để xem danh sách nhóm." : "Không có kế hoạch nào để hiển thị."}
                    </div>
                )}
            </motion.div>

            {/* Dialogs/Sheet: Có thể wrap bằng AnimatePresence nếu muốn hiệu ứng exit */}
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
    )
}