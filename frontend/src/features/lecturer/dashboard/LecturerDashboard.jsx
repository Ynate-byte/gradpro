import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Import APIs
import { getLecturerDashboardStats } from '@/api/lecturerService';
import { thesisTopicService } from '@/api/thesisTopicService';
import { getLecturerSchedule } from '@/api/lecturerCalendarService';
import lecturerQuotaService from '@/api/lecturerQuotaService';
import { getAllPlans } from '@/api/thesisPlanService';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Icons
import { 
    LayoutDashboard, Calendar, Users, BookOpen, 
    ChevronRight, FileStack, MessageSquarePlus, 
    Target, CheckCircle, GraduationCap, Clock, ArrowRight, 
    Hourglass, CalendarDays, MousePointerClick, BellRing 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';

// --- HÀM HELPER TÍNH GRID CỘT ĐỘNG ---
const getPlanGridClass = (count) => {
    switch (count) {
        case 1:
            return "grid-cols-1"; // 1 cột full
        case 2:
            return "grid-cols-1 md:grid-cols-2"; // Chia 2
        case 3:
            return "grid-cols-1 md:grid-cols-3"; // Chia 3
        case 4:
            return "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"; // Chia 4
        default:
            return "grid-cols-1 md:grid-cols-3 xl:grid-cols-4"; // Mặc định chia 4 nếu > 4
    }
};

// --- COMPONENT: ACTION CARD ---
const ActionCard = ({ title, count, icon: Icon, type, onClick, description }) => {
    const styles = {
        urgent: "bg-red-50 border-red-200 text-red-900 hover:border-red-400 dark:bg-red-900/20 dark:text-red-100 dark:border-red-900",
        warning: "bg-orange-50 border-orange-200 text-orange-900 hover:border-orange-400 dark:bg-orange-900/20 dark:text-orange-100 dark:border-orange-900",
        info: "bg-blue-50 border-blue-200 text-blue-900 hover:border-blue-400 dark:bg-blue-900/20 dark:text-blue-100 dark:border-blue-900",
    };

    const btnStyles = {
        urgent: "bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-600",
        warning: "bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-500",
        info: "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500",
    };

    const currentStyle = styles[type] || styles.info;
    const btnStyle = btnStyles[type] || btnStyles.info;

    return (
        <div className={cn("flex flex-col justify-between p-5 rounded-xl border transition-all shadow-sm hover:shadow-md", currentStyle)}>
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 bg-white/60 dark:bg-black/20 rounded-lg w-fit backdrop-blur-sm">
                        <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-4xl font-bold tracking-tighter">{count}</span>
                </div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-sm opacity-90 mt-1 leading-snug">{description}</p>
            </div>
            <Button 
                className={cn("mt-5 w-full justify-between group shadow-none border-0", btnStyle)} 
                onClick={onClick}
                size="sm"
            >
                Xử lý ngay <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
        </div>
    );
};

// --- COMPONENT: QUOTA PROGRESS CARD ---
const QuotaProgressCard = ({ assigned, created, onClick }) => {
    const percent = assigned > 0 ? Math.min(100, Math.round((created / assigned) * 100)) : 0;
    const missing = Math.max(0, assigned - created);
    const isComplete = assigned > 0 && missing === 0;

    return (
        <div className={cn(
            "p-5 rounded-xl border shadow-sm flex flex-col justify-between transition-all",
            isComplete 
                ? "bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-900 dark:text-green-100" 
                : "bg-white border-gray-200 dark:bg-card dark:border-border"
        )}>
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", isComplete ? "bg-green-200 dark:bg-green-800" : "bg-blue-100 dark:bg-blue-900")}>
                            <Target className={cn("w-5 h-5", isComplete ? "text-green-800 dark:text-green-200" : "text-blue-700 dark:text-blue-300")} />
                        </div>
                        <h3 className="font-bold text-lg">Chỉ tiêu Đề tài</h3>
                    </div>
                    {isComplete && <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />}
                </div>
                
                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                        <span>Tiến độ</span>
                        <span className="font-mono">{created}/{assigned}</span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                        <div 
                            className={cn("h-full transition-all duration-700 ease-out rounded-full", isComplete ? "bg-green-500" : "bg-blue-500")} 
                            style={{ width: `${percent}%` }} 
                        />
                    </div>
                    <p className="text-sm opacity-80 mt-2">
                        {isComplete 
                            ? "Bạn đã hoàn thành chỉ tiêu đề tài." 
                            : <>Cần tạo thêm <strong className="text-red-600 dark:text-red-400">{missing}</strong> đề tài nữa.</>}
                    </p>
                </div>
            </div>
            
            {!isComplete && (
                <Button 
                    variant="outline" 
                    className="mt-4 w-full border-blue-200 hover:bg-blue-50 text-blue-700 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/50" 
                    onClick={onClick}
                >
                    Quản lý Quota
                </Button>
            )}
        </div>
    );
};

// --- COMPONENT: REMINDER ITEM ---
const ReminderItem = ({ icon: Icon, title, description, actionText, onAction, variant = "default" }) => {
    const variants = {
        urgent: "bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-900 dark:text-red-200",
        warning: "bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-900/20 dark:border-orange-900 dark:text-orange-200",
        info: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-900 dark:text-blue-200",
        success: "bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-900 dark:text-green-200"
    };

    const iconColors = {
        urgent: "text-red-600 dark:text-red-400",
        warning: "text-orange-600 dark:text-orange-400",
        info: "text-blue-600 dark:text-blue-400",
        success: "text-green-600 dark:text-green-400"
    };

    return (
        <div className={cn("flex items-center justify-between p-3 rounded-lg border mb-3 last:mb-0 shadow-sm transition-all hover:shadow-md", variants[variant])}>
            <div className="flex items-center gap-3">
                <div className={cn("p-2 bg-white/80 dark:bg-black/20 rounded-full shrink-0", iconColors[variant])}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-sm font-bold">{title}</h4>
                    <p className="text-xs opacity-90">{description}</p>
                </div>
            </div>
            {onAction && (
                <Button 
                    size="sm" 
                    variant="ghost" 
                    className={cn("text-xs font-semibold hover:bg-white/50 dark:hover:bg-black/20 h-8 px-3", iconColors[variant])}
                    onClick={onAction}
                >
                    {actionText} <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
            )}
        </div>
    );
};

// --- COMPONENT: ACTIVE PLAN TIMELINE (ITEM) ---
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
                        Nhấn để xem chi tiết tiến độ
                    </div>
                </div>
            </PopoverTrigger>

            <PopoverContent className="w-80 md:w-96 p-0 overflow-hidden shadow-xl" align="start">
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

// --- COMPONENT CHÍNH: DASHBOARD ---
export default function LecturerDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

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

    // 4. Lấy Quota
    const { data: myQuotaData } = useQuery({
        queryKey: ['lecturerMyQuotaDetail'],
        queryFn: async () => {
            const plans = await getAllPlans();
            const activePlan = plans.find(p => p.TRANGTHAI === 'Đang thực hiện' || p.TRANGTHAI === 'Chờ duyệt chỉnh sửa') || plans[0];
            if (activePlan) {
                const res = await lecturerQuotaService.getMyQuota({ plan_id: activePlan.ID_KEHOACH });
                return res.data;
            }
            return null;
        }
    });

    const isLoading = loadStats || loadGroups || loadSchedule;

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between"><Skeleton className="h-10 w-64"/><Skeleton className="h-10 w-32"/></div>
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
            </div>
        );
    }

    // Extract Data
    const { 
        pendingSubmissionsCount = 0, 
        missingQuotaCount = 0, 
        pendingReviewsCount = 0, 
        activePlansStatus = [],
        hoiDongCount = 0
    } = stats || {};
    
    const hasReminders = pendingSubmissionsCount > 0 || missingQuotaCount > 0 || pendingReviewsCount > 0;

    const quotaAssigned = myQuotaData?.quota_assigned || 0;
    const topicsCreated = myQuotaData?.topics_created || 0;

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-background p-4 md:p-8 space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* --- CỘT TRÁI (2/3): KẾ HOẠCH & NHẮC NHỞ --- */}
                <div className="xl:col-span-2 space-y-8">
                    
                    {/* 1. Timeline các kế hoạch đang chạy (GRID LAYOUT ĐỘNG) */}
                    <section>
                        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-600" />
                            Tiến độ Kế hoạch
                        </h2>
                        {activePlansStatus.length > 0 ? (
                            // SỬ DỤNG HÀM getPlanGridClass Ở ĐÂY
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

                    {/* 2. Danh sách Nhắc nhở (Dạng dòng) */}
                    <section>
                        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                            <BellRing className="w-5 h-5 text-orange-500" />
                            Nhiệm vụ cần xử lý
                        </h2>
                        <Card className="border-none shadow-sm bg-transparent">
                            <CardContent className="p-0">
                                {hasReminders ? (
                                    <div className="flex flex-col">
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

                    {/* 3. Danh sách nhóm */}
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
                        
                        <ScrollArea className="h-[300px] border rounded-xl bg-card p-4 shadow-sm">
                             {myGroups && myGroups.length > 0 ? (
                                <div className="flex flex-col gap-3 pr-3">
                                    {myGroups.map((assignment) => {
                                        const topicName = assignment.detai?.TEN_DETAI || 'Chưa đăng ký đề tài';
                                        const planName = assignment.nhom?.kehoach?.TEN_DOT || 'Kế hoạch chung';
                                        const groupName = assignment.nhom?.TEN_NHOM || 'Nhóm ?';
                                        const groupCode = assignment.nhom?.MA_NHOM || 'N/A';
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
                                                    <Badge variant="secondary" className="text-[10px] px-2 h-5 font-normal text-muted-foreground bg-muted hover:bg-muted">
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
                                                    <span className="font-mono bg-muted/50 px-1 rounded">#{groupCode}</span>
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
                     {/* Lịch hôm nay */}
                     <Card className="shadow-sm border-t-4 border-t-blue-500">
                        <CardHeader className="pb-2 px-5 pt-5">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {format(new Date(), "EEEE, 'ngày' dd 'tháng' MM, yyyy", { locale: vi })}
                                    </p>
                                </CardTitle>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate('/lecturer/calendar')}>
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="space-y-2">
                                {todaySchedule && todaySchedule.length > 0 ? (
                                    todaySchedule.map((event, idx) => (
                                        <div key={event.ID_LICHHOP || idx} className="flex gap-3 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/lecturer/groups-management/${event.ID_NHOM}/schedule`)}>
                                            <div className="flex flex-col items-center justify-center w-12 bg-blue-50 rounded text-blue-700 shrink-0 h-12">
                                                <span className="text-xs font-bold">{format(parseISO(event.THOIGIAN_BATDAU), 'HH:mm')}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{event.TIEUDE_LICHHOP}</p>
                                                <p className="text-xs text-muted-foreground truncate">{event.nhom?.TEN_NHOM}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                        Hôm nay trống lịch.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Thẻ Hội đồng */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden cursor-pointer group" onClick={() => navigate('/lecturer/council')}>
                        <GraduationCap className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 group-hover:scale-110 transition-transform" />
                        <div className="relative z-10">
                            <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Hội đồng tham gia</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-extrabold">{hoiDongCount}</span>
                                <span className="text-sm opacity-80">buổi</span>
                            </div>
                            <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
                                <span className="text-xs font-medium">Xem lịch bảo vệ</span>
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                     {/* Thẻ Quota (Mini) */}
                     <div className="border rounded-xl p-4 bg-card shadow-sm">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                             <Target className="w-3 h-3" /> Tiến độ ra đề
                        </h4>
                        <QuotaProgressCard 
                            assigned={quotaAssigned} 
                            created={topicsCreated}
                            onClick={() => navigate('/lecturer/quota-management')}
                        />
                     </div>
                </div>
            </div>
        </div>
    );
}