import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Users, Layers, Info, AlertTriangle, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import lecturerQuotaService from '@/api/lecturerQuotaService';
import axios from '@/api/axiosConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// --- 1. Component Thẻ Thống Kê (StatCard) ---
const StatCard = ({ icon: Icon, title, value, description, iconBgClass, iconColorClass }) => (
  <motion.div
    className="bg-card text-card-foreground p-3 rounded-lg shadow-sm border flex items-center gap-3 transition-all duration-300 hover:shadow-md"
    whileHover={{ y: -2 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
  >
    <motion.div
      className={cn("p-2 rounded-lg", iconBgClass)}
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
      <Icon className={cn("h-5 w-5", iconColorClass)} />
    </motion.div>
    <div className="flex-1">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="flex items-center gap-2 h-7 overflow-hidden mt-0.5">
        <AnimatePresence mode="wait">
          <motion.div
            key={value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-2"
          >
            {value === 'loading' ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-xl font-bold">{value}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {description && (
        <motion.p
          className="text-[10px] text-muted-foreground mt-0.5"
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

// --- 2. Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

// --- 3. Main Component ---
const QuotaManager = () => {
  const [departmentQuotaInfo, setDepartmentQuotaInfo] = useState({});
  const [lecturers, setLecturers] = useState([]);
  const [originalLecturers, setOriginalLecturers] = useState([]); 
  const [selectedPlan, setSelectedPlan] = useState('');
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false); 

  // --- Lifecycle & Effects ---
  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (selectedPlan) {
      loadData();
    } else {
      setDepartmentQuotaInfo({});
      setLecturers([]);
      setOriginalLecturers([]);
      setHasChanges(false);
    }
  }, [selectedPlan]);

  // Kiểm tra thay đổi dữ liệu để hiện nút Lưu
  useEffect(() => {
    if (lecturers.length === 0 || originalLecturers.length === 0) {
        setHasChanges(false);
        return;
    }
    const isDifferent = JSON.stringify(lecturers) !== JSON.stringify(originalLecturers);
    setHasChanges(isDifferent);
  }, [lecturers, originalLecturers]);

  // --- API Handlers ---
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
      const response = await lecturerQuotaService.getLecturers({ plan_id: selectedPlan });
      setDepartmentQuotaInfo(response.data);
      setLecturers(response.data.lecturers || []);
      setOriginalLecturers(JSON.parse(JSON.stringify(response.data.lecturers || []))); 
      setHasChanges(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tải dữ liệu giảng viên');
      console.error(error);
      setDepartmentQuotaInfo({});
      setLecturers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Tự động chia đều quota
  const handleAutoAssignQuotas = async () => {
    if (!selectedPlan) {
      toast.error('Vui lòng chọn kế hoạch');
      return;
    }
    setIsSubmitting(true);
    try {
      await lecturerQuotaService.autoAssignLecturerQuotas({
        ID_KEHOACH: selectedPlan
      });
      toast.success('Tự động phân công đề tài cho giảng viên thành công');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tự động phân công');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cập nhật state cục bộ khi người dùng nhập/nhấn +/-
  const handleLocalChange = (lecturerId, newQuota) => {
    setLecturers(prev => 
        prev.map(gv => 
            gv.ID_GIANGVIEN === lecturerId 
            ? { ...gv, quota_assigned: newQuota } 
            : gv
        )
    );
  };

  // Lưu 1 dòng khi nhấn Enter
  const handleSaveSingleRow = async (lecturerId, newQuota) => {
    if (newQuota < 0) return;
    setIsSubmitting(true);
    try {
        await lecturerQuotaService.assignLecturerQuota({
            ID_KEHOACH: selectedPlan,
            ID_GIANGVIEN: lecturerId,
            SO_DETAI_QUOTA: newQuota,
            GHICHU: 'Cập nhật nhanh'
        });
        toast.success('Đã lưu quota.');

        // Cập nhật lại original để đồng bộ
        setOriginalLecturers(prev => 
            prev.map(gv => 
                gv.ID_GIANGVIEN === lecturerId 
                ? { ...gv, quota_assigned: newQuota } 
                : gv
            )
        );
        loadData(); 
    } catch (error) {
        toast.error(error.response?.data?.message || 'Lỗi khi lưu quota');
    } finally {
        setIsSubmitting(false);
    }
  };

  // Hủy thay đổi
  const handleResetChanges = () => {
      setLecturers(JSON.parse(JSON.stringify(originalLecturers)));
      setHasChanges(false);
      toast.info("Đã hủy các thay đổi chưa lưu.");
  };

  // Lưu tất cả thay đổi
  const handleSaveAll = async () => {
      setIsSubmitting(true);
      try {
          const changedLecturers = lecturers.filter((gv, index) => {
              return gv.quota_assigned !== originalLecturers[index].quota_assigned;
          });

          if (changedLecturers.length === 0) {
              toast.info("Không có thay đổi nào để lưu.");
              return;
          }

          const promises = changedLecturers.map(gv => 
              lecturerQuotaService.assignLecturerQuota({
                  ID_KEHOACH: selectedPlan,
                  ID_GIANGVIEN: gv.ID_GIANGVIEN,
                  SO_DETAI_QUOTA: gv.quota_assigned,
                  GHICHU: 'Cập nhật hàng loạt'
              })
          );

          await Promise.all(promises);
          toast.success(`Đã cập nhật thành công ${changedLecturers.length} giảng viên.`);
          loadData();
          
      } catch (error) {
          console.error("Lỗi lưu hàng loạt:", error);
          toast.error("Có lỗi xảy ra khi lưu dữ liệu.");
      } finally {
          setIsSubmitting(false);
      }
  };

  // Helper hiển thị trạng thái
  const getQuotaStatus = (quota, actual) => {
    if (quota === 0) return <Badge variant="outline">Chưa phân công</Badge>;
    if (actual >= quota) return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700">Đủ</Badge>;
    return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700">Còn {quota - actual}</Badge>;
  };

  // --- Render Content Logic ---
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

    const totalDeptQuota = departmentQuotaInfo.department_quota || 0;
    const totalAssignedToLecturers = lecturers.reduce((sum, gv) => sum + (gv.quota_assigned || 0), 0);
    const remainingForDept = totalDeptQuota - totalAssignedToLecturers;
    const isLoadingData = isLoading || isSubmitting;

    return (
      <motion.div
        className="space-y-6 pb-20"
        key={selectedPlan}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* STATS CARDS */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <StatCard
            icon={Layers}
            title="Tổng Quota Bộ môn"
            value={totalDeptQuota}
            description="Được Admin giao"
            iconBgClass="bg-blue-100 dark:bg-blue-900/30"
            iconColorClass="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            icon={Users}
            title="Đã Phân công (GV)"
            value={totalAssignedToLecturers}
            description={`Cho ${lecturers.length} giảng viên`}
            iconBgClass="bg-green-100 dark:bg-green-900/30"
            iconColorClass="text-green-600 dark:text-green-400"
          />
          <StatCard
            icon={AlertTriangle}
            title="Quota Bộ môn Còn lại"
            value={remainingForDept}
            description="Chưa phân cho giảng viên"
            iconBgClass={cn(remainingForDept > 0 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-green-100 dark:bg-green-900/30")}
            iconColorClass={cn(remainingForDept > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400")}
          />
        </motion.div>

        {/* AUTO ASSIGN CARD */}
        <Card>
          <CardHeader>
            <CardTitle>Tự động Phân công (Giảng viên)</CardTitle>
            <CardDescription>
              Chia đều <span className="font-bold text-primary">{totalDeptQuota}</span> đề tài của bộ môn cho <span className="font-bold text-primary">{lecturers.length}</span> giảng viên.
            </CardDescription>
          </CardHeader>
          <CardFooter className="bg-muted/50 dark:bg-card/50 p-4 border-t">
            <div className="flex justify-between items-center w-full">
              <p className="text-xs text-muted-foreground max-w-md">
                <strong>Lưu ý:</strong> Thao tác này sẽ ghi đè lên tất cả quota thủ công của giảng viên trong kế hoạch này.
              </p>
              <Button
                onClick={handleAutoAssignQuotas}
                disabled={!selectedPlan || isLoading || isSubmitting || totalDeptQuota === 0}
                variant="destructive"
                size="sm"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Tự động phân công
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* MANUAL ASSIGN TABLE */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 bg-muted/5 pb-4">
            <div>
              <CardTitle>Điều chỉnh Thủ công (Giảng viên)</CardTitle>
              <CardDescription>
                Cập nhật số lượng quota đề tài tối đa cho từng giảng viên.
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md border border-border/50 shadow-sm">
                    <span className="text-sm text-muted-foreground font-medium">Tổng cộng:</span>
                    <span className={cn(
                        "text-lg font-bold", 
                        totalAssignedToLecturers > totalDeptQuota ? "text-orange-600" : "text-primary"
                    )}>
                        {totalAssignedToLecturers}
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
                    size="sm"
                    disabled={!hasChanges || isSubmitting}
                    className={cn("transition-all", hasChanges ? "animate-pulse shadow-lg" : "opacity-50")}
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Lưu thay đổi
                </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {lecturers.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground border-t border-dashed">
                Không có giảng viên nào trong Bộ môn này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/20">
                    <TableRow>
                        <TableHead className="w-[30%] pl-6">Giảng viên</TableHead>
                        <TableHead>Học vị</TableHead>
                        <TableHead className="text-center font-bold text-primary">Quota Được Giao</TableHead>
                        <TableHead className="text-center">Đề tài Đã Tạo</TableHead>
                        <TableHead className="text-center pr-6">Trạng Thái</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {lecturers.map(gv => (
                        <TableRow key={gv.ID_GIANGVIEN} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold pl-6">{gv.TEN_GIANGVIEN}</TableCell>
                        <TableCell>{gv.HOCVI || 'N/A'}</TableCell>
                        <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleLocalChange(gv.ID_GIANGVIEN, Math.max(0, (gv.quota_assigned || 0) - 1))}
                                disabled={isLoadingData}
                                className="h-7 w-7 p-0 rounded-full"
                            >
                                -
                            </Button>

                            <input
                                type="number"
                                min="0"
                                value={gv.quota_assigned || 0}
                                className="w-14 text-center border rounded-md h-8 focus:outline-none focus:ring-2 focus:ring-primary bg-background font-bold"
                                disabled={isSubmitting}
                                onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                handleLocalChange(gv.ID_GIANGVIEN, isNaN(value) ? 0 : value);
                                }}
                                onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    const value = parseInt(e.target.value, 10) || 0;
                                    handleSaveSingleRow(gv.ID_GIANGVIEN, value);
                                    e.target.blur();
                                }
                                }}
                            />

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleLocalChange(gv.ID_GIANGVIEN, (gv.quota_assigned || 0) + 1)}
                                disabled={isLoadingData}
                                className="h-7 w-7 p-0 rounded-full"
                            >
                                +
                            </Button>
                            </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground">
                            {gv.topics_created || 0}
                        </TableCell>
                        <TableCell className="text-center pr-6">
                            {getQuotaStatus(gv.quota_assigned || 0, gv.topics_created || 0)}
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <motion.div
      className="h-full overflow-y-auto flex-1 space-y-6 p-4 md:p-8 bg-muted/10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100">
              <Layers className="h-5 w-5 text-blue-500" />
              Phân công Đề tài
            </CardTitle>
            <CardDescription className="mt-1">
              Phân bổ quota đề tài của bộ môn cho các giảng viên.
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