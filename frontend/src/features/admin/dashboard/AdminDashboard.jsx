import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getAdminDashboardStats } from '@/api/adminService';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

// Icons
import { 
    Users, Layers, FileText, AlertCircle, 
    CheckCircle as CheckCircleIcon, ArrowRight, Settings, 
    GraduationCap, FileClock, FolderPlus,
    ShieldAlert, Zap, PieChart, 
    AlertTriangle, CheckSquare, Activity
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// --- COMPONENT: ACTIVE PLAN ITEM (Một ô trong thanh xanh) ---
const ActivePlanItem = ({ plan, isLast }) => {
    const deadline = plan.phase_deadline ? parseISO(plan.phase_deadline) : null;

    return (
        <div className={cn(
            "flex flex-col justify-between h-full p-6", 
            !isLast && "border-r border-white/20"
        )}>
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-none">
                        {plan.status}
                    </Badge>
                    {deadline && (
                        <span className="text-xs text-blue-100 flex items-center gap-1">
                            <ClockIcon className="w-3 h-3 text-blue-100" /> 
                            {formatDistanceToNow(deadline, { locale: vi, addSuffix: true })}
                        </span>
                    )}
                </div>
                <h2 className="text-xl font-bold text-white leading-tight mb-1">{plan.name}</h2>
                <p className="text-sm text-blue-100 font-medium flex items-center gap-1">
                    <ActivityIcon className="w-4 h-4 inline mr-1"/>
                    {plan.current_phase}
                </p>
            </div>

            <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
                <div>
                    <p className="text-3xl font-bold text-white">{plan.groups_count}</p>
                    <p className="text-xs text-blue-200 uppercase">Nhóm</p>
                </div>
                <div>
                    <p className="text-3xl font-bold text-white">{plan.topics_count}</p>
                    <p className="text-xs text-blue-200 uppercase">Đề tài</p>
                </div>
            </div>
        </div>
    );
};

// --- HELPER ICONS (Tách ra để dùng trong JSX) ---
const ClockIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const ActivityIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
);


// --- COMPONENT: WORKFLOW ITEM ---
const WorkflowItem = ({ label, percentage, icon: Icon, colorClass, onClick, statusText }) => (
    <div 
        onClick={onClick}
        className={cn(
            "flex items-center gap-4 p-4 bg-card border rounded-xl cursor-pointer transition-all hover:border-primary/50 group",
            colorClass.border
        )}
    >
        <div className={cn("p-3 rounded-full shrink-0", colorClass.bg, colorClass.text)}>
            <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between mb-1">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <span className="text-xs font-bold text-muted-foreground">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" indicatorClassName={colorClass.indicator} />
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium truncate">{statusText}</p>
        </div>
        <ChevronRightIcon className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
);

const ChevronRightIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>
);

// --- COMPONENT: ACTION CARD ---
const ActionCard = ({ title, count, icon: Icon, colorClass, onClick, description }) => {
    if (count <= 0) return null;

    return (
        <div 
            onClick={onClick}
            className={cn(
                "flex items-center justify-between p-5 rounded-xl border cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1",
                colorClass.bg, colorClass.border
            )}
        >
            <div className="flex items-center gap-5">
                <div className={cn("p-3 rounded-full bg-white shadow-sm", colorClass.text)}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-bold text-xl">{count} {title}</h4>
                    <p className="text-sm text-muted-foreground font-medium">{description}</p>
                </div>
            </div>
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center bg-white/60", colorClass.text)}>
                <ArrowRight className="w-5 h-5" />
            </div>
        </div>
    );
};

// --- COMPONENT: URGENT ALERT ---
const UrgentAlert = ({ title, description, actionText, onAction, variant = "default" }) => {
    const bgClass = variant === 'danger' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-orange-50 border-orange-200 text-orange-900';
    const iconClass = variant === 'danger' ? 'text-red-600' : 'text-orange-600';

    return (
        <div className={cn("flex items-start gap-3 p-3 rounded-lg border text-sm", bgClass)}>
            <AlertTriangle className={cn("w-5 h-5 shrink-0 mt-0.5", iconClass)} />
            <div className="flex-1">
                <p className="font-bold">{title}</p>
                <p className="opacity-90 text-xs mt-0.5">{description}</p>
                <button 
                    onClick={onAction}
                    className="text-xs font-bold underline mt-2 hover:opacity-80"
                >
                    {actionText}
                </button>
            </div>
        </div>
    );
};

