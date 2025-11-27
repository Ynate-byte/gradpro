import React, { useState, useEffect, useMemo } from 'react'; // Thêm useMemo nếu chưa có
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Loader2, UserPlus, Search, BookCopy, Lock, Filter,
    AlertCircle, CheckCircle, BookOpen, Users, Info, FileText, Ban, User, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { thesisTopicService } from '@/api/thesisTopicService';
import { getKhoaBomons } from '@/api/userService';
import { getMyActivePlans } from '@/api/groupService';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { getThesisPlanById } from '@/api/thesisPlanService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useDebounce } from '@/hooks/useDebounce';
import axios from '@/api/axiosConfig';

// --- Helper Functions ---
const getLecturerName = (topic) => {
    if (topic.ten_giang_vien && topic.ten_giang_vien !== 'N/A') return topic.ten_giang_vien;
    return topic.nguoi_dexuat?.nguoidung?.HODEM_VA_TEN || 'Chưa cập nhật';
};

const getStatusBadge = (status) => {
    const statusColors = {
        'Nháp': 'bg-gray-400 text-white',
        'Chờ duyệt': 'bg-yellow-500 text-white',
        'Yêu cầu chỉnh sửa': 'bg-orange-500 text-white',
        'Đã duyệt': 'bg-green-600 text-white',
        'Từ chối': 'bg-red-600 text-white',
        'Đã đầy': 'bg-blue-500 text-white',
        'Đã khóa': 'bg-black text-white',
    };
    return <Badge className={`${statusColors[status] || 'bg-gray-300'} hover:${statusColors[status]}`}>{status}</Badge>;
};

