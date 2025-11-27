import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Users, BookOpen, Layers, Info, AlertTriangle, Plus, Minus, Save, RotateCcw } from 'lucide-react';
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
  const [originalDepartments, setOriginalDepartments] = useState([]); // Để so sánh thay đổi
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [quotaAmount, setQuotaAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (selectedPlan) {
      loadData();
    } else {
      setStatistics({});
      setDepartments([]);
      setOriginalDepartments([]);
      setHasChanges(false);
    }
  }, [selectedPlan]);

  // Kiểm tra thay đổi
  useEffect(() => {
    if (departments.length === 0 || originalDepartments.length === 0) {
        setHasChanges(false);
        return;
    }
    const isDifferent = JSON.stringify(departments) !== JSON.stringify(originalDepartments);
    setHasChanges(isDifferent);
  }, [departments, originalDepartments]);

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
      setOriginalDepartments(JSON.parse(JSON.stringify(departmentsRes.data))); // Deep copy
      setHasChanges(false);
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

  // Cập nhật local state (dùng cho +/- và onChange input)
  const handleLocalChange = (deptId, newValue) => {
    setDepartments(prev => 
        prev.map(dept => 
            dept.ID_KHOA_BOMON === deptId 
            ? { ...dept, quota_assigned: newValue } 
            : dept
        )
    );
  };

  // [MỚI] Hàm lưu NGAY LẬP TỨC 1 dòng (dùng cho phím Enter)
  const handleSaveSingleRow = async (deptId, newQuota) => {
    setIsSubmitting(true);
    try {
        await quotaService.assignDepartmentQuota({
            ID_KEHOACH: selectedPlan,
            ID_KHOA_BOMON: deptId,
            SO_DETAI_QUOTA: newQuota,
            GHICHU: 'Cập nhật nhanh'
        });

        toast.success('Đã lưu quota cho bộ môn này.');
        
        // Cập nhật lại originalDepartments để nó khớp với giá trị vừa lưu
        // Như vậy nút "Lưu thay đổi" sẽ không sáng lên vì dòng này nữa
        setOriginalDepartments(prev => 
            prev.map(dept => 
                dept.ID_KHOA_BOMON === deptId 
                ? { ...dept, quota_assigned: newQuota } 
                : dept
            )
        );
        
        // Cập nhật lại Statistics để số liệu tổng chính xác
        const statsRes = await quotaService.getStatistics({ plan_id: selectedPlan });
        setStatistics(statsRes.data);

    } catch (error) {
        toast.error(error.response?.data?.message || 'Lỗi khi lưu quota');
    } finally {
        setIsSubmitting(false);
    }
  };

  // Nút Reset
  const handleResetChanges = () => {
      setDepartments(JSON.parse(JSON.stringify(originalDepartments)));
      setHasChanges(false);
      toast.info("Đã hủy các thay đổi chưa lưu.");
  };

  // Nút Lưu tất cả
  const handleSaveAll = async () => {
      setIsSubmitting(true);
      try {
          const changedDepts = departments.filter((dept, index) => {
              return dept.quota_assigned !== originalDepartments[index].quota_assigned;
          });

          if (changedDepts.length === 0) {
              toast.info("Không có thay đổi nào để lưu.");
              return;
          }

          const promises = changedDepts.map(dept => 
              quotaService.assignDepartmentQuota({
                  ID_KEHOACH: selectedPlan,
                  ID_KHOA_BOMON: dept.ID_KHOA_BOMON,
                  SO_DETAI_QUOTA: dept.quota_assigned,
                  GHICHU: 'Cập nhật hàng loạt'
              })
          );

          await Promise.all(promises);
          toast.success(`Đã cập nhật thành công ${changedDepts.length} bộ môn.`);
          loadData();
          
      } catch (error) {
          console.error("Lỗi lưu hàng loạt:", error);
          toast.error("Có lỗi xảy ra khi lưu dữ liệu.");
      } finally {
          setIsSubmitting(false);
      }
  };

  // (Phần code xử lý manual assign bên trái - giữ nguyên)
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
    // Tính tổng real-time dựa trên state 'departments'
    const totalAssigned = departments.reduce((sum, dept) => sum + (dept.quota_assigned || 0), 0);
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
          {/* Stat Cards */}
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
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div>
              <CardTitle className="text-xl font-bold">Bảng Chi tiết Quota Bộ môn</CardTitle>
              <CardDescription>
                Điều chỉnh số lượng và nhấn <strong>Enter</strong> để lưu từng dòng, hoặc nhấn <strong>Lưu thay đổi</strong> để lưu tất cả.
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-3">
                {/* --- HIỂN THỊ TỔNG SỐ LƯỢNG --- */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md border border-border/50 shadow-sm">
                    <span className="text-sm text-muted-foreground font-medium">Tổng cộng:</span>
                    <span className={cn(
                        "text-lg font-bold", 
                        totalAssigned > totalRequired ? "text-orange-600" : "text-primary"
                    )}>
                        {totalAssigned}
                    </span>
                </div>

                {hasChanges && (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleResetChanges}
                        disabled={isSubmitting}
                        className="text-muted-foreground"
                    >
                        <RotateCcw className="h-4 w-4 mr-2" /> Hủy
                    </Button>
                )}

                <Button 
                    onClick={handleSaveAll}
                    disabled={!hasChanges || isSubmitting}
                    className={cn("transition-all", hasChanges ? "animate-pulse shadow-lg" : "opacity-50")}
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Lưu thay đổi
                </Button>
            </div>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLocalChange(dept.ID_KHOA_BOMON, Math.max(0, (dept.quota_assigned || 0) - 1))}
                            disabled={isLoadingData}
                            className="h-6 w-6 p-0"
                          >
                            -
                          </Button>

                          <input
                            type="number"
                            value={dept.quota_assigned || 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              handleLocalChange(dept.ID_KHOA_BOMON, isNaN(val) ? 0 : val);
                            }}
                            // Bắt sự kiện Enter để lưu ngay
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = parseInt(e.target.value, 10) || 0;
                                handleSaveSingleRow(dept.ID_KHOA_BOMON, val);
                                e.target.blur(); // Bỏ focus sau khi lưu
                              }
                            }}
                            disabled={isLoadingData}
                            className="w-16 text-center font-bold text-primary border rounded-md h-6 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                            min={0}
                          />

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLocalChange(dept.ID_KHOA_BOMON, (dept.quota_assigned || 0) + 1)}
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