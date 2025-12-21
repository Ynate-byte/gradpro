import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell 
} from 'recharts';
import { 
    Download, BellRing, Bell, Users, BookOpen, GraduationCap, 
    AlertCircle, CheckCircle, XCircle, Loader2, RefreshCw, Search,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';

import { getAllPlans } from '@/api/thesisPlanService';
import { getPlanReport, nudgeUser, getStudentResults } from '@/api/reportService';
import { useDebounce } from '@/hooks/useDebounce';

// --- CONFIG ---
const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

// --- COMPONENT CON: THẺ THỐNG KÊ (STAT CARD) ---
const StatCard = ({ title, value, description, icon: Icon, className }) => (
    <Card className={cn("shadow-sm", className)}>
        <CardContent className="p-4 flex items-center justify-between">
            <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
                <div className="text-2xl font-bold mt-1 text-foreground">{value}</div>
                {description && <p className="text-[10px] text-muted-foreground mt-1">{description}</p>}
            </div>
            <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Icon className="w-5 h-5" />
            </div>
        </CardContent>
    </Card>
);

// --- COMPONENT CON: DANH SÁCH CẢNH BÁO (ALERT LIST) ---
const AlertList = ({ items, renderItem }) => {
    if (!items || items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mb-2 text-green-500 opacity-80"/>
                <p className="text-sm">Không có cảnh báo nào.</p>
            </div>
        );
    }
    
    return (
        <ScrollArea className="h-[250px]">
            <div>{items.map((item, idx) => <div key={idx}>{renderItem(item)}</div>)}</div>
        </ScrollArea>
    );
};

