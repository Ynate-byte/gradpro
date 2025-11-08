import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Users, BookOpen, UserCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import axios from '@/api/axiosConfig';
import { cn } from '@/lib/utils';

const StatCard = ({ icon, title, value, description, iconBgClass, iconColorClass }) => {
    return (
        <div className="bg-card text-card-foreground p-4 rounded-lg shadow-sm border flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1">
            <div className={cn("p-3 rounded-lg", iconBgClass)}>
                {icon && React.createElement(icon, { className: cn("h-6 w-6", iconColorClass) })}
            </div>
            <div className="flex-1">
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <div className="flex items-center gap-2 h-8 overflow-hidden">
                    <div className="flex items-center gap-2">
                        {value === 'loading' ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                            <p className="text-2xl font-bold">{value}</p>
                        )}
                    </div>
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
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
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [selectedReviewers, setSelectedReviewers] = useState([]);

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
                setSelectedPlan(String(plansData[0].ID_KEHOACH));
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
                axios.get(`/department-head/topic-assignments/available-topics-for-reviewers?plan_id=${selectedPlan}`),
                axios.get(`/department-head/topic-assignments/lecturers?plan_id=${selectedPlan}`)
            ]);

            console.log('Topics response:', topicsRes.data);
            console.log('Lecturers response:', lecturersRes.data);

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
        // Load current reviewers for this topic
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
                }))
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

    const handleAutoAssign = async () => {
        if (!selectedPlan) {
            toast.error('Vui lòng chọn kế hoạch');
            return;
        }

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

    const getReviewerNames = (topic) => {
        if (!topic.phancong_nguoi_gop_y || topic.phancong_nguoi_gop_y.length === 0) {
            return 'Chưa phân công';
        }
        return topic.phancong_nguoi_gop_y.map(pc => pc.giangvien?.nguoidung?.HODEM_VA_TEN || 'N/A').join(', ');
    };

    const getReviewerCount = (topic) => {
        return topic.phancong_nguoi_gop_y?.length || 0;
    };

    const processedData = useMemo(() => {
        const stats = {
            totalTopics: topics.length,
            assignedTopics: topics.filter(t => getReviewerCount(t) > 0).length,
            unassignedTopics: topics.filter(t => getReviewerCount(t) === 0).length,
        };
        return { stats };
    }, [topics]);

    const renderContent = () => {
        if (isLoading) {
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
            <div className="space-y-6" key={selectedPlan}>
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
                        title="Chưa phân công"
                        value={processedData.stats.unassignedTopics}
                        description="Cần phân công người góp ý"
                        iconBgClass={cn(processedData.stats.unassignedTopics > 0 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-green-100 dark:bg-green-900/30")}
                        iconColorClass={cn(processedData.stats.unassignedTopics > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400")}
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Tự động Phân công Người Góp ý</CardTitle>
                        <CardDescription>
                            Phân công ngẫu nhiên người góp ý cho tất cả đề tài trạng thái Nháp và Chờ duyệt chưa có người góp ý.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                            Sẽ phân công 1-2 người góp ý cho mỗi đề tài, đảm bảo không trùng với người đề xuất đề tài.
                        </p>
                        <Button
                            onClick={handleAutoAssign}
                            disabled={isSubmitting || processedData.stats.unassignedTopics === 0}
                            variant="default"
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Tự động phân công
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Danh sách Đề tài Cần Phân công Người Góp ý</CardTitle>
                        <CardDescription>
                            Phân công thủ công người góp ý cho từng đề tài cụ thể.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {topics.length === 0 ? (
                            <div className="py-4 text-center text-muted-foreground">
                                Không có đề tài nào cần phân công người góp ý.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[30%]">Tên đề tài</TableHead>
                                        <TableHead>GV Đề xuất</TableHead>
                                        <TableHead>Người góp ý hiện tại</TableHead>
                                        <TableHead className="text-center">Số lượng</TableHead>
                                        <TableHead className="text-center">Hành động</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topics.map(topic => (
                                        <TableRow key={topic.ID_DETAI} className="hover:bg-muted/50">
                                            <TableCell className="font-semibold max-w-xs truncate" title={topic.TEN_DETAI}>
                                                {topic.TEN_DETAI}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {topic.nguoiDexuat?.nguoidung?.HODEM_VA_TEN || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-sm max-w-xs truncate" title={getReviewerNames(topic)}>
                                                {getReviewerNames(topic)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={getReviewerCount(topic) > 0 ? "default" : "secondary"}>
                                                    {getReviewerCount(topic)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleAssignReviewers(topic)}
                                                    variant="outline"
                                                >
                                                    Phân công
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8">
            <Card>
                <CardHeader className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100">
                            <Users className="h-5 w-5 text-blue-500" />
                            Phân công Người Góp ý (Trưởng Bộ môn)
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Phân công giảng viên góp ý cho các đề tài trong bộ môn.
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
                        <div className="text-sm text-muted-foreground">
                            <p>• Không thể chọn người đề xuất đề tài ({selectedTopic?.nguoiDexuat?.nguoidung?.HODEM_VA_TEN})</p>
                            <p>• Khuyến nghị chọn 1-2 người góp ý</p>
                        </div>

                        <div className="max-h-60 overflow-y-auto border rounded-lg p-4">
                            {lecturers.map(lecturer => {
                                const isProposer = lecturer.ID_GIANGVIEN === selectedTopic?.ID_NGUOI_DEXUAT;
                                const isSelected = selectedReviewers.includes(lecturer.ID_GIANGVIEN);

                                return (
                                    <div key={lecturer.ID_GIANGVIEN} className="flex items-center space-x-2 py-2">
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
                                                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                                                isProposer && "text-muted-foreground line-through"
                                            )}
                                        >
                                            {lecturer.TEN_GIANGVIEN} ({lecturer.HOCVI})
                                            {isProposer && " - Người đề xuất"}
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleSubmitAssignment}
                            disabled={isSubmitting || selectedReviewers.length === 0}
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Xác nhận phân công
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TopicReviewerAssignmentPage;
