import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Send, BookOpen, Loader2, Users, CheckCircle, AlertTriangle, FileSignature, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import CreateTopicDialog from './components/CreateTopicDialog';
import TopicDetailDialog from './components/TopicDetailDialog';
import SuggestionDialog from './components/SuggestionDialog';
import RegisteredGroupsDialog from './components/RegisteredGroupsDialog';
import { thesisTopicService } from '@/api/thesisTopicService';
import lecturerQuotaService from '@/api/lecturerQuotaService';
import { getThesisPlanById } from '@/api/thesisPlanService'; 
import axios from '@/api/axiosConfig';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from '@/components/shared/data-table/DataTable';
import { getColumns } from './components/columns';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { getChuyenNganhs } from '@/api/userService';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useTheme } from "@/components/theme-provider";

// [ĐÃ SỬA] Thêm import Dialog và các thành phần con
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from '@/components/ui/dialog';

// --- StatCard với logic giảm chuyển động ---
const StatCard = ({ icon: Icon, title, value, description, iconBgClass, iconColorClass }) => {
    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme();
    const isReduced = reduceMotion || shouldReduceMotion;

    return (
        <motion.div
            className="bg-card text-card-foreground p-4 rounded-xl shadow-sm border flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:border-primary/20"
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
                <div className="flex items-baseline gap-2 mt-0.5">
                    <AnimatePresence mode="wait">
                        {value === 'loading' ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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

// --- Variants với logic giảm chuyển động ---
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

const ThesisTopicsPage = () => {
    const { user } = useAuth();
    const [topics, setTopics] = useState([]);
    const [supervisedTopics, setSupervisedTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);

    // Dialog States
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showTopicDetailDialog, setShowTopicDetailDialog] = useState(false);
    const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
    const [showSubmitApprovalDialog, setShowSubmitApprovalDialog] = useState(false);
    const [showRegisteredGroupsDialog, setShowRegisteredGroupsDialog] = useState(false);

    // Selection States
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [selectedTopicForGroups, setSelectedTopicForGroups] = useState(null);
    const [editingTopic, setEditingTopic] = useState(null);

    // Filter & Pagination States
    const [activeTab, setActiveTab] = useState('my');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [columnFilters, setColumnFilters] = useState([]);
    const [contributionFilter, setContributionFilter] = useState('all');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState([{ id: 'TEN_DETAI', desc: false }]);
    const [rowSelection, setRowSelection] = useState({});

    // Data States
    const [selectedPlan, setSelectedPlan] = useState('');
    const [currentPlanData, setCurrentPlanData] = useState(null); 
    const [plans, setPlans] = useState([]);
    const [specializations, setSpecializations] = useState([]);
    const [myQuota, setMyQuota] = useState(null);

    // Motion & Theme
    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme();
    const isReduced = reduceMotion || shouldReduceMotion;
    const variants = useMemo(() => getVariants(isReduced), [isReduced]);

    // Feature Flag
    const canSubmitApproval = useFeatureFlag(currentPlanData, 'GV_RA_DE');

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
            setSpecializations(specRes || []);

            if (plansData.length > 0 && !selectedPlan) {
                const activePlan = plansData.find(p => p.TRANGTHAI === 'Đang thực hiện') || plansData[0];
                setSelectedPlan(String(activePlan.ID_KEHOACH));
                loadPlanDependentData(String(activePlan.ID_KEHOACH));
            } else if (plansData.length === 0) {
                setLoading(false);
                setLoadingStats(false);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            toast.error("Lỗi khi tải dữ liệu kế hoạch và chuyên ngành.");
            setLoading(false);
            setLoadingStats(false);
        }
    };

    const loadPlanDependentData = useCallback(async (planId) => {
        if (!planId) {
            setTopics([]);
            setSupervisedTopics([]);
            setMyQuota(null);
            setCurrentPlanData(null);
            setLoading(false);
            setLoadingStats(false);
            return;
        }

        setLoading(true);
        setLoadingStats(true);
        try {
            const params = { plan_id: planId };
            const [topicsRes, supervisedRes, quotaRes, planDetailRes] = await Promise.all([
                thesisTopicService.getTopics(params), 
                thesisTopicService.getSupervisedTopics(params),
                lecturerQuotaService.getMyQuota(params),
                getThesisPlanById(planId)
            ]);

            setTopics(topicsRes.data.data || []);
            setSupervisedTopics(supervisedRes.data.data || []);
            setMyQuota(quotaRes.data);
            setCurrentPlanData(planDetailRes);
        } catch (error) {
            console.error('Error loading plan dependent data:', error);
            toast.error("Lỗi khi tải dữ liệu đề tài và quota.");
            setTopics([]);
            setSupervisedTopics([]);
            setMyQuota(null);
        } finally {
            setLoading(false);
            setLoadingStats(false);
        }
    }, []);

    useEffect(() => {
        if (selectedPlan) {
            loadPlanDependentData(selectedPlan);
        }
    }, [selectedPlan, loadPlanDependentData]);

    // --- Handlers CRUD ---
    const handleCreateTopic = async (topicData) => {
        try {
            await thesisTopicService.createTopic(topicData);
            toast.success("Tạo đề tài thành công!");
            setShowCreateDialog(false);
            setEditingTopic(null);
            loadPlanDependentData(selectedPlan);
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
            loadPlanDependentData(selectedPlan);
        } catch (error) {
            console.error('Error updating topic:', error);
            toast.error("Lỗi khi cập nhật đề tài.");
        }
    };

    const handleSubmitForApproval = async (topicId) => {
        try {
            await thesisTopicService.submitForApproval(topicId);
            toast.success("Gửi duyệt đề tài thành công!");
            loadPlanDependentData(selectedPlan);
        } catch (error) {
            console.error('Error submitting for approval:', error);
            toast.error(error.response?.data?.message || "Lỗi khi gửi duyệt.");
        }
    };

    const handleDeleteTopic = async (topicId) => {
        try {
            await thesisTopicService.deleteTopic(topicId);
            toast.success("Xóa đề tài thành công!");
            loadPlanDependentData(selectedPlan);
        } catch (error) {
            console.error('Error deleting topic:', error);
            toast.error(error.response?.data?.message || "Lỗi khi xóa đề tài.");
        }
    };

    // --- Navigation Handlers ---
    const handleViewTopicDetails = (topicId) => {
        setSelectedTopicId(topicId);
        setShowTopicDetailDialog(true);
    };
    const handleAddSuggestion = (topicId) => {
        setSelectedTopicId(topicId);
        setShowSuggestionDialog(true);
    };
    const handleViewRegisteredGroups = (topic) => {
        setSelectedTopicForGroups(topic);
        setShowRegisteredGroupsDialog(true);
    };

    // --- Data Processing ---
    const processedData = useMemo(() => {
        let filtered = topics; 
        if (activeTab === 'my') {
            filtered = filtered.filter(t => t.ID_NGUOI_DEXUAT === user?.giangvien?.ID_GIANGVIEN);
        }
        filtered = filtered.filter(t =>
            t.TEN_DETAI?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            t.ten_giang_vien?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            t.MA_DETAI?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
        filtered = filtered.filter(t => {
            return columnFilters.every(filter => {
                if (filter.id === 'chuyen_nganh_id') {
                    const filterValues = new Set(filter.value);
                    if (filterValues.size === 0) return true;
                    return filterValues.has(String(t.chuyennganh?.ID_CHUYENNGANH));
                }
                if (filter.id === 'TRANGTHAI') {
                    const filterValues = new Set(filter.value);
                    if (filterValues.size === 0) return true;
                    return filterValues.has(t.TRANGTHAI);
                }
                return true;
            });
        });

        // Sorting
        if (sorting.length > 0) {
            const { id, desc } = sorting[0];
            filtered.sort((a, b) => {
                let valA = a[id];
                let valB = b[id];
                if (id === 'chuyennganh.TEN_CHUYENNGANH') {
                    valA = a.chuyennganh?.TEN_CHUYENNGANH;
                    valB = b.chuyennganh?.TEN_CHUYENNGANH;
                }
                if (valA === null || valA === undefined) valA = '';
                if (valB === null || valB === undefined) valB = '';
                if (typeof valA === 'string') {
                    valA = valA.toLowerCase();
                    valB = valB.toLowerCase();
                }
                if (valA < valB) return desc ? 1 : -1;
                if (valA > valB) return desc ? -1 : 1;
                return 0;
            });
        }

        const pageCount = Math.ceil(filtered.length / pagination.pageSize);
        const pagedData = filtered.slice(
            pagination.pageIndex * pagination.pageSize,
            (pagination.pageIndex + 1) * pagination.pageSize
        );

        return { pagedData, pageCount, allFiltered: filtered }; 
    }, [topics, activeTab, debouncedSearchTerm, columnFilters, sorting, pagination, user, contributionFilter]);

    // Process Review Data
    const processedReviewData = useMemo(() => {
        if (!topics) return { pagedData: [], pageCount: 0, allFiltered: [] };
        let filtered = topics.filter(t =>
            t.phancong_nguoi_gop_y?.some(p => p.ID_GIANGVIEN === user?.giangvien?.ID_GIANGVIEN)
        );
        if (filtered.length === 0) return { pagedData: [], pageCount: 0, allFiltered: [] };

        if (contributionFilter === 'contributed') {
            filtered = filtered.filter(t =>
                t.goiyDetai?.some(g => g.ID_GIANGVIEN === user?.giangvien?.ID_GIANGVIEN)
            );
        } else if (contributionFilter === 'not_contributed') {
            filtered = filtered.filter(t =>
                !t.goiyDetai?.some(g => g.ID_GIANGVIEN === user?.giangvien?.ID_GIANGVIEN)
            );
        }
        
         filtered = filtered.filter(t =>
            t.TEN_DETAI?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            t.ten_giang_vien?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            t.MA_DETAI?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
        const pageCount = Math.ceil(filtered.length / pagination.pageSize);
        const pagedData = filtered.slice(
            pagination.pageIndex * pagination.pageSize,
            (pagination.pageIndex + 1) * pagination.pageSize
        );
        return { pagedData, pageCount, allFiltered: filtered }; 
    }, [topics, debouncedSearchTerm, columnFilters, sorting, pagination, user, contributionFilter]);

    // Reset pagination
    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [activeTab, columnFilters, debouncedSearchTerm, contributionFilter]);

    // Logic điều hướng
    const currentFilteredList = (activeTab === 'review' ? processedReviewData.allFiltered : processedData.allFiltered) || [];
    const currentIndex = currentFilteredList.findIndex(t => t.ID_DETAI === selectedTopicId);
    const hasNext = currentIndex !== -1 && currentIndex < currentFilteredList.length - 1;
    const hasPrevious = currentIndex > 0;

    const handleNextTopic = () => { if (hasNext) setSelectedTopicId(currentFilteredList[currentIndex + 1].ID_DETAI); };
    const handlePreviousTopic = () => { if (hasPrevious) setSelectedTopicId(currentFilteredList[currentIndex - 1].ID_DETAI); };

    // --- TÍNH TOÁN THỐNG KÊ ---
    const assignedReviewTopics = topics.filter(t => 
        t.phancong_nguoi_gop_y?.some(p => p.ID_GIANGVIEN === user?.giangvien?.ID_GIANGVIEN)
    );
    const contributedTopicsCount = assignedReviewTopics.filter(t => 
        t.goiyDetai?.some(g => g.ID_GIANGVIEN === user?.giangvien?.ID_GIANGVIEN)
    ).length;
    const pendingReviewCount = assignedReviewTopics.length - contributedTopicsCount;


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
    }), [user, myQuota, handleViewRegisteredGroups, handleSubmitForApproval, handleDeleteTopic, activeTab, canSubmitApproval]);

    return (
        <motion.div
            className="flex-1 space-y-6 p-4 md:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header */}
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

                    <Button
                        onClick={() => { setEditingTopic(null); setShowCreateDialog(true); }}
                        disabled={loading}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo đề tài
                    </Button>
                </div>
            </div>


            {/* --- STAT CARDS --- */}
            <motion.div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                variants={variants.container}
                initial="hidden"
                animate="visible"
            >
                {/* 1. Quota được giao */}
                <StatCard
                    icon={Users}
                    title="Quota được giao"
                    value={loadingStats ? 'loading' : myQuota?.quota_assigned ?? 0}
                    description="Số lượng tối thiểu"
                    iconBgClass="bg-blue-100 dark:bg-blue-900/30"
                    iconColorClass="text-blue-600 dark:text-blue-400"
                />

                {/* 2. Tiến độ ra đề (Đã tạo / Cần tạo thêm) */}
                <StatCard
                    icon={FileSignature}
                    title="Tiến độ ra đề"
                    value={loadingStats ? 'loading' : `${myQuota?.topics_created ?? 0} / ${myQuota?.quota_assigned ?? 0}`}
                    description={loadingStats ? "..." : `Cần tạo thêm: ${myQuota?.topics_needed ?? 0}`}
                    iconBgClass="bg-green-100 dark:bg-green-900/30"
                    iconColorClass="text-green-600 dark:text-green-400"
                />

                {/* 3. Nhóm đã nhận HD */}
                <StatCard
                    icon={CheckCircle}
                    title="Nhóm đã nhận HD"
                    value={loadingStats ? 'loading' : myQuota?.actual_assigned ?? 0}
                    description="Số nhóm thực tế"
                    iconBgClass="bg-indigo-100 dark:bg-indigo-900/30"
                    iconColorClass="text-indigo-600 dark:text-indigo-400"
                />

                {/* 4. Góp ý phản biện (Đã xong / Tổng) */}
                <StatCard
                    icon={MessageSquare}
                    title="Góp ý phản biện"
                    value={loadingStats ? 'loading' : `${contributedTopicsCount} / ${assignedReviewTopics.length}`}
                    description={loadingStats ? "..." : `Chưa góp ý: ${pendingReviewCount}`}
                    iconBgClass="bg-purple-100 dark:bg-purple-900/30"
                    iconColorClass="text-purple-600 dark:text-purple-400"
                />
            </motion.div>

            {/* Tabs & DataTable */}
            <motion.div
                variants={variants.table}
                initial="hidden"
                animate="visible"
            >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="my">Đề tài của tôi</TabsTrigger>
                        <TabsTrigger value="all">Tất cả đề tài (Khoa)</TabsTrigger>
                        <TabsTrigger value="review">Đề tài cần góp ý</TabsTrigger>
                    </TabsList>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            variants={variants.table}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <TabsContent value={activeTab} className="mt-0 outline-none ring-0">
                                {activeTab !== "review" && (
                                    <DataTable
                                        columns={columns}
                                        data={processedData.pagedData}
                                        pageCount={processedData.pageCount}
                                        loading={loading}
                                        pagination={pagination}
                                        setPagination={setPagination}
                                        columnFilters={columnFilters}
                                        setColumnFilters={setColumnFilters}
                                        sorting={sorting}
                                        setSorting={setSorting}
                                        searchColumnId="TEN_DETAI"
                                        searchPlaceholder="Tìm theo tên, GV, mã..."
                                        searchTerm={searchTerm}
                                        onSearchChange={setSearchTerm}
                                        chuyenNganhFilterColumnId="chuyen_nganh_id"
                                        chuyenNganhFilterOptions={specializations.map(c => ({
                                            label: c.TEN_CHUYENNGANH,
                                            value: String(c.ID_CHUYENNGANH)
                                        }))}
                                        statusColumnId="TRANGTHAI"
                                        statusOptions={[
                                            { value: "Nháp", label: "Nháp" },
                                            { value: "Chờ duyệt", label: "Chờ duyệt" },
                                            { value: "Yêu cầu chỉnh sửa", label: "Yêu cầu chỉnh sửa" },
                                            { value: "Đã duyệt", label: "Đã duyệt" },
                                            { value: "Từ chối", label: "Từ chối" },
                                        ]}
                                        columnVisibility={columnVisibility}
                                        state={{ rowSelection, sorting, columnFilters, pagination }}
                                        onRowSelectionChange={setRowSelection}
                                    />
                                )}
                            </TabsContent>

                            <TabsContent value="review" className="mt-0 outline-none ring-0">
                                <div className="flex items-center gap-4 mb-4">
                                    <Select
                                        value={contributionFilter}
                                        onValueChange={setContributionFilter}
                                    >
                                        <SelectTrigger className="w-[200px] bg-background">
                                            <SelectValue placeholder="Lọc theo góp ý" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tất cả</SelectItem>
                                            <SelectItem value="contributed">Đã góp ý</SelectItem>
                                            <SelectItem value="not_contributed">Chưa góp ý</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DataTable
                                    columns={columns}
                                    data={processedReviewData.pagedData}
                                    pageCount={processedReviewData.pageCount}
                                    loading={loading}
                                    pagination={pagination}
                                    setPagination={setPagination}
                                    columnFilters={columnFilters}
                                    setColumnFilters={setColumnFilters}
                                    sorting={sorting}
                                    setSorting={setSorting}
                                    searchColumnId="TEN_DETAI"
                                    searchPlaceholder="Tìm theo tên, GV, mã..."
                                    searchTerm={searchTerm}
                                    onSearchChange={setSearchTerm}
                                    chuyenNganhFilterColumnId="chuyen_nganh_id"
                                    chuyenNganhFilterOptions={specializations.map(c => ({
                                        label: c.TEN_CHUYENNGANH,
                                        value: String(c.ID_CHUYENNGANH)
                                    }))}
                                    statusColumnId="TRANGTHAI"
                                    statusOptions={[
                                        { value: "Nháp", label: "Nháp" },
                                        { value: "Chờ duyệt", label: "Chờ duyệt" },
                                        { value: "Yêu cầu chỉnh sửa", label: "Yêu cầu chỉnh sửa" },
                                        { value: "Đã duyệt", label: "Đã duyệt" },
                                        { value: "Từ chối", label: "Từ chối" },
                                    ]}
                                    columnVisibility={columnVisibility}
                                    state={{ rowSelection, sorting, columnFilters, pagination }}
                                    onRowSelectionChange={setRowSelection}
                                />
                            </TabsContent>
                        </motion.div>
                    </AnimatePresence>
                </Tabs>
            </motion.div>

            <CreateTopicDialog
                open={showCreateDialog}
                onOpenChange={(open) => {
                    setShowCreateDialog(open);
                    if (!open) setEditingTopic(null);
                }}
                onSubmit={editingTopic ? handleEditTopic : handleCreateTopic}
                topic={editingTopic}
            />

            {/* [ĐÃ SỬA LỖI] Import Dialog đã có ở đầu file, đảm bảo component hoạt động */}
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
            />

            <SuggestionDialog
                open={showSuggestionDialog}
                onOpenChange={setShowSuggestionDialog}
                onSubmit={async (suggestion) => {
                    try {
                        const res = await thesisTopicService.addSuggestion(selectedTopicId, { NOIDUNG_GOIY: suggestion });
                        toast.success(res.data.message || 'Góp ý đã được gửi!');
                        setShowSuggestionDialog(false);
                        loadPlanDependentData(selectedPlan);
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
        </motion.div>
    );
};

export default ThesisTopicsPage;