import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Users, BookOpen, Layers, Info, AlertTriangle, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import quotaService from '@/api/quotaService';
import axios from '@/api/axiosConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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

const QuotaManager = () => {
  const [statistics, setStatistics] = useState({});
  const [departments, setDepartments] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [quotaAmount, setQuotaAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (selectedPlan) {
      loadData();
    } else {
      setStatistics({});
      setDepartments([]);
    }
  }, [selectedPlan]);

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
      console.error('Lỗi khi tải danh sách kế hoạch:', error);
      toast.error('Lỗi khi tải danh sách kế hoạch');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    if (!selectedPlan) return;
    setIsLoading(true);
    try {
      const [statsRes, departmentsRes] = await Promise.all([
        quotaService.getStatistics({ plan_id: selectedPlan }),
        quotaService.getDepartments({ plan_id: selectedPlan })
      ]);
      setStatistics(statsRes.data);
      setDepartments(departmentsRes.data);
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu thống kê');
      console.error(error);
      setStatistics({});
      setDepartments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRatio = (quota, lecturers) => {
    if (lecturers === 0) return 'N/A';
    return (quota / lecturers).toFixed(2);
  };

  const handleAssignQuota = async () => {
    if (!selectedDepartmentId || quotaAmount === '' || !selectedPlan) {
      toast.error('Vui lòng chọn khoa/bộ môn và nhập số lượng đề tài');
      return;
    }
    setIsSubmitting(true);
    try {
      await quotaService.assignDepartmentQuota({
        ID_KEHOACH: selectedPlan,
        ID_KHOA_BOMON: selectedDepartmentId,
        SO_DETAI_QUOTA: parseInt(quotaAmount),
        GHICHU: note
      });
      toast.success('Cập nhật quota đề tài thành công');
      setSelectedDepartmentId('');
      setQuotaAmount('');
      setNote('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi phân công đề tài');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickUpdateQuota = async (departmentId, newQuota) => {
    setIsSubmitting(true);
    try {
      await quotaService.assignDepartmentQuota({
        ID_KEHOACH: selectedPlan,
        ID_KHOA_BOMON: departmentId,
        SO_DETAI_QUOTA: newQuota,
        GHICHU: 'Cập nhật nhanh từ bảng'
      });

      // ✅ Cập nhật ngay trong state departments
      setDepartments(prev =>
        prev.map(dept =>
          dept.ID_KHOA_BOMON === departmentId
            ? { ...dept, quota_assigned: newQuota }
            : dept
        )
      );

      toast.success('Cập nhật quota thành công');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật quota');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleAutoAssignQuotas = async () => {
    if (!selectedPlan) {
      toast.error('Vui lòng chọn kế hoạch');
      return;
    }
    setIsSubmitting(true);
    try {
      await quotaService.autoAssignQuotas({
        ID_KEHOACH: selectedPlan
      });
      toast.success('Tự động phân công đề tài thành công');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tự động phân công đề tài');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getQuotaStatus = (quota, actual) => {
    if (quota === 0) return <Badge variant="outline">Chưa phân công</Badge>;
    if (actual >= quota) return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700">Đủ</Badge>;
    return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700">Còn {quota - actual}</Badge>;
  };

  const renderContent = () => {
    if (isLoading && !isSubmitting) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-blue-500">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Đang tải dữ liệu kế hoạch...</p>
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

    const totalRequired = statistics.overview?.required_topics || 0;
    const totalAssigned = departments.reduce((sum, dept) => sum + (dept.quota_assigned || 0), 0);
    const remainingQuota = totalRequired - totalAssigned;
    const isLoadingData = isLoading || isSubmitting;

    return (
      <motion.div
        className="space-y-6"
        key={selectedPlan}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
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
            title="Tổng sinh viên"
            value={isLoadingData ? 'loading' : statistics.overview?.total_students || 0}
            description="Trong kế hoạch"
            iconBgClass="bg-blue-100 dark:bg-blue-900/30"
            iconColorClass="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            icon={Layers}
            title="Số nhóm dự kiến"
            value={isLoadingData ? 'loading' : statistics.overview?.expected_groups || 0}
            description="Dựa trên tổng sinh viên"
            iconBgClass="bg-indigo-100 dark:bg-indigo-900/30"
            iconColorClass="text-indigo-600 dark:text-indigo-400"
          />
          <StatCard
            icon={BookOpen}
            title="Đề tài cần ra (Target)"
            value={isLoadingData ? 'loading' : totalRequired}
            description="1.5x số nhóm dự kiến"
            iconBgClass="bg-green-100 dark:bg-green-900/30"
            iconColorClass="text-green-600 dark:text-green-400"
          />
          <StatCard
            icon={AlertTriangle}
            title="Tổng quota đã phân công"
            value={isLoadingData ? 'loading' : totalAssigned}
            description="Tổng số quota đã giao cho các Khoa/Bộ môn"
            iconBgClass="bg-green-100 dark:bg-green-900/30"
            iconColorClass="text-green-600 dark:text-green-400"
          />

        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle>Tự động Phân công (Khoa/Bộ môn)</CardTitle>
            <CardDescription>
              Phân bổ <span className="font-bold text-primary">{totalRequired}</span> đề tài (target) đều cho các Khoa/Bộ môn.
            </CardDescription>
          </CardHeader>
          <CardFooter className="bg-muted/50 dark:bg-card/50 p-4 border-t">
            <div className="flex justify-between items-center w-full">
              <p className="text-xs text-muted-foreground max-w-md">
                <strong>Lưu ý:</strong> Thao tác này sẽ ghi đè lên tất cả quota thủ công của các Khoa/Bộ môn.
              </p>
              <Button
                onClick={handleAutoAssignQuotas}
                disabled={!selectedPlan || isLoadingData || totalRequired === 0}
                variant="destructive"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Tự động phân công
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Điều chỉnh Thủ công (Ghim Quota)</CardTitle>
            <CardDescription>
              Cập nhật quota cho một Khoa/Bộ môn. Hệ thống sẽ tự động phân phối lại số quota còn lại cho các khoa khác.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Khoa/Bộ môn</label>
                <Select
                  value={selectedDepartmentId ? String(selectedDepartmentId) : ""}
                  onValueChange={(value) => {
                    setSelectedDepartmentId(value);
                    const dept = departments.find(d => String(d.ID_KHOA_BOMON) === value);
                    if (dept && dept.quota_assigned > 0) {
                      setQuotaAmount(String(dept.quota_assigned));
                    } else if (remainingQuota > 0) {
                      setQuotaAmount(String(remainingQuota));
                    } else {
                      setQuotaAmount("0");
                    }
                  }}
                  disabled={!selectedPlan || isLoadingData || departments.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn khoa/bộ môn" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.ID_KHOA_BOMON} value={String(dept.ID_KHOA_BOMON)}>
                        {dept.TEN_KHOA_BOMON}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Quota (Số đề tài)</label>
                <Input
                  type="number"
                  placeholder="Số lượng"
                  value={quotaAmount}
                  onChange={(e) => setQuotaAmount(e.target.value)}
                  min="0"
                  disabled={!selectedPlan || isLoadingData}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Ghi chú (tùy chọn)</label>
                <Textarea
                  placeholder="Lý do điều chỉnh (nếu có)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={1}
                  disabled={!selectedPlan || isLoadingData}
                />
              </div>

              <Button
                onClick={handleAssignQuota}
                disabled={!selectedDepartmentId || quotaAmount === '' || !selectedPlan || isLoadingData}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Cập nhật (Ghim)
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div>
              <CardTitle className="text-xl font-bold">Bảng Chi tiết Quota Bộ môn</CardTitle>
              <CardDescription>Tổng hợp quota đã được giao và tình trạng sử dụng đề tài của từng khoa/bộ môn.</CardDescription>
            </div>
            <motion.div
              className="flex items-center gap-2 px-3 py-1 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50" // Đổi màu nền và viền
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />  
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Đề tài đã giao:
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400 ml-1">  
                  {totalAssigned}
                </span>
              </p>
            </motion.div>
          </CardHeader>
          <CardContent>
            {departments.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                Không có Khoa/Bộ môn nào.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Khoa/Bộ môn</TableHead>
                    <TableHead className="text-center">Số GV</TableHead>
                    <TableHead className="text-center font-bold text-primary">Được Giao</TableHead>
                    <TableHead className="text-center">Tỷ lệ</TableHead>
                    <TableHead className="text-center">Đề tài Đã Tạo</TableHead>
                    <TableHead className="text-center">Trạng Thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map(dept => (
                    <TableRow key={dept.ID_KHOA_BOMON} className="hover:bg-muted/50">
                      <TableCell className="font-semibold">{dept.TEN_KHOA_BOMON}</TableCell>
                      <TableCell className="text-center">{dept.total_lecturers || 0}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Nút giảm */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleQuickUpdateQuota(
                                dept.ID_KHOA_BOMON,
                                Math.max(0, (dept.quota_assigned || 0) - 1)
                              )
                            }
                            disabled={(dept.quota_assigned || 0) <= 0 || isLoadingData}
                            className="h-6 w-6 p-0"
                          >
                            -
                          </Button>

                          {/* Ô nhập số quota */}
                          <input
                            type="number"
                            value={dept.quota_assigned || 0}
                            onChange={(e) => {
                              // chỉ cập nhật tạm thời trong state (không gọi API)
                              const newValue = parseInt(e.target.value, 10) || 0;
                              setDepartments(prev =>
                                prev.map(d =>
                                  d.ID_KHOA_BOMON === dept.ID_KHOA_BOMON
                                    ? { ...d, quota_assigned: newValue }
                                    : d
                                )
                              );
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newValue = parseInt(e.target.value, 10) || 0;
                                handleQuickUpdateQuota(dept.ID_KHOA_BOMON, newValue);
                              }
                            }}
                            disabled={isLoadingData}
                            className="w-16 text-center font-bold text-primary border rounded-md h-6 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            min={0}
                          />


                          {/* Nút tăng */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleQuickUpdateQuota(
                                dept.ID_KHOA_BOMON,
                                (dept.quota_assigned || 0) + 1
                              )
                            }
                            disabled={isLoadingData}
                            className="h-6 w-6 p-0"
                          >
                            +
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-orange-500 dark:text-orange-400">
                        {calculateRatio(dept.quota_assigned || 0, dept.total_lecturers || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        {dept.actual_created || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {getQuotaStatus(dept.quota_assigned || 0, dept.actual_created || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
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
              <Layers className="h-5 w-5 text-blue-500" />
              Quản lý Phân công Đề tài (Admin)
            </CardTitle>
            <CardDescription className="mt-1">
              Phân bổ quota đề tài cho các Khoa/Bộ môn.
            </CardDescription>
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

export default QuotaManager;