// --- COMPONENT CON: BẢNG KẾT QUẢ CHI TIẾT (ĐÃ TỐI ƯU) ---
const StudentResultsTable = ({ planId, weights, planStatus }) => {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState("20"); 
    const [filter, setFilter] = useState('all'); 
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 500);

    // Query dữ liệu với per_page
    const { data: resultData, isLoading, isFetching } = useQuery({
        queryKey: ['studentResults', planId, page, perPage, filter, debouncedSearch],
        queryFn: () => getStudentResults(planId, { 
            page, 
            per_page: Number(perPage),
            filter, 
            search: debouncedSearch 
        }),
        enabled: !!planId,
        keepPreviousData: true 
    });

    // Reset về trang 1 khi thay đổi bộ lọc hoặc tìm kiếm
    useEffect(() => { setPage(1); }, [filter, debouncedSearch, perPage]);

    const students = resultData?.data || [];
    const meta = resultData || {};
    const totalPages = meta.last_page || 1;

    return (
        <Card className="shadow-sm border-t-4 border-t-blue-600">
            <CardHeader className="pb-3 px-4 pt-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-blue-600" />
                            Kết quả Sinh viên ({meta.total || 0})
                        </CardTitle>
                        <CardDescription>Bảng điểm chi tiết toàn khóa.</CardDescription>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                         {/* Filter Tabs */}
                         <div className="flex p-1 bg-muted rounded-md h-9 self-start sm:self-center">
                            <button
                                onClick={() => setFilter('all')}
                                className={cn("px-3 text-xs font-medium rounded-sm transition-all", filter === 'all' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                            >
                                Tất cả
                            </button>
                            <button
                                onClick={() => setFilter('pass')}
                                className={cn("px-3 text-xs font-medium rounded-sm transition-all", filter === 'pass' ? "bg-green-100 text-green-700 shadow-sm" : "text-muted-foreground hover:text-green-700")}
                            >
                                Đậu
                            </button>
                            <button
                                onClick={() => setFilter('fail')}
                                className={cn("px-3 text-xs font-medium rounded-sm transition-all", filter === 'fail' ? "bg-red-100 text-red-700 shadow-sm" : "text-muted-foreground hover:text-red-700")}
                            >
                                Rớt
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-60">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm MSSV, Tên..."
                                className="pl-9 h-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="px-0 pb-0">
                <div className="border-y relative min-h-[300px]">
                    {/* Loading Overlay khi chuyển trang */}
                    {isFetching && !isLoading && (
                        <div className="absolute inset-0 bg-background/50 z-10 flex items-start justify-center pt-20">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    )}

                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[100px] pl-4">MSSV</TableHead>
                                <TableHead className="w-[200px]">Họ và Tên</TableHead>
                                <TableHead className="hidden md:table-cell">Đề tài</TableHead>
                                {/* Hiển thị Tỷ trọng điểm */}
                                <TableHead className="text-center w-[90px] text-xs">
                                    HD <span className="text-[10px] text-muted-foreground block">({weights?.hd ?? 0}%)</span>
                                </TableHead>
                                <TableHead className="text-center w-[90px] text-xs">
                                    PB <span className="text-[10px] text-muted-foreground block">({weights?.pb ?? 0}%)</span>
                                </TableHead>
                                <TableHead className="text-center w-[90px] text-xs">
                                    HĐ <span className="text-[10px] text-muted-foreground block">({weights?.hdong ?? 0}%)</span>
                                </TableHead>
                                <TableHead className="text-center w-[80px] font-bold bg-muted/60 text-black dark:text-white">Tổng</TableHead>
                                <TableHead className="text-right w-[100px] pr-4">KQ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={8} className="h-12 text-center">
                                            <div className="h-4 bg-muted animate-pulse rounded w-full"></div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : students.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                        Không tìm thấy sinh viên nào.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                students.map((s) => {
                                    const score = parseFloat(s.DIEM_TONG || 0);
                                    const hasScore = s.DIEM_TONG !== null;
                                    const hasCouncil = !!s.ID_HOIDONG;
                                    const isPlanEnded = planStatus === 'Đã hoàn thành';

                                    let resultBadge = null;

                                    if (hasScore) {
                                        // Có điểm thì xét Đậu/Rớt bình thường
                                        const isPass = score >= 4.0;
                                        resultBadge = (
                                            <Badge variant={isPass ? "default" : "destructive"} className={cn("text-[10px] h-5 px-1.5 shadow-none", isPass ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200" : "bg-red-100 text-red-700 hover:bg-red-200 border-red-200")}>
                                                {isPass ? 'Đậu' : 'Rớt'}
                                            </Badge>
                                        );
                                    } else {
                                        // Chưa có điểm
                                        if (isPlanEnded && !hasCouncil) {
                                            // Kế hoạch đã kết thúc và không có hội đồng => Rớt
                                            resultBadge = (
                                                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 text-[10px] h-5 px-1.5 shadow-none">
                                                    Rớt (K.HĐ)
                                                </Badge>
                                            );
                                        } else {
                                            // Đang chờ hoặc chưa chấm
                                            resultBadge = <span className="text-[10px] text-muted-foreground italic">--</span>;
                                        }
                                    }
                                    
                                    return (
                                        <TableRow key={s.ID_NGUOIDUNG} className="hover:bg-muted/30">
                                            <TableCell className="font-medium pl-4">{s.MA_DINHDANH}</TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm">{s.HODEM_VA_TEN}</div>
                                                <div className="text-[10px] text-muted-foreground md:hidden truncate max-w-[150px]">{s.TEN_DETAI || 'Chưa có đề tài'}</div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell truncate max-w-[250px] text-xs text-muted-foreground" title={s.TEN_DETAI}>
                                                {s.TEN_DETAI || '-'}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground text-sm">{s.DIEM_HD ?? '-'}</TableCell>
                                            <TableCell className="text-center text-muted-foreground text-sm">{s.DIEM_PB ?? '-'}</TableCell>
                                            <TableCell className="text-center text-muted-foreground text-sm">{s.DIEM_HDONG ?? '-'}</TableCell>
                                            <TableCell className="text-center font-bold text-base bg-muted/20">
                                                {s.DIEM_TONG ?? '-'}
                                            </TableCell>
                                            <TableCell className="text-right pr-4">
                                                {resultBadge}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* --- ADVANCED PAGINATION --- */}
                <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 gap-4 bg-muted/10">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Hiển thị</span>
                        <Select value={perPage} onValueChange={setPerPage}>
                            <SelectTrigger className="h-8 w-[70px] text-xs">
                                <SelectValue placeholder={perPage} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">
                            / {meta.total || 0} SV
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage(1)}
                            disabled={page === 1 || isLoading}
                            title="Trang đầu"
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={!meta.prev_page_url || isLoading}
                            title="Trang trước"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        <span className="text-xs font-medium mx-2 min-w-[60px] text-center">
                            Trang {meta.current_page} / {totalPages}
                        </span>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={!meta.next_page_url || isLoading}
                            title="Trang sau"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage(totalPages)}
                            disabled={page === totalPages || isLoading}
                            title="Trang cuối"
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// --- MAIN PAGE ---
export default function ThesisReportPage() {
    const [selectedPlanId, setSelectedPlanId] = useState(null);

    // 1. Load danh sách kế hoạch
    const { data: plans } = useQuery({
        queryKey: ['allPlans'],
        queryFn: getAllPlans,
    });

    React.useEffect(() => {
        if (plans && plans.length > 0 && !selectedPlanId) {
            setSelectedPlanId(String(plans[0].ID_KEHOACH));
        }
    }, [plans, selectedPlanId]);

    // 2. Load dữ liệu báo cáo
    const { data: reportData, isLoading, refetch } = useQuery({
        queryKey: ['planReport', selectedPlanId],
        queryFn: () => getPlanReport(selectedPlanId),
        enabled: !!selectedPlanId,
    });

    const nudgeMutation = useMutation({
        mutationFn: ({ userId, message }) => nudgeUser(userId, 'manual', message),
        onSuccess: () => toast.success("Đã gửi nhắc nhở thành công.")
    });

    const handleNudge = (userId, name, type) => {
        let msg = "";
        if (type === 'student_no_group') msg = `Chào ${name}, bạn chưa tham gia nhóm khóa luận nào. Vui lòng tìm nhóm gấp.`;
        if (type === 'group_no_topic') msg = `Chào nhóm trưởng ${name}, nhóm của bạn chưa đăng ký đề tài. Hạn chót sắp đến.`;
        if (type === 'missing_grade') msg = `Chào Thầy/Cô ${name}, hệ thống ghi nhận Thầy/Cô chưa nhập điểm cho một số hội đồng.`;
        
        nudgeMutation.mutate({ userId, message: msg });
    };

    if (!selectedPlanId && !plans) return <div className="p-8 text-center flex items-center justify-center h-full"><Loader2 className="animate-spin mr-2"/> Đang tải dữ liệu...</div>;

    const { overview, charts, alerts, weights } = reportData || {};

    // [FIX] Xử lý số liệu an toàn
    const passCount = Number(charts?.pass_fail?.pass) || 0;
    const failCount = Number(charts?.pass_fail?.fail) || 0;
    const totalGraded = passCount + failCount;
    
    const passRate = totalGraded > 0 
        ? Math.round((passCount / totalGraded) * 100) 
        : 0;

    const scoreData = charts?.score_dist 
        ? Object.entries(charts.score_dist).map(([key, val]) => ({ name: key, value: val })) 
        : [];
        
    const passFailData = [
        { name: 'Đậu', value: passCount },
        { name: 'Rớt (<4.0)', value: failCount }
    ];

    // Lấy thông tin kế hoạch hiện tại để check trạng thái
    const selectedPlan = plans?.find(p => String(p.ID_KEHOACH) === selectedPlanId);

    return (
        <div className="p-4 md:p-6 space-y-6 h-full flex flex-col bg-gray-50/50 dark:bg-background overflow-y-auto">
            {/* --- HEADER CONTROL --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Báo cáo & Thống kê Khóa luận</h1>
                    <p className="text-xs text-muted-foreground">Phân tích dữ liệu chi tiết cho từng đợt khóa luận.</p>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select value={selectedPlanId || ""} onValueChange={setSelectedPlanId}>
                        <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Chọn kế hoạch..." />
                        </SelectTrigger>
                        <SelectContent>
                            {plans?.map(p => (
                                <SelectItem key={p.ID_KEHOACH} value={String(p.ID_KEHOACH)}>
                                    {p.TEN_DOT}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Button variant="outline" size="icon" onClick={() => refetch()} title="Làm mới">
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </Button>
                    <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
                        <Download className="w-4 h-4 mr-2" /> Xuất Excel
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-12 gap-6 pb-10">
                    {/* --- ROW 1: KPI CARDS --- */}
                    <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard 
                            title="Tổng Sinh viên" 
                            value={overview?.students || 0} 
                            icon={Users} 
                            className="border-l-4 border-l-blue-500"
                        />
                        <StatCard 
                            title="Tổng số Nhóm" 
                            value={overview?.groups || 0} 
                            description={`${overview?.active_groups || 0} đang thực hiện`}
                            icon={Users} 
                             className="border-l-4 border-l-indigo-500"
                        />
                        <StatCard 
                            title="Đề tài / Slot" 
                            value={`${overview?.assigned_topics || 0} / ${overview?.topics || 0}`} 
                            description={`${overview?.topics || 0} đề tài được duyệt`}
                            icon={BookOpen} 
                             className="border-l-4 border-l-emerald-500"
                        />
                        <StatCard 
                            title="Tỷ lệ Đậu" 
                            value={`${passRate}%`} 
                            description={`${failCount} sinh viên rớt`}
                            icon={GraduationCap} 
                             className="border-l-4 border-l-orange-500"
                        />
                    </div>

                    {/* --- ROW 2: CHARTS --- */}
                    <div className="col-span-12 md:col-span-8">
                        <Card className="h-full shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Phổ điểm Tổng kết</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={scoreData} barSize={40}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                            <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <Tooltip 
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Số lượng" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="col-span-12 md:col-span-4">
                        <Card className="h-full shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Tỷ lệ Đậu / Rớt</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[250px] w-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={passFailData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {passFailData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                                        <div className="text-center">
                                            <span className="text-2xl font-bold block">{totalGraded}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">SV Đã chấm</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* --- ROW 3: ALERTS & ACTIONS --- */}
                    <div className="col-span-12">
                        <Card className="shadow-sm border-l-4 border-l-orange-500">
                            <CardHeader className="py-3 px-4 bg-orange-50/50 dark:bg-orange-950/10 border-b">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-sm font-bold uppercase text-orange-700 dark:text-orange-400 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> Cảnh báo & Nhắc nhở
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Tabs defaultValue="students" className="w-full">
                                    <div className="px-4 pt-2">
                                        <TabsList className="bg-transparent p-0 gap-4 w-full justify-start border-b rounded-none h-auto">
                                            <TabsTrigger 
                                                value="students" 
                                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-1 pb-3 text-xs font-medium text-muted-foreground data-[state=active]:text-orange-600 transition-all"
                                            >
                                                SV chưa có nhóm ({alerts?.students_no_group?.length || 0})
                                            </TabsTrigger>
                                            <TabsTrigger 
                                                value="groups" 
                                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-1 pb-3 text-xs font-medium text-muted-foreground data-[state=active]:text-orange-600 transition-all"
                                            >
                                                Nhóm thiếu đề tài ({alerts?.groups_no_topic?.length || 0})
                                            </TabsTrigger>
                                            <TabsTrigger 
                                                value="grades" 
                                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-1 pb-3 text-xs font-medium text-muted-foreground data-[state=active]:text-orange-600 transition-all"
                                            >
                                                GV thiếu điểm ({alerts?.lecturers_missing_grades?.length || 0})
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <div className="p-0">
                                        <TabsContent value="students" className="m-0">
                                            <AlertList 
                                                items={alerts?.students_no_group} 
                                                renderItem={(item) => (
                                                    <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 border-b last:border-0">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                                                SV
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">{item.HODEM_VA_TEN}</p>
                                                                <p className="text-xs text-muted-foreground">{item.MA_DINHDANH}</p>
                                                            </div>
                                                        </div>
                                                        <Button size="sm" variant="ghost" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-8" 
                                                            onClick={() => handleNudge(item.ID_NGUOIDUNG, item.HODEM_VA_TEN, 'student_no_group')}>
                                                            <BellRing className="w-4 h-4 mr-1" /> Nhắc
                                                        </Button>
                                                    </div>
                                                )}
                                            />
                                        </TabsContent>
                                        
                                        <TabsContent value="groups" className="m-0">
                                            <AlertList 
                                                items={alerts?.groups_no_topic} 
                                                renderItem={(item) => (
                                                    <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 border-b last:border-0">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                                                G
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">{item.TEN_NHOM}</p>
                                                                <p className="text-xs text-muted-foreground">Trưởng nhóm: {item.LEADER_NAME}</p>
                                                            </div>
                                                        </div>
                                                        <Button size="sm" variant="ghost" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-8"
                                                            onClick={() => handleNudge(item.LEADER_ID, item.LEADER_NAME, 'group_no_topic')}>
                                                            <BellRing className="w-4 h-4 mr-1" /> Nhắc
                                                        </Button>
                                                    </div>
                                                )}
                                            />
                                        </TabsContent>

                                        <TabsContent value="grades" className="m-0">
                                            <AlertList 
                                                items={alerts?.lecturers_missing_grades} 
                                                renderItem={(item) => (
                                                    <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 border-b last:border-0">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">
                                                                GV
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">{item.HODEM_VA_TEN}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Hội đồng: {item.TEN_HOIDONG} • Thiếu {item.missing_count} nhóm
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Button size="sm" variant="ghost" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-8"
                                                            onClick={() => handleNudge(item.ID_NGUOIDUNG, item.HODEM_VA_TEN, 'missing_grade')}>
                                                            <BellRing className="w-4 h-4 mr-1" /> Nhắc
                                                        </Button>
                                                    </div>
                                                )}
                                            />
                                        </TabsContent>
                                    </div>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    {/* --- ROW 4: DANH SÁCH SINH VIÊN (MỚI) --- */}
                    <div className="col-span-12">
                        <StudentResultsTable 
                            planId={selectedPlanId} 
                            weights={weights} 
                            planStatus={selectedPlan?.TRANGTHAI} // Truyền trạng thái kế hoạch xuống
                        />
                    </div>

                </div>
            )}
        </div>
    );
}