import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getStudentDashboardOverview } from '@/api/studentDashboardService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Target, Calendar, MessageSquare, Activity, 
    Users, User, ArrowRight, Clock, CheckSquare 
} from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// --- COMPONENT: TOP STAT CARD (Giống ảnh 1) ---
const DashboardStatCard = ({ icon: Icon, label, value, subLabel, colorClass, alert }) => (
    <Card className="relative overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-6">
            <div className="flex justify-between items-start">
                <div className={cn("p-3 rounded-xl", colorClass)}>
                    <Icon className="w-6 h-6" />
                </div>
                {alert && (
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
            </div>
            <div className="mt-4">
                <h3 className="text-2xl font-bold">{value}</h3>
                <p className="text-sm text-muted-foreground font-medium mt-1">{label}</p>
                {subLabel && <p className="text-xs text-gray-400 mt-2">{subLabel}</p>}
            </div>
        </CardContent>
    </Card>
);

// --- COMPONENT: TASK ITEM (Giống ảnh 1 - Danh sách bên phải) ---
const TaskItem = ({ task, onClick }) => {
    const deadline = task.deadline ? parseISO(task.deadline) : null;
    
    let timeText = "Không thời hạn";
    let timeColor = "text-gray-500";

    if (deadline) {
        if (task.status_color === 'red') { // Quá hạn
            timeText = `Quá hạn ${format(deadline, 'dd/MM')}`;
            timeColor = "text-red-600 font-semibold";
        } else if (task.status_color === 'orange') { // Hôm nay
            timeText = "Hôm nay";
            timeColor = "text-orange-600 font-semibold";
        } else {
            timeText = `Còn ${Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))} ngày`;
            timeColor = "text-gray-500";
        }
    }

    const priorityColors = {
        'Cao': 'bg-red-100 text-red-700 border-red-200',
        'Trung bình': 'bg-orange-100 text-orange-700 border-orange-200',
        'Thấp': 'bg-blue-100 text-blue-700 border-blue-200',
    };

    return (
        <div 
            onClick={onClick}
            className="group flex items-center justify-between p-4 rounded-xl border bg-white hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
        >
            <div className="flex items-start gap-3 overflow-hidden">
                <div className={`mt-1 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 
                    ${task.status_color === 'red' ? 'border-red-400' : 'border-gray-300 group-hover:border-blue-500'}`}
                >
                    {/* Checkbox giả */}
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                        {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className={cn("flex items-center gap-1", timeColor)}>
                            <Clock className="w-3 h-3" /> {timeText}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-500 truncate max-w-[150px]">{task.group_name}</span>
                    </div>
                </div>
            </div>
            <Badge variant="outline" className={cn("ml-2 shrink-0", priorityColors[task.priority] || priorityColors['Thấp'])}>
                {task.priority || 'Thấp'}
            </Badge>
        </div>
    );
};

export default function OverviewDashboard() {
    const navigate = useNavigate();
    const { data, isLoading } = useQuery({
        queryKey: ['studentDashboardOverview'],
        queryFn: getStudentDashboardOverview,
    });

    if (isLoading) {
        return (
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div className="grid grid-cols-4 gap-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
                <div className="grid grid-cols-3 gap-6"><Skeleton className="h-96" /><Skeleton className="h-96 col-span-2" /></div>
            </div>
        );
    }

    const { stats, tasks, groups } = data;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen bg-gray-50/50 dark:bg-background">
            
            {/* 1. Top Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardStatCard 
                    icon={Target} 
                    label="Công việc cần làm" 
                    value={stats.pending_tasks} 
                    subLabel={`${tasks.length} task hiển thị bên dưới`}
                    colorClass="bg-blue-100 text-blue-600"
                    alert={stats.pending_tasks > 0}
                />
                <DashboardStatCard 
                    icon={Calendar} 
                    label="Cuộc họp hôm nay" 
                    value={stats.meetings_today} 
                    subLabel="Kiểm tra lịch chi tiết"
                    colorClass="bg-green-100 text-green-600"
                />
                <DashboardStatCard 
                    icon={MessageSquare} 
                    label="Thông báo mới" 
                    value={stats.new_feedback} 
                    subLabel="Feedback & Hệ thống"
                    colorClass="bg-purple-100 text-purple-600"
                    alert={stats.new_feedback > 0}
                />
                <DashboardStatCard 
                    icon={Activity} 
                    label="Tiến độ hoàn thành" 
                    value={`${stats.avg_progress}%`} 
                    subLabel="Trung bình tất cả nhóm"
                    colorClass="bg-orange-100 text-orange-600"
                />
            </div>

            {/* 2. Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* LEFT COLUMN: MY GROUPS (Context Switcher) */}
                <div className="lg:col-span-1 space-y-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Users className="w-5 h-5" /> Nhóm của tôi
                    </h2>
                    
                    <div className="space-y-4">
                        {groups.map(group => (
                            <Card key={group.id} className="hover:shadow-md transition-shadow border-l-4 border-l-indigo-500">
                                <CardContent className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="p-2 bg-gray-100 rounded-lg">
                                            <Users className="w-6 h-6 text-gray-600" />
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            {group.members_count} thành viên
                                        </Badge>
                                    </div>
                                    
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">
                                        {group.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mb-4 uppercase font-semibold tracking-wider">
                                        {group.plan_name}
                                    </p>

                                    <div className="space-y-2 text-sm mb-6">
                                        <div className="flex gap-2">
                                            <span className="text-gray-500 w-16 shrink-0">Đề tài:</span>
                                            <span className="font-medium truncate">{group.topic_name}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-gray-500 w-16 shrink-0">GVHD:</span>
                                            <span className="font-medium">{group.supervisor_name}</span>
                                        </div>
                                    </div>

                                    <Button 
                                        className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                                        onClick={() => navigate(`/student/dashboard/${group.plan_id}`)}
                                    >
                                        Quản lý nhóm
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}

                        {groups.length === 0 && (
                            <div className="p-8 text-center border-2 border-dashed rounded-xl bg-gray-50 dark:bg-gray-900/50">
                                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 font-medium">Bạn chưa tham gia nhóm nào.</p>
                                <Button variant="link" className="text-blue-600 mt-2" onClick={() => navigate('/projects/my-plans')}>
                                    Đăng ký tham gia ngay
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: TASKS (Actionable Items) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <CheckSquare className="w-5 h-5" /> Công việc cần làm
                        </h2>
                        <Badge variant="outline" className="px-3 py-1">{tasks.length} công việc</Badge>
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border p-1 space-y-1 min-h-[400px]">
                        {tasks.length > 0 ? (
                            tasks.map(task => (
                                <TaskItem 
                                    key={task.id} 
                                    task={task} 
                                    onClick={() => navigate(`/projects/my-group/kanban/${task.plan_id}?taskId=${task.id}`)}
                                />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                                <CheckSquare className="w-16 h-16 mb-4 opacity-20" />
                                <p>Tuyệt vời! Bạn không có công việc nào tồn đọng.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}