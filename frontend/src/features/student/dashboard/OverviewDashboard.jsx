import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getStudentDashboardOverview } from '@/api/studentDashboardService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
    Target, Calendar, MessageSquare, Activity, 
    Users, ArrowRight, Clock, CheckSquare,
    Briefcase, AlertCircle, ChevronRight
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// --- COMPONENT: MINI STAT ---
const MiniStat = ({ icon: Icon, label, value, colorClass }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
        <div className={cn("p-2 rounded-md shrink-0", colorClass.bg, colorClass.text)}>
            <Icon className="w-4 h-4" />
        </div>
        <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-lg font-bold leading-none">{value}</p>
        </div>
    </div>
);

// --- COMPONENT: COMPACT GROUP ITEM ---
const CompactGroupItem = ({ group, onClick }) => (
    <div 
        onClick={onClick}
        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer group"
    >
        <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 shrink-0 font-bold text-xs">
                {group.members_count} TV
            </div>
            <div className="min-w-0">
                <h4 className="font-semibold text-sm truncate group-hover:text-indigo-600 transition-colors">{group.name}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate max-w-[120px]">{group.plan_name}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="truncate max-w-[150px]">{group.topic_name || "Chưa có đề tài"}</span>
                </div>
            </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
);

// --- COMPONENT: URGENT TASK ROW ---
const UrgentTaskRow = ({ task, onClick }) => {
    const deadline = task.deadline ? parseISO(task.deadline) : null;
    const isOverdue = task.status_color === 'red';
    const isToday = task.status_color === 'orange';

    return (
        <div 
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 p-2.5 rounded border-l-4 cursor-pointer hover:bg-accent transition-colors text-sm",
                isOverdue ? "border-l-red-500 bg-red-50/50 dark:bg-red-900/10" : 
                isToday ? "border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10" : "border-l-gray-300"
            )}
        >
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                    <span className="font-medium truncate pr-2">{task.title}</span>
                    {deadline && (
                        <Badge variant="outline" className={cn("text-[10px] px-1 py-0 h-5 border-0", 
                            isOverdue ? "text-red-600 bg-red-100" : "text-gray-500 bg-gray-100")}>
                            {isOverdue ? 'Quá hạn' : format(deadline, 'dd/MM')}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center text-xs text-muted-foreground gap-2">
                    <span className="truncate max-w-[100px]">{task.group_name}</span>
                    {task.priority === 'Cao' && <span className="text-red-500 font-bold flex items-center gap-0.5"><AlertCircle className="w-3 h-3"/> Cao</span>}
                </div>
            </div>
        </div>
    );
};

