import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPersonalHistory, getPersonalHistoryStats } from '@/api/historyService';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from 'use-debounce';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";

// Icons
import { 
    History, Search, Activity, Calendar, PlusCircle, Edit3, LogIn, 
    RefreshCw, FileText, User, Shield, Monitor, Check, X, Filter, 
    ArrowLeft, ArrowRight, Mail, UserCheck, UserPlus
} from 'lucide-react';

// Map tên trường Database sang Tiếng Việt
const FIELD_MAP = {
    'TEN_CONGVIEC': 'Tên công việc',
    'TRANGTHAI': 'Trạng thái',
    'DIEM': 'Điểm số',
    'NGAY_HETHAN': 'Hạn chót',
    'DO_UUTIEN': 'Độ ưu tiên',
    'MOTA': 'Mô tả',
    'DIADIEM': 'Địa điểm',
    'THOIGIAN_BATDAU': 'Bắt đầu',
    'THOIGIAN_KETTHUC': 'Kết thúc',
    'TEN_DETAI': 'Tên đề tài',
    'ID_COT': 'Cột Kanban',
    'NOIDUNG_BINHLUAN': 'Nội dung',
    'LINK_TRUCTUYEN': 'Link họp'
};

// Component lọc đơn giản
const SimpleFacetedFilter = ({ title, options, value, onChange }) => {
    const selectedValues = new Set(value ? [value] : []);
    
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed">
                    <Filter className="mr-2 h-4 w-4" />
                    {title}
                    {selectedValues.size > 0 && (
                        <>
                            <Separator orientation="vertical" className="mx-2 h-4" />
                            <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                                {selectedValues.size}
                            </Badge>
                            <div className="hidden space-x-1 lg:flex">
                                {options
                                    .filter((option) => selectedValues.has(option.value))
                                    .map((option) => (
                                        <Badge variant="secondary" key={option.value} className="rounded-sm px-1 font-normal">
                                            {option.label}
                                        </Badge>
                                    ))
                                }
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Tìm ${title}...`} />
                    <CommandList>
                        <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selectedValues.has(option.value);
                                return (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => {
                                            if (isSelected) onChange(null);
                                            else onChange(option.value);
                                        }}
                                    >
                                        <div className={cn(
                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                        )}>
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        <span>{option.label}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                        {selectedValues.size > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => onChange(null)}
                                        className="justify-center text-center text-destructive opacity-90 cursor-pointer"
                                    >
                                        Xóa bộ lọc
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const StatCard = ({ title, value, subtitle, icon: Icon, colorClass }) => (
    <Card className="flex-1 min-w-[200px] border shadow-sm hover:shadow-md transition-all">
        <CardContent className="p-6">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
                    <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                </div>
                <div className={cn("p-2.5 rounded-xl bg-opacity-10", colorClass)}>
                    <Icon className={cn("h-5 w-5", colorClass.replace('bg-', 'text-'))} />
                </div>
            </div>
        </CardContent>
    </Card>
);

const ActionBadge = ({ type }) => {
    let color = "bg-gray-100 text-gray-800 border-gray-200";
    let icon = Activity;
    let label = type;

    if (type === 'LOGIN') { color = "bg-emerald-50 text-emerald-700 border-emerald-200"; icon = LogIn; label = "Đăng nhập"; }
    if (type === 'LOGOUT') { color = "bg-gray-50 text-gray-600 border-gray-200"; icon = LogIn; label = "Đăng xuất"; }
    
    if (type.includes('CREATE') || type.includes('SUBMIT') || type.includes('REGISTER') || type.includes('INVITE') || type.includes('REQUEST') || type.includes('PROPOSE')) { 
        color = "bg-blue-50 text-blue-700 border-blue-200"; icon = PlusCircle; 
        if(type === 'SUBMIT_PRODUCT') label = "Nộp bài";
        else if(type === 'CREATE_GROUP') label = "Tạo nhóm";
        else if(type === 'CREATE_MEETING') label = "Tạo lịch họp";
        else if(type === 'INVITE_MEMBER') label = "Mời thành viên";
        else if(type === 'REGISTER_TOPIC') label = "Đăng ký đề tài";
        else if(type === 'PROPOSE_TOPIC') label = "Đề xuất đề tài";
        else if(type === 'SEND_REQUEST') label = "Gửi yêu cầu";
        else label = "Tạo mới";
    }

    if (type.includes('UPDATE') || type.includes('CHANGE') || type.includes('MOVE') || type.includes('TRANSFER')) { 
        color = "bg-orange-50 text-orange-700 border-orange-200"; icon = Edit3; 
        if(type === 'TASK_MOVE') label = "Cập nhật Task";
        else if(type === 'CHANGE_PASSWORD') label = "Đổi mật khẩu";
        else if(type === 'UPDATE_PROFILE') label = "Cập nhật hồ sơ";
        else if(type === 'TRANSFER_LEADER') label = "Chuyển quyền";
        else label = "Chỉnh sửa";
    }

    if (type.includes('JOIN') || type.includes('APPROVE')) {
        color = "bg-indigo-50 text-indigo-700 border-indigo-200"; icon = User; label = "Gia nhập";
        if(type === 'APPROVE_MEMBER') label = "Duyệt thành viên";
        if(type === 'JOIN_GROUP') label = "Vào nhóm";
    }

    if (type.includes('GRADE') || type.includes('CONFIRM') || type.includes('REJECT')) {
        color = "bg-yellow-50 text-yellow-700 border-yellow-200"; icon = FileText; label = "Đánh giá";
        if(type.includes('GRADE')) label = "Chấm điểm";
        if(type === 'CONFIRM_SUBMISSION') label = "Duyệt bài";
        if(type === 'REJECT_SUBMISSION') label = "Yêu cầu nộp lại";
    }
    
    const IconComp = icon;

    return (
        <Badge variant="outline" className={cn("border flex w-fit items-center gap-1.5 px-2.5 py-0.5 font-medium rounded-md", color)}>
            <IconComp className="h-3.5 w-3.5" /> {label}
        </Badge>
    );
};

function getResourceName(type) {
    if (type.includes('LOGIN') || type.includes('LOGOUT')) return 'Hệ thống';
    if (type.includes('TASK')) return 'Công việc (Kanban)';
    if (type.includes('SUBMIT') || type.includes('CONFIRM') || type.includes('REJECT')) return 'Nộp bài';
    if (type.includes('GROUP') || type.includes('INVITE') || type.includes('REQUEST') || type.includes('JOIN')) return 'Nhóm';
    if (type.includes('MEETING')) return 'Lịch họp';
    if (type.includes('TOPIC') || type.includes('DETAI')) return 'Đề tài';
    if (type.includes('GRADE')) return 'Điểm số';
    if (type.includes('PROFILE') || type.includes('PASSWORD')) return 'Tài khoản';
    return 'Hệ thống';
}

function getResourceIcon(type) {
    if (type.includes('LOGIN') || type.includes('LOGOUT')) return Shield;
    if (type.includes('TASK')) return Activity;
    if (type.includes('SUBMIT')) return FileText;
    if (type.includes('GROUP')) return User;
    if (type.includes('MEETING')) return Calendar;
    return Monitor;
}

// Helper: Render chi tiết thông minh (Full view)
const DetailRenderer = ({ type, details }) => {
    if (!details || Object.keys(details).length === 0) return <span className="text-muted-foreground text-xs italic">Không có chi tiết</span>;

    // 1. Hiển thị Diff (Sự thay đổi Old -> New)
    if (details.changes && Array.isArray(details.changes)) {
        return (
            <div className="mt-2 flex flex-col gap-1.5 bg-muted/40 p-2.5 rounded-md border text-xs">
                <span className="font-semibold text-muted-foreground mb-0.5">Chi tiết thay đổi:</span>
                {details.changes.map((change, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground min-w-[80px]">
                            {FIELD_MAP[change.field] || change.field}:
                        </span>
                        <div className="flex items-center gap-2 flex-1">
                            <span className="line-through opacity-60 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 rounded text-red-600 dark:text-red-400 truncate max-w-[200px]">
                                {change.old ?? <span className="italic">Trống</span>}
                            </span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-green-600 dark:text-green-400 font-medium truncate max-w-[200px]">
                                {change.new ?? <span className="italic">Trống</span>}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // 2. Các loại log cụ thể khác
    if (type === 'LOGIN') {
        return <p className="text-xs text-muted-foreground">IP: {details.ip} • {details.user_agent?.split(')')[0]})</p>;
    }

    if (type === 'INVITE_MEMBER') {
         return (
             <div className="flex flex-col gap-1 mt-1">
                 <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
                     <Mail className="h-3 w-3" />
                     {details.count ? (
                        <span>Đã gửi lời mời cho {details.count} người</span>
                     ) : (
                        <span>Đã mời: {details.name} ({details.mssv})</span>
                     )}
                 </div>
                 {details.names && (
                     <p className="text-xs text-muted-foreground pl-5">
                        {details.names.join(', ')}
                     </p>
                 )}
             </div>
         );
    }
    
    if (type === 'JOIN_GROUP' || type === 'APPROVE_MEMBER') {
        return (
            <div className="flex items-center gap-2 mt-1 text-xs text-green-600 font-medium">
                <UserCheck className="h-3 w-3" />
                <span>Đã duyệt: {details.name || 'Thành viên mới'} {details.mssv ? `(${details.mssv})` : ''}</span>
            </div>
        );
    }

    if (type === 'TRANSFER_LEADER') {
         return (
             <div className="flex items-center gap-2 mt-1 text-xs text-orange-600">
                 <RefreshCw className="h-3 w-3" />
                 <span>Chuyển quyền cho: <strong>{details.new_leader}</strong></span>
             </div>
         );
    }
    
    // Grading Logs
    if (type && type.includes('GRADE')) {
         return (
             <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                        {details.new_score ?? details.score} điểm
                    </Badge>
                    {details.old_score !== undefined && (
                        <span className="text-xs text-muted-foreground flex items-center">
                            (Cũ: {details.old_score})
                        </span>
                    )}
                </div>
                {(details.note || details.comment) && (
                    <span className="text-xs text-muted-foreground italic border-l-2 pl-2">
                        "{details.note || details.comment}"
                    </span>
                )}
             </div>
         );
    }

    // Fallback: Hiển thị các thông tin text đơn giản
    if (details.topic_name) return <p className="text-xs text-muted-foreground mt-1">Đề tài: {details.topic_name}</p>;
    if (details.message) return <p className="text-xs text-muted-foreground italic mt-1">"{details.message}"</p>;
    
    // Fallback cuối cùng: In các cặp key-value còn lại
    return (
        <div className="text-xs text-muted-foreground mt-1">
            {Object.entries(details).map(([key, value]) => {
                if(typeof value === 'object') return null;
                return (
                    <span key={key} className="mr-3 inline-block">
                         <span className="font-medium text-foreground/70">{key}:</span> {value}
                    </span>
                )
            })}
        </div>
    );
};

export default function PersonalHistoryPage() {
    const { user } = useAuth();
    const [page, setPage] = useState(1);
    const [filterType, setFilterType] = useState(null); 
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch] = useDebounce(searchTerm, 500);
    const [isAutoRefresh, setIsAutoRefresh] = useState(false);

    const filterOptions = useMemo(() => {
        const role = user?.vaitro?.TEN_VAITRO;
        
        const commonOptions = [
            { value: 'LOGIN', label: 'Đăng nhập/Xuất' },
            { value: 'CHANGE_PASSWORD', label: 'Đổi mật khẩu' },
            { value: 'UPDATE_PROFILE', label: 'Cập nhật hồ sơ' },
            { value: 'TASK_CREATE', label: 'Tạo công việc (Kanban)' },
            { value: 'TASK_MOVE', label: 'Cập nhật công việc' },
            { value: 'TASK_UPDATE', label: 'Chỉnh sửa công việc' }, // Thêm cái này
            { value: 'CREATE_MEETING', label: 'Tạo lịch họp' },
        ];

        if (role === 'Sinh viên') {
            return [
                ...commonOptions,
                { value: 'CREATE_GROUP', label: 'Tạo nhóm' },
                { value: 'JOIN_GROUP', label: 'Gia nhập nhóm' },
                { value: 'REGISTER_TOPIC', label: 'Đăng ký đề tài' },
                { value: 'SUBMIT_PRODUCT', label: 'Nộp sản phẩm' },
                { value: 'INVITE_MEMBER', label: 'Mời thành viên' },
                { value: 'LEAVE_GROUP', label: 'Rời nhóm' },
                { value: 'SEND_REQUEST', label: 'Gửi yêu cầu' },
            ];
        }

        if (['Giảng viên', 'Trưởng khoa', 'Giáo vụ', 'Admin'].includes(role)) {
            return [
                ...commonOptions,
                { value: 'PROPOSE_TOPIC', label: 'Đề xuất đề tài' },
                { value: 'APPROVE_MEMBER', label: 'Duyệt thành viên' },
                { value: 'GRADE_HUONGDAN', label: 'Chấm điểm Hướng dẫn' },
                { value: 'GRADE_PHANBIEN', label: 'Chấm điểm Phản biện' },
                { value: 'GRADE_HOIDONG', label: 'Chấm điểm Hội đồng' },
                { value: 'CONFIRM_SUBMISSION', label: 'Xác nhận nộp bài' },
                { value: 'REJECT_SUBMISSION', label: 'Yêu cầu nộp lại' },
                { value: 'TRANSFER_LEADER', label: 'Chuyển quyền nhóm' },
            ];
        }

        return commonOptions;
    }, [user]);

    // Fetch Stats
    const { data: stats } = useQuery({
        queryKey: ['personal-history-stats'],
        queryFn: getPersonalHistoryStats,
        refetchInterval: isAutoRefresh ? 10000 : false,
    });

    // Fetch List
    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['personal-history', page, filterType, debouncedSearch],
        queryFn: () => getPersonalHistory({ 
            page, 
            per_page: 10,
            type: filterType, 
            search: debouncedSearch 
        }),
        refetchInterval: isAutoRefresh ? 10000 : false,
        keepPreviousData: true
    });

    const historyItems = data?.data || [];
    const totalPages = data?.last_page || 1;
    
    const toggleAutoRefresh = () => {
        setIsAutoRefresh(prev => {
            const newState = !prev;
            toast.info(newState ? "Đã BẬT tự động làm mới (10s)" : "Đã TẮT tự động làm mới");
            return newState;
        });
    };

    const resetFilters = () => {
        setFilterType(null);
        setSearchTerm('');
        setPage(1);
    };

    return (
        <div className="p-6 space-y-8 bg-background min-h-screen">
            
            {/* --- 1. HEADER & ACTIONS --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"> 
                <div className="flex gap-2">
                    <Button 
                        variant={isAutoRefresh ? "secondary" : "outline"} 
                        className={cn("gap-2", isAutoRefresh && "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100")}
                        onClick={toggleAutoRefresh}
                    >
                        <RefreshCw className={cn("h-4 w-4", isAutoRefresh && "animate-spin")} />
                        {isAutoRefresh ? "Auto Refresh: ON" : "Auto Refresh: OFF"}
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => refetch()} disabled={isLoading || isRefetching}>
                        <RefreshCw className={cn("h-4 w-4", (isLoading || isRefetching) && "animate-spin")} /> 
                        Làm mới
                    </Button>
                </div>
            </div>

            {/* --- 2. STATS CARDS --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Tổng hoạt động" value={stats?.total || 0} subtitle="Tất cả thời gian" icon={Activity} colorClass="bg-gray-100 text-gray-600" />
                <StatCard title="Hôm nay" value={stats?.today || 0} subtitle="Hoạt động trong ngày" icon={Calendar} colorClass="bg-blue-100 text-blue-600" />
                <StatCard title="Tạo mới" value={stats?.created || 0} subtitle="Các tạo mới" icon={PlusCircle} colorClass="bg-emerald-100 text-emerald-600" />
                <StatCard title="Cập nhật" value={stats?.updated || 0} subtitle="Chỉnh sửa/Cập nhật" icon={Edit3} colorClass="bg-orange-100 text-orange-600" />
                <StatCard title="Xác thực" value={stats?.auth || 0} subtitle="Đăng nhập/xuất" icon={Shield} colorClass="bg-purple-100 text-purple-600" />
            </div>

            {/* --- 3. MAIN CONTENT (FILTER & TABLE) --- */}
            <Card className="border shadow-sm">
                <CardHeader className="pb-4 border-b bg-muted/10">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div>
                            <CardTitle>Danh sách chi tiết</CardTitle>
                            <CardDescription>Hiển thị {data?.from || 0} - {data?.to || 0} trong tổng số {data?.total || 0} dòng</CardDescription>
                        </div>
                        
                        {/* TOOLBAR FILTER */}
                        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto items-center">
                            
                            <div className="relative w-full sm:w-[250px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Tìm kiếm nội dung..." 
                                    className="pl-9 h-8 bg-background" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <SimpleFacetedFilter 
                                title="Loại hành động"
                                options={filterOptions}
                                value={filterType}
                                onChange={(val) => { setFilterType(val); setPage(1); }}
                            />

                            {(filterType || searchTerm) && (
                                <Button 
                                    variant="ghost" 
                                    onClick={resetFilters}
                                    className="h-8 px-2 lg:px-3"
                                >
                                    Reset
                                    <X className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="p-0">
                    <div className="relative w-full overflow-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-[180px] font-semibold">Thời gian</TableHead>
                                    <TableHead className="w-[180px] font-semibold">Hành động</TableHead>
                                    <TableHead className="w-[150px] font-semibold">Tài nguyên</TableHead>
                                    <TableHead className="font-semibold">Mô tả chi tiết</TableHead>
                                    <TableHead className="w-[150px] text-right font-semibold">IP Address</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={5}>
                                                <div className="h-8 bg-muted rounded w-full animate-pulse"></div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : historyItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <History className="h-8 w-8 opacity-20" />
                                                <p>Không tìm thấy hoạt động nào phù hợp.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    historyItems.map((item) => {
                                        // Parse JSON detail
                                        const details = typeof item.CHI_TIET === 'string' ? JSON.parse(item.CHI_TIET) : (item.CHI_TIET || {});
                                        const resourceName = getResourceName(item.LOAI_HANH_DONG);
                                        const ResourceIcon = getResourceIcon(item.LOAI_HANH_DONG);

                                        return (
                                            <TableRow key={item.ID_LICHSU} className="hover:bg-muted/30 transition-colors">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-foreground">
                                                            {format(new Date(item.NGAY_TAO), "dd/MM/yyyy", { locale: vi })}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {format(new Date(item.NGAY_TAO), "HH:mm:ss")}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <ActionBadge type={item.LOAI_HANH_DONG} />
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                                                        <ResourceIcon className="h-4 w-4" />
                                                        {resourceName}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <span className="text-sm text-foreground block mb-1 font-medium">
                                                        {item.TIEU_DE}
                                                    </span>
                                                    
                                                    {/* Render chi tiết dựa trên loại hành động */}
                                                    <DetailRenderer type={item.LOAI_HANH_DONG} details={details} />
                                                </TableCell>

                                                <TableCell className="text-right text-xs text-muted-foreground font-mono">
                                                    {details.ip || '-'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    
                    {/* --- PAGINATION FOOTER --- */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t flex items-center justify-between bg-muted/10">
                            <div className="text-xs text-muted-foreground">
                                Trang {page} / {totalPages}
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" size="sm" 
                                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                                    disabled={page === 1 || isLoading}
                                >
                                    <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Trước
                                </Button>
                                <Button 
                                    variant="outline" size="sm" 
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                                    disabled={page === totalPages || isLoading}
                                >
                                    Sau <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}