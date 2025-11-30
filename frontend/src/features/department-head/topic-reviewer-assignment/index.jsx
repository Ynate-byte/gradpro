import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Users, BookOpen, UserCheck, AlertTriangle, Edit, Eye, Bot, Layers } from 'lucide-react';
import { toast } from 'sonner';
import axios from '@/api/axiosConfig';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// --- Component StatCard (Compact Version) ---
const StatCard = ({ icon: Icon, title, value, description, iconBgClass, iconColorClass }) => {
    return (
        <div className="bg-card text-card-foreground p-3 rounded-lg shadow-sm border flex items-center gap-3 transition-all duration-300 hover:shadow-md">
            <div className={cn("p-2 rounded-lg", iconBgClass)}>
                {Icon && <Icon className={cn("h-5 w-5", iconColorClass)} />}
            </div>
            <div className="flex-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
                <div className="flex items-center gap-2 h-7 overflow-hidden mt-0.5">
                    <div className="flex items-center gap-2">
                        {value === 'loading' ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : (
                            <p className="text-xl font-bold">{value}</p>
                        )}
                    </div>
                </div>
                {description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
};

const TopicReviewerAssignmentPage = () => {
    const [topics, setTopics] = useState([]);
    const [lecturers, setLecturers] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dialog states
    const [showAssignDialog, setShowAssignDialog] = useState(false);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [showLecturerTopicsDialog, setShowLecturerTopicsDialog] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [selectedReviewers, setSelectedReviewers] = useState([]);
    const [lecturerDetails, setLecturerDetails] = useState([]);
    const [selectedLecturer, setSelectedLecturer] = useState(null);

    // [MỚI] Alert Dialog state cho Auto Assign
    const [showAutoAssignAlert, setShowAutoAssignAlert] = useState(false);

    useEffect(() => {
        loadPlans();
    }, []);

    useEffect(() => {
        if (selectedPlan) {
            loadData();
        } else {
            setTopics([]);
            setLecturers([]);
        }
    }, [selectedPlan]);

    const loadPlans = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/admin/thesis-plans/list-all');
            const plansData = response.data || [];
            setPlans(plansData);
            if (plansData.length > 0 && !selectedPlan) {
                const activePlan = plansData.find(p => p.TRANGTHAI === 'Đang thực hiện') || plansData[0];
                setSelectedPlan(String(activePlan.ID_KEHOACH));
            }
        } catch (error) {
            console.error('Error loading plans:', error);
            toast.error('Lỗi khi tải danh sách kế hoạch');
        } finally {
            setIsLoading(false);
        }
    };

    const loadData = async () => {
        if (!selectedPlan) return;
        setIsLoading(true);
        try {
            const [topicsRes, lecturersRes] = await Promise.all([
                axios.get(`/department-head/topic-assignments/available-topics-for-reviewers`, {
                    params: { plan_id: selectedPlan }
                }),
                axios.get('/department-head/topic-assignments/lecturers', {
                    params: { plan_id: selectedPlan }
                })
            ]);

            setTopics(topicsRes.data || []);
            setLecturers(lecturersRes.data?.lecturers || []); 
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Lỗi khi tải dữ liệu đề tài và giảng viên');
            setTopics([]);
            setLecturers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssignReviewers = (topic) => {
        setSelectedTopic(topic);
        const currentReviewers = topic.phancong_nguoi_gop_y?.map(pc => pc.ID_GIANGVIEN) || [];
        setSelectedReviewers(currentReviewers);
        setShowAssignDialog(true);
    };

    const handleSubmitAssignment = async () => {
        if (!selectedTopic || selectedReviewers.length === 0) {
            toast.error('Vui lòng chọn ít nhất một người góp ý');
            return;
        }

        setIsSubmitting(true);
        try {
            await axios.post('/department-head/topic-assignments/assign-reviewers', {
                assignments: selectedReviewers.map(reviewerId => ({
                    topic_id: selectedTopic.ID_DETAI,
                    reviewer_id: reviewerId
                })),
                note: 'Phân công thủ công'
            });

            toast.success('Phân công người góp ý thành công');
            setShowAssignDialog(false);
            setSelectedTopic(null);
            setSelectedReviewers([]);
            loadData();
        } catch (error) {
            console.error('Error assigning reviewers:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi phân công người góp ý');
        } finally {
            setIsSubmitting(false);
        }
    };

    // [SỬA ĐỔI] Thay window.confirm bằng việc mở Dialog
    const handleAutoAssignClick = () => {
        if (!selectedPlan) {
            toast.error('Vui lòng chọn kế hoạch');
            return;
        }
        setShowAutoAssignAlert(true);
    };

    const executeAutoAssign = async () => {
        setShowAutoAssignAlert(false); // Đóng dialog trước khi chạy
        setIsSubmitting(true);
        try {
            await axios.post('/department-head/topic-assignments/auto-assign-reviewers', {
                ID_KEHOACH: selectedPlan
            });

            toast.success('Tự động phân công người góp ý thành công');
            loadData();
        } catch (error) {
            console.error('Error auto assigning reviewers:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi tự động phân công');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewDetails = () => {
        if (!selectedPlan) {
            toast.error('Vui lòng chọn kế hoạch');
            return;
        }

        const lecturerMap = new Map();
        lecturers.forEach(lecturer => {
            lecturerMap.set(lecturer.ID_GIANGVIEN, {
                ID_GIANGVIEN: lecturer.ID_GIANGVIEN,
                TEN_GIANGVIEN: lecturer.TEN_GIANGVIEN,
                HOCVI: lecturer.HOCVI,
                topic_count: 0,
                topic_names: []
            });
        });

        topics.forEach(topic => {
            if (topic.phancong_nguoi_gop_y) {
                topic.phancong_nguoi_gop_y.forEach(assignment => {
                    const lecturerId = assignment.ID_GIANGVIEN;
                    if (lecturerMap.has(lecturerId)) {
                        const lecturer = lecturerMap.get(lecturerId);
                        lecturer.topic_count += 1;
                        lecturer.topic_names.push(topic.TEN_DETAI);
                    }
                });
            }
        });

        const details = Array.from(lecturerMap.values()).map(lecturer => ({
            ...lecturer,
            topic_names: lecturer.topic_names.length > 0 ? lecturer.topic_names.join(', ') : 'Chưa có đề tài',
            topics_list: lecturer.topic_names
        }));

        setLecturerDetails(details);
        setShowDetailsDialog(true);
    };

    const handleViewLecturerTopics = (lecturer) => {
        setSelectedLecturer(lecturer);
        setShowLecturerTopicsDialog(true);
    };

    const processedData = useMemo(() => {
        const assignedTopics = topics.filter(topic => topic.reviewer_count > 0).length;
        const unassignedTopics = topics.filter(topic => topic.reviewer_count === 0).length;
        const stats = {
            totalTopics: topics.length,
            assignedTopics: assignedTopics,
            unassignedTopics: unassignedTopics,
        };
        return { stats };
    }, [topics]);

    const renderContent = () => {
        if (isLoading && !isSubmitting) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-blue-500">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p>Đang tải dữ liệu...</p>
                </div>
            );
        }

        if (!selectedPlan) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-card rounded-lg p-6 border-2 border-dashed">
                    <BookOpen className="h-8 w-8 mb-4 text-orange-500" />
                    <p className="text-lg font-semibold">Vui lòng chọn một Kế hoạch Khóa luận</p>
                    {plans.length === 0 && <p className="text-sm mt-2">Hiện tại không có Kế hoạch nào.</p>}
                </div>
            );
        }

        return (
            <motion.div 
                className="space-y-6 pb-20" 
                key={selectedPlan}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
            >
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                        icon={BookOpen}
                        title="Tổng số Đề tài"
                        value={processedData.stats.totalTopics}
                        description="Đề tài cần phân công người góp ý"
                        iconBgClass="bg-blue-100 dark:bg-blue-900/30"
                        iconColorClass="text-blue-600 dark:text-blue-400"
                    />
                    <StatCard
                        icon={UserCheck}
                        title="Đã phân công"
                        value={processedData.stats.assignedTopics}
                        description="Đề tài có người góp ý"
                        iconBgClass="bg-green-100 dark:bg-green-900/30"
                        iconColorClass="text-green-600 dark:text-green-400"
                    />
                    <StatCard
                        icon={AlertTriangle}
                        title="Cần phân công góp ý"
                        value={processedData.stats.unassignedTopics}
                        description="Đề tài chưa có người góp ý"
                        iconBgClass={cn(processedData.stats.unassignedTopics > 0 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-green-100 dark:bg-green-900/30")}
                        iconColorClass={cn(processedData.stats.unassignedTopics > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400")}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Card Tự động phân công */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bot className="w-5 h-5 text-purple-600" />
                                Tự động Phân công
                            </CardTitle>
                            <CardDescription>
                                Hệ thống sẽ tự động phân công ngẫu nhiên người góp ý cho tất cả đề tài chưa có người phụ trách.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                Đảm bảo mỗi đề tài có ít nhất 1 người góp ý, tránh trùng với GVHD.
                            </p>
                            <Button
                                onClick={handleAutoAssignClick}
                                disabled={isSubmitting || processedData.stats.unassignedTopics === 0}
                                variant="default"
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Chạy tự động
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Card Chi tiết phân công */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Eye className="w-5 h-5 text-blue-600" />
                                Chi tiết Phân công
                            </CardTitle>
                            <CardDescription>
                                Xem danh sách giảng viên và số lượng đề tài được giao góp ý.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                Kiểm tra tải công việc của từng giảng viên.
                            </p>
                            <Button
                                onClick={handleViewDetails}
                                disabled={isLoading}
                                variant="outline"
                            >
                                Xem chi tiết
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Danh sách đề tài Table */}
                <Card className="overflow-hidden">
                    <CardHeader className="bg-muted/5 pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-gray-600" />
                            Danh sách Đề tài
                        </CardTitle>
                        <CardDescription>
                            Danh sách các đề tài trong bộ môn cần phân công người góp ý.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {topics.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                Không có đề tài nào cần phân công người góp ý.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/20">
                                        <TableRow>
                                            <TableHead className="w-[35%] pl-6">Tên đề tài</TableHead>
                                            <TableHead>GV Đề xuất</TableHead>
                                            <TableHead>Người góp ý hiện tại</TableHead>
                                            <TableHead className="text-center">SL</TableHead>
                                            <TableHead className="text-center pr-6">Hành động</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topics.map(topic => (
                                            <TableRow key={topic.ID_DETAI} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-semibold max-w-xs truncate pl-6" title={topic.TEN_DETAI}>
                                                    {topic.TEN_DETAI}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {topic.nguoiDexuat?.nguoidung?.HODEM_VA_TEN || 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-sm max-w-xs truncate" title={topic.reviewer_names || 'Chưa phân công'}>
                                                    {topic.reviewer_names ? (
                                                        <div className="flex items-center gap-1">
                                                            <UserCheck className="w-3 h-3 text-green-600" />
                                                            {topic.reviewer_names}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground italic text-xs">Chưa phân công</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={topic.reviewer_count > 0 ? 'default' : 'secondary'}>
                                                        {topic.reviewer_count}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center pr-6">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAssignReviewers(topic)}
                                                        variant="outline"
                                                        className="h-8"
                                                    >
                                                        {topic.reviewer_count > 0 ? (
                                                            <>
                                                                <Edit className="w-3.5 h-3.5 mr-1" /> Chỉnh sửa
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Users className="w-3.5 h-3.5 mr-1" /> Phân công
                                                            </>
                                                        )}
                                                    </Button>
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
        // [FIX SCROLL] Thêm h-full và overflow-y-auto
        <div className="h-full overflow-y-auto p-4 md:p-8 bg-muted/10">
            <div className="max-w-[1600px] mx-auto space-y-6">
                <Card>
                    <CardHeader className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100">
                                <Users className="h-6 w-6 text-blue-600" />
                                Phân công Người Góp ý
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Quản lý và phân công giảng viên góp ý (phản biện sơ bộ) cho các đề tài.
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

                {/* --- DIALOGS --- */}

                {/* Assign Reviewers Dialog */}
                <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Phân công Người Góp ý</DialogTitle>
                            <DialogDescription>
                                Chọn giảng viên để góp ý cho đề tài: <strong>{selectedTopic?.TEN_DETAI}</strong>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md border border-blue-100">
                                <p className="flex items-center gap-2"><AlertTriangle className="w-3 h-3 text-orange-500" /> Không thể chọn người đề xuất ({selectedTopic?.nguoiDexuat?.nguoidung?.HODEM_VA_TEN})</p>
                                <p className="flex items-center gap-2 mt-1"><Checkbox checked disabled className="w-3 h-3" /> Khuyến nghị chọn 1-2 người góp ý</p>
                            </div>

                            <div className="max-h-60 overflow-y-auto border rounded-lg p-2">
                                {lecturers.map(lecturer => {
                                    const isProposer = lecturer.ID_GIANGVIEN === selectedTopic?.ID_NGUOI_DEXUAT;
                                    const isSelected = selectedReviewers.includes(lecturer.ID_GIANGVIEN);

                                    return (
                                        <div key={lecturer.ID_GIANGVIEN} className={cn("flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors", isProposer && "opacity-50 bg-muted/30")}>
                                            <Checkbox
                                                id={`lecturer-${lecturer.ID_GIANGVIEN}`}
                                                checked={isSelected}
                                                disabled={isProposer}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedReviewers(prev => [...prev, lecturer.ID_GIANGVIEN]);
                                                    } else {
                                                        setSelectedReviewers(prev => prev.filter(id => id !== lecturer.ID_GIANGVIEN));
                                                    }
                                                }}
                                            />
                                            <label
                                                htmlFor={`lecturer-${lecturer.ID_GIANGVIEN}`}
                                                className={cn(
                                                    "flex-1 text-sm font-medium leading-none cursor-pointer",
                                                    isProposer && "cursor-not-allowed line-through text-muted-foreground"
                                                )}
                                            >
                                                {lecturer.TEN_GIANGVIEN} <span className="text-muted-foreground text-xs ml-1">({lecturer.HOCVI})</span>
                                                {isProposer && <span className="ml-2 text-xs text-red-500 italic">- Người đề xuất</span>}
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Hủy</Button>
                            <Button onClick={handleSubmitAssignment} disabled={isSubmitting || selectedReviewers.length === 0}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Xác nhận phân công
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* [MỚI] Auto Assign Alert Dialog */}
                <AlertDialog open={showAutoAssignAlert} onOpenChange={setShowAutoAssignAlert}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-purple-600">
                                <Bot className="w-5 h-5" /> Xác nhận Tự động Phân công
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Hệ thống sẽ tự động phân công ngẫu nhiên giảng viên góp ý cho các đề tài <strong>chưa có người phụ trách</strong>.
                                <br/><br/>
                                <span className="block p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs">
                                    Lưu ý: Các phân công thủ công trước đó sẽ không bị ảnh hưởng.
                                </span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
                            <AlertDialogAction onClick={executeAutoAssign} className="bg-purple-600 hover:bg-purple-700">
                                Đồng ý chạy
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Lecturer Details Dialog */}
                <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                    <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Chi tiết Phân công Người Góp ý</DialogTitle>
                            <DialogDescription>
                                Danh sách giảng viên trong bộ môn và số lượng đề tài được giao góp ý.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-1">
                            {lecturerDetails.length === 0 ? (
                                <div className="py-4 text-center text-muted-foreground">
                                    Không có dữ liệu chi tiết.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/20 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="pl-4">Tên giảng viên</TableHead>
                                            <TableHead>Học vị</TableHead>
                                            <TableHead className="text-center">Số đề tài góp ý</TableHead>
                                            <TableHead className="text-center pr-4">Danh sách đề tài</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lecturerDetails.map(lecturer => (
                                            <TableRow key={lecturer.ID_GIANGVIEN} className="hover:bg-muted/50">
                                                <TableCell className="font-semibold pl-4">{lecturer.TEN_GIANGVIEN}</TableCell>
                                                <TableCell className="text-sm">{lecturer.HOCVI}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={lecturer.topic_count > 0 ? 'default' : 'secondary'}>
                                                        {lecturer.topic_count}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center pr-4">
                                                    {lecturer.topic_count > 0 ? (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleViewLecturerTopics(lecturer)}
                                                            className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 mr-1" /> Xem chi tiết
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">Chưa có</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                        <DialogFooter className="border-t pt-4">
                            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>Đóng</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Lecturer Topics Dialog */}
                <Dialog open={showLecturerTopicsDialog} onOpenChange={setShowLecturerTopicsDialog}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Danh sách đề tài góp ý</DialogTitle>
                            <DialogDescription>
                                Các đề tài được giao cho giảng viên <strong>{selectedLecturer?.TEN_GIANGVIEN}</strong> góp ý.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                            {selectedLecturer?.topics_list && selectedLecturer.topics_list.length > 0 ? (
                                selectedLecturer.topics_list.map((topicName, index) => (
                                    <div key={index} className="p-3 bg-muted/30 rounded-lg border flex items-start gap-2">
                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                        <span className="text-sm font-medium leading-tight">{topicName}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="py-4 text-center text-muted-foreground">
                                    Không có đề tài nào được giao.
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowLecturerTopicsDialog(false)}>Đóng</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default TopicReviewerAssignmentPage;