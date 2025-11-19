import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
    Loader2, Eye, UserPlus, Search, BookCopy, Lock, Filter, 
    AlertCircle, CheckCircle, BookOpen, Users, Info 
} from 'lucide-react';
import { toast } from 'sonner';
import { thesisTopicService } from '@/api/thesisTopicService';
import { getChuyenNganhs } from '@/api/userService';
import axios from '@/api/axiosConfig';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { getThesisPlanById } from '@/api/thesisPlanService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from "@/components/ui/separator";

// Helper lấy tên giảng viên an toàn
const getLecturerName = (topic) => {
    if (topic.ten_giang_vien && topic.ten_giang_vien !== 'N/A') return topic.ten_giang_vien;
    return topic.nguoi_dexuat?.nguoidung?.HODEM_VA_TEN || 'Chưa cập nhật';
};

// --- Component: Thẻ Đề tài (Topic Card) ---
const TopicCard = ({ topic, isGroupLeader, hasRegisteredTopic, myRegisteredTopicId, canRegister, onViewDetails, onRegister }) => {
    const currentGroups = topic.SO_NHOM_HIENTAI || 0;
    const maxGroups = topic.SO_NHOM_TOIDA || 1;
    const progress = (currentGroups / maxGroups) * 100;
    const isFull = currentGroups >= maxGroups;
    const isMyTopic = hasRegisteredTopic && topic.ID_DETAI === myRegisteredTopicId;
    
    const progressColor = isFull ? "bg-red-500" : (progress >= 75 ? "bg-yellow-500" : "bg-green-500");
    const lecturerName = getLecturerName(topic);

    return (
        <div className={`flex flex-col md:flex-row items-stretch justify-between p-4 border rounded-lg bg-card hover:shadow-md transition-all gap-4 group relative ${isMyTopic ? 'border-l-4 border-l-green-500 bg-green-50/30' : ''}`}>
             
            {/* 1. CỘT TRÁI: THÔNG TIN CƠ BẢN (35%) */}
            <div className="w-full md:w-[35%] flex flex-col justify-center shrink-0">
                <div className="flex items-center gap-2 mb-1">
                    {/* Click vào tên đề tài để mở Dialog */}
                    <h3 
                        onClick={() => onViewDetails(topic.ID_DETAI)}
                        className="text-lg font-bold truncate text-primary cursor-pointer hover:underline underline-offset-4 decoration-dashed max-w-[250px] md:max-w-full"
                    >
                        {topic.TEN_DETAI}
                    </h3>

                    <Badge 
                        variant="outline" 
                        className="text-[10px] font-normal h-5 text-muted-foreground cursor-pointer hover:bg-accent"
                        onClick={() => onViewDetails(topic.ID_DETAI)}
                    >
                        <Info className="w-3 h-3 mr-1" /> Chi tiết
                    </Badge>

                    {isMyTopic && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px] h-5 px-1.5 border-green-200">
                            Đã đăng ký
                        </Badge>
                    )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5 truncate max-w-[200px]" title={`GVHD: ${lecturerName}`}>
                        <Users className="h-3.5 w-3.5" />
                        {lecturerName}
                    </span>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="truncate max-w-[250px]" title={topic.chuyennganh?.TEN_CHUYENNGANH}>
                        {topic.chuyennganh?.TEN_CHUYENNGANH || 'Tất cả chuyên ngành'}
                    </span>
                </div>
            </div>

            {/* 2. CỘT GIỮA: MÔ TẢ (Lấp đầy khoảng trống) */}
            <div className="hidden md:flex flex-1 flex-col justify-center px-6 border-l border-r border-dashed border-gray-200 dark:border-gray-800 min-h-[60px]">
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 italic">
                    "{topic.MOTA || "Không có mô tả..."}"
                </p>
            </div>

            {/* 3. CỘT PHẢI: TIẾN ĐỘ & HÀNH ĐỘNG */}
            <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-4 shrink-0 min-w-[140px]">
                {/* Progress Bar */}
                <div className="flex flex-col items-end min-w-[100px]">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-xs font-bold ${isFull ? 'text-red-600' : 'text-primary'}`}>
                            {currentGroups}/{maxGroups} Nhóm
                        </span>
                    </div>
                    <Progress value={progress} className="h-2.5 w-24" indicatorClassName={progressColor} />
                </div>

                {/* Actions */}
                <div className="w-[120px] flex justify-end">
                    {isMyTopic ? (
                        <Button variant="outline" size="sm" className="w-full h-9 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-default opacity-100">
                            <CheckCircle className="w-4 h-4 mr-2" /> Đã chọn
                        </Button>
                    ) : (
                        <Button 
                            size="sm"
                            className={`w-full h-9 ${
                                !canRegister ? "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-100" : ""
                            }`}
                            disabled={hasRegisteredTopic || isFull || !canRegister || !isGroupLeader}
                            onClick={(e) => { e.stopPropagation(); onRegister(topic); }}
                            variant={isFull ? "secondary" : (!canRegister ? "outline" : "default")}
                        >
                            {isFull ? (
                                <span className="flex items-center text-muted-foreground"><AlertCircle className="w-4 h-4 mr-2" /> Đầy</span>
                            ) : !canRegister ? (
                                <span className="flex items-center"><Lock className="w-3 h-3 mr-2" /> Khóa</span>
                            ) : (
                                <span className="flex items-center"><UserPlus className="w-4 h-4 mr-2" /> Đăng ký</span>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Component: Dialog Chi tiết Đề tài ---
const TopicDetailDialog = ({
    open,
    onOpenChange,
    topicId,
    isGroupLeader,
    onRegisterGroup,
    hasRegisteredTopic,
    myRegisteredTopic,
    canRegister,
}) => {
    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && topicId) loadTopicDetails();
    }, [open, topicId]);

    const loadTopicDetails = async () => {
        try {
            setLoading(true);
            const response = await thesisTopicService.getTopicById(topicId);
            setTopic(response.data);
        } catch (error) {
            console.error('Error loading topic details:', error);
        } finally {
            setLoading(false);
        }
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
        return <Badge className={statusColors[status] || 'bg-gray-300'}>{status}</Badge>;
    };

    if (loading) return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><Loader2 className="h-8 w-8 animate-spin mx-auto" /></DialogContent></Dialog>;
    if (!topic) return null;

    const lecturerName = getLecturerName(topic);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl text-primary flex items-center gap-2">
                        <BookOpen className="h-5 w-5" /> {topic.TEN_DETAI}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                        {getStatusBadge(topic.TRANGTHAI)}
                        <span className="text-xs text-muted-foreground font-mono">Mã: {topic.MA_DETAI}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-muted/30 rounded-lg border">
                            <p className="text-muted-foreground mb-1">Giảng viên hướng dẫn</p>
                            <p className="font-medium">{lecturerName}</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg border">
                            <p className="text-muted-foreground mb-1">Chuyên ngành</p>
                            <p className="font-medium">{topic.chuyennganh?.TEN_CHUYENNGANH || 'Tất cả'}</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg border">
                            <p className="text-muted-foreground mb-1">Số nhóm tối đa</p>
                            <p className="font-medium">{topic.SO_NHOM_TOIDA} nhóm</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg border">
                            <p className="text-muted-foreground mb-1">Đã đăng ký</p>
                            <p className="font-medium">{topic.SO_NHOM_HIENTAI} nhóm</p>
                        </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-sm mb-1">Mô tả</h4>
                            <div className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-md whitespace-pre-line">
                                {topic.MOTA || "Không có mô tả."}
                            </div>
                        </div>
                        {topic.YEUCAU && (
                            <div>
                                <h4 className="font-semibold text-sm mb-1">Yêu cầu</h4>
                                <div className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-md whitespace-pre-line">{topic.YEUCAU}</div>
                            </div>
                        )}
                        {topic.KETQUA_MONGDOI && (
                            <div>
                                <h4 className="font-semibold text-sm mb-1">Kết quả mong đợi</h4>
                                <div className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-md whitespace-pre-line">{topic.KETQUA_MONGDOI}</div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    {isGroupLeader && !hasRegisteredTopic && (
                        <Button 
                            onClick={() => onRegisterGroup(topic)}
                            disabled={!canRegister}
                            className={!canRegister ? "opacity-50 cursor-not-allowed" : ""}
                        >
                            {canRegister ? <> <UserPlus className="w-4 h-4 mr-2" /> Đăng ký đề tài </> : <> <Lock className="w-4 h-4 mr-2" /> Chưa mở đăng ký </>}
                        </Button>
                    )}
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Đóng</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- Component: Dialog Xác nhận Đăng ký ---
const RegisterGroupDialog = ({ open, onOpenChange, topic, onSuccess }) => {
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        setLoading(true);
        try {
            await thesisTopicService.registerGroup(topic.ID_DETAI);
            toast.success('Đăng ký đề tài thành công!');
            onOpenChange(false);
            onSuccess(topic);
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
                    <DialogTitle>Xác nhận đăng ký</DialogTitle>
                    <DialogDescription>
                        Bạn đang đăng ký đề tài: <span className="font-bold text-primary">{topic.TEN_DETAI}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Lưu ý quan trọng</AlertTitle>
                        <AlertDescription>
                            Sau khi đăng ký, tên nhóm của bạn sẽ được đổi thành tên đề tài. Hành động này không thể hoàn tác bởi sinh viên.
                        </AlertDescription>
                    </Alert>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Hủy</Button>
                    <Button onClick={handleRegister} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Đăng ký ngay
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- MAIN COMPONENT ---
const StudentThesisTopicsPage = () => {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMajor, setSelectedMajor] = useState('all');
    const [selectedPlan, setSelectedPlan] = useState('');
    const [plans, setPlans] = useState([]);
    const [majors, setMajors] = useState([]);
    const [isGroupLeader, setIsGroupLeader] = useState(false);
    const [hasRegisteredTopic, setHasRegisteredTopic] = useState(false);
    const [myRegisteredTopic, setMyRegisteredTopic] = useState(null);

    const [showTopicDetailDialog, setShowTopicDetailDialog] = useState(false);
    const [showRegisterDialog, setShowRegisterDialog] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState(null);

    const [fullPlanData, setFullPlanData] = useState(null);
    const canRegisterFlag = useFeatureFlag(fullPlanData, 'SV_DANGKY_DE');

    useEffect(() => {
        loadPlans();
        loadMajors();
        checkGroupStatus();
    }, []);

    useEffect(() => {
        if (plans.length > 0 && !selectedPlan) {
            setSelectedPlan(String(plans[0].ID_KEHOACH));
        }
    }, [plans, selectedPlan]);

    useEffect(() => {
        if (selectedPlan) {
            getThesisPlanById(selectedPlan)
                .then((res) => setFullPlanData(res))
                .catch((err) => console.error("Failed to load plan settings:", err));
            loadTopics();
        } else {
            setFullPlanData(null);
            setTopics([]);
        }
    }, [selectedPlan, searchTerm, selectedMajor]);

    const loadTopics = async () => {
        try {
            setLoading(true);
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (selectedMajor && selectedMajor !== 'all') params.major_id = selectedMajor;
            if (selectedPlan) params.plan_id = selectedPlan;
            const response = await thesisTopicService.getAvailableTopics(params);
            setTopics(response.data.data || []);
        } catch (error) {
            console.error('Error loading topics:', error);
            toast.error("Không thể tải danh sách đề tài.");
        } finally {
            setLoading(false);
        }
    };

    const loadPlans = async () => {
        try {
            const response = await axios.get('/admin/thesis-plans/list-all');
            setPlans(response.data || []);
        } catch (error) {
            console.error('Error loading plans:', error);
        }
    };

    const loadMajors = async () => {
        try {
            const data = await getChuyenNganhs();
            setMajors(data || []);
        } catch (error) {
            console.error('Error loading majors:', error);
        }
    };

    const checkGroupStatus = async () => {
        try {
            const [leaderResponse, statusResponse] = await Promise.all([
                thesisTopicService.isGroupLeader(),
                thesisTopicService.getGroupStatus(),
            ]);
            setIsGroupLeader(leaderResponse.data.isGroupLeader);
            setHasRegisteredTopic(statusResponse.data.hasRegisteredTopic);
            if (statusResponse.data.hasRegisteredTopic)
                setMyRegisteredTopic(statusResponse.data.topic);
        } catch (error) {
            console.error('Error checking group status:', error);
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
        loadTopics();
    };

    return (
        <div className="p-4 md:p-8 space-y-6 container mx-auto max-w-7xl animate-in fade-in duration-500">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <BookCopy className="h-6 w-6 text-primary" /> Đăng ký Đề tài
                    </h1>
                    <p className="text-muted-foreground">Danh sách đề tài được phê duyệt cho đợt khóa luận.</p>
                </div>
                
                <div className="w-full md:w-auto">
                     <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger className="w-full md:w-[280px] bg-background">
                            <SelectValue placeholder="Chọn kế hoạch..." />
                        </SelectTrigger>
                        <SelectContent>
                            {plans.map(plan => (
                                <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                    {plan.TEN_DOT}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {!canRegisterFlag && fullPlanData && (
                <Alert variant="destructive" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                    <Lock className="h-4 w-4" />
                    <AlertTitle className="ml-2 font-semibold">Chưa đến thời gian đăng ký</AlertTitle>
                    <AlertDescription className="ml-2">
                        Cổng đăng ký đề tài hiện đang đóng. 
                        {fullPlanData.SETTINGS?.SV_DANGKY_DE?.start && 
                         ` Thời gian mở dự kiến: ${format(parseISO(fullPlanData.SETTINGS.SV_DANGKY_DE.start), 'dd/MM/yyyy HH:mm')}`}
                    </AlertDescription>
                </Alert>
            )}

            <div className="bg-card p-4 rounded-lg border shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Tìm theo tên đề tài, tên giảng viên..." 
                        className="pl-9 h-11"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="md:col-span-1">
                    <Select value={selectedMajor} onValueChange={setSelectedMajor}>
                        <SelectTrigger className="h-11">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 opacity-50" />
                                <SelectValue placeholder="Lọc theo chuyên ngành" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả chuyên ngành</SelectItem>
                            {majors.map((m) => (
                                <SelectItem key={m.ID_CHUYENNGANH} value={m.ID_CHUYENNGANH}>
                                    {m.TEN_CHUYENNGANH}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card className="border-none shadow-none bg-transparent">
                <CardContent className="p-0 space-y-3">
                    {loading ? (
                        [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
                    ) : topics.length > 0 ? (
                        <>
                            <div className="text-sm text-muted-foreground mb-2 px-1">
                                Tìm thấy {topics.length} đề tài
                            </div>
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
                        </>
                    ) : (
                        <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
                            <BookCopy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-medium">Không tìm thấy đề tài nào</h3>
                            <p className="text-muted-foreground">Thử thay đổi bộ lọc hoặc chọn kế hoạch khác.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

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

            <RegisterGroupDialog
                open={showRegisterDialog}
                onOpenChange={setShowRegisterDialog}
                topic={selectedTopic}
                onSuccess={handleRegisterSuccess}
            />
        </div>
    );
};

export default StudentThesisTopicsPage;