import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Users, CheckCircle, Info, Layers, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import lecturerQuotaService from '@/api/lecturerQuotaService';
import axios from '@/api/axiosConfig';
import { useAuth } from '@/contexts/AuthContext';
import LecturerQuotaManager from "./components/QuotaManager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const StatCard = ({ icon: Icon, title, value, description, iconBgClass, iconColorClass }) => (
  <motion.div
    className="bg-card text-card-foreground p-2 rounded-lg shadow-sm border flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1"
    whileHover={{ y: -4 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
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

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
    <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  </div>
);

const LecturerQuotaManagementPage = () => {
  const { user } = useAuth();
  const isDepartmentHead = user?.giangvien?.CHUCVU === 'Trưởng bộ môn';

  const [myQuota, setMyQuota] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGV, setIsLoadingGV] = useState(false);

  useEffect(() => {
    if (!isDepartmentHead) {
      loadPlans();
    }
  }, [isDepartmentHead]);

  useEffect(() => {
    if (!isDepartmentHead && selectedPlan) {
      loadMyQuota();
    } else if (!isDepartmentHead) {
      setMyQuota(null);
    }
  }, [selectedPlan, isDepartmentHead]);

  if (isDepartmentHead) {
    return <LecturerQuotaManager />;
  }

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/admin/thesis-plans/list-all');
      const plansData = response.data || [];
      setPlans(plansData);
      if (plansData.length > 0 && !selectedPlan) {
        setSelectedPlan(String(plansData[0].ID_KEHOACH));
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Lỗi khi tải danh sách kế hoạch');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyQuota = async () => {
    if (!selectedPlan) return;
    setIsLoadingGV(true);
    try {
      const response = await lecturerQuotaService.getMyQuota({ plan_id: selectedPlan });
      setMyQuota(response.data);
    } catch (error) {
      toast.error('Lỗi khi tải thông tin quota của bạn');
      console.error(error);
      setMyQuota(null);
    } finally {
      setIsLoadingGV(false);
    }
  };

  const getQuotaStatus = () => {
    if (!myQuota || myQuota.quota_assigned === 0) {
      return <Badge variant="outline">Chưa phân công</Badge>;
    }
    if (myQuota.topics_created >= myQuota.quota_assigned) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700">Đã đủ</Badge>;
    }
    return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700">Còn {myQuota.topics_needed}</Badge>;
  };

  const renderContent = () => {
    if (isLoadingGV) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-blue-500">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Đang tải dữ liệu quota...</p>
        </div>
      );
    }

    if (!selectedPlan) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-card rounded-lg p-6 border-2 border-dashed">
          <Info className="h-8 w-8 mb-4 text-orange-500" />
          <p className="text-lg font-semibold">Vui lòng chọn một Kế hoạch Khóa luận</p>
          {plans.length === 0 && <p className="text-sm mt-2">Hiện tại không có Kế hoạch nào.</p>}
        </div>
      );
    }

    if (!myQuota) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-card rounded-lg p-6 border-2 border-dashed">
          <Info className="h-8 w-8 mb-4 text-gray-400" />
          <p className="text-lg font-semibold">Chưa có dữ liệu Quota</p>
          <p className="text-sm mt-2">Bạn chưa được phân công quota cho kế hoạch này.</p>
        </div>
      );
    }

    return (
      <motion.div
        className="space-y-6"
        key={selectedPlan}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <StatCard
            icon={Users}
            title="Quota Được Giao"
            value={myQuota.quota_assigned || 0}
            description="Số đề tài tối đa"
            iconBgClass="bg-blue-100 dark:bg-blue-900/30"
            iconColorClass="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            icon={BookOpen}
            title="Đề Tài Đã Tạo"
            value={myQuota.topics_created || 0}
            description="Đã duyệt/Chờ duyệt"
            iconBgClass="bg-green-100 dark:bg-green-900/30"
            iconColorClass="text-green-600 dark:text-green-400"
          />
          <StatCard
            icon={AlertTriangle}
            title="Cần Tạo Thêm"
            value={myQuota.topics_needed || 0}
            description="Để đạt quota"
            iconBgClass={cn(myQuota.topics_needed > 0 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-green-100 dark:bg-green-900/30")}
            iconColorClass={cn(myQuota.topics_needed > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400")}
          />
          <StatCard
            icon={CheckCircle}
            title="Nhóm đã nhận HD"
            value={myQuota.actual_assigned || 0}
            description="Nhóm đang hướng dẫn"
            iconBgClass="bg-indigo-100 dark:bg-indigo-900/30"
            iconColorClass="text-indigo-600 dark:text-indigo-400"
          />
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle>Trạng thái Quota</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-lg bg-card border">
            <div className="flex items-center gap-4">
              {getQuotaStatus()}
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  Bạn đã tạo {myQuota.topics_created} / {myQuota.quota_assigned} đề tài.
                </p>
                <p className="text-muted-foreground">
                  ({myQuota.actual_assigned} đề tài đã được phân công cho nhóm)
                </p>
              </div>
            </div>
            {myQuota.topics_needed > 0 && (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Vui lòng tạo thêm {myQuota.topics_needed} đề tài.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin Bộ môn</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoItem
              icon={Layers}
              label="Tổng Quota Bộ môn"
              value={myQuota.department_quota || 0}
            />
            <InfoItem
              icon={Users}
              label="Bộ môn đã phân công"
              value={myQuota.department_assigned || 0}
            />
            <InfoItem
              icon={CheckCircle}
              label="Bộ môn còn lại"
              value={myQuota.department_remaining || 0}
            />
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <motion.div
      className="flex-1 space-y-6 p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100">
              <BookOpen className="h-5 w-5 text-blue-500" />
              Thông Tin Quota Đề Tài
            </CardTitle>
          </div>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium whitespace-nowrap text-muted-foreground">Chọn Kế hoạch:</label>
            <Select
              value={selectedPlan ? String(selectedPlan) : ""}
              onValueChange={setSelectedPlan}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full md:w-[300px] bg-background">
                <SelectValue placeholder="Chọn kế hoạch" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : plans.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">Không có kế hoạch</div>
                ) : (
                  plans.map(plan => (
                    <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                      {plan.TEN_DOT} - {plan.NAMHOC}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {renderContent()}
    </motion.div>
  );
};

export default LecturerQuotaManagementPage;