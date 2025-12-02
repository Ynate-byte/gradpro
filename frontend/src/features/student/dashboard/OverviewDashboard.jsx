import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getStudentDashboardOverview } from '@/api/studentDashboardService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
    Layers, Users, Zap, ArrowRight, AlertCircle, 
    Clock, CheckSquare, BookOpen, MessageSquare, Trophy, UserPlus,
    CalendarDays, Video, MapPin, Pin, Newspaper, GraduationCap
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';

// --- COMPONENTS CON ---
const StatBox = ({ label, value, icon: Icon, colorClass }) => (
    <div className="bg-card border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
        <div className={cn("p-3 rounded-lg", colorClass.bg, colorClass.text)}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase">{label}</p>
        </div>
    </div>
);

const NewsItem = ({ news, onClick }) => (
    <div 
        onClick={onClick}
        className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer border-b last:border-0"
    >
        <div className={cn("mt-1 p-1.5 rounded shrink-0", news.is_pinned ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600")}>
            {news.is_pinned ? <Pin className="w-3 h-3" /> : <Newspaper className="w-3 h-3" />}
        </div>
        <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium leading-tight line-clamp-2 mb-1">{news.title}</h4>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Badge variant="secondary" className="text-[9px] px-1 h-4 font-normal">{news.category}</Badge>
                <span>•</span>
                <span>{format(parseISO(news.created_at), "dd/MM/yyyy", { locale: vi })}</span>
            </div>
        </div>
    </div>
);

const PlanCard = ({ plan }) => {
    const navigate = useNavigate();
    const hasGroup = !!plan.group;
    const council = plan.group?.council;
    const cardBorderClass = hasGroup ? "border-l-4 border-l-indigo-500" : "border-l-4 border-l-orange-400 border-dashed";

    return (
        <Card className={cn("hover:shadow-md transition-all duration-300 group", cardBorderClass)}>
            <CardContent className="p-5">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] font-normal">{plan.term}</Badge>
                            {!hasGroup && <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 text-[10px]">Chưa có nhóm</Badge>}
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate" title={plan.plan_name}>{plan.plan_name}</h3>
                        
                        {hasGroup ? (
                            <div className="mt-3 space-y-2">
                                {/* Thông tin nhóm & Đề tài */}
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                    <Users className="w-4 h-4 mr-2 text-indigo-500 shrink-0" />
                                    <span className="font-medium mr-1">{plan.group.name}</span>
                                    <span className="text-muted-foreground text-xs">({plan.group.members_count} TV)</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                    <BookOpen className="w-4 h-4 mr-2 text-indigo-500 shrink-0" />
                                    <span className="truncate max-w-[300px]">{plan.group.topic_name || "Chưa đăng ký đề tài"}</span>
                                </div>

                                {/* [MỚI] Thông tin Hội đồng (Nếu có) */}
                                {council && (
                                    <div className="mt-3 pt-3 border-t border-dashed flex flex-col gap-1 bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded-md">
                                            <div className="flex items-center gap-2 mb-1">
                                                <GraduationCap className="w-4 h-4 text-blue-600" />
                                                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">
                                                    Lịch bảo vệ: {council.name}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pl-6">
                                                <span className="flex items-center gap-1">
                                                    <CalendarDays className="w-3 h-3" />
                                                    {council.date ? format(parseISO(council.date), 'dd/MM/yyyy') : '---'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {council.time ? format(parseISO(`2000-01-01T${council.time}`), 'HH:mm') : '---'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {council.room || 'Chưa xếp phòng'}
                                                </span>
                                            </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="mt-3 text-sm text-muted-foreground italic flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-orange-400" /> Bạn cần tham gia nhóm để bắt đầu.
                            </div>
                        )}
                    </div>
                    
                    {/* Phần tiến độ & Nút bấm */}
                    <div className="flex flex-col items-end justify-between gap-3 min-w-[140px]">
                        {hasGroup ? (
                            <div className="w-full text-right">
                                <div className="text-xs text-muted-foreground mb-1">Tiến độ công việc</div>
                                <div className="flex items-center justify-end gap-2">
                                    <Progress value={plan.task_stats?.percent || 0} className="h-2 w-24" />
                                    <span className="text-xs font-bold">{plan.task_stats?.percent}%</span>
                                </div>
                            </div>
                        ) : <div className="w-full"></div>}
                        
                        <Button size="sm" className={cn("w-full shadow-sm", hasGroup ? "bg-indigo-600 hover:bg-indigo-700" : "bg-orange-500 hover:bg-orange-600")}
                            onClick={() => hasGroup ? navigate(`/student/dashboard/${plan.plan_id}`) : navigate('/projects/find-group', { state: { planId: plan.plan_id } })}>
                            {hasGroup ? <><ArrowRight className="w-4 h-4 ml-1" /> Chi tiết</> : <><UserPlus className="w-4 h-4 mr-1" /> Tìm nhóm ngay</>}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const UrgentItem = ({ item }) => {
    const navigate = useNavigate();
    const time = item.time ? parseISO(item.time) : null;
    const isOverdue = time && isPast(time) && item.type === 'task';
    const isTodayDate = time && isToday(time);

    // Xử lý điều hướng: Cần có group_id để route hoạt động
    const handleClick = () => {
        if (!item.group_id) {
            console.error("Missing group_id for navigation", item);
            return;
        }

        if (item.type === 'task') {
            // Navigate đến Kanban của nhóm đó, mở task modal
            navigate(`/projects/my-group/kanban/${item.group_id}?taskId=${item.id}`);
        } else if (item.type === 'council') {
             // [UPDATED] Navigate đến Dashboard Chi tiết của đợt đó (nơi hiển thị Card Hội đồng)
             navigate(`/student/dashboard/${item.plan_id}`);
        } else {
            // Navigate đến Lịch họp của nhóm đó
            navigate(`/projects/my-group/schedule/${item.group_id}`);
        }
    };

    // [UPDATED] Handle Council Item (Hội đồng)
    if (item.type === 'council') {
        return (
            <div onClick={handleClick} 
                className="flex items-start gap-3 p-3 rounded-lg border-l-4 border-l-purple-500 bg-purple-50/30 hover:bg-purple-50 transition-colors cursor-pointer group">
                <div className="p-1.5 bg-purple-100 text-purple-600 rounded shrink-0">
                    <GraduationCap className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight text-purple-700">{item.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                         <span className="flex items-center text-purple-600 font-medium">
                            <Clock className="w-3 h-3 mr-1" /> {time ? format(time, 'HH:mm dd/MM') : '---'}
                        </span>
                        <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" /> {item.location}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    if (item.type === 'task') {
        return (
            <div onClick={handleClick}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group">
                <div className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", isOverdue ? "bg-red-500 animate-pulse" : "bg-orange-500")} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight group-hover:text-primary transition-colors line-clamp-2">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span className="bg-muted px-1.5 py-0.5 rounded truncate max-w-[100px]">{item.group_name}</span>
                        {time && <span className={cn("flex items-center", isOverdue ? "text-red-600 font-bold" : "")}>
                            <Clock className="w-3 h-3 mr-1" /> {isOverdue ? 'Quá hạn' : (isTodayDate ? 'Hôm nay' : format(time, 'dd/MM HH:mm'))}
                        </span>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div onClick={handleClick} 
            className="flex items-start gap-3 p-3 rounded-lg border-l-4 border-l-blue-500 bg-blue-50/30 hover:bg-blue-50 transition-colors cursor-pointer group">
            <div className="p-1.5 bg-blue-100 text-blue-600 rounded shrink-0">
                <CalendarDays className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight text-blue-700">{item.title}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center text-blue-600 font-medium">
                        <Clock className="w-3 h-3 mr-1" /> {time ? format(time, 'HH:mm dd/MM') : '---'}
                    </span>
                    <span className="flex items-center">
                        {item.location === 'Online' ? <Video className="w-3 h-3 mr-1" /> : <MapPin className="w-3 h-3 mr-1" />}
                        {item.location || 'Chưa có địa điểm'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default function OverviewDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { data, isLoading, isError } = useQuery({
        queryKey: ['studentDashboardOverview'],
        queryFn: getStudentDashboardOverview,
        retry: 1,
    });

    if (isLoading) return <div className="p-8 text-center">Đang tải dữ liệu...</div>;
    if (isError) return <div className="p-8 text-center text-red-500">Không thể tải dữ liệu.</div>;

    const { stats } = data || {};
    const plans = Array.isArray(data?.plans) ? data.plans : [];
    const urgentItems = Array.isArray(data?.urgent_items) ? data.urgent_items : [];
    const newsList = Array.isArray(data?.news) ? data.news : [];

    return (
        <div className="h-full overflow-auto bg-gray-50/50 dark:bg-background p-4 md:p-8">
            <div className="mx-auto space-y-8">
                <div className="flex justify-between items-start">
                    <Button variant="outline" onClick={() => navigate('/notifications')} className="hidden md:flex">
                        <MessageSquare className="w-4 h-4 mr-2" /> Thông báo
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatBox label="Đồ án tham gia" value={stats?.active_plans || 0} icon={Layers} colorClass={{ bg: "bg-blue-100", text: "text-blue-600" }} />
                    <StatBox label="Công việc tồn đọng" value={stats?.pending_tasks || 0} icon={Zap} colorClass={{ bg: "bg-orange-100", text: "text-orange-600" }} />
                    <StatBox label="Nhóm đã vào" value={stats?.groups_joined || 0} icon={Users} colorClass={{ bg: "bg-green-100", text: "text-green-600" }} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* CỘT TRÁI: KẾ HOẠCH & TIN TỨC */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Danh sách Kế hoạch */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Các đợt Khóa luận</h2>
                            {plans.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {plans.map(plan => <PlanCard key={plan.plan_id} plan={plan} />)}
                                </div>
                            ) : (
                                <Alert className="bg-muted/50 border-dashed">
                                    <AlertTitle>Chưa tham gia đợt nào</AlertTitle>
                                    <AlertDescription>Hiện tại bạn không có tên trong danh sách tham gia đợt khóa luận nào.</AlertDescription>
                                </Alert>
                            )}
                        </div>

                         {/* Tin tức & Thông báo */}
                         <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold flex items-center gap-2"><Newspaper className="w-5 h-5 text-blue-500" /> Tin tức mới</h2>
                                <Button variant="link" className="h-auto p-0 text-xs" onClick={() => navigate('/news')}>Xem tất cả</Button>
                            </div>
                            <Card className="border-none shadow-sm">
                                <CardContent className="p-0">
                                    {newsList.length > 0 ? (
                                        newsList.map(news => (
                                            <NewsItem key={news.id} news={news} onClick={() => navigate(`/news/${news.id}`)} />
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-muted-foreground text-sm italic">Không có tin tức mới.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* CỘT PHẢI: ƯU TIÊN XỬ LÝ */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-md bg-white dark:bg-card h-full">
                            <CardHeader className="pb-2 border-b bg-red-50/30 dark:bg-red-900/10">
                                <CardTitle className="text-base text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Ưu tiên xử lý</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[400px]">
                                    <div className="p-4 space-y-3">
                                        {urgentItems.length > 0 ? (
                                            urgentItems.map(item => <UrgentItem key={`${item.type}-${item.id}`} item={item} />)
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
                                                <CheckSquare className="w-10 h-10 mb-2 opacity-20" />
                                                <p>Tuyệt vời! Không có việc gấp.</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}