import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSystemHistory } from '@/api/historyService';
import { getUsers } from '@/api/userService';
import { useDebounce } from 'use-debounce';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// Import Shared Components
import StatCard from '@/components/shared/StatCard'; 
import { CleanupDialog } from './components/CleanupDialog'; 

// UI Components
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { 
    Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious 
} from "@/components/ui/pagination";

// Icons
import { 
    Activity, Eye, Shield, User, LogIn, 
    Trash2, Edit, UserPlus, UserMinus, 
    Search, X, Filter, RefreshCw, AlertTriangle, 
    CheckCircle, Info, AlertCircle, Eraser, Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- 1. HELPER: CẤU HÌNH GIAO DIỆN LOG ---
const getLogStyle = (actionType) => {
    if (!actionType) return { 
        bg: 'bg-gray-50 border-gray-200', 
        text: 'text-gray-700', 
        icon: Activity, 
        status: 'default' 
    };

    // Nhóm Nguy hiểm
    if (actionType.includes('DELETE') || actionType.includes('REMOVE') || actionType.includes('REJECT')) {
        return { 
            bg: 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/20', 
            text: 'text-red-600 dark:text-red-400', 
            icon: Trash2, 
            status: 'destructive' 
        };
    }

    // Nhóm Cảnh báo/Sửa đổi
    if (actionType.includes('UPDATE') || actionType.includes('CHANGE') || actionType.includes('RESET')) {
        return { 
            bg: 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20', 
            text: 'text-amber-600 dark:text-amber-400', 
            icon: Edit, 
            status: 'warning' 
        };
    }

    // Nhóm Tích cực / Thông tin
    if (actionType === 'LOGIN') {
        return { 
            bg: 'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/20', 
            text: 'text-blue-600 dark:text-blue-400', 
            icon: LogIn, 
            status: 'info' 
        };
    }

    return { 
        bg: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20', 
        text: 'text-emerald-600 dark:text-emerald-400', 
        icon: CheckCircle, 
        status: 'success' 
    };
};

// --- 2. COMPONENT: USER FILTER ---
const UserFilter = ({ selectedUser, onSelect }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [debouncedSearch] = useDebounce(search, 300);
    
    const { data, isLoading } = useQuery({
        queryKey: ['users-search-log', debouncedSearch],
        queryFn: () => getUsers({ search: debouncedSearch, per_page: 10 }),
        enabled: open 
    });
    const users = data?.data || [];

    return (
        <div className="flex items-center gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-[200px] md:w-[250px] justify-between bg-white dark:bg-background h-10 border-dashed">
                        {selectedUser ? (
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Avatar className="h-5 w-5 border">
                                    <AvatarFallback>{selectedUser.HODEM_VA_TEN[0]}</AvatarFallback>
                                </Avatar>
                                <span className="truncate text-sm">{selectedUser.HODEM_VA_TEN}</span>
                            </div>
                        ) : (
                            <span className="text-muted-foreground flex items-center gap-2">
                                <User className="h-4 w-4" /> Lọc theo người dùng...
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput placeholder="Tìm tên/MSSV..." value={search} onValueChange={setSearch} />
                        <CommandList>
                            {isLoading ? <div className="p-2 text-center text-xs text-muted-foreground">Đang tìm...</div> : 
                            users.length === 0 ? <CommandEmpty>Không tìm thấy.</CommandEmpty> :
                            <CommandGroup heading="Kết quả tìm kiếm">
                                {users.map((user) => (
                                    <CommandItem key={user.ID_NGUOIDUNG} value={user.ID_NGUOIDUNG.toString()} onSelect={() => { onSelect(user); setOpen(false); }}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarFallback>{user.HODEM_VA_TEN[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{user.HODEM_VA_TEN}</span>
                                                <span className="text-[10px] text-muted-foreground">{user.MA_DINHDANH}</span>
                                            </div>
                                        </div>
                                    </CommandItem>
                                ))}
                             </CommandGroup>
                            }
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            
            {selectedUser && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onSelect(null)}
                    className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Bỏ lọc người dùng"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
};

// --- 3. [UPDATED] COMPONENT: LOG ITEM (FLEX LAYOUT) ---
// Sửa lỗi hiển thị chồng chéo bằng cách dùng Flexbox thay vì absolute position
const LogItem = ({ log, onClick, isLast }) => {
    const style = getLogStyle(log.LOAI_HANH_DONG);
    const Icon = style.icon;

    return (
        <div className="group relative flex gap-4 pb-0">
            {/* Cột Timeline bên trái */}
            <div className="flex flex-col items-center">
                {/* Icon tròn */}
                <div className={cn(
                    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm bg-background transition-transform group-hover:scale-110",
                    style.text
                )}>
                    <Icon className="h-4 w-4" />
                </div>
                {/* Đường nối dọc - Chỉ hiện nếu không phải item cuối */}
                {!isLast && (
                    <div className="w-px flex-1 bg-border/60 my-1" />
                )}
            </div>

            {/* Card nội dung bên phải */}
            <div 
                onClick={() => onClick(log)}
                className={cn(
                    "flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer min-w-0 mb-4", 
                    style.bg
                )}
            >
                <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground truncate">{log.TIEU_DE}</span>
                        <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-normal bg-background/50 whitespace-nowrap", style.text)}>
                            {log.LOAI_HANH_DONG}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                            <User className="h-3 w-3 shrink-0" />
                            {log.nguoidung ? (
                                <span className="font-medium text-foreground/80 hover:underline truncate max-w-[150px]">
                                    {log.nguoidung.HODEM_VA_TEN}
                                </span>
                            ) : (
                                <span className="italic">Hệ thống</span>
                            )}
                        </span>
                        {log.nguoidung && (
                            <>
                                <span className="hidden sm:inline">•</span>
                                <span className="font-mono text-xs hidden sm:inline">{log.nguoidung.MA_DINHDANH}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Thời gian */}
                <div className="flex items-center justify-between sm:justify-end gap-4 pl-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-black/5 dark:border-white/5 pt-2 sm:pt-0 shrink-0">
                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0 text-xs text-muted-foreground w-full sm:w-auto justify-between sm:justify-end">
                        <span className="font-medium text-foreground/70">{format(new Date(log.NGAY_TAO), "HH:mm")}</span>
                        <span className="whitespace-nowrap">{formatDistanceToNow(new Date(log.NGAY_TAO), { addSuffix: true, locale: vi })}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex shrink-0">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

// --- 4. COMPONENT: LOG DETAIL DIALOG (Có Diff View) ---
const LogDetailDialog = ({ log, isOpen, onOpenChange }) => {
    if (!log) return null;
    const details = typeof log.CHI_TIET === 'string' ? JSON.parse(log.CHI_TIET) : (log.CHI_TIET || {});
    const style = getLogStyle(log.LOAI_HANH_DONG);
    const Icon = style.icon;

    // Kiểm tra xem có phải là log cập nhật có old/new value không
    const hasDiff = details.hasOwnProperty('old_value') && details.hasOwnProperty('new_value') ||
                    details.hasOwnProperty('old') && details.hasOwnProperty('new');
    
    const oldVal = details.old_value ?? details.old;
    const newVal = details.new_value ?? details.new;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={cn("p-2.5 rounded-full bg-muted", style.text)}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg">{log.TIEU_DE}</DialogTitle>
                            <DialogDescription className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="font-normal text-xs">{log.LOAI_HANH_DONG}</Badge>
                                <span>•</span>
                                <span>{format(new Date(log.NGAY_TAO), "HH:mm:ss - dd/MM/yyyy", { locale: vi })}</span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                
                <div className="space-y-6">
                    {/* User Info */}
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                        <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                            <AvatarImage src={log.nguoidung?.AVATAR_URL || ''} />
                            <AvatarFallback className="text-sm font-bold text-primary">
                                {log.nguoidung?.HODEM_VA_TEN?.charAt(0) || '?'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Người thực hiện</p>
                            <p className="font-semibold text-base">{log.nguoidung?.HODEM_VA_TEN || 'Hệ thống'}</p>
                            <p className="text-sm text-muted-foreground font-mono">{log.nguoidung?.MA_DINHDANH}</p>
                        </div>
                    </div>

                    {/* Visual Diff (Nếu có) */}
                    {hasDiff && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Giá trị cũ</p>
                                <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-md text-sm font-medium break-all">
                                    {String(oldVal)}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Giá trị mới</p>
                                <div className="p-3 bg-green-50 text-green-700 border border-green-100 rounded-md text-sm font-medium break-all">
                                    {String(newVal)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Full JSON Payload */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-medium text-muted-foreground">Dữ liệu kỹ thuật</p>
                        </div>
                        <ScrollArea className="h-[200px] w-full rounded-md border bg-slate-950">
                            <div className="p-4">
                                <pre className="text-slate-50 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                                    {JSON.stringify(details, null, 2)}
                                </pre>
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// --- 5. MAIN PAGE ---
export default function AdminActivityLog() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebounce(search, 500);
    const [filterUser, setFilterUser] = useState(null);
    const [filterType, setFilterType] = useState('ALL');
    const [selectedLog, setSelectedLog] = useState(null);
    const [isCleanupOpen, setIsCleanupOpen] = useState(false);

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['admin-logs', page, debouncedSearch, filterType, filterUser?.ID_NGUOIDUNG],
        queryFn: () => getSystemHistory({ 
            page, 
            per_page: 20, 
            search: debouncedSearch,
            type: filterType,
            user_id: filterUser?.ID_NGUOIDUNG
        }),
        keepPreviousData: true,
    });

    const logs = data?.data || [];
    const total = data?.total || 0;
    const lastPage = data?.last_page || 1;

    // Group logs by date
    const groupedLogs = useMemo(() => {
        const groups = {};
        logs.forEach(log => {
            const dateKey = format(new Date(log.NGAY_TAO), 'yyyy-MM-dd');
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(log);
        });
        return groups;
    }, [logs]);

    // Mock Stats
    const stats = useMemo(() => ({
        total: total,
        errors: logs.filter(l => l.LOAI_HANH_DONG.includes('DELETE') || l.LOAI_HANH_DONG.includes('REJECT')).length,
        warnings: logs.filter(l => l.LOAI_HANH_DONG.includes('UPDATE')).length,
        info: logs.filter(l => !l.LOAI_HANH_DONG.includes('DELETE') && !l.LOAI_HANH_DONG.includes('UPDATE')).length,
    }), [logs, total]);

    return (
        <div className="p-6 h-full flex flex-col space-y-6 bg-muted/10 overflow-hidden animate-in fade-in duration-500">
            
            {/* 1. Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
                <StatCard title="Tổng số bản ghi" value={stats.total} description="Tổng hợp toàn hệ thống" icon={Activity} iconBgClass="bg-gray-100" iconColorClass="text-gray-600" />
                <StatCard title="Cảnh báo / Xóa" value={stats.errors} description="Hành động rủi ro cao" icon={AlertCircle} iconBgClass="bg-red-100" iconColorClass="text-red-600" />
                <StatCard title="Cập nhật / Sửa" value={stats.warnings} description="Thay đổi dữ liệu" icon={AlertTriangle} iconBgClass="bg-amber-100" iconColorClass="text-amber-600" />
                <StatCard title="Thông tin / Tạo" value={stats.info} description="Hoạt động thường nhật" icon={Info} iconBgClass="bg-blue-100" iconColorClass="text-blue-600" />
            </div>

            {/* 2. Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-card p-4 rounded-xl shadow-sm border flex-shrink-0 z-20">
                <div className="flex-1 w-full relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Tìm theo nội dung, mã, tên..." 
                        className="pl-10 h-10 border-none bg-muted/30 focus-visible:ring-0 focus-visible:bg-muted/50 transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <UserFilter selectedUser={filterUser} onSelect={setFilterUser} />
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className={cn("h-10 gap-2 border-dashed", filterType !== 'ALL' && "bg-primary/5 border-primary/50 text-primary")}>
                                <Filter className="h-4 w-4" /> 
                                {filterType === 'ALL' ? 'Loại hoạt động' : filterType}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Lọc theo hành động</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setFilterType('ALL')}>
                                {filterType === 'ALL' && <CheckCircle className="mr-2 h-4 w-4 text-primary" />} Tất cả
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterType('CREATE')}>Tạo mới (Create)</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterType('UPDATE')}>Cập nhật (Update)</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterType('DELETE')}>Xóa (Delete)</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterType('LOGIN')}>Đăng nhập (Login)</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isRefetching} title="Làm mới">
                        <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
                    </Button>
                    
                    <Separator orientation="vertical" className="h-6" />

                    {/* Nút Dọn dẹp */}
                    <Button 
                        variant="destructive" 
                        size="sm" 
                        className="gap-2 px-3"
                        onClick={() => setIsCleanupOpen(true)}
                    >
                        <Eraser className="h-4 w-4" /> Dọn dẹp
                    </Button>
                </div>
            </div>

            {/* 3. List View (Grouped by Date) */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="space-y-6 pb-6 pl-1">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                        </div>
                    ) : logs.length > 0 ? (
                        Object.keys(groupedLogs).map(dateKey => {
                            const dateObj = new Date(dateKey);
                            let dateLabel = format(dateObj, 'EEEE, dd/MM/yyyy', { locale: vi });
                            if (isToday(dateObj)) dateLabel = "Hôm nay";
                            if (isYesterday(dateObj)) dateLabel = "Hôm qua";

                            return (
                                <div key={dateKey} className="relative">
                                    <div className="sticky top-0 z-10 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-4 border-b">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-primary/50"></div>
                                            {dateLabel}
                                        </h3>
                                    </div>
                                    <div className="space-y-0 ml-1"> 
                                        {groupedLogs[dateKey].map((log, idx) => (
                                            <LogItem 
                                                key={log.ID_LICHSU} 
                                                log={log} 
                                                onClick={setSelectedLog} 
                                                isLast={idx === groupedLogs[dateKey].length - 1}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-20 bg-white dark:bg-card rounded-xl border border-dashed">
                            <Shield className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-medium">Không tìm thấy nhật ký</h3>
                            <p className="text-muted-foreground">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
                        </div>
                    )}

                    {/* Pagination */}
                    {lastPage > 1 && (
                        <div className="flex justify-center mt-8">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious 
                                            onClick={() => setPage(p => Math.max(1, p - 1))} 
                                            className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <span className="px-4 text-sm font-medium text-muted-foreground">
                                            Trang {page} / {lastPage}
                                        </span>
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationNext 
                                            onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                                            className={page === lastPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </div>
            </div>

            <LogDetailDialog log={selectedLog} isOpen={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)} />
            
            <CleanupDialog isOpen={isCleanupOpen} onOpenChange={setIsCleanupOpen} />
        </div>
    );
}