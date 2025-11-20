import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { toast } from "sonner";
import { Loader2, BookOpen, Clock, CheckCircle, AlertTriangle, Circle } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from '@/components/shared/data-table/DataTable';
import { getColumns } from "./columns";

import { thesisTopicService } from "@/api/thesisTopicService";
import { getChuyenNganhs } from "@/api/userService";
import TopicDetailDialog from "../../../lecturer/thesis-topics/components/TopicDetailDialog";
import RejectDialog from "./RejectDialog";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

const StatCard = ({ icon: Icon, title, value, iconBgClass, iconColorClass, hasStatusDot }) => {
    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme();
    const isReduced = reduceMotion || shouldReduceMotion;

    return (
        <motion.div
            className="bg-card text-card-foreground p-4 rounded-lg shadow-sm border flex items-center gap-4 transition-all duration-300 hover:shadow-md"
            whileHover={isReduced ? {} : { y: -4, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
            <motion.div
                className={cn("p-3 rounded-lg flex-shrink-0", iconBgClass)}
                initial={false}
                animate={isReduced ? {} : {
                    scale: value === 'loading' ? [1, 1.1, 1] : 1,
                }}
                transition={{
                    duration: 1.5,
                    repeat: value === 'loading' ? Infinity : 0,
                    ease: "easeInOut"
                }}
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
                                <>
                                    <p className="text-2xl font-bold">{value}</p>
                                    {hasStatusDot && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring" }}>
                                            <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500" />
                                        </motion.div>
                                    )}
                                </>
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
            visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2, ease: "easeOut" } },
            exit: { opacity: 0, y: -30, transition: { duration: 0.3 } }
        }
    };
};
// --- [END] Animation & Styles ---

const columnVisibility = {
    "chuyen_nganh_id": false,
};