// --- COMPONENT: COMPACT METRIC ---
const CompactMetric = ({ label, value, icon: Icon, onClick }) => (
    <div 
        onClick={onClick}
        className="flex flex-col p-4 bg-card border rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
    >
        <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
            <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-2xl font-bold text-foreground">{value}</span>
    </div>
);

export default function AdminDashboard() {
    const navigate = useNavigate();

    const { data: rawData, isLoading } = useQuery({
        queryKey: ['adminDashboardStats'],
        queryFn: getAdminDashboardStats,
        refetchInterval: 60000,
    });

    // [QUAN TRỌNG] Destructuring an toàn để tránh ReferenceError
    const data = rawData || {};
    const planData = data.plan || {};
    const users = data.users || {};
    const actions = data.actions || {};
    const workflow = data.workflow || {};
    const activePlans = data.active_plans || []; 

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-48 w-full rounded-xl" />
                <div className="grid grid-cols-3 gap-6"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
            </div>
        );
    }

    const hasActions = actions.pending_topics > 0 || actions.pending_submissions > 0 || actions.groups_no_topic > 0 || actions.draft_plans > 0;

    // Tính toán grid column
    const gridColsClass = activePlans.length === 1 ? 'grid-cols-1' : 
                          activePlans.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 
                          'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';

    return (
        <div className="p-4 md:p-8 max-w-[1800px] mx-auto space-y-8 h-full bg-gray-50/30 dark:bg-background overflow-y-auto">
            
            {/* 1. HEADER COMPACT */}
            <div className="flex justify-between items-end border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                        <ShieldAlert className="w-6 h-6 text-primary" /> Trung tâm Điều hành
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Tổng quan hệ thống • {format(new Date(), "EEEE, dd/MM/yyyy", { locale: vi })}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate('/admin/settings/general')}>
                        <Settings className="w-4 h-4 mr-2" /> Cấu hình
                    </Button>
                    <Button onClick={() => navigate('/admin/thesis-plans/create')} className="shadow-md shadow-primary/20">
                        <FolderPlus className="w-4 h-4 mr-2" /> Kế hoạch mới
                    </Button>
                </div>
            </div>

            {/* 2. ACTIVE PLANS BAR (THANH XANH ĐA NĂNG) */}
            {activePlans.length > 0 ? (
                <Card className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white border-none shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-20 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

                    <CardContent className="p-0">
                        <div className={`grid ${gridColsClass} divide-y md:divide-y-0`}>
                            {activePlans.map((planItem, index) => (
                                <ActivePlanItem 
                                    key={planItem.id} 
                                    plan={planItem} 
                                    isLast={index === activePlans.length - 1} 
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-card">
                    <Layers className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="font-medium">Hiện không có kế hoạch nào đang chạy.</p>
                    <Button variant="link" onClick={() => navigate('/admin/thesis-plans/create')}>Bắt đầu một kế hoạch mới</Button>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* 3. CỘT TRÁI: WORKFLOW & CẢNH BÁO (ACTION CENTER) */}
                <div className="xl:col-span-2 space-y-6">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2 tracking-wider">
                        <Zap className="w-4 h-4 text-yellow-500" /> Tình trạng Quy trình & Cần xử lý ngay
                    </h3>
                    
                    {/* B. WORKFLOW PROGRESS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <WorkflowItem 
                            label="1. Phân bổ Quota" 
                            percentage={workflow.quota_percent} 
                            statusText={workflow.quota_missing > 0 ? `Còn ${workflow.quota_missing} bộ môn chưa phân công` : "Đã hoàn tất phân công"}
                            icon={PieChart} 
                            colorClass={{ bg: "bg-green-100", text: "text-green-600", indicator: "bg-green-600" }}
                            onClick={() => navigate('/admin/quota-management')}
                        />
                        <WorkflowItem 
                            label="2. Duyệt Đề tài" 
                            percentage={workflow.topic_percent} 
                            statusText={`${actions.pending_topics} đề tài đang chờ duyệt`}
                            icon={FileText} 
                            colorClass={{ bg: "bg-blue-100", text: "text-blue-600", indicator: "bg-blue-600" }}
                            onClick={() => navigate('/admin/thesis-topics')}
                        />
                        <WorkflowItem 
                            label="3. Phân bổ Hội đồng" 
                            percentage={workflow.council_percent} 
                            statusText={workflow.groups_missing_council > 0 ? `${workflow.groups_missing_council} nhóm thiếu HĐ` : "Ổn định"}
                            icon={GraduationCap} 
                            colorClass={{ bg: "bg-purple-100", text: "text-purple-600", indicator: "bg-purple-600" }}
                            onClick={() => navigate('/admin/hoidong/phanbo')}
                        />
                        <WorkflowItem 
                            label="4. Chấm điểm" 
                            percentage={workflow.grading_percent} 
                            statusText="Tiến độ nhập điểm tổng kết"
                            icon={CheckSquare} 
                            colorClass={{ bg: "bg-orange-100", text: "text-orange-600", indicator: "bg-orange-600" }}
                            onClick={() => navigate('/admin/cham-diem')}
                        />
                    </div>
                    
                    {/* C. PENDING ACTIONS */}
                    <div className="space-y-4 pt-4">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Cảnh báo hành động</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ActionCard 
                                title="Đề tài chờ duyệt" 
                                count={actions.pending_topics} 
                                description="Giảng viên đang đợi phê duyệt đề tài."
                                icon={CheckCircleIcon} 
                                colorClass={{ bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", text: "text-orange-600 dark:text-orange-400", textDark: "text-orange-900 dark:text-orange-100" }}
                                onClick={() => navigate('/admin/thesis-topics?status=Chờ duyệt')}
                            />
                            <ActionCard 
                                title="Bài nộp chờ xác nhận" 
                                count={actions.pending_submissions} 
                                description="Sinh viên đã nộp báo cáo."
                                icon={FileClock} 
                                colorClass={{ bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-600 dark:text-blue-400", textDark: "text-blue-900 dark:text-blue-100" }}
                                onClick={() => navigate('/admin/submissions')}
                            />
                        </div>
                    </div>
                </div>

                {/* 3. CỘT PHẢI: USER STATS & SHORTCUTS (STATIC DATA) */}
                <div className="space-y-6">
                    
                    {/* A. USER STATS (COMPACT) */}
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Dữ liệu hệ thống</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <CompactMetric label="Tổng User" value={users.total} icon={Users} onClick={() => navigate('/admin/users')} />
                        <CompactMetric label="Sinh viên" value={users.students} icon={GraduationCap} onClick={() => navigate('/admin/users?role=Sinh viên')} />
                        <CompactMetric label="Giảng viên" value={users.lecturers} icon={Users} onClick={() => navigate('/admin/users?role=Giảng viên')} />
                        <CompactMetric label="Kế hoạch" value={planData.total_active} icon={Layers} onClick={() => navigate('/admin/thesis-plans')} />
                    </div>

                    {/* B. QUẢN LÝ NHANH */}
                    <Card className="shadow-sm">
                        <CardHeader className="py-3 px-4 border-b bg-muted/30">
                            <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Lối tắt</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                            <Button variant="ghost" className="w-full justify-start text-sm h-9" onClick={() => navigate('/admin/hoidong')}>
                                <GraduationCap className="w-4 h-4 mr-2 text-indigo-600" /> Hội đồng bảo vệ
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-sm h-9" onClick={() => navigate('/admin/quota-management')}>
                                <Layers className="w-4 h-4 mr-2 text-green-600" /> Phân bổ Quota
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-sm h-9" onClick={() => navigate('/admin/system-logs')}>
                                <Activity className="w-4 h-4 mr-2 text-orange-600" /> Nhật ký hệ thống
                            </Button>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}