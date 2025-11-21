import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Import APIs
import { getLecturerDashboardStats } from '@/api/lecturerService';
import lecturerQuotaService from '@/api/lecturerQuotaService';
import { getSubmissionStatistics } from '@/api/adminSubmissionService'; // Dùng chung logic thống kê
import * as topicAssignmentService from '@/api/topicAssignmentService'; 

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';

// Icons
import { 
    Loader2, Users, Calendar, LayoutDashboard, GraduationCap, 
    CheckSquare, Clock, FileText, ChevronRight, AlertCircle, 
    PlusCircle, MessageSquarePlus, BookOpen, BellRing
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
            "bg-card hover:bg-accent/50"
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
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
    </Button>
);

// --- COMPONENT: ALERT SECTION ---
const DashboardAlerts = ({ remainingQuota, pendingSubmissions, pendingReviews }) => {
    if (remainingQuota <= 0 && pendingSubmissions <= 0 && pendingReviews <= 0) return null;

    return (
        <div className="grid gap-3 mb-6">
            {remainingQuota > 0 && (
                <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/10 dark:border-red-900 dark:text-red-300">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-bold">Thiếu chỉ tiêu đề tài</AlertTitle>
                    <AlertDescription>
                        Bạn cần ra thêm <strong>{remainingQuota}</strong> đề tài nữa để đạt chỉ tiêu phân công.
                    </AlertDescription>
                </Alert>
            )}
            {pendingSubmissions > 0 && (
                <Alert className="bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/10 dark:border-orange-900 dark:text-orange-300">
                    <BellRing className="h-4 w-4 text-orange-600" />
                    <AlertTitle className="font-bold">Cần duyệt bài nộp</AlertTitle>
                    <AlertDescription>
                        Có <strong>{pendingSubmissions}</strong> nhóm đã nộp sản phẩm và đang chờ bạn xác nhận.
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
            {time && <span className="text-xs text-muted-foreground font-mono hidden sm:block">{time}</span>}
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

    // 1. Lấy thống kê tổng quan
    const { data: generalStats, isLoading: loadStats } = useQuery({
        queryKey: ['lecturerDashboardStats'],
        queryFn: getLecturerDashboardStats,
    });

    // 2. Lấy thông tin Quota (để biết còn thiếu bao nhiêu đề tài)
    // Giả sử ta lấy plan đầu tiên hoặc plan đang active mới nhất
    const { data: quotaData, isLoading: loadQuota } = useQuery({
        queryKey: ['lecturerQuota', 'active'], 
        queryFn: async () => {
            // Logic thực tế: Lấy plan active trước, sau đó gọi getMyQuota
            // Demo: Gọi getMyQuota với plan_id (cần logic lấy plan_id active từ context hoặc API khác)
            // Ở đây ta giả định API trả về quota của plan mới nhất nếu không truyền ID, hoặc xử lý ở backend
            return { remaining_quota: 2, topics_created: 3 }; // Dữ liệu giả lập cho UI
        },
    });

    // 3. Lấy số lượng bài nộp chờ duyệt
    const { data: submissionStats, isLoading: loadSubs } = useQuery({
        queryKey: ['submissionStats'],
        queryFn: () => getSubmissionStatistics(), // Backend cần hỗ trợ trả về số lượng pending của GV
    });

    const isLoading = loadStats || loadQuota || loadSubs;

    // Dữ liệu (Fallback về 0 nếu chưa có)
    const remainingQuota = quotaData?.remaining_quota || 0;
    const pendingSubmissions = submissionStats?.pending || 0; // Giả sử API trả về field này
    const pendingReviews = generalStats?.taskReviewCount || 0;
    const upcomingMeetings = generalStats?.lichHopCount || 0;
    const activeGroups = generalStats?.nhomHuongDanCount || 0;
    const councilCount = generalStats?.hoiDongCount || 0;

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between"><Skeleton className="h-10 w-64"/><Skeleton className="h-10 w-32"/></div>
                <Skeleton className="h-24 w-full" />
                <div className="grid grid-cols-4 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
                <div className="grid grid-cols-3 gap-6"><Skeleton className="h-96 col-span-2" /><Skeleton className="h-96" /></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/30 dark:bg-background p-4 md:p-8 space-y-8">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Tổng quan Giảng viên
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(), "'Ngày' dd 'tháng' MM, yyyy", { locale: vi })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="py-1 px-3 bg-background">
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

            {/* QUICK ACTIONS GRID (Có Badge số lượng) */}
            <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3 tracking-wider">Truy cập nhanh & Việc cần làm</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                    <QuickActionButton 
                        icon={FileText} 
                        label="Duyệt bài nộp" 
                        count={pendingSubmissions} 
                        colorClass={{ bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600" }}
                        onClick={() => navigate('/lecturer/submissions')}
                    />
                    <QuickActionButton 
                        icon={BookOpen} 
                        label="Ra đề tài (Quota)" 
                        count={remainingQuota} 
                        colorClass={{ bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600" }}
                        onClick={() => navigate('/lecturer/quota-management')}
                        variant={remainingQuota > 0 ? "default" : "outline"} // Highlight nếu thiếu
                    />
                    <QuickActionButton 
                        icon={MessageSquarePlus} 
                        label="Góp ý đề tài" 
                        count={pendingReviews} 
                        colorClass={{ bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600" }}
                        onClick={() => navigate('/department-head/topic-reviewer-assignment')} // Hoặc route phù hợp
                    />
                    <QuickActionButton 
                        icon={Calendar} 
                        label="Lịch họp sắp tới" 
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
                                <TabsTrigger value="groups">Nhóm hướng dẫn ({activeGroups})</TabsTrigger>
                                <TabsTrigger value="pending_topics">Đề tài chờ duyệt</TabsTrigger>
                            </TabsList>
                        </div>

                        {/* TAB 1: NHÓM HƯỚNG DẪN */}
                        <TabsContent value="groups" className="space-y-4 mt-0">
                            <Card className="border-none shadow-md">
                                <CardHeader className="pb-3 border-b px-6 py-4">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <Users className="w-4 h-4 text-blue-600" /> Danh sách nhóm đang hướng dẫn
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[350px]">
                                        <div className="p-4 space-y-2">
                                            {/* Demo Data - Thay bằng dữ liệu thật từ API */}
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/30 transition-colors">
                                                    <div className="flex gap-4 items-center">
                                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                            G{i}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-sm">Nhóm Nghiên cứu AI {i}</h4>
                                                            <p className="text-xs text-muted-foreground">Đề tài: Ứng dụng AI trong y tế</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Đang thực hiện</Badge>
                                                        <Button size="sm" variant="ghost" onClick={() => navigate(`/lecturer/groups-management/${i}/details`)}>
                                                            Chi tiết
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* TAB 2: ĐỀ TÀI CHỜ DUYỆT (PLACEHOLDER) */}
                        <TabsContent value="pending_topics" className="mt-0">
                            <Card className="border-none shadow-md h-[400px] flex flex-col justify-center items-center text-muted-foreground">
                                <FileText className="w-12 h-12 mb-4 opacity-20" />
                                <p>Danh sách đề tài bạn cần góp ý hoặc phê duyệt sẽ hiện ở đây.</p>
                                <Button variant="link" onClick={() => navigate('/department-head/topic-reviewer-assignment')}>
                                    Đi tới trang quản lý
                                </Button>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* RIGHT COLUMN (1/3): LỊCH & THÔNG TIN PHỤ */}
                <div className="space-y-6">
                    <Card className="shadow-md border-none bg-gradient-to-b from-white to-blue-50/30 dark:from-card dark:to-card">
                        <CardHeader className="pb-2 border-b px-5 py-4">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-indigo-600" /> Lịch hôm nay
                                </CardTitle>
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/lecturer/calendar')}>
                                    Xem lịch
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="space-y-3">
                                {/* Demo Meeting Items */}
                                <MiniListItem 
                                    icon={Users} 
                                    title="Họp nhóm G1" 
                                    subtitle="Báo cáo tiến độ tuần 4" 
                                    time="09:00 AM"
                                />
                                <MiniListItem 
                                    icon={GraduationCap} 
                                    title="Hội đồng bảo vệ thử" 
                                    subtitle="Phòng B1.02" 
                                    time="14:00 PM"
                                />
                                <div className="text-center pt-2">
                                    <p className="text-xs text-muted-foreground">Hết lịch hôm nay.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader className="pb-2 px-5 py-4">
                            <CardTitle className="text-base font-bold">Thống kê nhanh</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 grid grid-cols-2 gap-4">
                             <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                 <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{activeGroups}</p>
                                 <p className="text-xs text-muted-foreground">Nhóm</p>
                             </div>
                             <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                 <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{quotaData?.topics_created || 0}</p>
                                 <p className="text-xs text-muted-foreground">Đề tài đã ra</p>
                             </div>
                             <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                 <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{councilCount}</p>
                                 <p className="text-xs text-muted-foreground">Hội đồng</p>
                             </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}