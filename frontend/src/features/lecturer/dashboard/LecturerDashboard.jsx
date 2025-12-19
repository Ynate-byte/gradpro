import React, { useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Import APIs
import { getLecturerDashboardStats } from '@/api/lecturerService';
import { thesisTopicService } from '@/api/thesisTopicService';
import { getLecturerSchedule } from '@/api/lecturerCalendarService';
import lecturerQuotaService from '@/api/lecturerQuotaService';
import { getAllPlans } from '@/api/thesisPlanService';
import { getHoiDongByGiangVien } from '@/api/adminHoiDongService';
import { nudgeLecturerReminder } from '@/api/adminService';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import { 
    Users, BookOpen, ChevronRight, FileStack, MessageSquarePlus, 
    Target, CheckCircle, GraduationCap, Clock, ArrowRight, 
    Hourglass, CalendarDays, MousePointerClick, BellRing,
    FileCheck, User, Bell, AlertOctagon, Loader2, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';

// --- HELPER: Tính grid cột động ---
const getPlanGridClass = (count) => {
    switch (count) {
        case 1: return "grid-cols-1";
        case 2: return "grid-cols-1 md:grid-cols-2";
        case 3: return "grid-cols-1 md:grid-cols-3";
        case 4: return "grid-cols-1 md:grid-cols-2 xl:grid-cols-4";
        default: return "grid-cols-1 md:grid-cols-3 xl:grid-cols-4";
    }
};

// --- COMPONENT: DANH SÁCH GIẢNG VIÊN (Trong Popover) ---
const LecturerListPopoverContent = ({ lecturers, nudgeAllMutation }) => {
    const nudgeLecturer = useMutation({
        mutationFn: ({ id_user, missing }) => nudgeLecturerReminder(id_user, missing),
        onSuccess: () => toast.success("Đã gửi nhắc nhở."),
        onError: () => toast.error("Lỗi gửi nhắc nhở.")
    });

    // Lọc GV chưa hoàn thành
    const incompleteLecturers = lecturers.filter(l => (l.topics_created || 0) < (l.quota_assigned || 0));

    return (
        <div className="w-[340px] flex flex-col">
            <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-orange-600" />
                    Chưa hoàn thành ({incompleteLecturers.length})
                </h4>
                
                {/* Nút Nhắc tất cả */}
                {incompleteLecturers.length > 0 && (
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                        onClick={() => nudgeAllMutation.mutate()}
                        disabled={nudgeAllMutation.isPending}
                    >
                        {nudgeAllMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <BellRing className="w-3 h-3 mr-1" />}
                        Nhắc tất cả
                    </Button>
                )}
            </div>

            <ScrollArea className="h-[250px] p-0">
                <div className="p-2 space-y-1">
                    {incompleteLecturers.length > 0 ? (
                        incompleteLecturers.map((lecturer) => {
                            const missing = (lecturer.quota_assigned || 0) - (lecturer.topics_created || 0);
                            return (
                                <div key={lecturer.ID_GIANGVIEN} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border text-xs group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-1.5 bg-background rounded-full shrink-0 border shadow-sm">
                                            <User className="w-3 h-3 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium truncate max-w-[150px] text-foreground" title={lecturer.TEN_GIANGVIEN}>
                                                {lecturer.TEN_GIANGVIEN}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                Đã tạo: <span className="font-mono font-bold text-foreground">{lecturer.topics_created}</span> / {lecturer.quota_assigned}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="h-7 w-7 text-muted-foreground hover:text-orange-600 hover:bg-orange-50"
                                                    disabled={nudgeLecturer.isPending}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if(lecturer.id_user) {
                                                                nudgeLecturer.mutate({ id_user: lecturer.id_user, missing: missing });
                                                        } else {
                                                            toast.error("Không tìm thấy thông tin người dùng.");
                                                        }
                                                    }}
                                                >
                                                    {nudgeLecturer.isPending ? <Loader2 className="w-3 h-3 animate-spin"/> : <Bell className="w-3.5 h-3.5" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="left"><p>Gửi thông báo nhắc nhở</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground">
                            <CheckCircle className="w-8 h-8 text-green-500 mb-2 opacity-50" />
                            <p className="text-xs">Tất cả giảng viên đã đủ chỉ tiêu.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

// --- COMPONENT: THẺ TIẾN ĐỘ GỘP (CÁ NHÂN + BỘ MÔN) ---
const CombinedProgressCard = ({ myQuotaData, deptLecturers, isTruongBoMon, navigate }) => {
    // 1. Dữ liệu Cá nhân
    const myAssigned = myQuotaData?.quota_assigned || 0;
    const myCreated = myQuotaData?.topics_created || 0;
    const myPercent = myAssigned > 0 ? Math.min(100, Math.round((myCreated / myAssigned) * 100)) : 0;
    const myMissing = Math.max(0, myAssigned - myCreated);
    const isMyComplete = myAssigned > 0 && myMissing === 0;

    // 2. Dữ liệu Bộ môn (Chỉ tính nếu là Trưởng BM)
    const incompleteLecturers = deptLecturers ? deptLecturers.filter(l => (l.topics_created || 0) < (l.quota_assigned || 0)) : [];
    const incompleteCount = incompleteLecturers.length;
    const isDeptComplete = deptLecturers && deptLecturers.length > 0 && incompleteCount === 0;

    // Mutation nhắc nhở hàng loạt
    const nudgeAllMutation = useMutation({
        mutationFn: async () => {
            const promises = incompleteLecturers.map(lecturer => {
                const userId = lecturer.id_user;
                const missing = (lecturer.quota_assigned || 0) - (lecturer.topics_created || 0);
                if (userId && missing > 0) {
                    return nudgeLecturerReminder(userId, missing);
                }
                return Promise.resolve();
            });
            await Promise.all(promises);
        },
        onSuccess: () => toast.success(`Đã gửi nhắc nhở đến ${incompleteCount} giảng viên.`),
        onError: () => toast.error("Có lỗi khi gửi nhắc nhở hàng loạt.")
    });

    return (
        <Card className="border shadow-sm overflow-hidden bg-card">
            <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                <CardTitle className="text-sm font-bold uppercase text-foreground flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Tiến độ Ra đề tài
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
                
                {/* 1. Phần Cá nhân */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-muted-foreground uppercase tracking-wide">Cá nhân</span>
                        <span className={cn("font-mono font-bold", isMyComplete ? "text-green-600" : "text-blue-600")}>
                            {myCreated} / {myAssigned}
                        </span>
                    </div>
                    <Progress value={myPercent} className="h-2.5" indicatorClassName={isMyComplete ? "bg-green-500" : "bg-blue-600"} />
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">
                            {isMyComplete ? "Đã hoàn thành" : <span className="text-red-500 font-medium">Thiếu {myMissing} đề tài</span>}
                        </span>
                        <Button variant="link" className="h-auto p-0 text-xs text-blue-500" onClick={() => navigate('/lecturer/quota-management')}>
                            Chi tiết
                        </Button>
                    </div>
                </div>

                {/* 2. Phần Bộ môn (Chỉ hiện nếu là Trưởng BM) */}
                {isTruongBoMon && (
                    <>
                        <Separator />
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5" /> Bộ môn
                                </span>
                                
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className={cn(
                                            "h-7 text-xs px-2.5 border transition-colors flex items-center gap-1",
                                            isDeptComplete 
                                                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                                                : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                                        )}>
                                            {isDeptComplete ? (
                                                <>Hoàn tất <CheckCircle className="w-3 h-3 ml-1" /></>
                                            ) : (
                                                <>{incompleteCount} GV chưa xong <ChevronDown className="w-3 h-3 ml-1 opacity-50" /></>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end" side="right" sideOffset={10}>
                                        <LecturerListPopoverContent lecturers={deptLecturers || []} nudgeAllMutation={nudgeAllMutation} />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

// --- COMPONENT: REMINDER ITEM ---
const ReminderItem = ({ icon: Icon, title, description, actionText, onAction, variant = "default" }) => {
    const variants = {
        urgent: "bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-900 dark:text-red-200",
        warning: "bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-900/20 dark:border-orange-900 dark:text-orange-200",
        info: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-900 dark:text-blue-200",
    };

    const iconColors = {
        urgent: "text-red-600 dark:text-red-400",
        warning: "text-orange-600 dark:text-orange-400",
        info: "text-blue-600 dark:text-blue-400",
    };

    return (
        <div className={cn("flex items-start gap-3 p-3 rounded-lg border mb-3 last:mb-0 shadow-sm transition-all hover:shadow-md", variants[variant])}>
            <div className="mt-0.5 shrink-0">
                <div className={cn("p-1.5 bg-white/60 dark:bg-black/20 rounded-full", iconColors[variant])}>
                     <Icon className="w-4 h-4" />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold truncate">{title}</h4>
                </div>
                <p className="text-xs opacity-90 line-clamp-2 mt-0.5">{description}</p>
                {onAction && (
                    <div className="mt-2 flex justify-end">
                         <Button 
                            size="sm" 
                            variant="ghost" 
                            className={cn("text-[10px] font-semibold hover:bg-white/50 dark:hover:bg-black/20 h-6 px-2", iconColors[variant])}
                            onClick={onAction}
                        >
                            {actionText} <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- COMPONENT: PLAN TIMELINE ---
const PlanTimelineItem = ({ plan }) => {
    const currentPhase = plan.current_phase;
    const nextPhase = plan.next_phase;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="cursor-pointer group border rounded-xl p-4 bg-card shadow-sm hover:shadow-md hover:border-primary/50 transition-all relative overflow-hidden h-full flex flex-col justify-between">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary group-hover:w-1.5 transition-all"></div>
                    
                    <div className="mb-3 pl-2">
                        <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-base text-primary flex items-center gap-2 line-clamp-1">
                                <BookOpen className="w-4 h-4 shrink-0" />
                                {plan.name}
                            </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 pl-6">{plan.term}</p>
                    </div>

                    <div className="pl-2 mt-auto flex items-center text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        <MousePointerClick className="w-3 h-3 mr-1.5" />
                        Nhấn để xem chi tiết
                    </div>
                </div>
            </PopoverTrigger>

            <PopoverContent className="w-80 md:w-96 p-0 overflow-hidden shadow-xl z-50" align="start">
                <div className="bg-muted/50 p-3 border-b flex items-center justify-between">
                    <h4 className="font-bold text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        Tiến độ kế hoạch
                    </h4>
                    <Badge variant="secondary" className="text-[10px]">{plan.term}</Badge>
                </div>
                
                <div className="p-4 space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 relative overflow-hidden">
                         <div className="absolute right-0 top-0 p-1.5">
                             <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                             </span>
                          </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Đang diễn ra</span>
                        </div>

                        {currentPhase ? (
                            <>
                                <p className="font-semibold text-sm text-foreground">{currentPhase.name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5">
                                    <Hourglass className="w-3 h-3" />
                                    Kết thúc: <span className="font-medium text-foreground">{format(parseISO(currentPhase.end_date), 'dd/MM/yyyy')}</span>
                                </p>
                                <div className="mt-2 text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-300 px-2 py-1 rounded w-fit">
                                    Còn {Math.max(0, differenceInDays(parseISO(currentPhase.end_date), new Date()))} ngày
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">Không có hoạt động cụ thể lúc này.</p>
                        )}
                    </div>

                    {nextPhase && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                                <CalendarDays className="w-3 h-3 text-gray-500" />
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Sắp tới</span>
                            </div>
                            <p className="font-medium text-sm text-foreground opacity-90">{nextPhase.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Bắt đầu: {format(parseISO(nextPhase.start_date), 'dd/MM/yyyy')}
                            </p>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

// --- COMPONENT: COUNCIL CARD ---
const CouncilCard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const { data: councils, isLoading } = useQuery({
        queryKey: ['lecturerCouncils'],
        queryFn: getHoiDongByGiangVien,
    });

    if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;

    const totalCount = councils?.length || 0;
    
    const upcomingCouncil = councils
        ?.filter(c => c.NGAY_BAOCAO && new Date(c.NGAY_BAOCAO) >= new Date().setHours(0,0,0,0))
        ?.sort((a, b) => new Date(a.NGAY_BAOCAO) - new Date(b.NGAY_BAOCAO))[0];

    const getRoleName = (role) => {
        switch(role) {
            case 'chutich': return 'Chủ tịch';
            case 'thuky': return 'Thư ký';
            case 'phanbien': return 'Phản biện';
            default: return 'Thành viên';
        }
    };

    const getMyRole = (council) => {
        if (!council.giangviens || !user?.giangvien?.ID_GIANGVIEN) return 'Thành viên';
        const me = council.giangviens.find(gv => gv.ID_GIANGVIEN === user.giangvien.ID_GIANGVIEN);
        return getRoleName(me?.VAITRO);
    };

    return (
        <div 
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 text-white shadow-lg transition-all hover:scale-[1.01] cursor-pointer"
            onClick={() => navigate('/lecturer/council')}
        >
            <GraduationCap className="absolute -bottom-6 -right-6 h-32 w-32 text-white/10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
            
            <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">Hội đồng tham gia</p>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-4xl font-extrabold tracking-tight">{totalCount}</span>
                            <span className="text-sm font-medium text-indigo-100 opacity-80">buổi bảo vệ</span>
                        </div>
                    </div>
                    <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                        <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                </div>

                <div className="mt-6 space-y-3">
                    {upcomingCouncil ? (
                        <div className="rounded-lg bg-white/10 p-3 backdrop-blur-md border border-white/10">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="bg-yellow-400/90 text-yellow-900 hover:bg-yellow-400 text-[10px] px-1.5 h-5 font-bold border-0">
                                    Sắp tới
                                </Badge>
                                <span className="text-xs font-medium text-indigo-100">
                                    {format(parseISO(upcomingCouncil.NGAY_BAOCAO), 'dd/MM/yyyy')}
                                    {upcomingCouncil.GIO_BAOCAO ? ` • ${format(parseISO(`2000-01-01T${upcomingCouncil.GIO_BAOCAO}`), 'HH:mm')}` : ''}
                                </span>
                            </div>
                            <p className="text-sm font-bold line-clamp-1" title={upcomingCouncil.TEN_HOIDONG}>
                                {upcomingCouncil.TEN_HOIDONG}
                            </p>
                            <div className="mt-1 flex items-center justify-between text-xs text-indigo-100">
                                <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    Vai trò: <span className="font-semibold text-white">{getMyRole(upcomingCouncil)}</span>
                                </span>
                                {upcomingCouncil.PHONG && (
                                    <span className="opacity-90">Phòng: {upcomingCouncil.PHONG}</span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg bg-white/5 p-3 text-center">
                            <p className="text-xs text-indigo-200">Chưa có lịch bảo vệ sắp tới.</p>
                        </div>
                    )}
                </div>

                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-indigo-200 transition-colors group-hover:text-white">
                    Xem danh sách đầy đủ <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </div>
            </div>
        </div>
    );
};

// --- PAGE MAIN: LECTURER DASHBOARD ---
export default function LecturerDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Xác định quyền Trưởng bộ môn
    const positionCodes = user?.giangvien?.chucvus?.map(cv => cv.MA_CHUCVU) || [];
    const isTruongBoMon = positionCodes.includes('TRUONG_BOMON');

    // 1. Lấy thống kê tổng quan & Kế hoạch active
    const { data: stats, isLoading: loadStats } = useQuery({
        queryKey: ['lecturerDashboardStats'],
        queryFn: getLecturerDashboardStats,
        refetchInterval: 60000,
    });

    // 2. Lấy danh sách nhóm đang hướng dẫn
    const { data: myGroups, isLoading: loadGroups } = useQuery({
        queryKey: ['lecturerGroups'],
        queryFn: thesisTopicService.getGroupsForLecturer,
    });

    // 3. Lấy lịch họp hôm nay
    const { data: todaySchedule, isLoading: loadSchedule } = useQuery({
        queryKey: ['lecturerTodaySchedule'],
        queryFn: () => getLecturerSchedule({ 
            start_date: format(new Date(), 'yyyy-MM-dd'),
            end_date: format(new Date(), 'yyyy-MM-dd')
        }),
    });

    // 4. Lấy Kế hoạch Active để dùng cho các query tiếp theo
    const { data: activePlans } = useQuery({
        queryKey: ['allPlansForDashboard'],
        queryFn: getAllPlans,
    });
    
    const activePlan = useMemo(() => {
        if (!activePlans) return null;
        return activePlans.find(p => p.TRANGTHAI === 'Đang thực hiện' || p.TRANGTHAI === 'Chờ duyệt chỉnh sửa') || activePlans[0];
    }, [activePlans]);

    const activePlanId = activePlan?.ID_KEHOACH;

    // 5. Lấy Quota (chỉ tiêu) CÁ NHÂN
    const { data: myQuotaData } = useQuery({
        queryKey: ['lecturerMyQuotaDetail', activePlanId],
        queryFn: async () => {
             const res = await lecturerQuotaService.getMyQuota({ plan_id: activePlanId });
             // [FIX] Truy cập đúng vào data bên trong response
             return res.data; 
        },
        enabled: !!activePlanId
    });

    // 6. [MỚI] TRƯỞNG BỘ MÔN: Lấy danh sách GV & Quota của họ
    const { data: deptLecturers } = useQuery({
        queryKey: ['deptLecturersQuota', activePlanId],
        queryFn: async () => {
            const res = await lecturerQuotaService.getLecturers({ plan_id: activePlanId });
            // API getLecturers trả về { department_id, lecturers: [...] }
            return res.data?.lecturers || [];
        },
        enabled: !!isTruongBoMon && !!activePlanId
    });

    // 7. [MỚI] TRƯỞNG BỘ MÔN: Lấy danh sách đề tài đang chờ duyệt
    const { data: pendingTopics } = useQuery({
        queryKey: ['pendingTopicsDepartment', activePlanId],
        queryFn: async () => {
             const res = await thesisTopicService.getAdminTopics({ 
                 plan_id: activePlanId, 
                 status: 'Chờ duyệt',
                 department_id: user.giangvien.ID_KHOA_BOMON 
             });
             // Xử lý dữ liệu trả về từ API
             return Array.isArray(res.data) ? res.data : (res.data?.data || []);
        },
        enabled: !!isTruongBoMon && !!activePlanId
    });

    const isLoading = loadStats || loadGroups || loadSchedule;

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between"><Skeleton className="h-10 w-64"/><Skeleton className="h-10 w-32"/></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-32 w-full rounded-xl md:col-span-2" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        );
    }

    const { 
        pendingSubmissionsCount = 0, 
        missingQuotaCount = 0, 
        pendingReviewsCount = 0, 
        activePlansStatus = []
    } = stats || {};
    
    // Tính toán số lượng đề tài chờ duyệt (cho Trưởng BM)
    const pendingTopicsCount = pendingTopics ? pendingTopics.length : 0;

    const hasReminders = pendingSubmissionsCount > 0 || missingQuotaCount > 0 || pendingReviewsCount > 0 || pendingTopicsCount > 0;

    return (
        <div className="h-full overflow-y-auto bg-gray-50/50 dark:bg-background p-4 md:p-8">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10">
                <div className="xl:col-span-2 space-y-8">                    
                    <section>
                        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-600" />
                            Tiến độ Kế hoạch
                        </h2>
                        {activePlansStatus.length > 0 ? (
                            <div className={cn("grid gap-4", getPlanGridClass(activePlansStatus.length))}>
                                {activePlansStatus.map(plan => (
                                    <PlanTimelineItem key={plan.id} plan={plan} />
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 border border-dashed rounded-xl text-center text-muted-foreground bg-muted/30">
                                Không có kế hoạch nào đang diễn ra.
                            </div>
                        )}
                    </section>

                    {/* 2. Danh sách Nhắc nhở (Urgent Tasks) */}
                    <section>
                        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                            <BellRing className="w-5 h-5 text-orange-500" />
                            Nhiệm vụ cần xử lý
                        </h2>
                        <Card className="border-none shadow-sm bg-transparent">
                            <CardContent className="p-0">
                                {hasReminders ? (
                                    <div className="flex flex-col">
                                        {/* [MỚI] Nhắc nhở duyệt đề tài (Cho Trưởng BM) */}
                                        {isTruongBoMon && pendingTopicsCount > 0 && (
                                            <ReminderItem 
                                                variant="urgent"
                                                icon={FileCheck}
                                                title="Duyệt đề tài Bộ môn"
                                                description={`Có ${pendingTopicsCount} đề tài mới đang chờ bạn phê duyệt.`}
                                                actionText="Duyệt ngay"
                                                onAction={() => navigate('/admin/thesis-topics?status=Chờ duyệt')}
                                            />
                                        )}

                                        {pendingSubmissionsCount > 0 && (
                                            <ReminderItem 
                                                variant="urgent"
                                                icon={FileStack}
                                                title="Duyệt bài nộp nhóm sinh viên"
                                                description={`Có ${pendingSubmissionsCount} nhóm đã nộp sản phẩm và đang chờ xác nhận.`}
                                                actionText="Kiểm tra ngay"
                                                onAction={() => navigate('/lecturer/submissions')}
                                            />
                                        )}
                                        
                                        {pendingReviewsCount > 0 && (
                                            <ReminderItem 
                                                variant="warning"
                                                icon={MessageSquarePlus}
                                                title="Góp ý đề tài phân công"
                                                description={`Bạn còn ${pendingReviewsCount} đề tài cần đọc và gửi góp ý phản biện.`}
                                                actionText="Góp ý ngay"
                                                onAction={() => navigate('/department-head/topic-reviewer-assignment')}
                                            />
                                        )}

                                        {missingQuotaCount > 0 && (
                                            <ReminderItem 
                                                variant="info"
                                                icon={BookOpen}
                                                title="Bổ sung chỉ tiêu đề tài"
                                                description={`Bạn cần tạo thêm ${missingQuotaCount} đề tài nữa để đạt chỉ tiêu bộ môn giao.`}
                                                actionText="Quản lý Quota"
                                                onAction={() => navigate('/lecturer/quota-management')}
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-800">
                                        <div className="p-2 bg-green-100 rounded-full">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm">Tất cả đã hoàn tất!</h4>
                                            <p className="text-xs">Hiện tại không có nhiệm vụ nào cần xử lý gấp.</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>

                    {/* 3. Danh sách nhóm đang hướng dẫn */}
                    <section>
                         <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-600" />
                                Nhóm hướng dẫn ({myGroups?.length || 0})
                            </h2>
                            <Button variant="link" size="sm" className="text-indigo-600 p-0 h-auto" onClick={() => navigate('/lecturer/groups-management')}>
                                Quản lý chi tiết <ArrowRight className="w-4 h-4 ml-1"/>
                            </Button>
                        </div>
                        
                        <ScrollArea className="h-[350px] border rounded-xl bg-card p-4 shadow-sm">
                             {myGroups && myGroups.length > 0 ? (
                                <div className="flex flex-col gap-3 pr-3">
                                    {myGroups.map((assignment) => {
                                        const topicName = assignment.detai?.TEN_DETAI || 'Chưa đăng ký đề tài';
                                        const planName = assignment.nhom?.kehoach?.TEN_DOT || 'Kế hoạch chung';
                                        const groupName = assignment.nhom?.TEN_NHOM || 'Nhóm ?';
                                        const groupCode = assignment.nhom?.ID_NHOM || 'N/A';
                                        const status = assignment.TRANGTHAI || 'Đang thực hiện';

                                        let statusBadgeClass = "bg-gray-100 text-gray-700 border-gray-200";
                                        if (status === 'Đang thực hiện') statusBadgeClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
                                        if (status === 'Đã hoàn thành') statusBadgeClass = "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300";
                                        if (status === 'Không đạt') statusBadgeClass = "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300";

                                        return (
                                            <div 
                                                key={assignment.ID_PHANCONG} 
                                                className="group relative p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
                                                onClick={() => navigate(`/lecturer/groups-management/${assignment.nhom.ID_NHOM}/details`)}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <Badge variant="secondary" className="text-[10px] px-2 h-5 font-normal text-muted-foreground bg-muted hover:bg-muted truncate max-w-[150px]">
                                                        {planName}
                                                    </Badge>

                                                    <Badge variant="outline" className={cn("text-[10px] px-2 h-5 border", statusBadgeClass)}>
                                                        {status}
                                                    </Badge>
                                                </div>

                                                <div className="mb-2">
                                                    <h4 className="text-sm md:text-base font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors" title={topicName}>
                                                        {topicName}
                                                    </h4>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-2 mt-2 border-dashed">
                                                    <span className="font-medium text-foreground/80">{groupName}</span>
                                                    <span className="text-muted-foreground/40">•</span>
                                                    <span className="font-mono bg-muted/50 px-1 rounded">ID: {groupCode}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground min-h-[200px]">
                                    <Users className="w-10 h-10 opacity-20 mb-3" />
                                    <p className="text-sm">Bạn chưa hướng dẫn nhóm nào.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </section>
                </div>

                {/* --- CỘT PHẢI (1/3): LỊCH & TIỆN ÍCH --- */}
                <div className="space-y-6">
                      {/* Lịch họp hôm nay */}
                      <Card className="shadow-sm border-t-4 border-t-blue-500 overflow-hidden">
                        <CardHeader className="pb-2 px-5 pt-5">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {format(new Date(), "EEEE, 'ngày' dd 'tháng' MM", { locale: vi })}
                                    </p>
                                </CardTitle>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate('/lecturer/calendar')} title="Xem lịch đầy đủ">
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="space-y-2">
                                {todaySchedule && todaySchedule.length > 0 ? (
                                    todaySchedule.map((event, idx) => (
                                        <div 
                                            key={event.ID_LICHHOP || idx} 
                                            className="flex gap-3 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer" 
                                            onClick={() => navigate(`/lecturer/groups-management/${event.ID_NHOM}/schedule`)}
                                        >
                                            <div className="flex flex-col items-center justify-center w-12 bg-blue-50 rounded text-blue-700 shrink-0 h-12 border border-blue-100">
                                                <span className="text-xs font-bold">{format(parseISO(event.THOIGIAN_BATDAU), 'HH:mm')}</span>
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <p className="text-sm font-medium truncate" title={event.TIEUDE_LICHHOP}>{event.TIEUDE_LICHHOP}</p>
                                                <p className="text-xs text-muted-foreground truncate" title={event.nhom?.TEN_NHOM}>{event.nhom?.TEN_NHOM}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed flex flex-col items-center">
                                            <CalendarDays className="w-6 h-6 mb-2 opacity-20" />
                                            Hôm nay bạn rảnh.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Thẻ Hội đồng */}
                    <CouncilCard />

                    <CombinedProgressCard 
                        myQuotaData={myQuotaData} 
                        deptLecturers={deptLecturers}
                        isTruongBoMon={isTruongBoMon}
                        navigate={navigate}
                    />
                </div>
            </div>
        </div>
    );
}