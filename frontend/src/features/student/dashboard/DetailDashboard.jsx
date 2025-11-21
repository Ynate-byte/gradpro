import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStudentDashboardDetail } from '@/api/studentDashboardService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
    ArrowLeft, Calendar, Users, BookOpen, 
    CheckCircle2, Clock, AlertTriangle, ArrowRight, 
    LayoutDashboard, ChevronRight, User, FileText, Mail, Phone
} from 'lucide-react';
import { format, isWithinInterval, parseISO, formatDistance } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// --- COMPONENT: COMPACT TIMELINE ---
const CompactTimeline = ({ milestones }) => {
    const now = new Date();
    return (
        <div className="relative space-y-0">
            <div className="absolute left-[7px] top-2 bottom-2 w-[1px] bg-border" />
            {milestones.map((moc) => {
                const start = parseISO(moc.NGAY_BATDAU);
                const end = parseISO(moc.NGAY_KETTHUC);
                const isActive = isWithinInterval(now, { start, end });
                const isPast = now > end;

                return (
                    <div key={moc.ID} className="relative pl-6 py-3 group">
                        <div className={cn(
                            "absolute left-0 top-4 w-3.5 h-3.5 rounded-full border-2 z-10 bg-background",
                            isActive ? "border-blue-600 ring-2 ring-blue-100" : 
                            isPast ? "border-green-500 bg-green-50" : "border-gray-300"
                        )}>
                            {isActive && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full m-0.5" />}
                        </div>
                        <div>
                            <p className={cn("text-xs font-bold leading-none mb-1", isActive ? "text-blue-700" : "text-foreground")}>
                                {moc.TEN_SUKIEN}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                                {format(end, 'dd/MM')}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- COMPONENT: INFO ROW ---
const InfoRow = ({ icon: Icon, label, value, subValue }) => (
    <div className="flex items-start gap-3 p-3 rounded-md hover:bg-accent/50 transition-colors">
        <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
        <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground font-medium uppercase">{label}</p>
            <p className="text-sm font-semibold truncate" title={value}>{value}</p>
            {subValue && <p className="text-xs text-gray-500">{subValue}</p>}
        </div>
    </div>
);

export default function DetailDashboard() {
    const { planId } = useParams();
    const navigate = useNavigate();
    const { data, isLoading } = useQuery({
        queryKey: ['studentDashboardDetail', planId],
        queryFn: () => getStudentDashboardDetail(planId),
        enabled: !!planId
    });

    if (isLoading) return <div className="p-6"><Skeleton className="h-32 mb-4"/><Skeleton className="h-96"/></div>;
    if (!data) return <div className="p-6">Không tìm thấy dữ liệu.</div>;

    const { plan, group, my_stats } = data;
    const hasGroup = !!group;
    const hasTopic = group?.phancong_detai_nhom?.detai;
    const gvhd = group?.phancong_detai_nhom?.gvhd?.nguoidung;

    return (
        <div className="h-screen flex flex-col bg-gray-50/30 dark:bg-background overflow-hidden">
            {/* 1. COMPACT HEADER */}
            <div className="h-14 border-b bg-background flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/student/dashboard')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <div>
                        <h1 className="text-sm font-bold leading-tight">{plan.name}</h1>
                        <p className="text-[10px] text-muted-foreground">
                            Giai đoạn: <span className="text-blue-600 font-medium">{plan.current_phase?.TEN_SUKIEN || 'N/A'}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasGroup && (
                        <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate(`/projects/my-group/kanban/${group.ID_NHOM}`)}>
                            <LayoutDashboard className="w-3.5 h-3.5 mr-2" /> Vào Kanban
                        </Button>
                    )}
                </div>
            </div>

            {/* 2. MAIN CONTENT - 3 COLUMNS */}
            <div className="flex-1 overflow-hidden p-4 md:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                    
                    {/* LEFT COLUMN: CONTEXT (2.5/12) */}
                    <Card className="lg:col-span-3 flex flex-col h-full border-none shadow-md bg-white dark:bg-card">
                        <CardHeader className="pb-2 border-b px-4 py-3">
                            <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Thông tin chung</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="p-2 space-y-1">
                                    {!hasGroup ? (
                                        <div className="p-4 text-center">
                                            <p className="text-sm mb-3">Chưa có nhóm</p>
                                            <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/projects/find-group', { state: { planId } })}>
                                                Tìm nhóm ngay
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <InfoRow icon={Users} label="Nhóm" value={group.TEN_NHOM} subValue={`${group.thanhviens?.length || 0} thành viên`} />
                                            <Separator className="my-1 opacity-50" />
                                            <InfoRow 
                                                icon={FileText} 
                                                label="Đề tài" 
                                                value={hasTopic ? group.phancong_detai_nhom.detai.TEN_DETAI : "Chưa đăng ký"} 
                                                subValue={!hasTopic && <span className="text-orange-500 cursor-pointer hover:underline" onClick={() => navigate('/projects/topics')}>Đăng ký ngay</span>}
                                            />
                                            <Separator className="my-1 opacity-50" />
                                            <InfoRow 
                                                icon={User} 
                                                label="GVHD" 
                                                value={gvhd ? gvhd.HODEM_VA_TEN : "Chưa phân công"}
                                                subValue={gvhd?.EMAIL}
                                            />
                                             <div className="mt-4 px-2">
                                                <Button variant="secondary" size="sm" className="w-full text-xs" onClick={() => navigate('/projects/my-group')}>
                                                    Xem chi tiết nhóm
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* CENTER COLUMN: ACTION & STATS (7/12) */}
                    <div className="lg:col-span-7 flex flex-col gap-4 h-full overflow-hidden">
                        {/* Top Stats Row */}
                        <div className="grid grid-cols-3 gap-4 shrink-0">
                             <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900 shadow-sm">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <CheckCircle2 className="w-6 h-6 text-blue-600 mb-1" />
                                    <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">{my_stats.total}</span>
                                    <span className="text-xs text-blue-600/80">Việc của tôi</span>
                                </CardContent>
                             </Card>
                             <Card className="bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900 shadow-sm">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <AlertTriangle className="w-6 h-6 text-red-600 mb-1" />
                                    <span className="text-2xl font-bold text-red-700 dark:text-red-400">{my_stats.overdue}</span>
                                    <span className="text-xs text-red-600/80">Quá hạn</span>
                                </CardContent>
                             </Card>
                             <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900 shadow-sm">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <Clock className="w-6 h-6 text-orange-600 mb-1" />
                                    <span className="text-2xl font-bold text-orange-700 dark:text-orange-400">{my_stats.today}</span>
                                    <span className="text-xs text-orange-600/80">Hạn hôm nay</span>
                                </CardContent>
                             </Card>
                        </div>

                        {/* Main Action Area */}
                        <Card className="flex-1 border-none shadow-md flex flex-col min-h-0">
                            <CardHeader className="py-3 px-5 border-b bg-muted/10">
                                <CardTitle className="text-base flex justify-between items-center">
                                    <span>Hoạt động & Sự kiện</span>
                                    {plan.current_phase && (
                                        <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                                            Đang diễn ra: {plan.current_phase.TEN_SUKIEN}
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 flex flex-col justify-center items-center text-center text-muted-foreground">
                                {/* Placeholder for Calendar/Activity Feed */}
                                <Calendar className="w-12 h-12 mb-3 opacity-20" />
                                <p>Khu vực này sẽ hiển thị Lịch chi tiết và Hoạt động gần đây</p>
                                <p className="text-xs mt-1">(Đang phát triển)</p>
                                <div className="mt-4 flex gap-3">
                                    <Button variant="outline" size="sm" onClick={() => navigate(`/projects/my-group/schedule/${group?.ID_NHOM}`)}>
                                        Xem lịch họp
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN: TIMELINE (2.5/12) */}
                    <Card className="lg:col-span-2 flex flex-col h-full border-none shadow-md bg-white dark:bg-card">
                        <CardHeader className="pb-2 border-b px-4 py-3 bg-muted/5">
                            <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" /> Mốc thời gian
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="p-4">
                                    <CompactTimeline milestones={plan.timeline} />
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}