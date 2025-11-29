import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { toast } from "sonner";
import { Loader2, BookOpen, Clock, CheckCircle, AlertTriangle, Filter } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from '@/components/shared/data-table/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getColumns } from "./columns";

import { thesisTopicService } from "@/api/thesisTopicService";
import { getAllPlans } from "@/api/thesisPlanService";
import { getKhoaBomons } from "@/api/userService"; 
import TopicDetailDialog from "../../../lecturer/thesis-topics/components/TopicDetailDialog";
import RejectDialog from "./RejectDialog";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

// --- StatCard Component ---
const StatCard = ({ icon: Icon, title, value, iconBgClass, iconColorClass, hasStatusDot }) => {
    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme();
    const isReduced = reduceMotion || shouldReduceMotion;

    return (
        <motion.div 
            className="bg-card text-card-foreground p-4 rounded-lg shadow-sm border flex items-center gap-4 transition-all duration-300 hover:shadow-md h-full"
            whileHover={isReduced ? {} : { y: -4, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
            <motion.div 
                className={cn("p-3 rounded-lg flex-shrink-0", iconBgClass)}
                initial={false}
                animate={isReduced ? {} : { scale: value === 'loading' ? [1, 1.1, 1] : 1 }}
                transition={{ duration: 1.5, repeat: value === 'loading' ? Infinity : 0, ease: "easeInOut" }}
            >
                <Icon className={cn("h-6 w-6", iconColorClass)} />
            </motion.div>
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground truncate">{title}</h3>
                <div className="flex items-baseline gap-2 h-8 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={value}
                            initial={isReduced ? { opacity: 1 } : { opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={isReduced ? { opacity: 0 } : { opacity: 0, y: -15 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="flex items-baseline gap-2"
                        >
                            {value === 'loading' ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                <p className="text-2xl font-bold">{value}</p>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};

const getVariants = (shouldReduce) => {
    if (shouldReduce) {
        return { container: { visible: { opacity: 1 } }, item: { visible: { opacity: 1, y: 0 } }, table: { visible: { opacity: 1, y: 0 } } };
    }
    return {
        container: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } },
        item: { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 12 } } },
        table: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }, exit: { opacity: 0, y: -20, transition: { duration: 0.2 } } }
    };
};

const columnVisibility = { "department_id": false };

const TopicManagementTabs = () => {
    const [allTopics, setAllTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);

    const [plans, setPlans] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState("");

    const [activeTab, setActiveTab] = useState("Chờ duyệt");
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [columnFilters, setColumnFilters] = useState([]);
    
    const [departmentOptions, setDepartmentOptions] = useState([]);
    
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
    const [sorting, setSorting] = useState([]);
    const [rowSelection, setRowSelection] = useState({});

    const [showTopicDetailDialog, setShowTopicDetailDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [actionType, setActionType] = useState("");

    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme();
    const isReduced = reduceMotion || shouldReduceMotion;
    const variants = useMemo(() => getVariants(isReduced), [isReduced]);

    // 1. Init Data
    useEffect(() => {
        const init = async () => {
            try {
                const [plansRes, deptRes] = await Promise.all([
                    getAllPlans(),
                    getKhoaBomons().catch(() => []) 
                ]);
                
                const plansList = plansRes || [];
                setPlans(plansList);

                if (plansList.length > 0) {
                    const activePlan = plansList.find(p => p.TRANGTHAI === 'Đang thực hiện') || plansList[0];
                    setSelectedPlanId(String(activePlan.ID_KEHOACH));
                }

                setDepartmentOptions(
                    (deptRes || []).map(dept => ({
                        label: dept.TEN_KHOA_BOMON,
                        value: String(dept.ID_KHOA_BOMON)
                    }))
                );
            } catch (error) {
                console.error("Error initializing:", error);
                toast.error("Lỗi tải dữ liệu ban đầu.");
            }
        };
        init();
    }, []);

    // 2. Load Topics
    useEffect(() => {
        if (selectedPlanId) {
            loadTopics(selectedPlanId);
        } else {
            setAllTopics([]); 
            setLoading(false);
            setLoadingStats(false);
        }
    }, [selectedPlanId]);

    const loadTopics = async (planId) => {
        try {
            setLoading(true);
            setLoadingStats(true);
            
            const topicRes = await thesisTopicService.getAdminTopics({ plan_id: planId });
            const topicsData = topicRes.data || topicRes || []; 
            
            setAllTopics(Array.isArray(topicsData) ? topicsData : (topicsData.data || []));

        } catch (error) {
            console.error("Error loading topics:", error);
            toast.error("Không thể tải danh sách đề tài.");
            setAllTopics([]);
        } finally {
            setLoading(false);
            setLoadingStats(false);
        }
    };

    // 3. Process Data (Filter & Sort)
    const processedData = useMemo(() => {
        let filtered = allTopics.filter(t => {
            const matchesSearch =
                t.TEN_DETAI?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                t.ten_giang_vien?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                t.MA_DETAI?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

            const matchesTab = activeTab === "Tất cả" || t.TRANGTHAI === activeTab;

            const matchesFilters = columnFilters.every(filter => {
                if (filter.id === 'department_id') {
                    const filterValues = new Set(filter.value);
                    return filterValues.has(String(t.ID_KHOA_BOMON));
                }
                return true;
            });

            return matchesSearch && matchesTab && matchesFilters;
        });

        if (sorting.length > 0) {
            const { id, desc } = sorting[0];
            filtered.sort((a, b) => {
                let valA = a[id] || a[id.toLowerCase()];
                let valB = b[id] || b[id.toLowerCase()];
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

        const stats = {
            total: allTopics.length,
            pending: allTopics.filter(t => t.TRANGTHAI === 'Chờ duyệt').length,
            approved: allTopics.filter(t => t.TRANGTHAI === 'Đã duyệt').length,
            editRequest: allTopics.filter(t =>
                t.TRANGTHAI === 'Yêu cầu chỉnh sửa' || t.TRANGTHAI === 'Từ chối'
            ).length,
        };

        const pageCount = Math.ceil(filtered.length / pagination.pageSize);
        const pagedData = filtered.slice(
            pagination.pageIndex * pagination.pageSize,
            (pagination.pageIndex + 1) * pagination.pageSize
        );

        return { pagedData, pageCount, stats, allFiltered: filtered };
    }, [allTopics, debouncedSearchTerm, activeTab, columnFilters, sorting, pagination]);

    // --- LOGIC ĐIỀU HƯỚNG MỚI (FIXED) ---

    // 1. Lấy danh sách hiện tại (động)
    const currentList = useMemo(() => {
        return processedData.allFiltered || [];
    }, [processedData.allFiltered]);

    // 2. Tính toán Index dựa trên Selected ID (Luôn đúng kể cả khi data thay đổi)
    const currentTopicIndex = useMemo(() => {
        if (!selectedTopicId || currentList.length === 0) return -1;
        return currentList.findIndex(t => String(t.ID_DETAI) === String(selectedTopicId));
    }, [currentList, selectedTopicId]);

    // 3. Tính toán trạng thái nút
    const hasNext = currentTopicIndex !== -1 && currentTopicIndex < currentList.length - 1;
    const hasPrevious = currentTopicIndex !== -1 && currentTopicIndex > 0;

    const handleViewTopicDetails = (topicId) => {
        setSelectedTopicId(topicId);
        setShowTopicDetailDialog(true);
    };

    const handleNext = () => {
        if (hasNext) {
            const nextTopic = currentList[currentTopicIndex + 1];
            if (nextTopic) setSelectedTopicId(nextTopic.ID_DETAI);
        }
    };

    const handlePrevious = () => {
        if (hasPrevious) {
            const prevTopic = currentList[currentTopicIndex - 1];
            if (prevTopic) setSelectedTopicId(prevTopic.ID_DETAI);
        }
    };

    // --- ACTIONS HANDLERS ---

    const handleApprove = async (topicId) => {
        try {
            // Logic Auto-Next thông minh: 
            // Lưu lại ID của topic tiếp theo TRƯỚC khi reload data (vì sau khi approve, topic hiện tại có thể biến mất khỏi list 'Chờ duyệt')
            let nextTopicId = null;
            if (hasNext) {
                nextTopicId = currentList[currentTopicIndex + 1].ID_DETAI;
            }

            // Gọi API
            await thesisTopicService.adminApproveOrReject(topicId, { action: "approve" });
            toast.success("Đề tài đã được duyệt thành công!");
            
            // Reload
            await loadTopics(selectedPlanId); 
            
            // Điều hướng
            if (showTopicDetailDialog) {
                if (nextTopicId) {
                    // Nếu còn topic tiếp theo trong danh sách cũ, chuyển tới đó
                    setSelectedTopicId(nextTopicId);
                } else {
                    // Nếu hết danh sách, đóng dialog
                    setShowTopicDetailDialog(false);
                }
            }
        } catch (error) {
            console.error("Error approving topic:", error);
            toast.error("Có lỗi xảy ra khi duyệt đề tài.");
        }
    };

    const handleRejectSubmit = async (reason) => {
        try {
            // Logic Auto-Next tương tự approve
            let nextTopicId = null;
            if (hasNext) {
                nextTopicId = currentList[currentTopicIndex + 1].ID_DETAI;
            }

            const action = actionType === "reject" ? "reject" : "request_edit";
            await thesisTopicService.adminApproveOrReject(selectedTopic.ID_DETAI, {
                action,
                reason,
            });
            const message = actionType === "reject"
                ? "Đề tài đã bị từ chối."
                : "Đã yêu cầu chỉnh sửa đề tài.";
            toast.success(message);
            setShowRejectDialog(false);
            
            await loadTopics(selectedPlanId);

             // Điều hướng
             if (showTopicDetailDialog) {
                if (nextTopicId) {
                    setSelectedTopicId(nextTopicId);
                } else {
                    setShowTopicDetailDialog(false);
                }
            }
        } catch (error) {
            console.error("Error processing topic:", error);
            toast.error("Có lỗi xảy ra khi xử lý yêu cầu.");
        }
    };

    const handleReject = (topic) => {
        setSelectedTopic(topic);
        setActionType("reject");
        setShowRejectDialog(true);
    };

    const handleRequestEdit = (topic) => {
        setSelectedTopic(topic);
        setActionType("request_edit");
        setShowRejectDialog(true);
    };

    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [activeTab, columnFilters, debouncedSearchTerm, selectedPlanId]);

    const columns = useMemo(() => getColumns({
        onViewDetails: handleViewTopicDetails,
        onApprove: handleApprove,
        onReject: handleReject,
        onRequestEdit: handleRequestEdit
    }), [handleApprove, handleReject, handleRequestEdit]); // bỏ handleViewTopicDetails khỏi deps để tránh rerender ko cần thiết nếu logic đơn giản

    const renderDataTable = () => {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col" 
            >
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
                    onSuccess={() => loadTopics(selectedPlanId)}
                    searchColumnId="TEN_DETAI"
                    searchPlaceholder="Tìm theo tên, GV, mã..."
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}

                    // Filter Bộ môn
                    khoaBomonFilterColumnId="department_id"
                    khoaBomonFilterOptions={departmentOptions}
                    khoaBomonFilterTitle="Bộ môn"
                    
                    columnVisibility={columnVisibility}
                    state={{ rowSelection, sorting, columnFilters, pagination, columnVisibility }}
                    onRowSelectionChange={setRowSelection}
                    flexLayout={true}
                    className="h-full"
                />
            </motion.div>
        );
    };

    return (
        <motion.div
            initial={isReduced ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-[calc(100vh-8.7rem)] space-y-4 p-4 md:p-0 overflow-hidden"
        >
            {/* Stat Cards */}
            <div className="shrink-0">
                <motion.div
                    className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                    variants={variants.container}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={variants.item}>
                        <StatCard
                            icon={BookOpen}
                            title="Tổng số Đề tài"
                            value={loadingStats ? 'loading' : processedData.stats.total}
                            iconBgClass="bg-blue-100 dark:bg-blue-900/30"
                            iconColorClass="text-blue-600 dark:text-blue-400"
                        />
                    </motion.div>
                    <motion.div variants={variants.item}>
                        <StatCard
                            icon={Clock}
                            title="Chờ duyệt"
                            value={loadingStats ? 'loading' : processedData.stats.pending}
                            iconBgClass="bg-yellow-100 dark:bg-yellow-900/30"
                            iconColorClass="text-yellow-600 dark:text-yellow-400"
                            hasStatusDot={processedData.stats.pending > 0}
                        />
                    </motion.div>
                    <motion.div variants={variants.item}>
                        <StatCard
                            icon={CheckCircle}
                            title="Đã duyệt"
                            value={loadingStats ? 'loading' : processedData.stats.approved}
                            iconBgClass="bg-green-100 dark:bg-green-900/30"
                            iconColorClass="text-green-600 dark:text-green-400"
                        />
                    </motion.div>
                    <motion.div variants={variants.item}>
                        <StatCard
                            icon={AlertTriangle}
                            title="Cần xử lý"
                            value={loadingStats ? 'loading' : processedData.stats.editRequest}
                            iconBgClass="bg-orange-100 dark:bg-orange-900/30"
                            iconColorClass="text-orange-600 dark:text-orange-400"
                        />
                    </motion.div>
                </motion.div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full space-y-4">
                    <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <TabsList className={cn("transition-all duration-300 w-full md:w-auto justify-start bg-transparent p-0 h-auto gap-2 flex-wrap", isReduced && "transition-none")}>
                            {["Tất cả", "Chờ duyệt", "Đang chỉnh sửa", "Đã duyệt", "Yêu cầu chỉnh sửa", "Từ chối", "Nháp"].map(tab => (
                                <TabsTrigger
                                    key={tab}
                                    value={tab}
                                    className={cn(
                                        "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-md px-4 py-2 transition-all duration-200 border border-transparent data-[state=inactive]:border-border/50 data-[state=inactive]:bg-background",
                                        isReduced && "transition-none"
                                    )}
                                >
                                    {tab}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
                            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                                <SelectTrigger className="w-full md:w-[250px] h-9 bg-background shadow-sm focus:ring-1">
                                    <SelectValue placeholder="Chọn kế hoạch..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {plans.map((plan) => (
                                        <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                            <span className="font-medium">{plan.TEN_DOT}</span> 
                                            <span className="text-xs text-muted-foreground ml-2">({plan.NAMHOC})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={activeTab + selectedPlanId} 
                                variants={variants.table} 
                                initial="hidden" 
                                animate="visible" 
                                exit="exit" 
                                className="h-full flex flex-col"
                            >
                                <TabsContent value={activeTab} className="mt-0 h-full outline-none ring-0 flex flex-col">
                                    {renderDataTable()}
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </Tabs>
            </div>

            <TopicDetailDialog
                open={showTopicDetailDialog}
                onOpenChange={setShowTopicDetailDialog}
                topicId={selectedTopicId}
                showAdminActions={true}
                onApprove={handleApprove}
                onReject={handleReject}
                onRequestEdit={handleRequestEdit}
                // Truyền props điều hướng (đã fix)
                onNext={handleNext}
                onPrevious={handlePrevious}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
            />

            <RejectDialog
                open={showRejectDialog}
                onOpenChange={setShowRejectDialog}
                onSubmit={handleRejectSubmit}
                topic={selectedTopic}
                actionType={actionType}
            />
        </motion.div>
    );
};

export default TopicManagementTabs;