import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getAdminDashboardStats, getAdminReminders } from '@/api/adminService';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- SHADCN/UI CHART & RECHARTS ---
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

// Icons
import { 
    AlertTriangle, Clock, ArrowRight, 
    BellRing, FileText, Zap, ShieldAlert,
    PieChart, GraduationCap, UserX, AlertOctagon,
    Settings, FolderPlus, CheckSquare, Activity,
    CheckCircle, RefreshCw, BarChart3, ChevronRight
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { format, parseISO, formatDistanceToNow, isPast, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';

// --- HELPER: Rút gọn tên bộ môn ---
const getAbbreviation = (name) => {
    if (!name) return '';
    const map = {
        'Kỹ thuật phần mềm': 'KTPM',
        'Hệ thống thông tin': 'HTTT',
        'Khoa học máy tính': 'KHMT',
        'Mạng máy tính và truyền thông': 'MMT&TT',
        'Mạng máy tính và An ninh thông tin': 'MMT&ATTT',
        'An toàn thông tin': 'ATTT',
        'Thương mại điện tử': 'TMĐT',
        'Khoa học dữ liệu': 'KHDL',
        'Trí tuệ nhân tạo': 'TTNT',
        'Công nghệ kỹ thuật máy tính': 'CNKTMT',
        'Công nghệ thông tin': 'CNTT',
        'Công nghệ phần mềm': 'CNPM',
    };
    return map[name] || name.split(' ').map(w => w[0].toUpperCase()).join('');
};

// --- CHART CONFIG (Màu sắc Shadcn) ---
const chartConfig = {
    da_giao: { label: "Đã giao (Có nhóm)", color: "#10b981" }, // Emerald-500
    con_lai: { label: "Còn trống", color: "#3b82f6" }, // Blue-500
};

// --- 1. COMPONENT: ACTIVE PLAN ITEM ---
const ActivePlanItem = ({ plan, className }) => {
    const navigate = useNavigate();
    
    const deadline = plan.phase_deadline ? parseISO(plan.phase_deadline) : null;
    const startDate = plan.phase_start ? parseISO(plan.phase_start) : null;
    const isEnded = deadline && isValid(deadline) ? isPast(deadline) : false;

    // Xử lý dữ liệu cho Stacked Chart
    const rawDeptData = plan.department_stats || [];
    const deptData = rawDeptData.map(item => {
        const daTao = Number(item.da_tao);
        const daGiao = Number(item.da_giao);
        return {
            ...item,
            shortName: getAbbreviation(item.name),
            con_lai: Math.max(0, daTao - daGiao), 
            da_giao: daGiao,
            total: daTao 
        };
    });

    return (
        <div className={cn(
            "relative flex flex-col justify-between p-5 flex-1 group transition-all hover:bg-white/10 min-w-[320px]",
            className
        )}>
            {/* Header: Status & Time */}
            <div className="flex items-center justify-between mb-3">
                <Badge className={cn(
                    "text-white border-none font-medium px-2 text-[10px] h-5 backdrop-blur-sm",
                    plan.status === 'Đang thực hiện' ? "bg-emerald-500/20 text-emerald-100" : "bg-white/20"
                )}>
                    {plan.status}
                </Badge>
                {deadline && isValid(deadline) && (
                    <span className={cn(
                        "text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full h-5",
                         isEnded ? "bg-red-500/20 text-red-100" : "bg-black/20 text-blue-100"
                    )}>
                        <Clock className="w-3 h-3" /> 
                        {formatDistanceToNow(deadline, { locale: vi, addSuffix: true })}
                    </span>
                )}
            </div>

            {/* Plan Name */}
            <div className="mb-4">
                <h2 
                    className="text-lg font-bold text-white leading-tight mb-3 tracking-tight line-clamp-2 hover:underline cursor-pointer" 
                    title={plan.name}
                    onClick={() => navigate(`/admin/thesis-plans/${plan.id}/edit`)}
                >
                    {plan.name}
                </h2>
                
                {/* --- [RESTORED] POPOVER THÔNG TIN GIAI ĐOẠN --- */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-left w-full group/btn">
                            <Activity className="w-4 h-4 text-blue-200 shrink-0 group-hover/btn:text-white" />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-blue-200/70 uppercase font-semibold">Giai đoạn hiện tại</span>
                                <span className="text-xs font-medium text-white truncate">
                                    {plan.current_phase}
                                </span>
                            </div>
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4 bg-background/95 backdrop-blur-md border-blue-200 shadow-xl" align="start">
                        <div className="space-y-3">
                            <h4 className="font-bold text-blue-600 dark:text-blue-400 text-base">{plan.current_phase}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-blue-200 pl-2">
                                {plan.phase_desc || "Không có mô tả chi tiết."}
                            </p>
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t mt-2">
                                <div>
                                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Bắt đầu</p>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                                        {startDate && isValid(startDate) ? format(startDate, "dd/MM/yyyy") : "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Kết thúc</p>
                                    <p className={cn("text-xs font-medium", isEnded ? "text-red-600" : "text-green-600")}>
                                        {deadline && isValid(deadline) ? format(deadline, "dd/MM/yyyy") : "N/A"}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-2 flex items-center justify-between border-t border-dashed border-gray-200 dark:border-gray-700">
                                <span className="text-[10px] uppercase text-muted-foreground font-bold">Đối tượng:</span>
                                <Badge variant="secondary" className="text-[10px] h-5">{plan.phase_actors || "Tất cả"}</Badge>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Footer Metrics */}
            <div className="grid grid-cols-2 gap-4 mt-auto pt-3 border-t border-white/10">
                {/* Metric: Nhóm */}
                <div 
                    className="cursor-pointer hover:bg-white/10 p-1 rounded transition-colors"
                    onClick={() => navigate('/admin/groups')}
                >
                    <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-2xl font-bold text-white leading-none">{plan.groups_registered || 0}</span>
                        <span className="text-[10px] text-blue-200 font-medium opacity-60">/ {plan.groups_total || 0}</span>
                    </div>
                    <p className="text-[10px] uppercase text-blue-200 font-bold tracking-widest opacity-70">Nhóm ĐK</p>
                </div>

                {/* Metric: Đề tài (Kèm POPOVER BIỂU ĐỒ) */}
                <Popover>
                    <PopoverTrigger asChild>
                        <div className="cursor-pointer hover:bg-white/10 p-1 rounded transition-colors relative group/chart">
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-2xl font-bold text-white leading-none">{plan.topics_current || 0}</span>
                                <span className="text-[10px] text-blue-200 font-medium opacity-60">/ {plan.topics_target || 0}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] uppercase text-blue-200 font-bold tracking-widest opacity-70">
                                Đề tài <BarChart3 className="w-3 h-3 group-hover/chart:text-white transition-colors" />
                            </div>
                        </div>
                    </PopoverTrigger>
                    
                    <PopoverContent className="w-[400px] p-0 bg-background border-border shadow-xl overflow-hidden" align="end" side="top">
                        <div className="bg-muted/40 p-3 border-b flex justify-between items-center">
                            <h4 className="text-xs font-bold text-foreground uppercase flex items-center gap-2">
                                <PieChart className="w-3 h-3 text-primary" /> 
                                Phân bổ Đề tài
                            </h4>
                        </div>

                        {deptData.length > 0 ? (
                            <div className="p-4 bg-white dark:bg-zinc-950/50">
                                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                                    <BarChart 
                                        accessibilityLayer
                                        data={deptData} 
                                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                        barGap={0}
                                    >
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis 
                                            dataKey="shortName"
                                            tickLine={false}
                                            tickMargin={10}
                                            axisLine={false}
                                            interval={0} // Hiển thị tất cả nhãn
                                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                                        />
                                        <YAxis 
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fontSize: 10, fill: '#64748b' }}
                                            allowDecimals={false}
                                        />
                                        <ChartTooltip 
                                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                            content={
                                                <ChartTooltipContent 
                                                    labelKey="name"
                                                    indicator="dot" 
                                                />
                                            }
                                        />
                                        <ChartLegend content={<ChartLegendContent />} className="mt-2 text-[10px]" />
                                        
                                        {/* Stacked Bars */}
                                        <Bar 
                                            dataKey="da_giao" 
                                            stackId="a" 
                                            fill="var(--color-da_giao)" 
                                            radius={[0, 0, 4, 4]} 
                                            barSize={24} 
                                        />
                                        <Bar 
                                            dataKey="con_lai" 
                                            stackId="a" 
                                            fill="var(--color-con_lai)" 
                                            radius={[4, 4, 0, 0]} 
                                            barSize={24} 
                                        />
                                    </BarChart>
                                </ChartContainer>
                            </div>
                        ) : (
                            <div className="h-[150px] flex items-center justify-center text-xs text-muted-foreground">
                                Không có dữ liệu thống kê.
                            </div>
                        )}

                        <div className="p-2 border-t bg-muted/30 text-center">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-[10px] w-full hover:bg-primary/10 hover:text-primary"
                                onClick={() => navigate(`/admin/thesis-topics?plan_id=${plan.id}`)}
                            >
                                Quản lý chi tiết <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
};

// --- 2. COMPONENT: REMINDER ITEM (Hiển thị thẻ việc cần làm) ---
const ReminderItem = ({ item }) => {
    const navigate = useNavigate();
    const styleConfig = {
        critical: { 
            icon: AlertTriangle, 
            color: "text-red-600 dark:text-red-400", 
            bg: "bg-red-50 hover:bg-red-100 border-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:border-red-800",
            badge: "bg-red-200 text-red-700 dark:bg-red-900 dark:text-red-300"
        },
        urgent: { 
            icon: Zap, 
            color: "text-orange-600 dark:text-orange-400", 
            bg: "bg-orange-50 hover:bg-orange-100 border-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 dark:border-orange-800",
            badge: "bg-orange-200 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
        },
        warning: { 
            icon: Clock, 
            color: "text-amber-600 dark:text-amber-400", 
            bg: "bg-amber-50 hover:bg-amber-100 border-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:border-amber-800",
            badge: "bg-amber-200 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
        }
    };
    const config = styleConfig[item.type] || styleConfig.warning;
    const Icon = config.icon;

    return (
        <div 
            className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer group relative",
                config.bg
            )} 
            onClick={() => navigate(item.link)}
        >
            <div className="mt-0.5 shrink-0">
                <Icon className={cn("w-5 h-5", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <h4 className={cn("text-sm font-bold pr-2", config.color)}>{item.title}</h4>
                    {item.count > 0 && (
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", config.badge)}>
                            {item.count}
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.message}</p>
                <div className="mt-2 flex justify-end">
                    <span className={cn(
                        "text-[11px] font-semibold flex items-center opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300",
                        config.color
                    )}>
                        {item.action_label} <ChevronRight className="w-3 h-3 ml-1" />
                    </span>
                </div>
            </div>
        </div>
    );
};

// --- 3. COMPONENT: RISK METRIC ---
const RiskMetric = ({ label, value, icon: Icon, colorClass, onClick }) => (
    <div 
        onClick={onClick}
        className="flex items-center justify-between p-4 bg-card border rounded-xl hover:bg-accent/50 cursor-pointer group transition-all hover:shadow-md"
    >
        <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-lg bg-opacity-15", colorClass)}>
                <Icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
        </div>
        <span className={cn("text-2xl font-bold tracking-tight", value > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>{value}</span>
    </div>
);

// --- 4. COMPONENT: WORKFLOW ITEM ---
const WorkflowItem = ({ label, percentage, icon: Icon, colorClass, onClick, statusText }) => (
    <div 
        onClick={onClick}
        className={cn(
            "flex flex-col p-4 bg-card border rounded-xl cursor-pointer transition-all hover:border-primary/50 hover:shadow-md group relative overflow-hidden h-full justify-between",
            colorClass.border
        )}
    >
        <div className="flex items-start justify-between mb-3">
            <div className={cn("p-2 rounded-lg bg-opacity-15", colorClass.bg, colorClass.text)}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex flex-col items-end">
                <span className={cn("text-2xl font-bold tracking-tight", colorClass.text)}>{percentage}%</span>
            </div>
        </div>

        <div>
            <p className="text-sm font-bold text-foreground uppercase tracking-tight mb-2 group-hover:text-primary transition-colors">
                {label}
            </p>
            <Progress value={percentage} className="h-1.5 bg-gray-100 dark:bg-gray-800 mb-2" indicatorClassName={colorClass.indicator} />
            <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground font-medium truncate max-w-[140px]" title={statusText}>
                    {statusText}
                </p>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </div>
        </div>
    </div>
);

export default function AdminDashboard() {
    const navigate = useNavigate();

    const { data: reminderData, isLoading: remindersLoading, refetch: refetchReminders } = useQuery({
        queryKey: ['adminReminders'],
        queryFn: getAdminReminders,
        refetchInterval: 60000 // Refresh mỗi phút
    });

    const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
        queryKey: ['adminDashboardStats'],
        queryFn: getAdminDashboardStats,
        refetchInterval: 300000 // Refresh mỗi 5 phút
    });

    const handleRefresh = () => {
        refetchReminders();
        refetchStats();
    };

    const reminders = reminderData?.reminders || [];
    const data = statsData || {};
    const workflow = data.workflow || {};
    const activePlans = data.active_plans || [];
    const risks = data.risks || {};
    const actions = data.actions || {};

    if (remindersLoading || statsLoading) {
        return <div className="p-8"><Skeleton className="h-screen w-full rounded-xl" /></div>;
    }

    return (
        <div className="p-4 md:p-8 max-w-[1800px] mx-auto h-full overflow-y-auto bg-gray-50/30 dark:bg-background">
            
            {/* 1. HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b pb-4 mb-8 gap-4">
                <div>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        Hệ thống quản lý khóa luận tốt nghiệp
                        <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                        {format(new Date(), "EEEE, dd 'tháng' MM, yyyy", { locale: vi })}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-muted-foreground hover:text-primary">
                        <RefreshCw className="w-4 h-4 mr-2" /> Làm mới
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/admin/settings/general')}>
                        <Settings className="w-4 h-4 mr-2" /> Cấu hình
                    </Button>
                    <Button onClick={() => navigate('/admin/thesis-plans/create')} size="sm" className="shadow-lg shadow-primary/20">
                        <FolderPlus className="w-4 h-4 mr-2" /> Kế hoạch mới
                    </Button>
                </div>
            </div>

            {/* 2. ACTIVE PLANS SECTION */}
            <div className="mb-8">
                {activePlans.length > 0 ? (
                    <div className="flex flex-col lg:flex-row w-full bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-900 dark:to-indigo-900 rounded-2xl overflow-hidden shadow-xl divide-y lg:divide-y-0 lg:divide-x divide-white/10 relative min-h-[220px]">
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
                        
                        {activePlans.map((planItem) => (
                            <ActivePlanItem key={planItem.id} plan={planItem} />
                        ))}
                    </div>
                ) : (
                    <div className="p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-card min-h-[200px] hover:bg-accent/20 transition-colors">
                        <FolderPlus className="w-10 h-10 text-gray-300 mb-3" />
                        <p className="font-medium text-lg">Hiện không có kế hoạch nào đang chạy.</p>
                        <Button onClick={() => navigate('/admin/thesis-plans/create')} className="mt-4">Tạo kế hoạch ngay</Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* --- 3. CỘT TRÁI (8/12) --- */}
                <div className="xl:col-span-8 space-y-8">
                    {/* A. VIỆC CẦN XỬ LÝ (REMINDERS) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2 tracking-wider">
                                <BellRing className="w-4 h-4 text-orange-500" /> Việc cần xử lý ngay
                                {reminders.length > 0 && <Badge variant="destructive" className="ml-1 rounded-full px-2">{reminders.length}</Badge>}
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {reminders.length > 0 ? (
                                <ScrollArea className="h-[260px] pr-4">
                                    <div className="space-y-3">
                                        {reminders.map((item) => (
                                            <ReminderItem key={item.id} item={item} />
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-center p-6 border rounded-xl bg-card/50">
                                    <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full mb-3 animate-bounce">
                                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-foreground">Tuyệt vời!</h3>
                                    <p className="text-xs text-muted-foreground">Bạn đã xử lý hết các công việc tồn đọng quan trọng.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* B. TIẾN ĐỘ QUY TRÌNH */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2 tracking-wider">
                            <Zap className="w-4 h-4 text-blue-500" /> Tiến độ Tổng hợp (Tất cả KH)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <WorkflowItem 
                                label="1. Phân bổ Quota" 
                                percentage={workflow.quota_percent || 0} 
                                statusText={workflow.quota_missing > 0 ? `Thiếu ${workflow.quota_missing} khoa` : "Hoàn tất"}
                                icon={PieChart} 
                                colorClass={{ bg: "bg-indigo-100 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-400", indicator: "bg-indigo-600", border: "border-indigo-200 dark:border-indigo-800" }}
                                onClick={() => navigate('/admin/quota-management')}
                            />
                            <WorkflowItem 
                                label="2. Duyệt Đề tài" 
                                percentage={workflow.topic_percent || 0} 
                                statusText={`${actions.pending_topics || 0} chờ duyệt`}
                                icon={FileText} 
                                colorClass={{ bg: "bg-blue-100 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400", indicator: "bg-blue-600", border: "border-blue-200 dark:border-blue-800" }}
                                onClick={() => navigate('/admin/thesis-topics?status=Chờ duyệt')}
                            />
                            <WorkflowItem 
                                label="3. Phân bổ Hội đồng" 
                                percentage={workflow.council_percent || 0} 
                                statusText={workflow.groups_missing_council > 0 ? `${workflow.groups_missing_council} nhóm thiếu` : "Đủ HĐ"}
                                icon={GraduationCap} 
                                colorClass={{ bg: "bg-purple-100 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400", indicator: "bg-purple-600", border: "border-purple-200 dark:border-purple-800" }}
                                onClick={() => navigate('/admin/hoidong')}
                            />
                            <WorkflowItem 
                                label="4. Chấm điểm" 
                                percentage={workflow.grading_percent || 0} 
                                statusText="Tiến độ nhập điểm"
                                icon={CheckSquare} 
                                colorClass={{ bg: "bg-orange-100 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400", indicator: "bg-orange-600", border: "border-orange-200 dark:border-orange-800" }}
                                onClick={() => navigate('/admin/cham-diem')}
                            />
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-4 space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                             <Activity className="w-3 h-3" /> Theo dõi Rủi ro
                        </h3>
                        <div className="grid gap-3">
                            <RiskMetric 
                                label="SV chưa có nhóm" 
                                value={risks.students_no_group || 0} 
                                icon={UserX} 
                                colorClass="text-red-600 bg-red-100 dark:bg-red-900/30"
                                onClick={() => navigate('/admin/groups/ungrouped-students')} 
                            />
                            
                            <RiskMetric 
                                label="Bộ môn chưa xong Quota" 
                                value={risks.departments_missing_quota || 0} 
                                icon={AlertOctagon} 
                                colorClass="text-orange-600 bg-orange-100 dark:bg-orange-900/30"
                                onClick={() => navigate('/admin/quota-management')}
                            />

                            <RiskMetric 
                                label="Nhóm thiếu Hội đồng" 
                                value={risks.groups_no_council || 0} 
                                icon={GraduationCap} 
                                colorClass="text-purple-600 bg-purple-100 dark:bg-purple-900/30"
                                onClick={() => navigate('/admin/hoidong')}
                            />
                        </div>
                    </div>

                    {/* B. LỐI TẮT QUẢN LÝ */}
                    <Card className="shadow-sm border-l-4 border-l-blue-500">
                        <CardHeader className="py-3 px-4 border-b bg-muted/30">
                            <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <Settings className="w-3 h-3" /> Truy cập nhanh
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 grid gap-1">
                            <Button variant="ghost" className="w-full justify-start text-sm h-10 font-normal hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20" onClick={() => navigate('/admin/thesis-topics')}>
                                <FileText className="w-4 h-4 mr-3 text-blue-500" /> Duyệt Đề tài
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-sm h-10 font-normal hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20" onClick={() => navigate('/admin/submissions')}>
                                <CheckSquare className="w-4 h-4 mr-3 text-green-500" /> Duyệt Nộp bài
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-sm h-10 font-normal hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20" onClick={() => navigate('/admin/quota-management')}>
                                <PieChart className="w-4 h-4 mr-3 text-indigo-500" /> Phân bổ Quota
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-sm h-10 font-normal hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20" onClick={() => navigate('/admin/system-logs')}>
                                <Activity className="w-4 h-4 mr-3 text-orange-500" /> Nhật ký hệ thống
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}