import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStudentDashboardDetail } from '@/api/studentDashboardService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
    ArrowLeft, Calendar, Users, BookOpen, 
    CheckCircle2, Clock, AlertTriangle, ArrowRight, 
    LayoutDashboard, ChevronRight, User
} from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

// --- COMPONENT: TIMELINE ---
const PlanTimeline = ({ milestones }) => {
    const now = new Date();

    return (
        <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800" />
            <div className="space-y-8 pl-0">
                {milestones.map((moc, index) => {
                    const start = parseISO(moc.NGAY_BATDAU);
                    const end = parseISO(moc.NGAY_KETTHUC);
                    const isActive = isWithinInterval(now, { start, end });
                    const isPast = now > end;

                    return (
                        <div key={moc.ID} className="relative flex items-start gap-4 group">
                            {/* Dot Indicator */}
                            <div className={`absolute left-[-5px] mt-1.5 h-3 w-3 rounded-full border-2 z-10 transition-all
                                ${isActive 
                                    ? 'bg-blue-600 border-blue-600 scale-125 ring-4 ring-blue-100 dark:ring-blue-900' 
                                    : isPast 
                                        ? 'bg-green-500 border-green-500' 
                                        : 'bg-white border-gray-300 dark:bg-gray-950 dark:border-gray-600'
                                }`} 
                            />
                            
                            <div className={`flex-1 ml-8 p-4 rounded-lg border transition-all
                                ${isActive 
                                    ? 'bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-800 shadow-md' 
                                    : 'bg-transparent border-transparent opacity-70 hover:opacity-100'
                                }`}>
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className={`font-bold text-sm ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {moc.TEN_SUKIEN}
                                    </h4>
                                    {isActive && <Badge className="bg-blue-600 text-[10px]">Đang diễn ra</Badge>}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                    <Calendar className="w-3 h-3" />
                                    {format(start, 'dd/MM')} - {format(end, 'dd/MM/yyyy')}
                                </div>
                                {moc.MOTA && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                        {moc.MOTA}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function DetailDashboard() {
    const { planId } = useParams();
    const navigate = useNavigate();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['studentDashboardDetail', planId],
        queryFn: () => getStudentDashboardDetail(planId),
        enabled: !!planId
    });

    if (isLoading) return <div className="p-8"><Skeleton className="h-[500px] w-full rounded-xl" /></div>;
    if (isError || !data) return <div className="p-8 text-center">Không tìm thấy dữ liệu kế hoạch.</div>;

    const { plan, group, my_stats } = data;
    const hasGroup = !!group;
    const hasTopic = group?.phancong_detai_nhom?.detai;

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-background p-4 md:p-8 space-y-8">
            
            {/* 1. HEADER & NAVIGATION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <Button 
                        variant="ghost" 
                        className="pl-0 text-muted-foreground hover:text-foreground -ml-2 h-8" 
                        onClick={() => navigate('/student/dashboard')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại Tổng quan
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                        {plan.name}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm py-1 px-3 bg-white dark:bg-gray-800">
                        {plan.current_phase ? `Giai đoạn: ${plan.current_phase.TEN_SUKIEN}` : 'Chưa bắt đầu'}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* 2. LEFT COLUMN: MAIN ACTIONS & STATUS (8/12) */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* SECTION A: TRẠNG THÁI NHÓM & ĐỀ TÀI (CTA CENTER) */}
                    <Card className="border-l-4 border-l-indigo-500 shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Users className="w-5 h-5 text-indigo-600" /> 
                                Trạng thái Nhóm & Đề tài
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!hasGroup ? (
                                // CASE 1: Chưa có nhóm
                                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-dashed border-indigo-200">
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                                        <Users className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Bạn chưa tham gia nhóm nào</h3>
                                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                            Để bắt đầu thực hiện khóa luận, bạn cần tham gia vào một nhóm hoặc tự tạo nhóm mới.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button onClick={() => navigate('/projects/find-group', { state: { planId } })}>
                                            Tìm nhóm
                                        </Button>
                                        <Button variant="outline" onClick={() => navigate('/projects/my-group', { state: { planId } })}>
                                            Tạo nhóm mới
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                // CASE 2: Đã có nhóm -> Hiển thị thông tin nhóm
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row justify-between gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border shadow-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-semibold uppercase">Nhóm của bạn</p>
                                            <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-400">
                                                {group.TEN_NHOM}
                                            </h3>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Trưởng nhóm: <span className="font-medium">{group.nhomtruong?.HODEM_VA_TEN}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center">
                                            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/my-group`)}>
                                                Quản lý nhóm <ChevronRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Kiểm tra Đề tài */}
                                    {!hasTopic ? (
                                        // CASE 2a: Chưa có đề tài
                                        <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                                <div>
                                                    <p className="font-semibold text-orange-800 dark:text-orange-200">Chưa đăng ký đề tài</p>
                                                    <p className="text-xs text-orange-600 dark:text-orange-400">Vui lòng chọn đề tài để được phân công GVHD.</p>
                                                </div>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                className="bg-orange-600 hover:bg-orange-700 text-white"
                                                onClick={() => navigate('/projects/topics', { state: { planId } })}
                                            >
                                                Đăng ký ngay
                                            </Button>
                                        </div>
                                    ) : (
                                        // CASE 2b: Đã có đề tài & GVHD
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100">
                                                    <p className="text-xs text-blue-600 font-semibold mb-1 flex items-center gap-1">
                                                        <BookOpen className="w-3 h-3" /> ĐỀ TÀI
                                                    </p>
                                                    <p className="font-medium line-clamp-2 text-sm" title={group.phancong_detai_nhom.detai.TEN_DETAI}>
                                                        {group.phancong_detai_nhom.detai.TEN_DETAI}
                                                    </p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100">
                                                    <p className="text-xs text-green-600 font-semibold mb-1 flex items-center gap-1">
                                                        <User className="w-3 h-3" /> GVHD
                                                    </p>
                                                    <p className="font-medium text-sm">
                                                        {group.phancong_detai_nhom.gvhd?.nguoidung?.HODEM_VA_TEN || 'Chưa phân công'}
                                                    </p>
                                                </div>
                                            </div>

                                            <Button className="w-full py-6 text-lg shadow-lg shadow-blue-500/20" onClick={() => navigate(`/projects/my-group/kanban/${group.ID_NHOM}`)}>
                                                <LayoutDashboard className="w-5 h-5 mr-2" />
                                                Vào Không Gian Làm Việc (Kanban)
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* SECTION B: THỐNG KÊ CÁ NHÂN (Chỉ hiện nếu đã có nhóm) */}
                    {hasGroup && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Card className="bg-white dark:bg-gray-900">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{my_stats.total}</p>
                                        <p className="text-xs text-muted-foreground">Tổng công việc</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white dark:bg-gray-900">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-red-100 text-red-600">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{my_stats.overdue}</p>
                                        <p className="text-xs text-muted-foreground">Quá hạn</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white dark:bg-gray-900">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{my_stats.today}</p>
                                        <p className="text-xs text-muted-foreground">Hạn hôm nay</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                {/* 3. RIGHT COLUMN: TIMELINE (4/12) */}
                <div className="lg:col-span-4">
                    <Card className="h-full border-none shadow-none bg-transparent">
                        <CardHeader className="px-0 pt-0">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="w-5 h-5 text-gray-500" /> Tiến độ Kế hoạch
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-0">
                            <ScrollArea className="h-[calc(100vh-200px)] pr-4">
                                <PlanTimeline milestones={plan.timeline} />
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}