import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Users, BookOpen, Layers, Info, AlertTriangle, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import lecturerQuotaService from '@/api/lecturerQuotaService';
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
  const [departmentQuotaInfo, setDepartmentQuotaInfo] = useState({});
  const [lecturers, setLecturers] = useState([]);
  const [originalLecturers, setOriginalLecturers] = useState([]); // [MỚI] Để so sánh thay đổi
  const [selectedLecturerId, setSelectedLecturerId] = useState('');
  const [quotaAmount, setQuotaAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false); // [MỚI] Trạng thái thay đổi

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

  // [MỚI] Kiểm tra thay đổi
  useEffect(() => {
    if (lecturers.length === 0 || originalLecturers.length === 0) {
        setHasChanges(false);
        return;
    }
    // So sánh đơn giản qua chuỗi JSON
    const isDifferent = JSON.stringify(lecturers) !== JSON.stringify(originalLecturers);
    setHasChanges(isDifferent);
  }, [lecturers, originalLecturers]);

  // Update quota amount when lecturer is selected (Left panel)
  useEffect(() => {
    if (selectedLecturerId && lecturers.length > 0) {
      const selectedLecturer = lecturers.find(gv => gv.ID_GIANGVIEN === parseInt(selectedLecturerId));
      if (selectedLecturer) {
        setQuotaAmount(String(selectedLecturer.quota_assigned || 0));
      }
    } else {
      setQuotaAmount('');
    }
  }, [selectedLecturerId, lecturers]);

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
      // [MỚI] Sao chép dữ liệu gốc
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

  const handleAssignQuota = async () => {
    if (!selectedLecturerId || quotaAmount === '' || !selectedPlan) {
      toast.error('Vui lòng chọn giảng viên và nhập số lượng đề tài');
      return;
    }
    setIsSubmitting(true);
    try {
      await lecturerQuotaService.assignLecturerQuota({
        ID_KEHOACH: selectedPlan,
        ID_GIANGVIEN: selectedLecturerId,
        SO_DETAI_QUOTA: parseInt(quotaAmount),
        GHICHU: note
      });
      toast.success('Cập nhật quota cho giảng viên thành công');
      setSelectedLecturerId('');
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

  // [MỚI] Hàm cập nhật local state (cho nút +/- và input)
  const handleLocalChange = (lecturerId, newQuota) => {
    setLecturers(prev => 
        prev.map(gv => 
            gv.ID_GIANGVIEN === lecturerId 
            ? { ...gv, quota_assigned: newQuota } 
            : gv
        )
    );
  };

  // [MỚI] Hàm lưu ngay lập tức 1 dòng (dùng cho phím Enter)
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

        // Cập nhật lại original để tắt trạng thái "Thay đổi" cho dòng này
        setOriginalLecturers(prev => 
            prev.map(gv => 
                gv.ID_GIANGVIEN === lecturerId 
                ? { ...gv, quota_assigned: newQuota } 
                : gv
            )
        );
        
        // Load lại để update số liệu tổng bộ môn (nếu cần chính xác tuyệt đối từ server)
        // Hoặc update local nếu muốn nhanh
        loadData(); 

    } catch (error) {
        toast.error(error.response?.data?.message || 'Lỗi khi lưu quota');
    } finally {
        setIsSubmitting(false);
    }
  };

  // [MỚI] Nút Reset
  const handleResetChanges = () => {
      setLecturers(JSON.parse(JSON.stringify(originalLecturers)));
      setHasChanges(false);
      toast.info("Đã hủy các thay đổi chưa lưu.");
  };

  // [MỚI] Nút Lưu tất cả
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

    const totalDeptQuota = departmentQuotaInfo.department_quota || 0;
    // [MỚI] Tính tổng real-time từ state lecturers
    const totalAssignedToLecturers = lecturers.reduce((sum, gv) => sum + (gv.quota_assigned || 0), 0);
    const remainingForDept = totalDeptQuota - totalAssignedToLecturers;
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
              <CardTitle>Điều chỉnh Thủ công (Giảng viên)</CardTitle>
              <CardDescription>
                Cập nhật số lượng quota đề tài tối đa cho từng giảng viên.
              </CardDescription>
            </div>
            {/* --- [MỚI] PHẦN NÚT BẤM LƯU & TỔNG CỘNG --- */}
            <div className="flex items-center gap-3">
                {/* Tổng số lượng */}
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
                    disabled={!hasChanges || isSubmitting}
                    className={cn("transition-all", hasChanges ? "animate-pulse shadow-lg" : "opacity-50")}
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Lưu thay đổi
                </Button>
            </div>
          </CardHeader>
          
          {/* [FIX] Phần manual assign đơn lẻ bên trái đã được tích hợp vào bảng hoặc giữ lại nếu muốn */}
          {/* Ở đây tôi ẩn phần form nhập đơn lẻ đi để dùng Bảng trực tiếp cho tiện, giống Admin */}
          {/* Nếu bạn vẫn muốn giữ form nhập đơn lẻ, có thể để lại CardContent cũ */}
          
          <CardContent>
            {lecturers.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                Không có giảng viên nào trong Bộ môn này.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Giảng viên</TableHead>
                    <TableHead>Học vị</TableHead>
                    <TableHead className="text-center font-bold text-primary">Quota Được Giao</TableHead>
                    <TableHead className="text-center">Đề tài Đã Tạo</TableHead>
                    <TableHead className="text-center">Trạng Thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lecturers.map(gv => (
                    <TableRow key={gv.ID_GIANGVIEN} className="hover:bg-muted/50">
                      <TableCell className="font-semibold">{gv.TEN_GIANGVIEN}</TableCell>
                      <TableCell>{gv.HOCVI || 'N/A'}</TableCell>
                      <TableCell className="text-center font-bold text-primary">
                        <div className="flex items-center justify-center gap-2">
                          {/* Nút giảm */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLocalChange(gv.ID_GIANGVIEN, Math.max(0, (gv.quota_assigned || 0) - 1))}
                            disabled={isLoadingData}
                            className="h-6 w-6 p-0"
                          >
                            -
                          </Button>

                          {/* Ô nhập số */}
                          <input
                            type="number"
                            min="0"
                            value={gv.quota_assigned || 0}
                            className="w-16 text-center border rounded-md h-7 focus:outline-none focus:ring-2 focus:ring-primary bg-background"
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
                            // Lưu ý: Admin có onBlur save, ở đây ta dùng nút Lưu hoặc Enter để an toàn hơn, 
                            // hoặc có thể thêm onBlur={...} gọi handleSaveSingleRow nếu muốn.
                          />

                          {/* Nút tăng */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLocalChange(gv.ID_GIANGVIEN, (gv.quota_assigned || 0) + 1)}
                            disabled={isLoadingData}
                            className="h-6 w-6 p-0"
                          >
                            +
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {gv.topics_created || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {getQuotaStatus(gv.quota_assigned || 0, gv.topics_created || 0)}
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