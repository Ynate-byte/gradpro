import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGroupHistory } from '@/api/historyService';
import { getGroupDetailsById } from '@/api/groupService';
import { useDebounce } from 'use-debounce';
import { format, isToday, isYesterday, formatDistanceToNow, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from "@/lib/utils";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

// Icons
import { 
    Search, CheckCircle, MessageSquare, FileText, 
    Calendar, PlusCircle, Activity, Clock, Star, Users, BookOpen, 
    Filter, ChevronDown 
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- 0. SUB-COMPONENT: HIGHLIGHTS (Giữ nguyên) ---
const Highlights = ({ items }) => {
    const importantEvents = items.filter(item => {
        const isImportant = ['CONFIRM_SUBMISSION', 'TASK_COMPLETE', 'CREATE_MEETING', 'SUBMIT_PRODUCT'].includes(item.LOAI_HANH_DONG);
        const eventDate = new Date(item.NGAY_TAO);
        const isRecent = differenceInDays(new Date(), eventDate) <= 4; 

        return isImportant && isRecent;
    }).slice(0, 7);

    if (importantEvents.length === 0) return null;

    return (
        <Card className="mb-6 border shadow-sm bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-800">
            <CardContent className="p-4">
                <div className="mb-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
                        <Star className="h-5 w-5" /> Sự kiện nổi bật
                    </h3>
                </div>
                <div className="space-y-2">
                    {importantEvents.map(item => (
                        <div key={item.ID_LICHSU} className="flex items-start gap-3 p-2 bg-white dark:bg-card rounded-lg border border-yellow-100 dark:border-yellow-800 shadow-sm">
                            <div className="mt-0.5 p-1 rounded-full bg-yellow-100 text-yellow-600">
                                <Star className="h-3 w-3 fill-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
                                    {item.TIEU_DE}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(item.NGAY_TAO), { addSuffix: true, locale: vi })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

// --- 1. SUB-COMPONENT: TIMELINE ITEM (Giữ nguyên) ---
const TimelineItem = ({ item, isLast }) => {
    // ... (Giữ nguyên code cũ)
    const details = typeof item.CHI_TIET === 'string' ? JSON.parse(item.CHI_TIET) : (item.CHI_TIET || {});
    
    let Icon = Activity;
    let colorClass = "bg-gray-100 text-gray-600";
    let statusLabel = "Hoạt động";

    if (item.LOAI_HANH_DONG === 'CONFIRM_SUBMISSION' || item.LOAI_HANH_DONG === 'TASK_COMPLETE') {
        Icon = CheckCircle;
        colorClass = "bg-green-500 text-white";
        statusLabel = "Hoàn thành";
    } else if (item.LOAI_HANH_DONG.includes('COMMENT') || item.LOAI_HANH_DONG === 'ADD_SUGGESTION') {
        Icon = MessageSquare;
        colorClass = "bg-blue-500 text-white";
        statusLabel = "Bình luận";
    } else if (item.LOAI_HANH_DONG === 'SUBMIT_PRODUCT' || item.LOAI_HANH_DONG === 'UPLOAD_FILE') {
        Icon = FileText;
        colorClass = "bg-purple-500 text-white";
        statusLabel = "Tải lên";
    } else if (item.LOAI_HANH_DONG === 'TASK_CREATE') {
        Icon = PlusCircle;
        colorClass = "bg-blue-100 text-blue-600";
        statusLabel = "Công việc mới";
    } else if (item.LOAI_HANH_DONG.includes('MEETING')) {
        Icon = Calendar;
        colorClass = "bg-orange-100 text-orange-600";
        statusLabel = "Lịch họp";
    } else if (['JOIN_GROUP', 'LEAVE_GROUP', 'INVITE_MEMBER', 'TRANSFER_LEADER'].includes(item.LOAI_HANH_DONG)) {
        Icon = Users;
        colorClass = "bg-pink-100 text-pink-600";
        statusLabel = "Thành viên";
    }

    const timeAgo = formatDistanceToNow(new Date(item.NGAY_TAO), { addSuffix: true, locale: vi });
    const timeAbsolute = format(new Date(item.NGAY_TAO), "HH:mm");

    return (
        <div className="flex gap-4 relative pb-8 last:pb-0 group">
            {!isLast && (
                <div className="absolute left-[19px] top-10 bottom-0 w-[2px] bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors" />
            )}

            <div className={cn(
                "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm border border-white dark:border-gray-950 transition-transform group-hover:scale-110",
                colorClass
            )}>
                <Icon className="h-5 w-5" />
            </div>

            <Card className="flex-1 border shadow-sm hover:shadow-md transition-all duration-200">
                <CardContent className="p-4">
                    <div className="flex gap-3">
                        <Avatar className="h-8 w-8 bg-gray-100 border hidden sm:flex">
                            <AvatarFallback className="text-xs font-medium text-gray-600">
                                {item.nguoidung?.HODEM_VA_TEN ? item.nguoidung.HODEM_VA_TEN.charAt(0).toUpperCase() : '?'}
                            </AvatarFallback>
                        </Avatar>

                        <div className="space-y-1 flex-1">
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                                <span className="font-semibold mr-1">
                                    {item.nguoidung?.HODEM_VA_TEN || 'Thành viên'}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400">
                                    {item.TIEU_DE.replace(item.nguoidung?.HODEM_VA_TEN, '').trim()}
                                </span>
                                {details.task_title && <span className="font-semibold ml-1">"{details.task_title}"</span>}
                            </div>
                            
                            {details.comment && (
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded text-sm text-gray-600 dark:text-gray-300 italic border-l-2 border-gray-300">
                                    "{details.comment}"
                                </div>
                            )}

                             <div className="flex items-center gap-3 mt-2 pt-1">
                                <div className="flex items-center text-xs text-muted-foreground" title={timeAbsolute}>
                                    <Clock className="mr-1 h-3 w-3" />
                                    {timeAgo}
                                </div>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs font-mono text-muted-foreground">{timeAbsolute}</span>
                                
                                <Badge variant="secondary" className="ml-auto text-[10px] px-2 h-5 font-normal bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                    {statusLabel}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// --- 2. RIGHT SIDEBAR (Giữ nguyên) ---
const RightSidebar = ({ members, stats, selectedMemberId, onMemberClick }) => {
    // ... (Giữ nguyên code cũ)
    return (
        <div className="space-y-6">
            {/* Mức độ tham gia */}
            <Card className="border-none shadow-none bg-transparent">
                <div className="mb-4">
                    <h3 className="font-semibold text-lg">Hoạt động thành viên</h3>
                    <p className="text-sm text-muted-foreground">Click để lọc lịch sử theo người</p>
                </div>
                <div className="space-y-2">
                    {members.map((member) => {
                        const isSelected = selectedMemberId === member.ID_NGUOIDUNG;
                        return (
                            <div 
                                key={member.ID_NGUOIDUNG} 
                                onClick={() => onMemberClick(member.ID_NGUOIDUNG)}
                                className={cn(
                                    "p-2 rounded-lg border transition-all cursor-pointer hover:bg-muted",
                                    isSelected 
                                        ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 ring-1 ring-blue-300" 
                                        : "bg-card border-transparent hover:border-border"
                                )}
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 bg-gray-100 border">
                                                <AvatarFallback className="text-xs">{member.HODEM_VA_TEN.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className={cn("text-sm font-medium leading-none flex items-center gap-2", isSelected && "text-blue-700 dark:text-blue-300")}>
                                                    {member.HODEM_VA_TEN}
                                                    {member.IS_LEADER && (
                                                        <Badge variant="secondary" className="text-[10px] h-4 px-1">Leader</Badge>
                                                    )}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{member.activity_count} hoạt động</span>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold">{member.participation_rate}%</span>
                                    </div>
                                    <Progress value={member.participation_rate} className={cn("h-1.5", isSelected && "bg-blue-100 [&>div]:bg-blue-600")} />
                                </div>
                            </div>
                        );
                    })}
                    {selectedMemberId && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onMemberClick(null)}
                            className="w-full mt-2 text-xs h-7"
                        >
                            Bỏ lọc thành viên
                        </Button>
                    )}
                </div>
            </Card>

            <Separator />

            {/* Phân loại hoạt động (Stats) */}
            <Card className="border-none shadow-none bg-transparent">
                <div className="mb-4">
                    <h3 className="font-semibold text-lg">Thống kê loại</h3>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" /><span>Hoàn thành</span></div>
                        <span className="font-medium">{stats.completed}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /><span>Công việc mới</span></div>
                        <span className="font-medium">{stats.new_tasks}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-500" /><span>Bình luận</span></div>
                        <span className="font-medium">{stats.comments}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500" /><span>Tải lên</span></div>
                        <span className="font-medium">{stats.uploads}</span>
                    </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" /><span>Lịch họp</span></div>
                        <span className="font-medium">{stats.meetings}</span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-pink-500" /><span>Thành viên</span></div>
                        <span className="font-medium">{stats.members_action}</span>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- 3. MAIN COMPONENT ---
const GroupHistoryTab = ({ groupId }) => {
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [selectedMemberId, setSelectedMemberId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch] = useDebounce(searchTerm, 300);
    
    // [UPDATED] State cho phân trang phía Client
    const [visibleCount, setVisibleCount] = useState(10);
    const ITEMS_PER_PAGE = 10;

    const { data: historyData, isLoading: loadingHistory } = useQuery({
        queryKey: ['group-history', groupId, debouncedSearch],
        queryFn: () => getGroupHistory(groupId, { per_page: 100, search: debouncedSearch }),
        
        enabled: !!groupId && groupId !== '0', 
        
        staleTime: 1000 * 60,
        refetchOnWindowFocus: false,
        retry: 1,
    });

    const { data: groupData } = useQuery({
        queryKey: ['group-details', groupId],
        queryFn: () => getGroupDetailsById(groupId),
        enabled: !!groupId,
        staleTime: 1000 * 60 * 5,
    });

    const historyItems = historyData?.data || [];

    // [UPDATED] Reset visibleCount khi thay đổi filter/search/member
    useEffect(() => {
        setVisibleCount(ITEMS_PER_PAGE);
    }, [activeFilter, selectedMemberId, debouncedSearch]);

    // Tính toán thống kê (trên toàn bộ dữ liệu historyItems)
    const stats = useMemo(() => {
        return {
            completed: historyItems.filter(i => i.LOAI_HANH_DONG === 'CONFIRM_SUBMISSION' || i.LOAI_HANH_DONG === 'TASK_COMPLETE').length,
            new_tasks: historyItems.filter(i => i.LOAI_HANH_DONG === 'TASK_CREATE').length,
            comments: historyItems.filter(i => i.LOAI_HANH_DONG.includes('COMMENT')).length,
            uploads: historyItems.filter(i => i.LOAI_HANH_DONG === 'SUBMIT_PRODUCT').length,
            meetings: historyItems.filter(i => i.LOAI_HANH_DONG.includes('MEETING')).length,
            members_action: historyItems.filter(i => ['JOIN_GROUP', 'LEAVE_GROUP', 'INVITE_MEMBER', 'TRANSFER_LEADER'].includes(i.LOAI_HANH_DONG)).length,
            topics: historyItems.filter(i => ['REGISTER_TOPIC', 'UPDATE_TOPIC'].includes(i.LOAI_HANH_DONG)).length,
        };
    }, [historyItems]);

    const memberStats = useMemo(() => {
        if (!groupData) return [];
        const members = groupData.thanhviens?.map(tv => tv.nguoidung) || [];
        const totalActions = historyItems.length || 1; 

        return members.map(member => {
            const memberActions = historyItems.filter(i => i.ID_NGUOIDUNG === member.ID_NGUOIDUNG);
            const count = memberActions.length;
            const lastAction = memberActions[0]; 

            return {
                ...member,
                IS_LEADER: member.ID_NGUOIDUNG === groupData.ID_NHOMTRUONG,
                activity_count: count,
                participation_rate: Math.round((count / totalActions) * 100) || 0,
                last_activity: lastAction ? lastAction.TIEU_DE : 'Chưa có hoạt động'
            };
        }).sort((a, b) => b.participation_rate - a.participation_rate); 
    }, [groupData, historyItems]);

    // Logic lọc dữ liệu
    const filteredItems = useMemo(() => {
        let items = historyItems;

        if (selectedMemberId) {
            items = items.filter(i => i.ID_NGUOIDUNG === selectedMemberId);
        }

        if (activeFilter === 'ALL') return items;
        if (activeFilter === 'COMPLETED') return items.filter(i => i.LOAI_HANH_DONG === 'CONFIRM_SUBMISSION' || i.LOAI_HANH_DONG === 'TASK_COMPLETE');
        if (activeFilter === 'NEW_TASK') return items.filter(i => i.LOAI_HANH_DONG === 'TASK_CREATE');
        if (activeFilter === 'COMMENT') return items.filter(i => i.LOAI_HANH_DONG.includes('COMMENT'));
        if (activeFilter === 'UPLOAD') return items.filter(i => i.LOAI_HANH_DONG === 'SUBMIT_PRODUCT');
        if (activeFilter === 'MEETING') return items.filter(i => i.LOAI_HANH_DONG.includes('MEETING'));
        if (activeFilter === 'MEMBER') return items.filter(i => ['JOIN_GROUP', 'LEAVE_GROUP', 'INVITE_MEMBER', 'TRANSFER_LEADER'].includes(i.LOAI_HANH_DONG));
        if (activeFilter === 'TOPIC') return items.filter(i => ['REGISTER_TOPIC', 'UPDATE_TOPIC'].includes(i.LOAI_HANH_DONG));
        
        return items;
    }, [historyItems, activeFilter, selectedMemberId]);

    // [UPDATED] Cắt danh sách hiển thị dựa trên visibleCount
    const visibleItems = useMemo(() => {
        return filteredItems.slice(0, visibleCount);
    }, [filteredItems, visibleCount]);

    // [UPDATED] Logic nhóm ngày tháng áp dụng trên visibleItems
    const groupedTimeline = useMemo(() => {
        const groups = { today: [], yesterday: [], older: [] };
        visibleItems.forEach(item => { // Dùng visibleItems
            const date = new Date(item.NGAY_TAO);
            if (isToday(date)) {
                groups.today.push(item);
            } else if (isYesterday(date)) {
                groups.yesterday.push(item);
            } else {
                groups.older.push(item);
            }
        });
        return groups;
    }, [visibleItems]);

    const handleMemberClick = (memberId) => {
        if (selectedMemberId === memberId) {
            setSelectedMemberId(null); 
        } else {
            setSelectedMemberId(memberId); 
        }
    };

    // [UPDATED] Xử lý nút Xem thêm
    const handleShowMore = () => {
        setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    };

    // Các biến hiển thị bộ lọc (như cũ)
    const filterOptions = [
        { value: 'ALL', label: 'Tất cả', count: selectedMemberId ? filteredItems.length : historyItems.length },
        { value: 'COMPLETED', label: 'Hoàn thành', count: stats.completed, icon: CheckCircle },
        { value: 'NEW_TASK', label: 'Việc mới', count: stats.new_tasks, icon: PlusCircle },
        { value: 'COMMENT', label: 'Bình luận', count: stats.comments, icon: MessageSquare, hidden: true },
        { value: 'UPLOAD', label: 'Tải lên', count: stats.uploads, icon: FileText, hidden: true },
        { value: 'MEETING', label: 'Lịch họp', count: stats.meetings, icon: Calendar, hidden: true },
        { value: 'MEMBER', label: 'Thành viên', count: stats.members_action, icon: Users, hidden: true },
        { value: 'TOPIC', label: 'Đề tài', count: stats.topics, icon: BookOpen, hidden: true },
    ];

    const visibleFilters = filterOptions.filter(f => !f.hidden);
    const hiddenFilters = filterOptions.filter(f => f.hidden);
    const isHiddenFilterActive = hiddenFilters.some(f => f.value === activeFilter);

    // Nút lọc component
    const FilterButton = ({ label, value, count, icon: Icon }) => (
        <Button
            variant={activeFilter === value ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(value)}
            className={cn(
                "h-8 rounded-full text-xs font-medium transition-all",
                activeFilter === value 
                    ? "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-black" 
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700"
            )}
        >
            {Icon && <Icon className="h-3 w-3 mr-1.5 opacity-70" />}
            {label}
            {count !== undefined && <span className="ml-1.5 opacity-70">{count}</span>}
        </Button>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-1">
            <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Thanh tìm kiếm & Filter */}
                <div className="flex flex-col gap-4">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                            placeholder="Tìm kiếm hoạt động..." 
                            className="pl-10 bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 h-11 text-base"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                        {visibleFilters.map((filter) => (
                            <FilterButton key={filter.value} {...filter} />
                        ))}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant={isHiddenFilterActive ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                        "h-8 rounded-full text-xs font-medium transition-all gap-1 pr-2",
                                        isHiddenFilterActive 
                                            ? "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-black"
                                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700"
                                    )}
                                >
                                    <Filter className="h-3 w-3 mr-1" />
                                    {isHiddenFilterActive ? hiddenFilters.find(f => f.value === activeFilter)?.label : "Bộ lọc khác"}
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                                <DropdownMenuLabel>Chọn loại hoạt động</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {hiddenFilters.map((filter) => {
                                    const Icon = filter.icon;
                                    const isActive = activeFilter === filter.value;
                                    return (
                                        <DropdownMenuItem 
                                            key={filter.value} 
                                            onClick={() => setActiveFilter(filter.value)}
                                            className={cn("flex items-center justify-between cursor-pointer", isActive && "bg-muted font-medium")}
                                        >
                                            <div className="flex items-center gap-2">
                                                {Icon && <Icon className="h-4 w-4 opacity-70" />}
                                                <span>{filter.label}</span>
                                            </div>
                                            <Badge variant="secondary" className="text-[10px] h-5 px-1">{filter.count}</Badge>
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* 2. Highlights */}
                {!selectedMemberId && activeFilter === 'ALL' && <Highlights items={historyItems} />}

                {/* 3. Timeline */}
                <div className="space-y-8">
                    {loadingHistory ? (
                        <div className="text-center py-10 text-muted-foreground">Đang tải...</div>
                    ) : (
                        <>
                            {selectedMemberId && (
                                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <span className="text-sm text-blue-700 dark:text-blue-300">
                                        Đang lọc hoạt động của: <strong>{memberStats.find(m => m.ID_NGUOIDUNG === selectedMemberId)?.HODEM_VA_TEN}</strong>
                                    </span>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedMemberId(null)} className="h-6 text-xs hover:bg-blue-100">
                                        Xóa lọc
                                    </Button>
                                </div>
                            )}

                            {/* Today */}
                            {groupedTimeline.today.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-4 mb-4">
                                        <h4 className="text-sm font-medium text-gray-500">Hôm nay</h4>
                                        <Separator className="flex-1" />
                                        <Badge variant="secondary" className="rounded-full px-2">{groupedTimeline.today.length}</Badge>
                                    </div>
                                    <div className="space-y-0">
                                        {groupedTimeline.today.map((item, idx) => (
                                            <TimelineItem key={item.ID_LICHSU} item={item} isLast={idx === groupedTimeline.today.length - 1} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Yesterday */}
                            {groupedTimeline.yesterday.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-4 mb-4 mt-2">
                                        <h4 className="text-sm font-medium text-gray-500">Hôm qua</h4>
                                        <Separator className="flex-1" />
                                        <Badge variant="secondary" className="rounded-full px-2">{groupedTimeline.yesterday.length}</Badge>
                                    </div>
                                    <div className="space-y-0">
                                        {groupedTimeline.yesterday.map((item, idx) => (
                                            <TimelineItem key={item.ID_LICHSU} item={item} isLast={idx === groupedTimeline.yesterday.length - 1} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Older */}
                            {groupedTimeline.older.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-4 mb-4 mt-2">
                                        <h4 className="text-sm font-medium text-gray-500">Cũ hơn</h4>
                                        <Separator className="flex-1" />
                                    </div>
                                    <div className="space-y-0">
                                        {groupedTimeline.older.map((item, idx) => (
                                            <TimelineItem key={item.ID_LICHSU} item={item} isLast={idx === groupedTimeline.older.length - 1} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* [UPDATED] Nút Xem thêm */}
                            {visibleCount < filteredItems.length && (
                                <div className="flex justify-center pt-4 pb-2">
                                    <Button 
                                        variant="outline" 
                                        onClick={handleShowMore}
                                        className="gap-2 text-muted-foreground"
                                    >
                                        Xem thêm hoạt động cũ hơn
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            {filteredItems.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                                    Không tìm thấy hoạt động nào phù hợp.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="lg:col-span-1 pl-0 lg:pl-4">
                <div className="sticky top-6">
                    <RightSidebar 
                        members={memberStats} 
                        stats={stats} 
                        selectedMemberId={selectedMemberId}
                        onMemberClick={handleMemberClick}
                    />
                </div>
            </div>
        </div>
    );
};

export default GroupHistoryTab;