const TopicManagementTabs = () => {
    const [allTopics, setAllTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);

    const [activeTab, setActiveTab] = useState("Chờ duyệt");
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [columnFilters, setColumnFilters] = useState([]);
    const [chuyenNganhOptions, setChuyenNganhOptions] = useState([]);

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState([]);
    const [rowSelection, setRowSelection] = useState({});

    const [showTopicDetailDialog, setShowTopicDetailDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [actionType, setActionType] = useState("");
    const [pendingTopics, setPendingTopics] = useState([]);
    const [currentTopicIndex, setCurrentTopicIndex] = useState(0);

    // [MỚI] Hook Theme & Reduced Motion
    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme();
    const isReduced = reduceMotion || shouldReduceMotion;
    const variants = useMemo(() => getVariants(isReduced), [isReduced]);

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        try {
            setLoading(true);
            setLoadingStats(true);
            const [topicRes, cnRes] = await Promise.all([
                thesisTopicService.getAdminTopics(),
                getChuyenNganhs().catch(() => [])
            ]);

            setAllTopics(topicRes.data || []);
            setChuyenNganhOptions(
                (cnRes || []).map(cn => ({
                    label: cn.TEN_CHUYENNGANH,
                    value: String(cn.ID_CHUYENNGANH)
                }))
            );
        } catch (error) {
            console.error("Error loading data:", error);
            toast.error("Không thể tải dữ liệu.");
        } finally {
            setLoading(false);
            setLoadingStats(false);
        }
    };

    const handleViewTopicDetails = (topicId) => {
        setSelectedTopicId(topicId);
        setShowTopicDetailDialog(true);

        const pending = allTopics.filter(t => t.TRANGTHAI === 'Chờ duyệt');
        setPendingTopics(pending);
        const currentIndex = pending.findIndex(t => t.ID_DETAI === topicId);
        setCurrentTopicIndex(currentIndex >= 0 ? currentIndex : 0);
    };

    const handleApprove = async (topicId) => {
        try {
            await thesisTopicService.adminApproveOrReject(topicId, { action: "approve" });
            toast.success("Đề tài đã được duyệt thành công!");
            loadAllData();

            if (showTopicDetailDialog && pendingTopics.length > 0) {
                const nextIndex = (currentTopicIndex + 1) % pendingTopics.length;
                if (nextIndex !== currentTopicIndex) {
                    setCurrentTopicIndex(nextIndex);
                    setSelectedTopicId(pendingTopics[nextIndex].ID_DETAI);
                } else {
                    setShowTopicDetailDialog(false);
                }
            }
        } catch (error) {
            console.error("Error approving topic:", error);
            toast.error("Có lỗi xảy ra khi duyệt đề tài.");
            throw error;
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

    const handleRejectSubmit = async (reason) => {
        try {
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
            loadAllData();

            if (showTopicDetailDialog && pendingTopics.length > 0) {
                const nextIndex = (currentTopicIndex + 1) % pendingTopics.length;
                if (nextIndex !== currentTopicIndex) {
                    setCurrentTopicIndex(nextIndex);
                    setSelectedTopicId(pendingTopics[nextIndex].ID_DETAI);
                } else {
                    setShowTopicDetailDialog(false);
                }
            }
        } catch (error) {
            console.error("Error processing topic:", error);
            toast.error("Có lỗi xảy ra khi xử lý yêu cầu.");
            throw error;
        }
    };

    const processedData = useMemo(() => {
        let filtered = allTopics.filter(t => {
            const matchesSearch =
                t.TEN_DETAI?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                t.ten_giang_vien?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                t.MA_DETAI?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

            const matchesTab = activeTab === "Tất cả" || t.TRANGTHAI === activeTab;

            const matchesFilters = columnFilters.every(filter => {
                if (filter.id === 'chuyen_nganh_id') {
                    const filterValues = new Set(filter.value);
                    return filterValues.has(String(t.chuyennganh?.ID_CHUYENNGANH));
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

        return { pagedData, pageCount, stats };
    }, [allTopics, debouncedSearchTerm, activeTab, columnFilters, sorting, pagination]);

    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [activeTab, columnFilters, debouncedSearchTerm]);

    const columns = useMemo(() => getColumns({
        onViewDetails: handleViewTopicDetails,
        onApprove: handleApprove,
        onReject: handleReject,
        onRequestEdit: handleRequestEdit
    }), [handleApprove, handleReject, handleRequestEdit, handleViewTopicDetails]);

    // [MỚI] Hàm render DataTable với animation chiều cao
    const renderDataTable = (tabName) => {
        const [tableHeight, setTableHeight] = useState('auto');
        const tableRef = React.useRef(null);

        React.useLayoutEffect(() => {
            if (tableRef.current) {
                const height = tableRef.current.getBoundingClientRect().height;
                setTableHeight(height);
            }
        }, [processedData.pagedData, loading, tabName]);

        return (
            <motion.div
                initial={false}
                animate={{ height: tableHeight }}
                transition={{
                    duration: isReduced ? 0 : 0.5,
                    ease: [0.4, 0, 0.2, 1]
                }}
                style={{ overflow: 'hidden' }}
            >
                <div ref={tableRef}>
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
                        onAddUser={() => { }}
                        addBtnText={null}
                        onImportUser={null}
                        onSuccess={loadAllData}
                        searchColumnId="TEN_DETAI"
                        searchPlaceholder="Tìm theo tên, GV, mã..."
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        chuyenNganhFilterColumnId="chuyen_nganh_id"
                        chuyenNganhFilterOptions={chuyenNganhOptions}
                        columnVisibility={columnVisibility}
                        state={{ rowSelection, sorting, columnFilters, pagination, columnVisibility }}
                        onRowSelectionChange={setRowSelection}
                    />
                </div>
            </motion.div>
        );
    };

    return (
        <motion.div
            className="flex-1 space-y-6 p-4 md:p-0"
            initial={isReduced ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
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

            <motion.div
                initial={isReduced ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                    duration: 0.5,
                    delay: isReduced ? 0 : 0.3,
                    type: "spring",
                    stiffness: 100
                }}
            >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <motion.div
                        initial={isReduced ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: isReduced ? 0 : 0.4 }}
                    >
                        <TabsList className={cn("transition-all duration-300", isReduced && "transition-none")}>
                            <TabsTrigger value="Tất cả" className={cn("transition-all duration-200", isReduced && "transition-none")}>Tất cả</TabsTrigger>
                            <TabsTrigger value="Chờ duyệt" className={cn("transition-all duration-200", isReduced && "transition-none")}>Chờ duyệt</TabsTrigger>
                            <TabsTrigger value="Đang chỉnh sửa" className={cn("transition-all duration-200", isReduced && "transition-none")}>Đang chỉnh sửa</TabsTrigger>
                            <TabsTrigger value="Đã duyệt" className={cn("transition-all duration-200", isReduced && "transition-none")}>Đã duyệt</TabsTrigger>
                            <TabsTrigger value="Yêu cầu chỉnh sửa" className={cn("transition-all duration-200", isReduced && "transition-none")}>Yêu cầu chỉnh sửa</TabsTrigger>
                            <TabsTrigger value="Từ chối" className={cn("transition-all duration-200", isReduced && "transition-none")}>Từ chối</TabsTrigger>
                            <TabsTrigger value="Nháp" className={cn("transition-all duration-200", isReduced && "transition-none")}>Nháp</TabsTrigger>
                        </TabsList>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            variants={variants.table}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <TabsContent value={activeTab} className="mt-0 outline-none ring-0">
                                {renderDataTable(activeTab)}
                            </TabsContent>
                        </motion.div>
                    </AnimatePresence>
                </Tabs>
            </motion.div>

            <TopicDetailDialog
                open={showTopicDetailDialog}
                onOpenChange={setShowTopicDetailDialog}
                topicId={selectedTopicId}
                showAdminActions={true}
                onApprove={handleApprove}
                onReject={handleReject}
                onRequestEdit={handleRequestEdit}
                onNext={() => {
                    if (pendingTopics.length > 0) {
                        const nextIndex = (currentTopicIndex + 1) % pendingTopics.length;
                        if (nextIndex !== currentTopicIndex) {
                            setCurrentTopicIndex(nextIndex);
                            setSelectedTopicId(pendingTopics[nextIndex].ID_DETAI);
                        } else {
                            setShowTopicDetailDialog(false);
                        }
                    }
                }}
                onPrevious={() => {
                    if (pendingTopics.length > 0) {
                        const prevIndex = currentTopicIndex === 0 ? pendingTopics.length - 1 : currentTopicIndex - 1;
                        setCurrentTopicIndex(prevIndex);
                        setSelectedTopicId(pendingTopics[prevIndex].ID_DETAI);
                    }
                }}
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