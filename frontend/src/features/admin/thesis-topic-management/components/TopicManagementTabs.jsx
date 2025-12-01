import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { toast } from "sonner";
import { Loader2, BookOpen, Clock, CheckCircle, AlertTriangle, Filter, FileDown, CheckCheck } from "lucide-react"; // Thêm CheckCheck

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from '@/components/shared/data-table/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Import AlertDialog
import { getColumns } from "./columns";

import { thesisTopicService } from "@/api/thesisTopicService";
import { getAllPlans } from "@/api/thesisPlanService";
import { getKhoaBomons } from "@/api/userService"; 
import TopicDetailDialog from "../../../lecturer/thesis-topics/components/TopicDetailDialog";
import RejectDialog from "./RejectDialog";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import StatCard from '@/components/shared/StatCard';

const getVariants = (shouldReduce) => {
    // ... (Giữ nguyên)
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
    // ... (Giữ nguyên các state cũ)
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

    // [NEW] State cho Bulk Action
    const [showBulkApproveAlert, setShowBulkApproveAlert] = useState(false);
    const [isBulkApproving, setIsBulkApproving] = useState(false);

    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme();
    const isReduced = reduceMotion || shouldReduceMotion;
    const variants = useMemo(() => getVariants(isReduced), [isReduced]);

    // ... (Giữ nguyên useEffect init data và loadTopics) ...
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
            setRowSelection({}); // Reset selection khi load lại

        } catch (error) {
            console.error("Error loading topics:", error);
            toast.error("Không thể tải danh sách đề tài.");
            setAllTopics([]);
        } finally {
            setLoading(false);
            setLoadingStats(false);
        }
    };

    // 3. Process Data (Filter & Sort) - Giữ nguyên
    const processedData = useMemo(() => {
        let filtered = allTopics.filter(t => {
            const matchesSearch =
                t.TEN_DETAI?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                t.ten_giang_vien?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                t.MA_DETAI?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

            // Logic lọc theo Tab
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

    // ... (Navigation Logic & Single Action Handlers giữ nguyên) ...
    const currentList = useMemo(() => {
        return processedData.allFiltered || [];
    }, [processedData.allFiltered]);

    const currentTopicIndex = useMemo(() => {
        if (!selectedTopicId || currentList.length === 0) return -1;
        return currentList.findIndex(t => String(t.ID_DETAI) === String(selectedTopicId));
    }, [currentList, selectedTopicId]);

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

    const handleApprove = async (topicId) => {
        try {
            let nextTopicId = null;
            if (hasNext) {
                nextTopicId = currentList[currentTopicIndex + 1].ID_DETAI;
            }

            await thesisTopicService.adminApproveOrReject(topicId, { action: "approve" });
            toast.success("Đề tài đã được duyệt thành công!");
            
            await loadTopics(selectedPlanId); 
            
            if (showTopicDetailDialog) {
                if (nextTopicId) {
                    setSelectedTopicId(nextTopicId);
                } else {
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

    const handleExport = () => {
        toast.info("Tính năng xuất danh sách đang phát triển.");
    };

    // [NEW] Bulk Action Logic
    const handleBulkApproveClick = () => {
        const selectedCount = Object.keys(rowSelection).length;
        if (selectedCount === 0) return;
        setShowBulkApproveAlert(true);
    };

    const confirmBulkApprove = async () => {
        setIsBulkApproving(true);
        try {
            // Lấy danh sách ID từ rowSelection (key của object rowSelection là index, cần map sang ID thực)
            // DataTable của Tanstack Table lưu rowSelection theo id của row.
            // Nếu không set getRowId, mặc định là index.
            // Cách tốt nhất là duyệt qua pagedData hoặc allFiltered để lấy ID.
            
            // Tuy nhiên, processedData.pagedData chỉ chứa trang hiện tại. 
            // rowSelection chứa state của toàn bộ bảng nếu enableRowSelection được cấu hình đúng.
            
            // Lấy ra các row ID được chọn (ở đây row ID = ID_DETAI nếu ta cấu hình getRowId cho DataTable, 
            // hoặc ta phải map từ index nếu dùng mặc định).
            // Để an toàn, ta sẽ filter từ processedData.allFiltered dựa trên trạng thái rowSelection.
            
            // Ở component DataTable, ta truyền data là processedData.pagedData
            // Nên rowSelection chỉ chứa index của trang hiện tại (nếu manualPagination)
            
            // CÁCH FIX: Trong DataTable, row.original chứa dữ liệu gốc. 
            // Chúng ta cần lấy các item được chọn từ dữ liệu hiện có.
            
            // Đơn giản nhất: Duyệt qua processedData.pagedData và check rowSelection
            // Lưu ý: rowSelection object keys là row index (string).
            
            const selectedIds = Object.keys(rowSelection).map(index => {
                 const row = processedData.pagedData[parseInt(index)];
                 return row ? row.ID_DETAI : null;
            }).filter(id => id !== null);

            if (selectedIds.length === 0) {
                 toast.warning("Vui lòng chọn ít nhất 1 đề tài.");
                 return;
            }

            await thesisTopicService.bulkApproveTopics(selectedIds);
            toast.success(`Đã duyệt thành công ${selectedIds.length} đề tài.`);
            setRowSelection({}); // Reset selection
            await loadTopics(selectedPlanId);

        } catch (error) {
            console.error("Bulk approve error:", error);
            toast.error(error.response?.data?.message || "Lỗi khi duyệt hàng loạt.");
        } finally {
            setIsBulkApproving(false);
            setShowBulkApproveAlert(false);
        }
    };

    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [activeTab, columnFilters, debouncedSearchTerm, selectedPlanId]);

    const columns = useMemo(() => getColumns({
        onViewDetails: handleViewTopicDetails,
        onApprove: handleApprove,
        onReject: handleReject,
        onRequestEdit: handleRequestEdit
    }), [handleApprove, handleReject, handleRequestEdit]);

    const renderDataTable = () => {
        const selectedCount = Object.keys(rowSelection).length;

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
                    onAddUser={null}
                    onImportUser={null}
                    addBtnText=""
                    
                    // [NEW] Bulk Actions Slot
                    bulkActions={
                         selectedCount > 0 && activeTab === "Chờ duyệt" ? (
                            <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700 text-white h-8 ml-2 animate-in fade-in zoom-in duration-200"
                                onClick={handleBulkApproveClick}
                            >
                                <CheckCheck className="mr-2 h-4 w-4" />
                                Duyệt {selectedCount} đề tài
                            </Button>
                         ) : null
                    }
                    
                    flexLayout={true}
                    containerClassName="h-full border-none shadow-none"
                    className="h-full"
                />
            </motion.div>
        );
    };

    const TABS = [
        "Chờ duyệt", 
        "Đã duyệt", 
        "Yêu cầu chỉnh sửa", 
        "Đang chỉnh sửa", 
        "Đã đầy",
        "Tất cả" 
    ];

    return (
        <motion.div
            initial={isReduced ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full space-y-4 p-4 md:p-6 overflow-hidden"
        >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
                 <div className="flex items-center gap-2 w-full md:w-auto">
                      <BookOpen className="h-5 w-5 text-muted-foreground shrink-0" />
                      <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                          <SelectTrigger className="w-full md:w-[400px] shadow-sm">
                              <SelectValue placeholder="Chọn một kế hoạch..." />
                          </SelectTrigger>
                          <SelectContent>
                              {plans.length > 0 ? (
                                  plans.map(plan => (
                                      <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                          <div className="flex items-center justify-between w-full gap-2">
                                              <span className="truncate">{plan.TEN_DOT}</span>
                                              <span className="text-xs text-muted-foreground">({plan.NAMHOC})</span>
                                          </div>
                                      </SelectItem>
                                  ))
                              ) : (
                                  <div className="p-4 text-center text-sm text-muted-foreground">Không tìm thấy kế hoạch nào.</div>
                              )}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="flex items-center gap-2">
                     <Button variant="outline" onClick={handleExport} disabled={!selectedPlanId} className="shadow-sm">
                          <FileDown className="mr-2 h-4 w-4" /> Xuất danh sách
                      </Button>
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
                        icon={BookOpen}
                        title="Tổng số Đề tài"
                        value={loadingStats ? 'loading' : processedData.stats.total}
                        onClick={() => setActiveTab("Tất cả")}
                        iconBgClass="bg-blue-100 dark:bg-blue-900/30"
                        iconColorClass="text-blue-600 dark:text-blue-400"
                        isActive={activeTab === "Tất cả"}
                        isLoading={loadingStats}
                    />
                </motion.div>
                <motion.div variants={variants.item} className="h-full">
                    <StatCard
                        icon={Clock}
                        title="Chờ duyệt"
                        value={loadingStats ? 'loading' : processedData.stats.pending}
                        onClick={() => setActiveTab("Chờ duyệt")}
                        iconBgClass="bg-yellow-100 dark:bg-yellow-900/30"
                        iconColorClass="text-yellow-600 dark:text-yellow-400"
                        hasStatusDot={processedData.stats.pending > 0}
                        isActive={activeTab === "Chờ duyệt"}
                        isLoading={loadingStats}
                    />
                </motion.div>
                <motion.div variants={variants.item} className="h-full">
                    <StatCard
                        icon={CheckCircle}
                        title="Đã duyệt"
                        value={loadingStats ? 'loading' : processedData.stats.approved}
                        onClick={() => setActiveTab("Đã duyệt")}
                        iconBgClass="bg-green-100 dark:bg-green-900/30"
                        iconColorClass="text-green-600 dark:text-green-400"
                        isActive={activeTab === "Đã duyệt"}
                        isLoading={loadingStats}
                    />
                </motion.div>
                <motion.div variants={variants.item} className="h-full">
                    <StatCard
                        icon={AlertTriangle}
                        title="Cần xử lý"
                        value={loadingStats ? 'loading' : processedData.stats.editRequest}
                        onClick={() => setActiveTab("Yêu cầu chỉnh sửa")}
                        iconBgClass="bg-orange-100 dark:bg-orange-900/30"
                        iconColorClass="text-orange-600 dark:text-orange-400"
                        isActive={activeTab === "Yêu cầu chỉnh sửa"}
                        isLoading={loadingStats}
                    />
                </motion.div>
            </motion.div>

            {/* Tabs & Table */}
            <div className="flex-1 min-h-0 flex flex-col bg-card rounded-lg border shadow-sm">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <div className="px-4 pt-4 pb-2 border-b shrink-0">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                             <TabsList className="bg-muted/50">
                                {TABS.map((tab) => (
                                    <TabsTrigger key={tab} value={tab} className="px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                        {tab}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 p-0 overflow-hidden">
                         <AnimatePresence mode="wait">
                            <motion.div 
                                key={activeTab + selectedPlanId} 
                                variants={variants.table} 
                                initial="hidden" 
                                animate="visible" 
                                exit="exit" 
                                className="h-full flex flex-col"
                            >
                                <TabsContent value={activeTab} className="flex-1 mt-0 h-full outline-none ring-0 flex flex-col p-4 pt-2">
                                    {renderDataTable()}
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </Tabs>
            </div>

            {/* Dialogs */}
            <TopicDetailDialog
                open={showTopicDetailDialog}
                onOpenChange={setShowTopicDetailDialog}
                topicId={selectedTopicId}
                showAdminActions={true}
                onApprove={handleApprove}
                onReject={handleReject}
                onRequestEdit={handleRequestEdit}
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

            {/* [NEW] Bulk Approve Alert Dialog */}
            <AlertDialog open={showBulkApproveAlert} onOpenChange={setShowBulkApproveAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận duyệt hàng loạt?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn duyệt <strong>{Object.keys(rowSelection).length}</strong> đề tài đã chọn không?
                            <br />
                            Hành động này sẽ gửi thông báo đến các giảng viên tương ứng.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkApproving}>Hủy</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={confirmBulkApprove} 
                            disabled={isBulkApproving}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isBulkApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Duyệt ngay
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </motion.div>
    );
};

export default TopicManagementTabs;