// --- Component: Thẻ Đề tài (List View) ---
const TopicCard = ({ topic, isGroupLeader, hasRegisteredTopic, myRegisteredTopicId, canRegister, onViewDetails, onRegister }) => {
    const currentGroups = topic.SO_NHOM_HIENTAI || 0;
    const maxGroups = topic.SO_NHOM_TOIDA || 1;
    const progress = Math.min((currentGroups / maxGroups) * 100, 100);
    const isFull = currentGroups >= maxGroups;
    const isMyTopic = hasRegisteredTopic && topic.ID_DETAI === myRegisteredTopicId;
    
    const progressColor = isFull ? "bg-red-500" : (progress >= 75 ? "bg-yellow-500" : "bg-blue-500");
    const lecturerName = getLecturerName(topic);

    // [SỬA QUAN TRỌNG] Kiểm tra cả khoa_bomon (snake_case do Laravel trả về mặc định)
    const departmentName = 
        topic.khoa_bomon?.TEN_KHOA_BOMON || // Trường hợp Laravel trả về snake_case
        topic.khoaBomon?.TEN_KHOA_BOMON || // Trường hợp Laravel trả về camelCase (ít gặp hơn ở default serializer)
        topic.ten_bo_mon ||                // Trường hợp API custom trả về
        'Chưa cập nhật bộ môn';

    return (
        <div className={`group flex flex-col md:flex-row items-center justify-between p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200 gap-4 ${isMyTopic ? 'border-l-4 border-l-green-500 bg-green-50/30' : 'border-l-4 border-l-transparent hover:border-l-blue-500'}`}>
              
            {/* 1. CỘT TRÁI: Thông tin */}
            <div className="w-full md:w-[40%] flex flex-col justify-center shrink-0 gap-1.5">
                <div className="flex items-start gap-2">
                    <h3 
                        onClick={() => onViewDetails(topic.ID_DETAI)}
                        className="text-[16px] font-bold text-blue-600 cursor-pointer line-clamp-2 leading-tight underline-offset-2 hover:underline"
                        style={{ textDecorationStyle: 'dashed' }}
                        title={topic.TEN_DETAI}
                    >
                        {topic.TEN_DETAI}
                    </h3>
                    <div 
                        onClick={() => onViewDetails(topic.ID_DETAI)}
                        className="shrink-0 cursor-pointer text-gray-400 hover:text-blue-600 transition-colors mt-0.5"
                        title="Xem chi tiết"
                    >
                        <Info className="w-4 h-4" />
                    </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1 truncate font-medium text-gray-700" title={`GVHD: ${lecturerName}`}>
                        <User className="h-3.5 w-3.5 text-blue-500" /> {lecturerName}
                    </span>
                    <span className="text-gray-300">|</span>
                    
                    {/* Hiển thị tên bộ môn */}
                    <span className="truncate text-gray-500 flex items-center gap-1" title={departmentName}>
                        <Layers className="h-3.5 w-3.5 text-indigo-500" />
                        {departmentName}
                    </span>
                </div>
                
                {isMyTopic && (
                    <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Nhóm bạn đã đăng ký đề tài này
                    </span>
                )}
            </div>

            {/* 2. CỘT GIỮA: Mô tả */}
            <div className="hidden md:flex flex-1 px-6 border-l border-r border-dashed border-gray-200 h-full items-center">
                <p className="text-sm text-gray-600 italic line-clamp-2 w-full">
                    "{topic.MOTA ? topic.MOTA : "Chưa có mô tả chi tiết..."}"
                </p>
            </div>

            {/* 3. CỘT PHẢI: Hành động */}
            <div className="w-full md:w-[180px] flex items-center justify-between md:justify-end gap-4 shrink-0">
                <div className="flex flex-col items-end min-w-[80px]">
                    <span className={`text-xs font-bold mb-1 ${isFull ? 'text-red-600' : 'text-blue-600'}`}>
                        {currentGroups}/{maxGroups} Nhóm
                    </span>
                    <Progress value={progress} className="h-1.5 w-20" indicatorClassName={progressColor} />
                </div>

                <div className="shrink-0">
                    {isMyTopic ? (
                        <Button variant="outline" size="sm" disabled className="bg-green-50 text-green-700 border-green-200 h-9 px-3">
                            <CheckCircle className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button 
                            size="sm"
                            className={`h-9 px-4 font-medium shadow-sm ${!canRegister || isFull ? 'bg-gray-100 text-gray-400 hover:bg-gray-100' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            disabled={hasRegisteredTopic || isFull || !canRegister || !isGroupLeader}
                            onClick={(e) => { e.stopPropagation(); onRegister(topic); }}
                        >
                            {isFull ? 'Đầy' : (!canRegister ? 'Khóa' : <><UserPlus className="w-4 h-4 mr-1.5" /> Đăng ký</>)}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Component: Dialog Chi tiết (Giữ nguyên logic, chỉ cập nhật departmentName) ---
const TopicDetailDialog = ({ open, onOpenChange, topicId, isGroupLeader, onRegisterGroup, hasRegisteredTopic, canRegister }) => {
    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && topicId) {
            setLoading(true);
            thesisTopicService.getTopicById(topicId)
                .then(res => setTopic(res.data))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [open, topicId]);

    if (!open) return null;

    // [SỬA] Lấy tên bộ môn an toàn cho Dialog
    const departmentName = 
        topic?.khoa_bomon?.TEN_KHOA_BOMON || 
        topic?.khoaBomon?.TEN_KHOA_BOMON || 
        topic?.ten_bo_mon || 
        'Chưa cập nhật';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto p-0 gap-0">
                <DialogHeader className="p-6 pb-2 border-b bg-slate-50/50">
                    <DialogTitle className="text-xl text-blue-700 flex items-start gap-2 leading-relaxed">
                        <FileText className="h-5 w-5 mt-1 shrink-0" /> 
                        {loading ? <Skeleton className="h-6 w-64" /> : topic?.TEN_DETAI}
                    </DialogTitle>
                    {!loading && topic && (
                        <DialogDescription className="flex items-center gap-2 mt-1">
                            {getStatusBadge(topic.TRANGTHAI)}
                            <span className="text-xs font-mono text-muted-foreground">#{topic.MA_DETAI}</span>
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {loading ? (
                         <div className="space-y-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : topic ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                    <p className="text-blue-600/80 text-xs uppercase font-bold mb-1">Giảng viên hướng dẫn</p>
                                    <p className="font-medium text-gray-900 flex items-center gap-2">
                                        <Users className="h-4 w-4" /> {getLecturerName(topic)}
                                    </p>
                                </div>
                                <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                                    <p className="text-indigo-600/80 text-xs uppercase font-bold mb-1">Bộ môn</p>
                                    <p className="font-medium text-gray-900 flex items-center gap-2">
                                        <Layers className="h-4 w-4" /> {departmentName}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Section title="Mô tả đề tài" content={topic.MOTA} />
                                <Section title="Yêu cầu kiến thức" content={topic.YEUCAU} />
                                <Section title="Mục tiêu" content={topic.MUCTIEU} />
                                <Section title="Kết quả mong đợi" content={topic.KETQUA_MONGDOI} />
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-muted-foreground">Không có dữ liệu</div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t bg-gray-50/50 sm:justify-between items-center">
                    <div className="text-xs text-muted-foreground hidden sm:block">
                        {topic && `Số nhóm tối đa: ${topic.SO_NHOM_TOIDA}`}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
                        {!loading && topic && isGroupLeader && !hasRegisteredTopic && (
                            <Button 
                                onClick={() => onRegisterGroup(topic)}
                                disabled={!canRegister || topic.SO_NHOM_HIENTAI >= topic.SO_NHOM_TOIDA}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {canRegister ? 'Đăng ký ngay' : 'Chưa mở đăng ký'}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const Section = ({ title, content }) => {
    if (!content) return null;
    return (
        <div>
            <h4 className="font-bold text-gray-900 text-sm mb-1.5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {title}
            </h4>
            <div className="text-sm text-gray-600 bg-gray-50/50 p-3 rounded-md border border-gray-100 whitespace-pre-line leading-relaxed">
                {content}
            </div>
        </div>
    );
};

// ... (RegisterConfirmDialog giữ nguyên)
const RegisterConfirmDialog = ({ open, onOpenChange, topic, onSuccess }) => {
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        setLoading(true);
        try {
            await thesisTopicService.registerGroup(topic.ID_DETAI);
            toast.success('Đăng ký đề tài thành công!');
            onOpenChange(false);
            if (onSuccess) onSuccess(topic);
        } catch (error) {
            console.error('Error registering group:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký đề tài.');
        } finally {
            setLoading(false);
        }
    };

    if (!topic) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-blue-700">Xác nhận đăng ký</DialogTitle>
                    <DialogDescription>
                        Bạn đang đăng ký đề tài: <span className="font-bold text-gray-900 block mt-1 p-2 bg-gray-100 rounded">{topic.TEN_DETAI}</span>
                    </DialogDescription>
                </DialogHeader>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex gap-3 items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                        <p className="font-semibold mb-1">Lưu ý quan trọng:</p>
                        <ul className="list-disc pl-4 space-y-1 text-xs">
                            <li>Tên nhóm sẽ được tự động đổi thành tên đề tài.</li>
                            <li>Sau khi đăng ký, bạn <strong>không thể tự hủy</strong>.</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Hủy</Button>
                    <Button onClick={handleRegister} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} 
                        Xác nhận đăng ký
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- MAIN COMPONENT ---
const StudentThesisTopicsPage = () => {
    // ... (Logic trong Main Component giữ nguyên như file bạn gửi trước đó, chỉ đảm bảo import đúng)
    // Lưu ý: Logic fetch đã được sửa trong câu trả lời trước đó để dùng department_id thay vì major_id
    
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [selectedDepartment, setSelectedDepartment] = useState('all'); 
    const [selectedPlan, setSelectedPlan] = useState('');
    const [selectedLecturer, setSelectedLecturer] = useState('all');
    
    // Data sources
    const [plans, setPlans] = useState([]);
    const [departments, setDepartments] = useState([]); 
    const [lecturers, setLecturers] = useState([]);
    
    // User context
    const [isGroupLeader, setIsGroupLeader] = useState(false);
    const [hasRegisteredTopic, setHasRegisteredTopic] = useState(false);
    const [myRegisteredTopic, setMyRegisteredTopic] = useState(null);

    // UI state
    const [showTopicDetailDialog, setShowTopicDetailDialog] = useState(false);
    const [showRegisterDialog, setShowRegisterDialog] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState(null);

    const [fullPlanData, setFullPlanData] = useState(null);
    const canRegisterFlag = useFeatureFlag(fullPlanData, 'SV_DANGKY_DE');

    // 1. Init Data
    useEffect(() => {
        const initData = async () => {
            try {
                const [plansRes, deptsRes] = await Promise.all([
                    getMyActivePlans(),
                    getKhoaBomons() 
                ]);
                
                const plansData = Array.isArray(plansRes) ? plansRes : (plansRes.data || []);
                setPlans(plansData);
                setDepartments(deptsRes || []); 

                if (plansData.length > 0 && !selectedPlan) {
                    const activePlan = plansData.find(p => p.TRANGTHAI === 'Đang thực hiện') || plansData[0];
                    setSelectedPlan(String(activePlan.ID_KEHOACH));
                } else if (plansData.length === 0) {
                    setLoading(false);
                }

                await checkGroupStatus();
            } catch (error) {
                console.error("Init error:", error);
                toast.error("Lỗi tải dữ liệu ban đầu.");
                setLoading(false);
            }
        };
        initData();
    }, []);

    // 2. Load Plan Details, Lecturers & Topics
    useEffect(() => {
        if (!selectedPlan) {
            setTopics([]);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const planDetails = await getThesisPlanById(selectedPlan);
                setFullPlanData(planDetails);

                const lecturersRes = await thesisTopicService.getSupervisorsByPlan(selectedPlan);
                setLecturers(lecturersRes || []);

                // Load topics
                const params = {
                    plan_id: selectedPlan,
                    search: debouncedSearch,
                    department_id: selectedDepartment !== 'all' ? selectedDepartment : undefined, 
                    lecturer_id: selectedLecturer !== 'all' ? selectedLecturer : undefined,
                };
                const res = await thesisTopicService.getAvailableTopics(params);
                setTopics(Array.isArray(res.data) ? res.data : (res.data.data || []));
                
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedPlan, debouncedSearch, selectedDepartment, selectedLecturer]);

    const checkGroupStatus = async () => {
        try {
            const [leaderRes, statusRes] = await Promise.all([
                thesisTopicService.isGroupLeader(),
                thesisTopicService.getGroupStatus()
            ]);
            setIsGroupLeader(leaderRes.data.isGroupLeader);
            setHasRegisteredTopic(statusRes.data.hasRegisteredTopic);
            if (statusRes.data.hasRegisteredTopic)
                setMyRegisteredTopic(statusRes.data.topic);
        } catch (error) {
            console.error('Error checking status:', error);
        }
    };

    const handleViewTopicDetails = (id) => {
        setSelectedTopicId(id);
        setShowTopicDetailDialog(true);
    };

    const handleRegisterGroup = (topic) => {
        setSelectedTopic(topic);
        setShowRegisterDialog(true);
    };

    const handleRegisterSuccess = (registeredTopic) => {
        setHasRegisteredTopic(true);
        setMyRegisteredTopic(registeredTopic);
        setTopics(prev => prev.map(t => 
            t.ID_DETAI === registeredTopic.ID_DETAI 
            ? { ...t, SO_NHOM_HIENTAI: (t.SO_NHOM_HIENTAI || 0) + 1 } 
            : t
        ));
    };

    return (
        <div className="p-4 md:p-8 space-y-6 container mx-auto max-w-7xl animate-in fade-in duration-500">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        <BookCopy className="h-6 w-6 text-blue-600" /> Đăng ký Đề tài
                    </h1>
                    <p className="text-muted-foreground mt-1">Danh sách đề tài được phê duyệt cho đợt khóa luận.</p>
                </div>
                
                <div className="w-full md:w-auto">
                      <Select value={selectedPlan} onValueChange={setSelectedPlan} disabled={plans.length === 0}>
                        <SelectTrigger className="w-full md:w-[300px] bg-white dark:bg-slate-950 shadow-sm border-blue-200/60">
                            <SelectValue placeholder={plans.length === 0 ? "Bạn chưa tham gia đợt nào" : "Chọn kế hoạch..."} />
                        </SelectTrigger>
                        <SelectContent>
                            {plans.map(plan => (
                                <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                    <span className="font-medium">{plan.TEN_DOT}</span> 
                                    <span className="text-xs text-muted-foreground ml-2">({plan.NAMHOC})</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Alert */}
            {selectedPlan && !canRegisterFlag && fullPlanData && (
                <Alert variant="destructive" className="bg-yellow-50 border-yellow-200 text-yellow-800 shadow-sm">
                    <Lock className="h-4 w-4" />
                    <AlertTitle className="ml-2 font-bold">Chưa đến thời gian đăng ký</AlertTitle>
                    <AlertDescription className="ml-2">
                        Cổng đăng ký đề tài hiện đang đóng. 
                        {fullPlanData.SETTINGS?.SV_DANGKY_DE?.start && 
                         ` Thời gian mở dự kiến: ${format(parseISO(fullPlanData.SETTINGS.SV_DANGKY_DE.start), 'HH:mm dd/MM/yyyy')}`}
                    </AlertDescription>
                </Alert>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-center sticky top-2 z-10">
                {/* Search Box */}
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Tìm theo tên đề tài..." 
                        className="pl-9 h-10 bg-slate-50/50 focus:bg-white transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={!selectedPlan}
                    />
                </div>

                {/* Filter by Department [SỬA] */}
                <div className="md:col-span-1">
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={!selectedPlan}>
                        <SelectTrigger className="h-10 bg-slate-50/50 focus:bg-white transition-colors">
                            <div className="flex items-center gap-2 truncate">
                                <Filter className="h-4 w-4 opacity-50 shrink-0" />
                                <span className="truncate">
                                    {selectedDepartment === 'all' ? 'Tất cả bộ môn' : departments.find(d => d.ID_KHOA_BOMON == selectedDepartment)?.TEN_KHOA_BOMON}
                                </span>
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả bộ môn</SelectItem>
                            {departments.map((d) => (
                                <SelectItem key={d.ID_KHOA_BOMON} value={String(d.ID_KHOA_BOMON)}>
                                    {d.TEN_KHOA_BOMON}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Filter by Lecturer */}
                <div className="md:col-span-1">
                    <Select value={selectedLecturer} onValueChange={setSelectedLecturer} disabled={!selectedPlan || lecturers.length === 0}>
                        <SelectTrigger className="h-10 bg-slate-50/50 focus:bg-white transition-colors">
                            <div className="flex items-center gap-2 truncate">
                                <Users className="h-4 w-4 opacity-50 shrink-0" />
                                <span className="truncate">
                                    {selectedLecturer === 'all' ? 'Tất cả giảng viên' : lecturers.find(l => l.ID_GIANGVIEN == selectedLecturer)?.HODEM_VA_TEN}
                                </span>
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả giảng viên</SelectItem>
                            {lecturers.map((l) => (
                                <SelectItem key={l.ID_GIANGVIEN} value={String(l.ID_GIANGVIEN)}>
                                    {l.HODEM_VA_TEN}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* List of Topics */}
            <div className="space-y-3">
                {loading ? (
                    [...Array(5)].map((_, i) => (
                        <div key={i} className="p-4 border rounded-lg bg-white shadow-sm">
                             <div className="flex gap-4 items-center">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-5 w-[40%]" />
                                    <Skeleton className="h-4 w-[20%]" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : topics.length > 0 ? (
                    <>
                        <div className="flex justify-between items-center px-1">
                             <div className="text-sm text-muted-foreground font-medium">
                                Hiển thị tất cả <span className="text-foreground font-bold">{topics.length}</span> đề tài
                            </div>
                            {myRegisteredTopic && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 py-1">
                                    <CheckCircle className="w-3 h-3 mr-1"/> Nhóm bạn đã có đề tài
                                </Badge>
                            )}
                        </div>
                        
                        <div className="flex flex-col gap-3">
                            {topics.map(topic => (
                                <TopicCard 
                                    key={topic.ID_DETAI} 
                                    topic={topic}
                                    isGroupLeader={isGroupLeader}
                                    hasRegisteredTopic={hasRegisteredTopic}
                                    myRegisteredTopicId={myRegisteredTopic?.ID_DETAI}
                                    canRegister={canRegisterFlag}
                                    onViewDetails={handleViewTopicDetails}
                                    onRegister={handleRegisterGroup}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50/50 rounded-xl border-2 border-dashed">
                        {plans.length === 0 ? (
                            <>
                                <Ban className="h-12 w-12 mx-auto text-red-400 mb-4" />
                                <h3 className="text-lg font-semibold text-slate-700">Bạn chưa tham gia đợt khóa luận nào</h3>
                                <p className="text-muted-foreground max-w-md mt-1">
                                    Vui lòng liên hệ Giáo vụ khoa để được thêm vào danh sách.
                                </p>
                            </>
                        ) : !selectedPlan ? (
                            <>
                                <BookCopy className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                                <h3 className="text-lg font-semibold text-slate-700">Vui lòng chọn kế hoạch</h3>
                            </>
                        ) : (
                            <>
                                <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                                <h3 className="text-lg font-semibold text-slate-700">Không tìm thấy đề tài nào</h3>
                                <p className="text-muted-foreground max-w-md mt-1">
                                    Thử thay đổi bộ lọc hoặc liên hệ giáo vụ.
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>

            <TopicDetailDialog
                open={showTopicDetailDialog}
                onOpenChange={setShowTopicDetailDialog}
                topicId={selectedTopicId}
                isGroupLeader={isGroupLeader}
                onRegisterGroup={handleRegisterGroup}
                hasRegisteredTopic={hasRegisteredTopic}
                myRegisteredTopic={myRegisteredTopic}
                canRegister={canRegisterFlag}
            />

            <RegisterConfirmDialog
                open={showRegisterDialog}
                onOpenChange={setShowRegisterDialog}
                topic={selectedTopic}
                onSuccess={handleRegisterSuccess}
            />
        </div>
    );
};

export default StudentThesisTopicsPage;