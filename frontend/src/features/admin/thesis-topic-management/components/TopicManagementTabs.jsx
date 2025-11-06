import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import { Loader2, BookOpen, Clock, CheckCircle, AlertTriangle } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from '@/components/shared/data-table/DataTable';
import { getColumns } from "./columns";

import { thesisTopicService } from "@/api/thesisTopicService";
import { getChuyenNganhs } from "@/api/userService";
import TopicDetailDialog from "../../../lecturer/thesis-topics/components/TopicDetailDialog";
import RejectDialog from "./RejectDialog";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

const StatCard = ({ icon: Icon, title, value, iconBgClass, iconColorClass }) => (
  <motion.div
    className="bg-card text-card-foreground p-4 rounded-lg shadow-sm border flex items-center gap-4"
    variants={itemVariants}
  >
    <div className={cn("p-3 rounded-lg", iconBgClass)}>
      <Icon className={cn("h-6 w-6", iconColorClass)} />
    </div>
    <div className="flex-1">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="text-2xl font-bold h-8"
        >
          {value === 'loading' ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : value}
        </motion.div>
      </AnimatePresence>
    </div>
  </motion.div>
);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

const tableVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 80, damping: 18, duration: 0.5 }
  },
  exit: { opacity: 0, y: -30, scale: 0.98, transition: { duration: 0.3 } }
};

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
  };

  const handleApprove = async (topicId) => {
    try {
      await thesisTopicService.adminApproveOrReject(topicId, { action: "approve" });
      toast.success("Đề tài đã được duyệt thành công!");
      loadAllData();
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

  return (
    <motion.div
      className="flex-1 space-y-6 p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <StatCard
          icon={BookOpen}
          title="Tổng số Đề tài"
          value={loadingStats ? 'loading' : processedData.stats.total}
          iconBgClass="bg-blue-100 dark:bg-blue-900/30"
          iconColorClass="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={Clock}
          title="Chờ duyệt"
          value={loadingStats ? 'loading' : processedData.stats.pending}
          iconBgClass="bg-yellow-100 dark:bg-yellow-900/30"
          iconColorClass="text-yellow-600 dark:text-yellow-400"
        />
        <StatCard
          icon={CheckCircle}
          title="Đã duyệt"
          value={loadingStats ? 'loading' : processedData.stats.approved}
          iconBgClass="bg-green-100 dark:bg-green-900/30"
          iconColorClass="text-green-600 dark:text-green-400"
        />
        <StatCard
          icon={AlertTriangle}
          title="Cần xử lý"
          value={loadingStats ? 'loading' : processedData.stats.editRequest}
          iconBgClass="bg-orange-100 dark:bg-orange-900/30"
          iconColorClass="text-orange-600 dark:text-orange-400"
        />
      </motion.div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3, type: "spring", stiffness: 100 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <TabsList>
              <TabsTrigger value="Tất cả">Tất cả</TabsTrigger>
              <TabsTrigger value="Chờ duyệt">Chờ duyệt</TabsTrigger>
              <TabsTrigger value="Đã duyệt">Đã duyệt</TabsTrigger>
              <TabsTrigger value="Yêu cầu chỉnh sửa">Yêu cầu chỉnh sửa</TabsTrigger>
              <TabsTrigger value="Từ chối">Từ chối</TabsTrigger>
              <TabsTrigger value="Nháp">Nháp</TabsTrigger>
            </TabsList>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={tableVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <TabsContent value={activeTab} className="mt-0 outline-none ring-0">
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
                  onAddUser={() => {}}
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
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </motion.div>

      <TopicDetailDialog
        open={showTopicDetailDialog}
        onOpenChange={setShowTopicDetailDialog}
        topicId={selectedTopicId}
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