export default function OverviewDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data, isLoading } = useQuery({
        queryKey: ['studentDashboardOverview'],
        queryFn: getStudentDashboardOverview,
    });

    if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;

    const { stats, tasks, groups } = data;
    // Tách task quan trọng: Quá hạn hoặc Hôm nay
    const urgentTasks = tasks.filter(t => t.status_color === 'red' || t.status_color === 'orange');
    const otherTasks = tasks.filter(t => t.status_color !== 'red' && t.status_color !== 'orange');

    return (
        <div className="h-full flex flex-col bg-gray-50/30 dark:bg-background">
            {/* HEADER COMPACT */}
            <div className="px-6 py-4 border-b bg-background flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        Dashboard của {user?.HODEM_VA_TEN?.split(' ').pop()}
                    </h1>
                    <p className="text-xs text-muted-foreground">Cập nhật mới nhất: {format(new Date(), 'HH:mm dd/MM/yyyy')}</p>
                </div>
                <div className="flex gap-2">
                     <Button size="sm" variant="outline" onClick={() => navigate('/notifications')} className="h-8">
                        <MessageSquare className="w-4 h-4 mr-2" /> Thông báo ({stats.new_feedback})
                    </Button>
                    <Button size="sm" onClick={() => navigate('/projects/find-group')} className="h-8 shadow-sm">
                        <Users className="w-4 h-4 mr-2" /> Tìm nhóm
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-4 md:p-6">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 h-full">
                    
                    {/* LEFT COLUMN: STATS & GROUPS (7/12) */}
                    <div className="xl:col-span-7 flex flex-col gap-4 h-full overflow-hidden">
                        {/* 1. Quick Stats Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                            <MiniStat 
                                icon={Target} label="Cần làm ngay" value={stats.pending_tasks} 
                                colorClass={{ bg: "bg-blue-100", text: "text-blue-600" }} 
                            />
                            <MiniStat 
                                icon={Calendar} label="Họp hôm nay" value={stats.meetings_today} 
                                colorClass={{ bg: "bg-green-100", text: "text-green-600" }} 
                            />
                            <MiniStat 
                                icon={Activity} label="Tiến độ chung" value={`${stats.avg_progress}%`} 
                                colorClass={{ bg: "bg-orange-100", text: "text-orange-600" }} 
                            />
                             <MiniStat 
                                icon={Briefcase} label="Số nhóm" value={groups.length} 
                                colorClass={{ bg: "bg-purple-100", text: "text-purple-600" }} 
                            />
                        </div>

                        {/* 2. Active Groups */}
                        <Card className="flex-1 flex flex-col min-h-0 shadow-sm border-indigo-100 dark:border-indigo-900">
                            <CardHeader className="py-3 px-4 border-b min-h-[50px]">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <Users className="w-4 h-4 text-indigo-600" /> Nhóm hoạt động
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/projects/my-group')}>
                                        Quản lý
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-hidden">
                                <ScrollArea className="h-full">
                                    <div className="p-4 space-y-3">
                                        {groups.length > 0 ? (
                                            groups.map(group => (
                                                <CompactGroupItem 
                                                    key={group.id} 
                                                    group={group} 
                                                    onClick={() => navigate(`/student/dashboard/${group.plan_id}`)} 
                                                />
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground text-sm">
                                                Bạn chưa tham gia nhóm nào.
                                                <br/>
                                                <Button variant="link" size="sm" onClick={() => navigate('/projects/my-plans')}>Đăng ký tham gia</Button>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN: TASKS & PRIORITY (5/12) */}
                    <div className="xl:col-span-5 flex flex-col h-full overflow-hidden gap-4">
                        
                        {/* Urgent Tasks */}
                        <Card className="flex flex-col max-h-[50%] shadow-sm border-red-100 dark:border-red-900/50">
                            <CardHeader className="py-3 px-4 border-b bg-red-50/30 dark:bg-red-900/10">
                                <CardTitle className="text-base font-bold flex items-center gap-2 text-red-700 dark:text-red-400">
                                    <AlertCircle className="w-4 h-4" /> Cần xử lý gấp
                                    <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px]">{urgentTasks.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-hidden flex-1">
                                <ScrollArea className="h-full">
                                    <div className="p-3 space-y-2">
                                        {urgentTasks.length > 0 ? urgentTasks.map(task => (
                                            <UrgentTaskRow 
                                                key={task.id} 
                                                task={task} 
                                                onClick={() => navigate(`/projects/my-group/kanban/${task.plan_id}?taskId=${task.id}`)}
                                            />
                                        )) : (
                                            <div className="py-6 text-center text-xs text-muted-foreground">Tuyệt vời! Không có việc gấp.</div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Other Tasks */}
                        <Card className="flex-1 flex flex-col min-h-0 shadow-sm">
                            <CardHeader className="py-3 px-4 border-b">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <CheckSquare className="w-4 h-4 text-blue-600" /> Công việc khác
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-hidden flex-1">
                                <ScrollArea className="h-full">
                                    <div className="p-3 space-y-2">
                                        {otherTasks.map(task => (
                                            <div 
                                                key={task.id} 
                                                onClick={() => navigate(`/projects/my-group/kanban/${task.plan_id}?taskId=${task.id}`)}
                                                className="flex justify-between items-center p-2.5 hover:bg-muted rounded cursor-pointer text-sm group border border-transparent hover:border-border"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-blue-500" />
                                                    <span className="truncate font-medium">{task.title}</span>
                                                </div>
                                                <span className="text-xs text-muted-foreground shrink-0">
                                                    {task.deadline ? format(parseISO(task.deadline), 'dd/MM') : '-'}
                                                </span>
                                            </div>
                                        ))}
                                        {otherTasks.length === 0 && (
                                            <div className="py-8 text-center text-xs text-muted-foreground">Không có công việc nào khác.</div>
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