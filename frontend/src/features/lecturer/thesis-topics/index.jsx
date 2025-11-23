import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Plus, Send, BookOpen, Loader2, Users, CheckCircle, AlertTriangle, 
    FileSignature, MessageSquare, Upload, RefreshCcw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { useTheme } from "@/components/theme-provider";
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

// API Services
import { thesisTopicService } from '@/api/thesisTopicService';
import lecturerQuotaService from '@/api/lecturerQuotaService';
import { getThesisPlanById } from '@/api/thesisPlanService'; 
import { getChuyenNganhs } from '@/api/userService';
import axios from '@/api/axiosConfig';

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from '@/components/shared/data-table/DataTable';
import {
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from '@/components/ui/dialog';

// Custom Components
import CreateTopicDialog from './components/CreateTopicDialog';
import TopicDetailDialog from './components/TopicDetailDialog';
import SuggestionDialog from './components/SuggestionDialog';
import RegisteredGroupsDialog from './components/RegisteredGroupsDialog';
import ImportTopicDialog from './components/ImportTopicDialog';
import { getColumns } from './components/columns';
import ReuseTopicDialog from './components/ReuseTopicDialog';

// --- Internal Component: StatCard ---
const StatCard = ({ icon: Icon, title, value, description, iconBgClass, iconColorClass }) => {
    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme();
    const isReduced = reduceMotion || shouldReduceMotion;

    return (
        <motion.div 
            className="bg-card text-card-foreground p-4 rounded-xl shadow-sm border flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:border-primary/20 h-full"
            whileHover={isReduced ? {} : { y: -4, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            <motion.div 
                className={cn("p-3 rounded-lg flex-shrink-0", iconBgClass)}
                animate={isReduced ? {} : { 
                    scale: value === 'loading' ? [1, 1.05, 1] : 1,
                }}
                transition={{ 
                    duration: 2, 
                    repeat: value === 'loading' ? Infinity : 0, 
                    ease: "easeInOut" 
                }}
            >
                <Icon className={cn("h-6 w-6", iconColorClass)} />
            </motion.div>
            <div className="flex-1 min-w-0">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
                <div className="flex items-baseline gap-2 mt-0.5 h-8 overflow-hidden">
                    <AnimatePresence mode="wait">
                        {value === 'loading' ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </motion.div>
                        ) : (
                            <motion.div 
                                key={value}
                                initial={isReduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <p className="text-2xl font-bold tracking-tight">{value}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                        {description}
                    </p>
                )}
            </div>
        </motion.div>
    );
};

// --- Animation Variants ---
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
            visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
        },
        table: {
            hidden: { opacity: 0, y: 30, scale: 0.98 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 80, damping: 18, duration: 0.5 } },
            exit: { opacity: 0, y: -30, scale: 0.98, transition: { duration: 0.3 } }
        }
    };
};

const columnVisibility = {
    "chuyen_nganh_id": false,
};

