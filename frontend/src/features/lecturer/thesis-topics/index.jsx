import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Plus, Send, BookOpen, Loader2, Users, CheckCircle, AlertTriangle, 
    FileSignature, MessageSquare, Upload, RefreshCcw, Filter
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
import { getThesisPlanById, getAllPlans } from '@/api/thesisPlanService'; 
import { getKhoaBomons } from '@/api/userService';
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

// Ẩn cột department_id
const columnVisibility = {
    "department_id": false,
};

const ThesisTopicsPage = () => {
    const { user } = useAuth();
    
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);
    
    const [myQuota, setMyQuota] = useState(null);
    
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [showTopicDetailDialog, setShowTopicDetailDialog] = useState(false);
    const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
    const [showSubmitApprovalDialog, setShowSubmitApprovalDialog] = useState(false);
    const [showRegisteredGroupsDialog, setShowRegisteredGroupsDialog] = useState(false);
    const [reuseDialogOpen, setReuseDialogOpen] = useState(false);

    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [selectedTopicForGroups, setSelectedTopicForGroups] = useState(null);
    const [editingTopic, setEditingTopic] = useState(null);

    const [activeTab, setActiveTab] = useState('my');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [columnFilters, setColumnFilters] = useState([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [serverPageCount, setServerPageCount] = useState(0);
    const [sorting, setSorting] = useState([{ id: 'NGAYTAO', desc: true }]);
    const [rowSelection, setRowSelection] = useState({});

    const [selectedPlan, setSelectedPlan] = useState('');
    const [currentPlanData, setCurrentPlanData] = useState(null); 
    const [plans, setPlans] = useState([]);
    
    // State departmentOptions
    const [departmentOptions, setDepartmentOptions] = useState([]);

    // --- [QUAN TRỌNG] Xóa state currentTopicIndex cũ để dùng useMemo ---
    // const [currentTopicIndex, setCurrentTopicIndex] = useState(0); 

    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme();
    const isReduced = reduceMotion || shouldReduceMotion;
    const variants = useMemo(() => getVariants(isReduced), [isReduced]);

    const canSubmitApproval = useFeatureFlag(currentPlanData, 'GV_RA_DE');

    const role = user?.vaitro?.TEN_VAITRO;
    const positions = user?.giangvien?.chucvus || [];
    const canImport = role === 'Admin' || positions.length > 0; 

    // --- Logic khởi tạo dữ liệu ---
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        setLoadingStats(true);
        try {
            const [plansRes, deptRes] = await Promise.all([
                getAllPlans(),
                getKhoaBomons() 
            ]);

            const plansData = plansRes || []; 
            setPlans(plansData);
            
            setDepartmentOptions(
                (deptRes || []).map(dept => ({
                    label: dept.TEN_KHOA_BOMON,
                    value: String(dept.ID_KHOA_BOMON)
                }))
            );

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

    // --- Logic Fetch Topics ---
    const fetchTopicsData = useCallback(async () => {
        if (!selectedPlan) return;

        setLoading(true);
        try {
            let filterMode = 'all';
            if (activeTab === 'my') filterMode = 'my';
            if (activeTab === 'review') filterMode = 'review';

            const params = {
                plan_id: selectedPlan,
                filter_mode: filterMode,
                page: pagination.pageIndex + 1,
                per_page: pagination.pageSize,
                search: debouncedSearchTerm,
            };

            const statusFilter = columnFilters.find(f => f.id === 'TRANGTHAI');
            if (statusFilter) params.status = statusFilter.value;

            // Filter theo Department ID
            const deptFilter = columnFilters.find(f => f.id === 'department_id');
            if (deptFilter) params.department_id = deptFilter.value;

            const response = await thesisTopicService.getTopics(params);
            const { data, last_page } = response.data;

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

    useEffect(() => {
        fetchTopicsData();
    }, [fetchTopicsData]);

    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [selectedPlan, activeTab, debouncedSearchTerm, columnFilters]);

    // --- Logic Fetch Stats ---
    useEffect(() => {
        if (selectedPlan) {
            loadPlanStatsAndInfo(selectedPlan);
        }
    }, [selectedPlan]);

    const loadPlanStatsAndInfo = async (planId) => {
        setLoadingStats(true);
        try {
            const [quotaRes, planDetailRes] = await Promise.all([
                lecturerQuotaService.getMyQuota({ plan_id: planId }),
                getThesisPlanById(planId),
            ]);

            setMyQuota(quotaRes.data);
            setCurrentPlanData(planDetailRes);

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
            fetchTopicsData();
            loadPlanStatsAndInfo(selectedPlan);
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

    // --- [SỬA] LOGIC ĐIỀU HƯỚNG MỚI (Dynamic Calculation) ---
    // Tính toán index dựa trên ID đang chọn và danh sách topics hiện có
    // Sử dụng String() để đảm bảo an toàn khi so sánh
    const currentTopicIndex = useMemo(() => {
        if (!selectedTopicId || topics.length === 0) return -1;
        return topics.findIndex(t => String(t.ID_DETAI) === String(selectedTopicId));
    }, [topics, selectedTopicId]);

    const hasNext = currentTopicIndex !== -1 && currentTopicIndex < topics.length - 1;
    const hasPrevious = currentTopicIndex > 0;

    const handleNextTopic = useCallback(() => { 
        if (hasNext) {
            const nextTopic = topics[currentTopicIndex + 1];
            if (nextTopic) {
                setSelectedTopicId(nextTopic.ID_DETAI);
            }
        }
    }, [hasNext, currentTopicIndex, topics]);

    const handlePreviousTopic = useCallback(() => { 
        if (hasPrevious) {
            const prevTopic = topics[currentTopicIndex - 1];
            if (prevTopic) {
                setSelectedTopicId(prevTopic.ID_DETAI);
            }
        }
    }, [hasPrevious, currentTopicIndex, topics]);

    const handleViewTopicDetails = (topicId) => {
        setSelectedTopicId(topicId);
        setShowTopicDetailDialog(true);
    };

    // --- Other Dialog Handlers ---
    const handleAddSuggestion = (topicId) => {
        setSelectedTopicId(topicId);
        setShowSuggestionDialog(true);
    };
    const handleViewRegisteredGroups = (topic) => {
        setSelectedTopicForGroups(topic);
        setShowRegisteredGroupsDialog(true);
    };

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
    }), [user, activeTab, canSubmitApproval, topics]);

    return (
        <motion.div 
            className="flex-1 space-y-6 p-8 pb-0 flex flex-col h-[calc(100vh-5.5rem)] overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div className="shrink-0 space-y-6">
                {/* Top Bar */}
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div className="flex items-center justify-between w-full gap-4">
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
                    <motion.div variants={variants.item}>
                        <StatCard 
                            icon={Users} 
                            title="Quota được giao" 
                            value={loadingStats ? 'loading' : myQuota?.quota_assigned ?? 0} 
                            description="Số đề tài tối đa" 
                            iconBgClass="bg-blue-100 dark:bg-blue-900/30" 
                            iconColorClass="text-blue-600 dark:text-blue-400" 
                        />
                    </motion.div>
                    <motion.div variants={variants.item}>
                        <StatCard 
                            icon={FileSignature} 
                            title="Tiến độ ra đề" 
                            value={loadingStats ? 'loading' : `${myQuota?.topics_created ?? 0} / ${myQuota?.quota_assigned ?? 0}`} 
                            description={loadingStats ? "..." : `Cần tạo thêm: ${myQuota?.topics_needed ?? 0}`} 
                            iconBgClass="bg-green-100 dark:bg-green-900/30" 
                            iconColorClass="text-green-600 dark:text-green-400" 
                        />
                    </motion.div>
                    <motion.div variants={variants.item}>
                        <StatCard 
                            icon={CheckCircle} 
                            title="Nhóm đã nhận HD" 
                            value={loadingStats ? 'loading' : myQuota?.actual_assigned ?? 0} 
                            description="Nhóm đang hướng dẫn" 
                            iconBgClass="bg-indigo-100 dark:bg-indigo-900/30" 
                            iconColorClass="text-indigo-600 dark:text-indigo-400" 
                        />
                    </motion.div>
                    <motion.div variants={variants.item}>
                        <StatCard 
                            icon={MessageSquare} 
                            title="Góp ý phản biện" 
                            value={loadingStats ? 'loading' : `${myQuota?.reviewed_count ?? 0} / ${myQuota?.total_reviews_assigned ?? 0}`} 
                            description={loadingStats ? "..." : `Chưa góp ý: ${myQuota?.pending_reviews ?? 0}`} 
                            iconBgClass="bg-purple-100 dark:bg-purple-900/30" 
                            iconColorClass="text-purple-600 dark:text-purple-400" 
                        />
                    </motion.div>
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
                                    <DataTable
                                        columns={columns}
                                        data={topics}
                                        pageCount={serverPageCount}
                                        loading={loading}
                                        
                                        pagination={pagination}
                                        setPagination={setPagination}
                                        
                                        columnFilters={columnFilters}
                                        setColumnFilters={setColumnFilters}
                                        
                                        sorting={sorting}
                                        setSorting={setSorting}
                                        
                                        onSuccess={() => {
                                            fetchTopicsData();
                                            loadPlanStatsAndInfo(selectedPlan);
                                        }}
                                        
                                        searchColumnId="TEN_DETAI"
                                        searchPlaceholder="Tìm theo tên, GV, mã..."
                                        searchTerm={searchTerm}
                                        onSearchChange={setSearchTerm}

                                        // Filter Bộ môn
                                        khoaBomonFilterColumnId="department_id"
                                        khoaBomonFilterOptions={departmentOptions}
                                        khoaBomonFilterTitle="Bộ môn"
                                        
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
                        <DialogDescription>Bạn có chắc chắn muốn gửi đề tài này để duyệt không?</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-sm text-gray-600">Sau khi gửi duyệt, đề tài sẽ chuyển sang trạng thái "Chờ duyệt".</div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSubmitApprovalDialog(false)}>Hủy</Button>
                        <Button onClick={() => { handleSubmitForApproval(selectedTopicId); setShowSubmitApprovalDialog(false); }}>Gửi duyệt</Button>
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
                
                // --- TRUYỀN PROPS ĐIỀU HƯỚNG MỚI ---
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
                        fetchTopicsData(); 
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