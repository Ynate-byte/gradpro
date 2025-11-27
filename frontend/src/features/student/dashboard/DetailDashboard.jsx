import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStudentDashboardDetail } from '@/api/studentDashboardService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
    ArrowLeft, Calendar, Users, CheckCircle2, AlertTriangle, Clock, 
    LayoutDashboard, User, FileText, Flag, CheckSquare, Trophy, BarChart3,
    Video, MapPin, CalendarDays, GraduationCap, ListTree, Info, X
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

// --- 1. BIỂU ĐỒ ĐÓNG GÓP (Giữ nguyên) ---
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const ContributionChart = ({ data }) => {
    if (!data || data.length === 0) return <div className="text-center text-muted-foreground py-10">Chưa có dữ liệu công việc</div>;
    const chartData = data.filter(d => d.value > 0);
    const totalTasks = data.reduce((acc, cur) => acc + cur.value, 0);

    if (totalTasks === 0) return (
        <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
            <BarChart3 className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">Chưa có công việc hoàn thành</p>
        </div>
    );

    return (
        <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <RechartsTooltip 
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-popover border rounded-md shadow-md p-2 text-xs">
                                        <p className="font-semibold mb-1">{data.name}</p>
                                        <p>Hoàn thành: <span className="font-bold text-primary">{data.value}</span> việc</p>
                                        <p className="text-muted-foreground">Tổng được giao: {data.total}</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        content={({ payload }) => (
                            <div className="flex flex-wrap justify-center gap-3 mt-2 text-xs">
                                {payload.map((entry, index) => (
                                    <div key={`item-${index}`} className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="text-muted-foreground">{entry.value}</span>
                                        <span className="font-semibold ml-0.5">
                                            ({Math.round((chartData[index].value / totalTasks) * 100)}%)
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-2xl font-bold text-foreground">{totalTasks}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Đã xong</p>
            </div>
        </div>
    );
};

// --- 2. WIDGET SỨC KHỎE ĐỀ TÀI ---

// Component Popover hiển thị điểm chi tiết
const DetailedScorePopover = ({ details, members }) => {
    if (!details || !Array.isArray(details) || details.length === 0) return null;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-muted-foreground hover:text-primary absolute -top-2 -right-2 p-0 bg-background rounded-full border shadow-sm"
                    title="Xem điểm thành phần"
                >
                    <ListTree className="w-3 h-3"/>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="center" side="top">
                <div className="px-3 py-2 bg-muted/50 border-b text-xs font-bold text-muted-foreground flex justify-between items-center">
                    <span>Sinh viên</span>
                    <span>Điểm</span>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                    {details.map((item, idx) => {
                        // Tìm tên sinh viên trong danh sách thành viên nhóm
                        // Logic: item.student_id là ID_NGUOIDUNG.
                        const student = members.find(m => 
                            String(m.ID_NGUOIDUNG) === String(item.student_id) || 
                            String(m.nguoidung?.ID_NGUOIDUNG) === String(item.student_id)
                        );
                        
                        const displayName = student?.nguoidung?.HODEM_VA_TEN || `ID: ${item.student_id}`;
                        const mssv = student?.nguoidung?.MA_DINHDANH;

                        return (
                            <div key={idx} className="flex justify-between items-center px-3 py-2 text-xs border-b last:border-0 hover:bg-muted/20">
                                <div className="flex flex-col overflow-hidden mr-2">
                                    <span className="truncate font-medium text-foreground/90" title={displayName}>
                                        {displayName}
                                    </span>
                                    {mssv && <span className="text-[10px] text-muted-foreground">{mssv}</span>}
                                </div>
                                <Badge variant="outline" className="font-bold text-primary border-primary/30 h-5 min-w-[30px] justify-center bg-primary/5">
                                    {item.score}
                                </Badge>
                            </div>
                        )
                    })}
                </div>
                <div className="p-1.5 bg-yellow-50 text-[9px] text-yellow-700 text-center border-t border-yellow-100">
                    * Điểm hiển thị bên ngoài là trung bình cộng.
                </div>
            </PopoverContent>
        </Popover>
    );
};

const GradeBadge = ({ label, score, details, members }) => {
    const hasScore = score !== null && score !== undefined;
    
    // Parse details nếu nó là chuỗi JSON (phòng trường hợp backend trả về string thay vì array)
    let parsedDetails = details;
    if (typeof details === 'string') {
        try { parsedDetails = JSON.parse(details); } catch (e) { parsedDetails = []; }
    }
    const hasDetails = parsedDetails && Array.isArray(parsedDetails) && parsedDetails.length > 0;

    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-3 rounded-lg border relative group transition-all",
            hasScore ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-50 border-gray-100 text-gray-400"
        )}>
            <span className="text-[10px] font-bold uppercase tracking-wide mb-1">{label}</span>
            <span className="text-2xl font-bold">{hasScore ? Number(score).toFixed(1).replace(/[.,]0$/, '') : '-'}</span>
            
            {/* Hiển thị nút xem chi tiết nếu có điểm thành phần */}
            {hasDetails && (
                <DetailedScorePopover details={parsedDetails} members={members} />
            )}
        </div>
    );
};

const HealthStatusItem = ({ label, value, status }) => {
    let icon = <Clock className="w-4 h-4 text-muted-foreground" />;
    let statusClass = "text-muted-foreground";
    
    if (status === 'success') {
        icon = <CheckCircle2 className="w-4 h-4 text-green-600" />;
        statusClass = "text-green-700 font-medium";
    } else if (status === 'warning') {
        icon = <AlertTriangle className="w-4 h-4 text-orange-500" />;
        statusClass = "text-orange-700";
    } else if (status === 'danger') {
        icon = <X className="w-4 h-4 text-red-500" />;
        statusClass = "text-red-700";
    }

    return (
        <div className="flex items-center justify-between py-2 border-b last:border-0">
            <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
            <div className="flex items-center gap-2">
                <span className={cn("text-sm truncate max-w-[150px]", statusClass)}>{value || '---'}</span>
                {icon}
            </div>
        </div>
    );
};

const ThesisHealthWidget = ({ health, group }) => {
    if (!health) return null;

    // --- [SỬA LỖI QUAN TRỌNG] ---
    // Laravel trả về snake_case (diem_huong_dan) mặc dù trong controller gọi diemHuongDan
    // Cần kiểm tra cả 2 trường hợp để an toàn
    
    const getDetails = (relationName, snakeName) => {
        const rel = group?.[relationName] || group?.[snakeName];
        return rel?.[0]?.DIEM_CHI_TIET;
    };

    const guideDetails = getDetails('diemHuongDan', 'diem_huong_dan');
    const reviewDetails = getDetails('diemPhanBien', 'diem_phan_bien');
    
    // Với hội đồng, có thể có nhiều người chấm. Lấy người đầu tiên có điểm chi tiết để hiển thị ví dụ
    // Hoặc xử lý phức tạp hơn nếu cần. Ở đây ta lấy người đầu tiên.
    const councilRel = group?.diemHoiDong || group?.diem_hoi_dong;
    const councilDetails = councilRel?.[0]?.DIEM_CHI_TIET;

    const members = group?.thanhviens || [];

    return (
        <div className="space-y-1">
            <HealthStatusItem 
                label="Đề tài" 
                value={health.topic_status} 
                status={health.has_topic ? 'success' : 'warning'} 
            />
            <HealthStatusItem 
                label="GVHD" 
                value={health.supervisor} 
                status={health.supervisor ? 'success' : 'default'} 
            />
            <HealthStatusItem 
                label="Phản biện" 
                value={health.reviewer || 'Chưa phân công'} 
                status={health.reviewer ? 'success' : 'default'} 
            />
            
            <div className="mt-5 pt-3 border-t border-dashed">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                    Điểm số ghi nhận <Info className="w-3 h-3 cursor-help" />
                </p>
                <div className="grid grid-cols-3 gap-3">
                    <GradeBadge 
                        label="Hướng dẫn" 
                        score={health.grades?.guide} 
                        details={guideDetails} 
                        members={members} 
                    />
                    <GradeBadge 
                        label="Phản biện" 
                        score={health.grades?.review} 
                        details={reviewDetails} 
                        members={members} 
                    />
                    <GradeBadge 
                        label="Hội đồng" 
                        score={health.grades?.council} 
                        details={councilDetails} 
                        members={members} 
                    />
                </div>
            </div>
        </div>
    );
};

// --- WIDGET THÔNG TIN HỘI ĐỒNG (Giữ nguyên) ---
const CouncilInfoWidget = ({ group }) => {
    const defenseCouncil = group?.hoidongs?.find(c => c.LOAI === 'hoidong');

    if (!defenseCouncil) {
        return (
            <div className="p-6 text-center border-2 border-dashed rounded-lg bg-muted/30">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Chưa có lịch hội đồng bảo vệ.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="text-center pb-2 border-b border-dashed">
                 <Badge variant="secondary" className="mb-2 font-normal">
                    {defenseCouncil.TEN_HOIDONG}
                 </Badge>
            </div>

            <div className="space-y-3">
                {/* Ngày */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Ngày bảo vệ</span>
                    <div className="flex items-center gap-2 font-medium">
                        <span>{defenseCouncil.NGAY_BAOCAO ? format(parseISO(defenseCouncil.NGAY_BAOCAO), 'dd/MM/yyyy') : '---'}</span>
                        <CalendarDays className="w-4 h-4 text-blue-500" />
                    </div>
                </div>

                {/* Giờ */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Thời gian</span>
                    <div className="flex items-center gap-2 font-medium">
                        <span>{defenseCouncil.GIO_BAOCAO ? format(parseISO(`2000-01-01T${defenseCouncil.GIO_BAOCAO}`), 'HH:mm') : '---'}</span>
                        <Clock className="w-4 h-4 text-orange-500" />
                    </div>
                </div>

                {/* Địa điểm */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Địa điểm</span>
                    <div className="flex items-center gap-2 font-medium">
                        <span className="truncate max-w-[150px]">{defenseCouncil.PHONG || 'Chưa cập nhật'}</span>
                        <MapPin className="w-4 h-4 text-red-500" />
                    </div>
                </div>
            </div>

             <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px] rounded border border-blue-100 dark:border-blue-800 flex gap-2 items-start">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                <span>Vui lòng có mặt trước 15 phút để chuẩn bị thiết bị.</span>
            </div>
        </div>
    );
};

// --- 3. TIMELINE TÍCH HỢP (Giữ nguyên) ---
const IntegratedTimeline = ({ items }) => {
    if (!items || items.length === 0) {
        return <div className="py-8 text-center text-muted-foreground text-sm">Chưa có sự kiện nào sắp diễn ra.</div>;
    }

    return (
        <div className="relative pl-4 space-y-6 my-2">
            <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-gray-100 dark:bg-gray-800" />
            
            {items.map((item, idx) => {
                const date = parseISO(item.date);
                const isPastDate = isPast(date) && !isToday(date);
                const isTodayDate = isToday(date);
                
                let icon, borderColor, textColor, typeLabel;

                switch (item.type) {
                    case 'milestone':
                        icon = <Flag className="w-3 h-3" />;
                        borderColor = "border-indigo-400";
                        textColor = "text-indigo-400";
                        typeLabel = "Mốc Khoa";
                        break;
                    case 'meeting':
                        icon = <CalendarDays className="w-3 h-3" />;
                        borderColor = "border-green-500";
                        textColor = "text-green-500";
                        typeLabel = "Lịch họp";
                        break;
                    case 'task':
                    default:
                        icon = <CheckSquare className="w-3 h-3" />;
                        borderColor = "border-orange-400";
                        textColor = "text-orange-400";
                        typeLabel = "Deadline Task";
                        break;
                }

                return (
                    <div key={item.id} className="relative pl-6 group">
                        {/* Dot Icon */}
                        <div className={cn(
                            "absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 bg-background transition-colors",
                            isTodayDate ? "border-blue-500 text-blue-500 scale-110" : 
                            isPastDate ? "border-gray-300 text-gray-300 bg-gray-50" : 
                            cn(borderColor, textColor)
                        )}>
                            {icon}
                        </div>

                        {/* Content */}
                        <div className={cn(
                            "flex flex-col transition-opacity",
                            isPastDate ? "opacity-60 hover:opacity-100" : "opacity-100"
                        )}>
                            <div className="flex justify-between items-start">
                                <span className={cn(
                                    "text-sm font-medium leading-none",
                                    isTodayDate ? "text-blue-600 font-bold" : "text-foreground"
                                )}>
                                    {item.title}
                                </span>
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded ml-2 shrink-0",
                                    isTodayDate ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                                )}>
                                    {format(date, 'dd/MM')}
                                </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge variant="outline" className={cn("text-[9px] h-4 px-1 font-normal border-0 bg-opacity-20", 
                                    item.type === 'milestone' ? "bg-indigo-100 text-indigo-700" : 
                                    item.type === 'meeting' ? "bg-green-100 text-green-700" :
                                    "bg-orange-100 text-orange-700"
                                )}>
                                    {typeLabel}
                                </Badge>
                                
                                {item.type === 'meeting' && item.details && (
                                    <span className="text-[10px] text-muted-foreground flex items-center">
                                        {item.details.includes('http') || item.details === 'Online' 
                                            ? <Video className="w-3 h-3 mr-1"/> 
                                            : <MapPin className="w-3 h-3 mr-1"/>
                                        }
                                        {item.details === 'Online' ? 'Online' : 'Trực tiếp'}
                                    </span>
                                )}

                                {item.priority === 'Cao' && (
                                    <span className="text-[9px] text-red-500 font-bold flex items-center">
                                        <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Gấp
                                    </span>
                                )}
                            </div>
                            
                            {isTodayDate && (
                                <p className="text-xs text-blue-500 mt-1 font-medium">Diễn ra hôm nay!</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
export default function DetailDashboard() {
    const { planId } = useParams();
    const navigate = useNavigate();
    
    const { data, isLoading } = useQuery({
        queryKey: ['studentDashboardDetail', planId],
        queryFn: () => getStudentDashboardDetail(planId),
        enabled: !!planId
    });

    if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-32"/><div className="grid grid-cols-3 gap-4"><Skeleton className="h-64"/><Skeleton className="h-64"/><Skeleton className="h-64"/></div></div>;
    if (!data) return <div className="p-6 text-center">Không tìm thấy dữ liệu.</div>;

    const { plan, group, member_contribution, thesis_health, integrated_timeline } = data;
    const hasGroup = !!group;

    return (
        <div className="flex flex-col min-h-full bg-gray-50/30 dark:bg-background">
            
            {/* HEADER */}
            <div className="h-14 border-b bg-background flex items-center justify-between px-6 shrink-0 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/student/dashboard')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <div>
                        <h1 className="text-sm font-bold leading-tight">{plan.name}</h1>
                        <p className="text-[10px] text-muted-foreground">
                            {plan.current_phase ? (
                                <>Giai đoạn: <span className="text-blue-600 font-medium">{plan.current_phase.TEN_SUKIEN}</span></>
                            ) : "Chưa bắt đầu"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasGroup && (
                        <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate(`/projects/my-group/kanban/${group.ID_NHOM}`)}>
                            <LayoutDashboard className="w-3.5 h-3.5 mr-2" /> Kanban Board
                        </Button>
                    )}
                </div>
            </div>

            {/* CONTENT: Sử dụng div thường, không dùng ScrollArea để dùng scrollbar của trình duyệt */}
            <div className="flex-1 p-4 md:p-6 max-w-[1600px] mx-auto w-full">
                {!hasGroup ? (
                        <div className="flex flex-col items-center justify-center py-12 bg-card border rounded-lg border-dashed">
                        <Users className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold">Bạn chưa có nhóm trong đợt này</h3>
                        <Button className="mt-4" onClick={() => navigate('/projects/find-group', { state: { planId } })}>Tìm nhóm ngay</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        
                        {/* CỘT 1: THÔNG TIN NHÓM & SỨC KHỎE ĐỀ TÀI (3/12) */}
                        <div className="md:col-span-4 lg:col-span-3 space-y-6">
                            {/* Card Thông tin Nhóm */}
                            <Card className="shadow-sm border-l-4 border-l-indigo-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm uppercase text-muted-foreground font-bold">Nhóm của bạn</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-indigo-700 mb-1">{group.TEN_NHOM}</div>
                                    <div className="flex items-center text-sm text-muted-foreground mb-4">
                                        <Users className="w-4 h-4 mr-1" /> {group.thanhviens?.length || 0} thành viên
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/projects/my-group')}>
                                        Quản lý nhóm
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Card Sức khỏe Đề tài */}
                            <Card>
                                <CardHeader className="pb-2 border-b">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-yellow-500" /> 
                                        Tiến độ Đề tài
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <ThesisHealthWidget health={thesis_health} group={group} />
                                </CardContent>
                            </Card>
                        </div>

                        {/* CỘT 2: BIỂU ĐỒ & HOẠT ĐỘNG (6/12) */}
                        <div className="md:col-span-8 lg:col-span-6 space-y-6">
                            {/* Biểu đồ đóng góp */}
                            <Card className="shadow-sm">
                                <CardHeader className="pb-0">
                                    <CardTitle className="text-base">Phân bổ công việc</CardTitle>
                                    <CardDescription>Tỷ lệ hoàn thành task của các thành viên</CardDescription>
                                </CardHeader>
                                <CardContent className="pb-2">
                                    <ContributionChart data={member_contribution} />
                                </CardContent>
                            </Card>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200" onClick={() => navigate(`/projects/my-group/kanban/${group.ID_NHOM}`)}>
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="text-xs">Tạo Task</span>
                                </Button>
                                <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" onClick={() => navigate(`/projects/my-group/schedule/${group.ID_NHOM}`)}>
                                    <Calendar className="w-5 h-5" />
                                    <span className="text-xs">Lịch họp</span>
                                </Button>
                                <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 hover:bg-green-50 hover:text-green-600 hover:border-green-200" onClick={() => navigate('/projects/my-group')}>
                                    <FileText className="w-5 h-5" />
                                    <span className="text-xs">Nộp bài</span>
                                </Button>
                                <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200" onClick={() => navigate('/projects/topics')}>
                                    <User className="w-5 h-5" />
                                    <span className="text-xs">GVHD</span>
                                </Button>
                            </div>
                        </div>

                        {/* CỘT 3: HỘI ĐỒNG & TIMELINE (3/12) */}
                        <div className="md:col-span-12 lg:col-span-3 space-y-6">
                            {/* Card Hội đồng Bảo vệ */}
                            <Card>
                                <CardHeader className="pb-2 border-b bg-blue-50/30 dark:bg-blue-900/10">
                                    <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                        <GraduationCap className="w-4 h-4" />
                                        Lịch bảo vệ
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <CouncilInfoWidget group={group} />
                                </CardContent>
                            </Card>

                            {/* Card Timeline */}
                            <Card className="border-none shadow-none bg-transparent lg:bg-card lg:border lg:shadow-sm">
                                <CardHeader className="pb-2 px-0 lg:px-6 lg:border-b">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-500" /> Sắp diễn ra
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-0 lg:px-6 pt-4">
                                    <IntegratedTimeline items={integrated_timeline} />
                                </CardContent>
                            </Card>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}