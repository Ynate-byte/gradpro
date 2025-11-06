import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Eye, Edit, Trash2, Send, BookOpen, Loader2, Users, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import CreateTopicDialog from './components/CreateTopicDialog';
import TopicDetailDialog from './components/TopicDetailDialog';
import SuggestionDialog from './components/SuggestionDialog';
import RegisteredGroupsDialog from './components/RegisteredGroupsDialog';
import { thesisTopicService } from '@/api/thesisTopicService';
import lecturerQuotaService from '@/api/lecturerQuotaService';
import axios from '@/api/axiosConfig';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from '@/components/shared/data-table/DataTable';
import { getColumns } from './components/columns';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { getChuyenNganhs } from '@/api/userService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const StatCard = ({ icon: Icon, title, value, description, iconBgClass, iconColorClass }) => (
  <motion.div
    className="bg-card text-card-foreground p-2 rounded-lg shadow-sm border flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1"
    whileHover={{ y: -4 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    variants={itemVariants}
  >
    <motion.div
      className={cn("p-3 rounded-lg", iconBgClass)}
      animate={{
        scale: value === 'loading' ? [1, 1.08, 1] : 1,
        rotate: value === 'loading' ? [0, 5, -5, 0] : 0
      }}
      transition={{
        duration: 2,
        repeat: value === 'loading' ? Infinity : 0,
        ease: "easeInOut"
      }}
    >
      <Icon className={cn("h-6 w-6", iconColorClass)} />
    </motion.div>
    <div className="flex-1">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="flex items-center gap-2 h-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={value}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-2"
          >
            {value === 'loading' ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {description && (
        <motion.p
          className="text-xs text-muted-foreground mt-0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {description}
        </motion.p>
      )}
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
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 80, damping: 18, duration: 0.5 } },
  exit: { opacity: 0, y: -30, scale: 0.98, transition: { duration: 0.3 } }
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

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTopicDetailDialog, setShowTopicDetailDialog] = useState(false);
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
  const [showSubmitApprovalDialog, setShowSubmitApprovalDialog] = useState(false);
  const [showRegisteredGroupsDialog, setShowRegisteredGroupsDialog] = useState(false);

  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [selectedTopicForGroups, setSelectedTopicForGroups] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);

  const [activeTab, setActiveTab] = useState('my');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [columnFilters, setColumnFilters] = useState([]);

  const [selectedPlan, setSelectedPlan] = useState('');
  const [plans, setPlans] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [myQuota, setMyQuota] = useState(null);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([{ id: 'TEN_DETAI', desc: false }]);
  const [rowSelection, setRowSelection] = useState({});

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
        const firstPlanId = plansData[0].ID_KEHOACH;
        setSelectedPlan(firstPlanId);
        loadPlanDependentData(firstPlanId);
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
      setLoading(false);
      setLoadingStats(false);
      return;
    }

    setLoading(true);
    setLoadingStats(true);
    try {
      const params = { plan_id: planId };
      const [topicsRes, supervisedRes, quotaRes] = await Promise.all([
        thesisTopicService.getTopics(params),
        thesisTopicService.getSupervisedTopics(params),
        lecturerQuotaService.getMyQuota(params)
      ]);

      setTopics(topicsRes.data.data || []);
      setSupervisedTopics(supervisedRes.data.data || []);
      setMyQuota(quotaRes.data);
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
    loadPlanDependentData(selectedPlan);
  }, [selectedPlan, loadPlanDependentData]);

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
      throw error;
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
      throw error;
    }
  };

  const handleSubmitForApproval = async (topicId) => {
    if (myQuota && myQuota.topics_created >= myQuota.quota_assigned) {
      toast.error('Bạn đã đủ số lượng đề tài cần ra. Không thể gửi duyệt thêm.');
      return;
    }
    try {
      await thesisTopicService.submitForApproval(topicId);
      toast.success("Gửi duyệt đề tài thành công!");
      loadPlanDependentData(selectedPlan);
    } catch (error) {
      console.error('Error submitting for approval:', error);
      toast.error("Lỗi khi gửi duyệt.");
      throw error;
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
      throw error;
    }
  };

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

  const processedData = useMemo(() => {
    let filtered = (activeTab === 'my')
      ? topics.filter(t => t.ID_NGUOI_DEXUAT === user?.giangvien?.ID_GIANGVIEN)
      : topics;

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

    return { pagedData, pageCount };
  }, [topics, activeTab, debouncedSearchTerm, columnFilters, sorting, pagination, user]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [activeTab, columnFilters, debouncedSearchTerm]);

  const columns = useMemo(() => getColumns({
    currentUserId: user?.giangvien?.ID_GIANGVIEN,
    onEdit: (topic) => { setEditingTopic(topic); setShowCreateDialog(true); },
    onDelete: handleDeleteTopic,
    onSubmit: handleSubmitForApproval,
    onViewDetails: handleViewTopicDetails,
    onAddSuggestion: handleAddSuggestion,
    onViewRegisteredGroups: handleViewRegisteredGroups,
  }), [user, myQuota, handleViewRegisteredGroups, handleSubmitForApproval, handleDeleteTopic]);

  return (
    <motion.div
      className="flex-1 space-y-6 p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold">Đề tài Khóa luận</h1>
        <div className="flex items-center gap-4">
          <Select
            value={selectedPlan ? String(selectedPlan) : ""}
            onValueChange={setSelectedPlan}
            disabled={loading}
          >
            <SelectTrigger className="w-full md:w-[300px] bg-white dark:bg-card">
              <SelectValue placeholder="Chọn kế hoạch" />
            </SelectTrigger>
            <SelectContent>
              {plans.map(plan => (
                <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                  {plan.TEN_DOT} - {plan.NAMHOC}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => { setEditingTopic(null); setShowCreateDialog(true); }}
            disabled={loading || (myQuota && myQuota.topics_created >= myQuota.quota_assigned)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Tạo đề tài
          </Button>
        </div>
      </div>

      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <StatCard
          icon={Users}
          title="Quota được giao"
          value={loadingStats ? 'loading' : myQuota?.quota_assigned ?? 0}
          description="Số đề tài tối đa được tạo"
          iconBgClass="bg-blue-100 dark:bg-blue-900/30"
          iconColorClass="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={BookOpen}
          title="Đề tài đã tạo"
          value={loadingStats ? 'loading' : myQuota?.topics_created ?? 0}
          description="Đã duyệt / Chờ duyệt"
          iconBgClass="bg-green-100 dark:bg-green-900/30"
          iconColorClass="text-green-600 dark:text-green-400"
        />
        <StatCard
          icon={AlertTriangle}
          title="Cần tạo thêm"
          value={loadingStats ? 'loading' : myQuota?.topics_needed ?? 0}
          description="Để đạt quota"
          iconBgClass={cn(myQuota?.topics_needed > 0 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-green-100 dark:bg-green-900/30")}
          iconColorClass={cn(myQuota?.topics_needed > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400")}
        />
        <StatCard
          icon={CheckCircle}
          title="Nhóm đã nhận HD"
          value={loadingStats ? 'loading' : myQuota?.actual_assigned ?? 0}
          description="Nhóm đang hướng dẫn"
          iconBgClass="bg-indigo-100 dark:bg-indigo-900/30"
          iconColorClass="text-indigo-600 dark:text-indigo-400"
        />
      </motion.div>

      <motion.div
        variants={tableVariants}
        initial="hidden"
        animate="visible"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="my">Đề tài của tôi</TabsTrigger>
            <TabsTrigger value="all">Tất cả đề tài (Khoa)</TabsTrigger>
          </TabsList>

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

      <TopicDetailDialog
        open={showTopicDetailDialog}
        onOpenChange={setShowTopicDetailDialog}
        topicId={selectedTopicId}
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
          <div className="flex justify-end gap-2">
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
        </DialogContent>
      </Dialog>

      <RegisteredGroupsDialog
        open={showRegisteredGroupsDialog}
        onOpenChange={setShowRegisteredGroupsDialog}
        topic={selectedTopicForGroups}
      />
    </motion.div>
  );
};

export default ThesisTopicsPage;