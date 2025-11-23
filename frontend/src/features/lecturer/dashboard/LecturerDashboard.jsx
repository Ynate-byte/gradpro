import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Import APIs
import { getLecturerDashboardStats } from '@/api/lecturerService';
import { thesisTopicService } from '@/api/thesisTopicService'; // Để lấy danh sách nhóm
import { getLecturerSchedule } from '@/api/lecturerCalendarService'; // Để lấy lịch

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import { 
    Loader2, Users, Calendar, LayoutDashboard, GraduationCap, 
    CheckSquare, Clock, FileText, ChevronRight, AlertCircle, 
    MessageSquarePlus, BookOpen, BellRing, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

// --- COMPONENT: QUICK ACTION BUTTON WITH BADGE ---
const QuickActionButton = ({ icon: Icon, label, count, colorClass, onClick, variant = "outline" }) => (
    <Button 
        variant={variant}
        className={cn(
            "relative h-24 flex flex-col gap-3 items-center justify-center border-2 hover:border-primary/50 transition-all shadow-sm",
            "bg-card hover:bg-accent/50 whitespace-normal text-center px-2"
        )}
        onClick={onClick}
    >
        {count > 0 && (
            <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow-sm border-2 border-background animate-in zoom-in">
                {count > 99 ? '99+' : count}
            </span>
        )}
        <div className={cn("p-2 rounded-full bg-opacity-10", colorClass.bg)}>
            <Icon className={cn("w-6 h-6", colorClass.text)} />
        </div>
        <span className="text-xs font-semibold text-muted-foreground leading-tight">{label}</span>
    </Button>
);

// --- COMPONENT: ALERT SECTION ---
const DashboardAlerts = ({ remainingQuota, pendingSubmissions, pendingReviews }) => {
    if (remainingQuota <= 0 && pendingSubmissions <= 0 && pendingReviews <= 0) return null;

    return (
        <div className="grid gap-3 mb-6">
            {remainingQuota > 0 && (
                <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-900 dark:text-red-300">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-bold">Thiếu chỉ tiêu đề tài</AlertTitle>
                    <AlertDescription>
                        Bạn cần ra thêm <strong>{remainingQuota}</strong> đề tài nữa để đạt chỉ tiêu phân công của bộ môn.
                    </AlertDescription>
                </Alert>
            )}
            {pendingSubmissions > 0 && (
                <Alert className="bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-900 dark:text-orange-300">
                    <BellRing className="h-4 w-4 text-orange-600" />
                    <AlertTitle className="font-bold">Cần duyệt bài nộp</AlertTitle>
                    <AlertDescription>
                        Có <strong>{pendingSubmissions}</strong> nhóm đã nộp sản phẩm và đang chờ bạn xác nhận.
                    </AlertDescription>
                </Alert>
            )}
            {pendingReviews > 0 && (
                <Alert className="bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-900 dark:text-purple-300">
                    <MessageSquarePlus className="h-4 w-4 text-purple-600" />
                    <AlertTitle className="font-bold">Cần góp ý đề tài</AlertTitle>
                    <AlertDescription>
                        Có <strong>{pendingReviews}</strong> đề tài được phân công đang chờ bạn góp ý kiến.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
};

// --- COMPONENT: MINI LIST ITEM ---
const MiniListItem = ({ icon: Icon, title, subtitle, action, time }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
        <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-md bg-muted shrink-0">
                <Icon className="w-4 h-4 text-foreground" />
            </div>
            <div className="min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
            {time && <span className="text-xs text-muted-foreground font-mono hidden sm:block bg-muted px-2 py-1 rounded">{time}</span>}
            {action && (
                <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={action}>
                    <ChevronRight className="w-4 h-4" />
                </Button>
            )}
        </div>
    </div>
);

export default function LecturerDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // 1. Lấy thống kê tổng quan (Số liệu & Alerts)
    const { data: generalStats, isLoading: loadStats } = useQuery({
        queryKey: ['lecturerDashboardStats'],
        queryFn: getLecturerDashboardStats,
        refetchInterval: 60000, // 1 phút refresh
    });

    // 2. Lấy danh sách nhóm đang hướng dẫn (Real Data)
    const { data: myGroups, isLoading: loadGroups } = useQuery({
        queryKey: ['lecturerGroups'],
        queryFn: thesisTopicService.getGroupsForLecturer,
    });

    // 3. Lấy lịch họp hôm nay (Real Data)
    const { data: todaySchedule, isLoading: loadSchedule } = useQuery({
        queryKey: ['lecturerTodaySchedule'],
        queryFn: () => getLecturerSchedule({ 
            start_date: format(new Date(), 'yyyy-MM-dd'),
            end_date: format(new Date(), 'yyyy-MM-dd')
        }),
    });

    const isLoading = loadStats || loadGroups || loadSchedule;

    // Dữ liệu từ API Stats (Backend đã tính toán sẵn)
    const remainingQuota = generalStats?.missingQuotaCount || 0;
    const pendingSubmissions = generalStats?.pendingSubmissionsCount || 0;
    const pendingReviews = generalStats?.pendingReviewsCount || 0;
    
    const upcomingMeetings = generalStats?.lichHopCount || 0; // Trong 7 ngày tới
    const councilCount = generalStats?.hoiDongCount || 0;
    
    // Lấy số lượng nhóm active từ danh sách thực tế để chính xác hơn
    const activeGroupsCount = myGroups?.length || 0;

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between"><Skeleton className="h-10 w-64"/><Skeleton className="h-10 w-32"/></div>
                <Skeleton className="h-24 w-full" />
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <Skeleton className="h-96 xl:col-span-2" /><Skeleton className="h-96" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/30 dark:bg-background p-4 md:p-8 space-y-8">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <LayoutDashboard className="w-6 h-6 text-primary" /> Tổng quan Giảng viên
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">
                        {format(new Date(), "EEEE, 'ngày' dd 'tháng' MM, yyyy", { locale: vi })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="py-1 px-3 bg-background border-green-200 text-green-700 dark:border-green-900 dark:text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                        Hệ thống hoạt động
                    </Badge>
                </div>
            </div>

            {/* ALERTS AREA */}
            <DashboardAlerts 
                remainingQuota={remainingQuota} 
                pendingSubmissions={pendingSubmissions} 
                pendingReviews={pendingReviews}
            />

            {/* QUICK ACTIONS GRID */}
            <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-3 tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Truy cập nhanh
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                    <QuickActionButton 
                        icon={FileText} 
                        label="Duyệt bài nộp" 
                        count={pendingSubmissions} 
                        colorClass={{ bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600" }}
                        onClick={() => navigate('/lecturer/submissions')}
                        variant={pendingSubmissions > 0 ? "default" : "outline"}
                    />
                    <QuickActionButton 
                        icon={BookOpen} 
                        label="Ra đề tài (Quota)" 
                        count={remainingQuota} 
                        colorClass={{ bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600" }}
                        onClick={() => navigate('/lecturer/quota-management')}
                        variant={remainingQuota > 0 ? "default" : "outline"}
                    />
                    <QuickActionButton 
                        icon={MessageSquarePlus} 
                        label="Góp ý đề tài" 
                        count={pendingReviews} 
                        colorClass={{ bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600" }}
                        onClick={() => navigate('/department-head/topic-reviewer-assignment')}
                        variant={pendingReviews > 0 ? "default" : "outline"}
                    />
                    <QuickActionButton 
                        icon={Calendar} 
                        label="Lịch họp (7 ngày)" 
                        count={upcomingMeetings} 
                        colorClass={{ bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600" }}
                        onClick={() => navigate('/lecturer/calendar')}
                    />
                    <QuickActionButton 
                        icon={GraduationCap} 
                        label="Hội đồng tham gia" 
                        count={councilCount} 
                        colorClass={{ bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600" }}
                        onClick={() => navigate('/lecturer/council')}
                    />
                </div>
            </div>

            {/* MAIN CONTENT SPLIT */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* LEFT COLUMN (2/3): CHI TIẾT & DANH SÁCH */}
                <div className="xl:col-span-2 space-y-6">
                    <Tabs defaultValue="groups" className="w-full">
                        <div className="flex items-center justify-between mb-4">
                            <TabsList>
                                <TabsTrigger value="groups">Nhóm hướng dẫn ({activeGroupsCount})</TabsTrigger>
                                <TabsTrigger value="pending_topics">Đề tài chờ duyệt</TabsTrigger>
                            </TabsList>
                        </div>

                        {/* TAB 1: NHÓM HƯỚNG DẪN (REAL DATA) */}
                        <TabsContent value="groups" className="space-y-4 mt-0">
                            <Card className="border-none shadow-md overflow-hidden">
                                <CardHeader className="pb-3 border-b px-6 py-4 bg-card">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <Users className="w-4 h-4 text-blue-600" /> Danh sách nhóm đang hướng dẫn
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 bg-card">
                                    <ScrollArea className="h-[400px]">
                                        {myGroups && myGroups.length > 0 ? (
                                            <div className="p-4 space-y-3">
                                                {myGroups.map((assignment) => (
                                                    <div key={assignment.ID_PHANCONG} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-background hover:bg-accent/30 hover:border-primary/30 transition-all group">
                                                        <div className="flex gap-4 items-start">
                                                            <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-800">
                                                                {assignment.nhom?.TEN_NHOM?.substring(0, 2).toUpperCase() || 'G'}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-sm text-foreground">{assignment.nhom?.TEN_NHOM}</h4>
                                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1" title={assignment.detai?.TEN_DETAI}>
                                                                    <span className="font-semibold text-primary">Đề tài:</span> {assignment.detai?.TEN_DETAI || 'Chưa cập nhật'}
                                                                </p>
                                                                <div className="flex gap-2 mt-2">
                                                                    <Badge variant="outline" className="text-[10px] font-normal">
                                                                        {assignment.nhom?.SO_THANHVIEN_HIENTAI || 0} thành viên
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-3 sm:mt-0 sm:ml-4">
                                                            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate(`/lecturer/groups-management/${assignment.nhom.ID_NHOM}/details`)}>
                                                                Chi tiết
                                                            </Button>
                                                            <Button size="sm" className="text-xs h-8" onClick={() => navigate(`/lecturer/groups-management/${assignment.nhom.ID_NHOM}/kanban`)}>
                                                                Kanban <ArrowRight className="w-3 h-3 ml-1" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                                                <Users className="w-12 h-12 opacity-20 mb-2" />
                                                <p>Chưa có nhóm nào đăng ký đề tài của bạn.</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* TAB 2: ĐỀ TÀI CHỜ DUYỆT (PLACEHOLDER) */}
                        <TabsContent value="pending_topics" className="mt-0">
                            <Card className="border-none shadow-md h-[400px] flex flex-col justify-center items-center text-muted-foreground bg-card">
                                <FileText className="w-12 h-12 mb-4 opacity-20" />
                                <p className="mb-4">Danh sách đề tài bạn cần góp ý hoặc phê duyệt sẽ hiện ở đây.</p>
                                <Button variant="outline" onClick={() => navigate('/department-head/topic-reviewer-assignment')}>
                                    Đi tới trang quản lý <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* RIGHT COLUMN (1/3): LỊCH & THÔNG TIN PHỤ */}
                <div className="space-y-6">
                    {/* LỊCH HÔM NAY */}
                    <Card className="shadow-md border-none bg-gradient-to-b from-white to-blue-50/30 dark:from-card dark:to-card ring-1 ring-border">
                        <CardHeader className="pb-2 border-b px-5 py-4">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-indigo-600" /> Lịch hôm nay
                                </CardTitle>
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-primary" onClick={() => navigate('/lecturer/calendar')}>
                                    Xem đầy đủ
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="space-y-3">
                                {todaySchedule && todaySchedule.length > 0 ? (
                                    todaySchedule.map((event) => (
                                        <MiniListItem 
                                            key={event.ID_LICHHOP}
                                            icon={Users} 
                                            title={event.TIEUDE_LICHHOP} 
                                            subtitle={`Nhóm: ${event.nhom?.TEN_NHOM}`}
                                            time={format(new Date(event.THOIGIAN_BATDAU), 'HH:mm')}
                                            action={() => navigate(`/lecturer/groups-management/${event.ID_NHOM}/schedule`)}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-sm text-muted-foreground">
                                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        Hôm nay bạn không có lịch họp nào.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* THỐNG KÊ NHANH */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-2 px-5 py-4">
                            <CardTitle className="text-base font-bold">Thống kê nhanh</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 grid grid-cols-2 gap-4">
                             <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-border/50">
                                 <p className="text-3xl font-bold text-primary">{activeGroupsCount}</p>
                                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-1">Nhóm</p>
                             </div>
                             <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-border/50">
                                 <p className="text-3xl font-bold text-primary">{generalStats?.missingQuotaCount ? 'Thiếu' : 'Đủ'}</p>
                                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-1">Quota</p>
                             </div>
                             <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-border/50 col-span-2">
                                 <p className="text-3xl font-bold text-primary">{councilCount}</p>
                                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-1">Hội đồng tham gia</p>
                             </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}