// === MAIN COMPONENT ===
const ThesisTopicsPage = () => {
    const { user } = useAuth();
    
    // Main Data States
    const [topics, setTopics] = useState([]); // Danh sách đề tài (theo trang hiện tại)
    const [loading, setLoading] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);
    
    // Stats Data States
    const [myQuota, setMyQuota] = useState(null);
    const [supervisedTopicsCount, setSupervisedTopicsCount] = useState(0);
    const [assignedReviewCount, setAssignedReviewCount] = useState(0);
    const [contributedCount, setContributedCount] = useState(0);

    // Dialog States
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [showTopicDetailDialog, setShowTopicDetailDialog] = useState(false);
    const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
    const [showSubmitApprovalDialog, setShowSubmitApprovalDialog] = useState(false);
    const [showRegisteredGroupsDialog, setShowRegisteredGroupsDialog] = useState(false);
    const [reuseDialogOpen, setReuseDialogOpen] = useState(false);

    // Selection States
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [selectedTopicForGroups, setSelectedTopicForGroups] = useState(null);
    const [editingTopic, setEditingTopic] = useState(null);

    // Filter & Pagination States
    const [activeTab, setActiveTab] = useState('my');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce 500ms cho search server-side
    const [columnFilters, setColumnFilters] = useState([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [serverPageCount, setServerPageCount] = useState(0); // Tổng số trang từ server
    const [sorting, setSorting] = useState([{ id: 'NGAYTAO', desc: true }]);
    const [rowSelection, setRowSelection] = useState({});

    // Context Data States
    const [selectedPlan, setSelectedPlan] = useState('');
    const [currentPlanData, setCurrentPlanData] = useState(null); 
    const [plans, setPlans] = useState([]);
    const [chuyenNganhOptions, setChuyenNganhOptions] = useState([]);

    // Navigation for Detail Dialog
    const [currentTopicIndex, setCurrentTopicIndex] = useState(0);

    // Motion & Theme
    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme();
    const isReduced = reduceMotion || shouldReduceMotion;
    const variants = useMemo(() => getVariants(isReduced), [isReduced]);

    // Feature Flag: Kiểm tra quyền GV_RA_DE
    const canSubmitApproval = useFeatureFlag(currentPlanData, 'GV_RA_DE');

    // --- Kiểm tra quyền Import ---
    const role = user?.vaitro?.TEN_VAITRO;
    const positions = user?.giangvien?.chucvus || [];
    const canImport = role === 'Admin' || positions.length > 0; 

    // 1. Load dữ liệu ban đầu (Kế hoạch, Chuyên ngành)
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        setLoadingStats(true);
        try {
            const [plansRes, specRes] = await Promise.all([
                axios.get('/admin/thesis-plans/list-all'),
                getChuyenNganhs()
            ]);

            const plansData = plansRes.data || [];
            setPlans(plansData);
            
            setChuyenNganhOptions(
                (specRes || []).map(cn => ({
                    label: cn.TEN_CHUYENNGANH,
                    value: String(cn.ID_CHUYENNGANH)
                }))
            );

            // Tự động chọn kế hoạch đang hoạt động hoặc mới nhất
            if (plansData.length > 0 && !selectedPlan) {
                const activePlan = plansData.find(p => p.TRANGTHAI === 'Đang thực hiện') || plansData[0];
                setSelectedPlan(String(activePlan.ID_KEHOACH));
            } else if (plansData.length === 0) {
                setLoading(false);
                setLoadingStats(false);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            toast.error("Lỗi khi tải dữ liệu hệ thống.");
            setLoading(false);
            setLoadingStats(false);
        }
    };

    // 2. Fetch Dữ liệu chính (Server-side Pagination & Filtering)
    // Hàm này được gọi khi: selectedPlan, activeTab, pagination, sorting, filters thay đổi
    const fetchTopicsData = useCallback(async () => {
        if (!selectedPlan) return;

        setLoading(true);
        try {
            // Map activeTab sang filter_mode
            let filterMode = 'all';
            if (activeTab === 'my') filterMode = 'my';
            if (activeTab === 'review') filterMode = 'review';

            // Chuẩn bị params
            const params = {
                plan_id: selectedPlan,
                filter_mode: filterMode,
                page: pagination.pageIndex + 1, // React Table dùng 0-based, Laravel dùng 1-based
                per_page: pagination.pageSize,
                search: debouncedSearchTerm,
                // Có thể thêm sorting vào params nếu Backend hỗ trợ sort động
                // sort_by: sorting[0]?.id,
                // sort_dir: sorting[0]?.desc ? 'desc' : 'asc'
            };

            // Xử lý Column Filters (Client filter -> Server param)
            // Ví dụ: status, chuyên ngành
            const statusFilter = columnFilters.find(f => f.id === 'TRANGTHAI');
            if (statusFilter) params.status = statusFilter.value; // Backend cần hỗ trợ nhận mảng hoặc giá trị đơn

            const majorFilter = columnFilters.find(f => f.id === 'chuyen_nganh_id');
            if (majorFilter) params.major_id = majorFilter.value;

            const response = await thesisTopicService.getTopics(params);
            const { data, last_page, total } = response.data;

            setTopics(data || []);
            setServerPageCount(last_page || 1);
            
        } catch (error) {
            console.error("Error fetching topics:", error);
            toast.error("Không thể tải danh sách đề tài.");
            setTopics([]);
        } finally {
            setLoading(false);
        }
    }, [selectedPlan, activeTab, pagination.pageIndex, pagination.pageSize, debouncedSearchTerm, columnFilters, sorting]);

    // Trigger fetch khi các dependency thay đổi
    useEffect(() => {
        fetchTopicsData();
    }, [fetchTopicsData]);

    // Reset về trang 1 khi đổi Plan, Tab hoặc Search
    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [selectedPlan, activeTab, debouncedSearchTerm, columnFilters]);

    // 3. Fetch Dữ liệu thống kê (Stats) & Thông tin kế hoạch (Chỉ khi đổi Plan)
    useEffect(() => {
        if (selectedPlan) {
            loadPlanStatsAndInfo(selectedPlan);
        }
    }, [selectedPlan]);

    const loadPlanStatsAndInfo = async (planId) => {
        setLoadingStats(true);
        try {
            const [quotaRes, planDetailRes, supervisedRes] = await Promise.all([
                lecturerQuotaService.getMyQuota({ plan_id: planId }),
                getThesisPlanById(planId),
                thesisTopicService.getSupervisedTopics({ plan_id: planId })
            ]);

            setMyQuota(quotaRes.data);
            setCurrentPlanData(planDetailRes);
            setSupervisedTopicsCount(supervisedRes.data.total || 0);
            
            // [Tùy chọn] Lấy thống kê review riêng nếu API getMyQuota chưa trả về đủ
            // Ở đây giả sử ta lấy tạm từ quotaRes hoặc phải gọi thêm API stats
            // setAssignedReviewCount(...) 

        } catch (error) {
            console.error("Error loading plan stats:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    // --- CRUD Handlers ---
    const handleCreateTopic = async (topicData) => {
        try {
            await thesisTopicService.createTopic(topicData);
            toast.success("Tạo đề tài thành công!");
            setShowCreateDialog(false);
            setEditingTopic(null);
            fetchTopicsData(); // Reload list
            loadPlanStatsAndInfo(selectedPlan); // Reload stats
        } catch (error) {
            console.error('Error creating topic:', error);
            toast.error("Lỗi khi tạo đề tài.");
        }
    };

    const handleEditTopic = async (topicData) => {
        try {
            await thesisTopicService.updateTopic(editingTopic.ID_DETAI, topicData);
            toast.success("Cập nhật đề tài thành công!");
            setShowCreateDialog(false);
            setEditingTopic(null);
            fetchTopicsData();
        } catch (error) {
            console.error('Error updating topic:', error);
            toast.error("Lỗi khi cập nhật đề tài.");
        }
    };

    const handleSubmitForApproval = async (topicId) => {
        try {
            await thesisTopicService.submitForApproval(topicId);
            toast.success("Gửi duyệt đề tài thành công!");
            fetchTopicsData();
        } catch (error) {
            console.error('Error submitting for approval:', error);
            toast.error(error.response?.data?.message || "Lỗi khi gửi duyệt.");
        }
    };

    const handleDeleteTopic = async (topicId) => {
        try {
            await thesisTopicService.deleteTopic(topicId);
            toast.success("Xóa đề tài thành công!");
            fetchTopicsData();
            loadPlanStatsAndInfo(selectedPlan);
        } catch (error) {
            console.error('Error deleting topic:', error);
            toast.error(error.response?.data?.message || "Lỗi khi xóa đề tài.");
        }
    };

    // --- Navigation Logic cho Detail Dialog ---
    const handleViewTopicDetails = (topicId) => {
        setSelectedTopicId(topicId);
        setShowTopicDetailDialog(true);
        const idx = topics.findIndex(t => t.ID_DETAI === topicId);
        setCurrentTopicIndex(idx >= 0 ? idx : 0);
    };

    const hasNext = currentTopicIndex < topics.length - 1;
    const hasPrevious = currentTopicIndex > 0;

    const handleNextTopic = () => { 
        if (hasNext) {
            const nextIdx = currentTopicIndex + 1;
            setCurrentTopicIndex(nextIdx);
            setSelectedTopicId(topics[nextIdx].ID_DETAI);
        }
    };

    const handlePreviousTopic = () => { 
        if (hasPrevious) {
            const prevIdx = currentTopicIndex - 1;
            setCurrentTopicIndex(prevIdx);
            setSelectedTopicId(topics[prevIdx].ID_DETAI);
        }
    };

    const handleAddSuggestion = (topicId) => {
        setSelectedTopicId(topicId);
        setShowSuggestionDialog(true);
    };
    const handleViewRegisteredGroups = (topic) => {
        setSelectedTopicForGroups(topic);
        setShowRegisteredGroupsDialog(true);
    };

    // --- Columns Definition ---
    const columns = useMemo(() => getColumns({
        currentUserId: user?.giangvien?.ID_GIANGVIEN,
        onEdit: (topic) => { setEditingTopic(topic); setShowCreateDialog(true); },
        onDelete: handleDeleteTopic,
        onSubmit: handleSubmitForApproval,
        onViewDetails: handleViewTopicDetails,
        onAddSuggestion: handleAddSuggestion,
        onViewRegisteredGroups: handleViewRegisteredGroups,
        isReviewTab: activeTab === 'review',
        canSubmitApproval: canSubmitApproval,
    }), [user, activeTab, canSubmitApproval, topics]); // Thêm topics vào deps nếu cần update khi list thay đổi

    return (
        <motion.div 
            className="flex-1 space-y-6 p-8 pb-0 flex flex-col h-[calc(100vh-5.5rem)] overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div className="shrink-0 space-y-6">
                {/* Top Bar: Title, Plan Select, Actions */}
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div className="flex items-center justify-between w-full gap-4">
                        {/* Plan Selector */}
                        <Select
                            value={selectedPlan ? String(selectedPlan) : ""}
                            onValueChange={setSelectedPlan}
                            disabled={loading}
                        >
                            <SelectTrigger className="w-full md:w-[350px] bg-background">
                                <SelectValue placeholder="Chọn kế hoạch" />
                            </SelectTrigger>
                            <SelectContent>
                                {plans.map(plan => (
                                    <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                        {plan.TEN_DOT} - {plan.NAMHOC} ({plan.TRANGTHAI})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={fetchTopicsData}
                                disabled={loading}
                                title="Tải lại dữ liệu"
                            >
                                <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                            </Button>

                            {canImport && (
                                <Button 
                                    variant="outline" 
                                    onClick={() => setShowImportDialog(true)}
                                    disabled={loading || !selectedPlan}
                                >
                                    <Upload className="w-4 h-4 mr-2" /> Import
                                </Button>
                            )}

                            <Button
                                onClick={() => { setEditingTopic(null); setShowCreateDialog(true); }}
                                disabled={loading || !selectedPlan}
                            >
                                <Plus className="w-4 h-4 mr-2" /> Tạo đề tài
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <motion.div 
                    className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                    variants={variants.container}
                    initial="hidden"
                    animate="visible"
                >
                    <StatCard 
                        icon={Users} 
                        title="Quota được giao" 
                        value={loadingStats ? 'loading' : myQuota?.quota_assigned ?? 0} 
                        description="Số đề tài tối đa" 
                        iconBgClass="bg-blue-100 dark:bg-blue-900/30" 
                        iconColorClass="text-blue-600 dark:text-blue-400" 
                    />
                    <StatCard 
                        icon={FileSignature} 
                        title="Tiến độ ra đề" 
                        value={loadingStats ? 'loading' : `${myQuota?.topics_created ?? 0} / ${myQuota?.quota_assigned ?? 0}`} 
                        description={loadingStats ? "..." : `Cần tạo thêm: ${myQuota?.topics_needed ?? 0}`} 
                        iconBgClass="bg-green-100 dark:bg-green-900/30" 
                        iconColorClass="text-green-600 dark:text-green-400" 
                    />
                    <StatCard 
                        icon={CheckCircle} 
                        title="Nhóm đã nhận HD" 
                        value={loadingStats ? 'loading' : myQuota?.actual_assigned ?? 0} 
                        description="Nhóm đang hướng dẫn" 
                        iconBgClass="bg-indigo-100 dark:bg-indigo-900/30" 
                        iconColorClass="text-indigo-600 dark:text-indigo-400" 
                    />
                    <StatCard 
                        icon={MessageSquare} 
                        title="Góp ý phản biện" 
                        value={loadingStats ? 'loading' : `${myQuota?.reviewed_count ?? 0} / ${myQuota?.total_reviews_assigned ?? 0}`} 
                        description={loadingStats ? "..." : `Chưa góp ý: ${myQuota?.pending_reviews ?? 0}`} 
                        iconBgClass="bg-purple-100 dark:bg-purple-900/30" 
                        iconColorClass="text-purple-600 dark:text-purple-400" 
                    />
                </motion.div>
            </div>

            {/* Tabs Content */}
            <div className="flex-1 min-h-0 flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full space-y-4">
                    <div className="shrink-0">
                        <TabsList className={cn("transition-all duration-300 w-full justify-start bg-transparent p-0 h-auto gap-2", isReduced && "transition-none")}>
                            <TabsTrigger value="my" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md px-4 py-2 border border-transparent data-[state=inactive]:border-border/50 data-[state=inactive]:bg-background">
                                Đề tài của tôi
                            </TabsTrigger>
                            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md px-4 py-2 border border-transparent data-[state=inactive]:border-border/50 data-[state=inactive]:bg-background">
                                Tất cả đề tài (Khoa)
                            </TabsTrigger>
                            <TabsTrigger value="review" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md px-4 py-2 border border-transparent data-[state=inactive]:border-border/50 data-[state=inactive]:bg-background">
                                Đề tài cần góp ý
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 min-h-0 overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={activeTab} 
                                variants={variants.table} 
                                initial="hidden" 
                                animate="visible" 
                                exit="exit"
                                className="h-full flex flex-col"
                            >
                                <TabsContent value={activeTab} className="mt-0 h-full outline-none ring-0 flex flex-col">
                                    {/* DataTable với Server-side Pagination */}
                                    <DataTable
                                        columns={columns}
                                        data={topics}
                                        pageCount={serverPageCount} // Quan trọng: Tổng số trang từ server
                                        loading={loading}
                                        
                                        // Pagination State Control
                                        pagination={pagination}
                                        setPagination={setPagination}
                                        
                                        // Filters State Control
                                        columnFilters={columnFilters}
                                        setColumnFilters={setColumnFilters}
                                        
                                        // Sorting State Control
                                        sorting={sorting}
                                        setSorting={setSorting}

                                        // Search Params
                                        searchColumnId="TEN_DETAI"
                                        searchPlaceholder="Tìm theo tên, GV, mã..."
                                        searchTerm={searchTerm}
                                        onSearchChange={setSearchTerm}

                                        // Filter Options (Client or Server logic supported by DataTable component structure)
                                        chuyenNganhFilterColumnId="chuyen_nganh_id"
                                        chuyenNganhFilterOptions={chuyenNganhOptions}
                                        
                                        statusColumnId="TRANGTHAI"
                                        statusOptions={[
                                            { value: "Nháp", label: "Nháp" },
                                            { value: "Chờ duyệt", label: "Chờ duyệt" },
                                            { value: "Yêu cầu chỉnh sửa", label: "Yêu cầu chỉnh sửa" },
                                            { value: "Đã duyệt", label: "Đã duyệt" },
                                            { value: "Từ chối", label: "Từ chối" },
                                        ]}

                                        columnVisibility={columnVisibility}
                                        state={{ rowSelection, sorting, columnFilters, pagination, columnVisibility }}
                                        onRowSelectionChange={setRowSelection}
                                        
                                        flexLayout={true}
                                        className="h-full"
                                    />
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </Tabs>
            </div>

            {/* Dialogs */}
            <CreateTopicDialog 
                open={showCreateDialog} 
                onOpenChange={(open) => {
                    setShowCreateDialog(open);
                    if (!open) setEditingTopic(null);
                }}
                onSubmit={editingTopic ? handleEditTopic : handleCreateTopic}
                topic={editingTopic}
            />

            <Dialog open={showSubmitApprovalDialog} onOpenChange={setShowSubmitApprovalDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Gửi duyệt đề tài</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn gửi đề tài này để duyệt không?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-sm text-gray-600">
                        Sau khi gửi duyệt, đề tài sẽ chuyển sang trạng thái "Chờ duyệt".
                    </div>
                    <DialogFooter>
                        <div className="flex justify-end gap-2 w-full">
                            <Button variant="outline" onClick={() => setShowSubmitApprovalDialog(false)}>
                                Hủy
                            </Button>
                            <Button 
                                onClick={() => {
                                    handleSubmitForApproval(selectedTopicId);
                                    setShowSubmitApprovalDialog(false);
                                }}
                            >
                                Gửi duyệt
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <TopicDetailDialog 
                open={showTopicDetailDialog} 
                onOpenChange={setShowTopicDetailDialog} 
                topicId={selectedTopicId} 
                showAdminActions={false} 
                onApprove={null}
                onReject={null}
                onRequestEdit={null}
                onNext={handleNextTopic}
                onPrevious={handlePreviousTopic}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
                onDataChange={() => {
                    fetchTopicsData();
                    loadPlanStatsAndInfo(selectedPlan);
                }}
            />

            <SuggestionDialog 
                open={showSuggestionDialog} 
                onOpenChange={setShowSuggestionDialog} 
                onSubmit={async (suggestion) => {
                    try {
                        const res = await thesisTopicService.addSuggestion(selectedTopicId, { NOIDUNG_GOIY: suggestion });
                        toast.success(res.data.message || 'Góp ý đã được gửi!');
                        setShowSuggestionDialog(false);
                        fetchTopicsData(); // Reload list to reflect status changes if any
                    } catch (error) {
                        toast.error(error.response?.data?.message || 'Có lỗi khi gửi góp ý');
                        throw error;
                    }
                }}
                topic={topics.find(t => t.ID_DETAI === selectedTopicId)}
            />

            <RegisteredGroupsDialog 
                open={showRegisteredGroupsDialog} 
                onOpenChange={setShowRegisteredGroupsDialog} 
                topic={selectedTopicForGroups} 
            />

            <ImportTopicDialog 
                open={showImportDialog} 
                onOpenChange={setShowImportDialog} 
                planId={selectedPlan} 
                onSuccess={() => {
                    fetchTopicsData();
                    loadPlanStatsAndInfo(selectedPlan);
                }} 
            />

            <ReuseTopicDialog
                open={reuseDialogOpen}
                onOpenChange={setReuseDialogOpen}
                onReuseSuccess={() => {
                    fetchTopicsData();
                    loadPlanStatsAndInfo(selectedPlan);
                }}
            />

        </motion.div>
    );
};

export default ThesisTopicsPage;