import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markAsRead, deleteNotification, getUnreadCount } from '@/api/notificationService';
import { useDebounce } from 'use-debounce';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Components
import StatCard from '@/components/shared/StatCard';
import { CreateNotificationDialog } from '@/components/admin/notifications/CreateNotificationDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Icons
import { 
    Bell, BellOff, Star, Calendar, Search, MoreVertical, 
    CheckCircle, Trash2, MailOpen, Clock, AlertTriangle, AlertCircle, 
    Megaphone, BookOpen, Info, Zap, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- 1. HELPER STYLES ---
const getNotificationStyle = (type) => {
    switch (type) {
        case 'ACADEMIC':
            return { icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100' };
        case 'SYSTEM':
            return { icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-100' };
        case 'GROUP':
            return { icon: Users, color: 'text-violet-600', bg: 'bg-violet-100' };
        case 'TASK':
            return { icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-100' };
        default:
            return { icon: Info, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
};

// --- 2. ITEM COMPONENT (Đã cập nhật Priority) ---
const NotificationCard = ({ notification, onMarkRead, onDelete }) => {
    const navigate = useNavigate();
    const { icon: Icon, color, bg } = getNotificationStyle(notification.LOAI_THONGBAO);
    
    // Lấy mức độ ưu tiên và metadata
    const priority = notification.DO_UU_TIEN || 'NORMAL';
    const metaData = notification.DU_LIEU_GOC || {};
    const isUnread = !notification.DA_DOC;

    const handleClick = () => {
        if (isUnread) onMarkRead(notification.ID_THONGBAO);
        if (notification.LIEN_KET) navigate(notification.LIEN_KET);
    };

    // Style dựa trên độ ưu tiên
    const getPriorityClasses = () => {
        if (!isUnread) return "bg-white dark:bg-card border-gray-200 dark:border-border opacity-80 hover:opacity-100"; // Đã đọc

        switch (priority) {
            case 'URGENT':
                return "bg-red-50 dark:bg-red-950/20 border-red-500 border-l-4 shadow-sm";
            case 'HIGH':
                return "bg-orange-50 dark:bg-orange-950/20 border-orange-500 border-l-4 shadow-sm";
            default:
                return "bg-blue-50/50 dark:bg-blue-900/10 border-blue-500 border-l-4 shadow-sm";
        }
    };

    return (
        <div 
            className={cn(
                "group relative flex items-start gap-4 p-4 rounded-xl border transition-all mb-3 hover:shadow-md cursor-pointer", 
                getPriorityClasses()
            )} 
            onClick={handleClick}
        >
            {/* Icon */}
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full mt-1 shadow-sm", bg, color)}>
                <Icon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 pr-6">
                        {/* Icon cảnh báo cho mức độ khẩn cấp */}
                        {priority === 'URGENT' && <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse shrink-0" />}
                        {priority === 'HIGH' && <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />}

                        <h4 className={cn("text-sm font-semibold leading-snug", isUnread ? "text-foreground" : "text-muted-foreground")}>
                            {notification.TIEU_DE}
                        </h4>
                    </div>
                    
                    {/* Badge Mới */}
                    {isUnread && priority === 'NORMAL' && (
                        <Badge variant="secondary" className="shrink-0 text-[10px] h-5 px-1.5">Mới</Badge>
                    )}
                </div>
                
                <p className={cn("text-sm line-clamp-2 leading-relaxed", isUnread ? "text-foreground/80" : "text-muted-foreground")}>
                    {notification.NOI_DUNG}
                </p>

                {/* --- Metadata Chips (Điểm số, Hạn chót...) --- */}
                {(metaData.deadline || metaData.quota || metaData.score) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {metaData.deadline && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 border border-red-200">
                                <Clock className="w-3 h-3 mr-1" />
                                Hạn: {format(new Date(metaData.deadline), 'HH:mm dd/MM')}
                            </span>
                        )}
                        {metaData.score && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                <Zap className="w-3 h-3 mr-1" />
                                Điểm: {metaData.score}
                            </span>
                        )}
                        {metaData.quota && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                                Chỉ tiêu: {metaData.quota}
                            </span>
                        )}
                    </div>
                )}
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.NGAY_TAO), { addSuffix: true, locale: vi })}
                    </span>
                </div>
            </div>

            {/* Dropdown Actions */}
            <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {!notification.DA_DOC && (
                            <DropdownMenuItem onClick={() => onMarkRead(notification.ID_THONGBAO)}>
                                <MailOpen className="mr-2 h-4 w-4" /> Đánh dấu đã đọc
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onDelete(notification.ID_THONGBAO)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Xóa thông báo
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};

// --- 3. MAIN PAGE ---
export default function NotificationPage() {
    const [currentTab, setCurrentTab] = useState('all'); // all | unread | important
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebounce(search, 300);
    const queryClient = useQueryClient();
    
    const { user } = useAuth();
    const role = user?.vaitro?.TEN_VAITRO;
    const positionCodes = user?.giangvien?.chucvus?.map(c => c.MA_CHUCVU) || [];
    const canBroadcast = role === 'Admin' || positionCodes.includes('TRUONG_KHOA') || positionCodes.includes('GIAO_VU');

    // 1. Lấy thống kê số lượng
    const { data: countData } = useQuery({
        queryKey: ['unreadCount'],
        queryFn: getUnreadCount,
        refetchInterval: 30000,
    });
    const unreadCount = countData?.count || 0;

    // 2. Lấy danh sách thông báo (Có lọc server-side theo tab)
    const { data: notiData, isLoading } = useQuery({
        queryKey: ['notifications-page', currentTab, debouncedSearch], 
        queryFn: () => getNotifications({ 
            page: 1, 
            per_page: 50, 
            filter: currentTab === 'unread' ? 'unread' : null,
            priority: currentTab === 'important' ? 'important' : null, // Gửi tham số priority lên server
            search: debouncedSearch // Nếu backend hỗ trợ tìm kiếm
        }),
        keepPreviousData: true,
    });

    const allNotifications = notiData?.data || [];

    // Mutations
    const markReadMutation = useMutation({
        mutationFn: markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications-page']);
            queryClient.invalidateQueries(['unreadCount']);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteNotification,
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications-page']);
            queryClient.invalidateQueries(['unreadCount']);
        }
    });

    // Filter Logic (Client-side fallback cho search)
    const filteredNotifications = useMemo(() => {
        let items = allNotifications;
        // Filter search client-side nếu backend chưa hỗ trợ full text search
        if (debouncedSearch) {
            const s = debouncedSearch.toLowerCase();
            items = items.filter(n => n.TIEU_DE.toLowerCase().includes(s) || n.NOI_DUNG.toLowerCase().includes(s));
        }
        return items;
    }, [allNotifications, debouncedSearch]);

    // Group by Date
    const groupedNotifications = useMemo(() => {
        const groups = { today: [], yesterday: [], older: [] };
        filteredNotifications.forEach(item => {
            const date = new Date(item.NGAY_TAO);
            if (isToday(date)) groups.today.push(item);
            else if (isYesterday(date)) groups.yesterday.push(item);
            else groups.older.push(item);
        });
        return groups;
    }, [filteredNotifications]);

    // Thống kê giả định cho UI (Trong thực tế có thể lấy từ API nếu cần chính xác)
    const stats = {
        total: notiData?.total || 0,
        unread: unreadCount,
        // Đếm số quan trọng trong trang hiện tại
        important: allNotifications.filter(n => ['HIGH', 'URGENT'].includes(n.DO_UU_TIEN)).length,
        today: allNotifications.filter(n => isToday(new Date(n.NGAY_TAO))).length
    };

    const renderGroup = (title, items) => {
        if (!items || items.length === 0) return null;
        return (
            <div className="mb-6 animate-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-sm font-bold text-foreground">{title}</h3>
                    <Badge variant="secondary" className="text-[10px] h-5 px-2">{items.length}</Badge>
                </div>
                <div className="space-y-1">
                    {items.map(noti => (
                        <NotificationCard 
                            key={noti.ID_THONGBAO} 
                            notification={noti} 
                            onMarkRead={(id) => markReadMutation.mutate(id)}
                            onDelete={(id) => deleteMutation.mutate(id)}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
            
            {/* 1. HEADER & ACTIONS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Thông báo</h1>
                    <p className="text-muted-foreground text-sm">Cập nhật các hoạt động mới nhất từ hệ thống.</p>
                </div>
                
                {canBroadcast && (
                    <div className="flex shrink-0">
                        <CreateNotificationDialog />
                    </div>
                )}
            </div>

            {/* 2. Stat Cards (Sử dụng dữ liệu thực tế hơn) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard 
                    title="Tất cả" 
                    value={stats.total} 
                    description="Tổng số tin"
                    icon={Bell} 
                    isActive={currentTab === 'all'}
                    onClick={() => setCurrentTab('all')}
                />
                <StatCard 
                    title="Chưa đọc" 
                    value={stats.unread} 
                    description="Cần xem ngay" 
                    icon={BellOff} 
                    iconBgClass="bg-blue-100 dark:bg-blue-900/20" 
                    iconColorClass="text-blue-600 dark:text-blue-400" 
                    isActive={currentTab === 'unread'}
                    onClick={() => setCurrentTab('unread')}
                    hasStatusDot={stats.unread > 0}
                />
                <StatCard 
                    title="Quan trọng" 
                    value={stats.important} // Hiển thị số lượng quan trọng trong trang hiện tại
                    description="Khẩn cấp / Cao" 
                    icon={Star} 
                    iconBgClass="bg-orange-100 dark:bg-orange-900/20" 
                    iconColorClass="text-orange-600 dark:text-orange-400" 
                    isActive={currentTab === 'important'}
                    onClick={() => setCurrentTab('important')}
                />
                <StatCard 
                    title="Hôm nay" 
                    value={stats.today} 
                    description="Mới nhất" 
                    icon={Calendar} 
                    iconBgClass="bg-emerald-100 dark:bg-emerald-900/20" 
                    iconColorClass="text-emerald-600 dark:text-emerald-400" 
                />
            </div>

            {/* 3. Search & Tabs */}
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Tìm kiếm theo tiêu đề hoặc nội dung..." 
                        className="pl-12 h-12 rounded-xl bg-background border-input shadow-sm text-base focus-visible:ring-1 focus-visible:ring-primary"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                    <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                        <TabsList className="h-10 bg-muted p-1 rounded-lg">
                            <TabsTrigger value="all" className="px-4">Tất cả</TabsTrigger>
                            <TabsTrigger value="unread" className="px-4">Chưa đọc</TabsTrigger>
                            <TabsTrigger value="important" className="px-4 text-orange-700 dark:text-orange-400 data-[state=active]:text-orange-800 data-[state=active]:font-bold">
                                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Quan trọng
                            </TabsTrigger>
                        </TabsList>

                        <Button variant="outline" size="sm" onClick={() => markReadMutation.mutate(null)} disabled={unreadCount === 0}>
                            <CheckCircle className="w-4 h-4 mr-2" /> Đánh dấu đã đọc tất cả
                        </Button>
                    </div>

                    <div className="min-h-[400px]">
                        {isLoading ? (
                            <div className="space-y-4 mt-4">
                                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                            </div>
                        ) : filteredNotifications.length > 0 ? (
                            <div className="mt-4">
                                {renderGroup("Hôm nay", groupedNotifications.today)}
                                {renderGroup("Hôm qua", groupedNotifications.yesterday)}
                                {renderGroup("Cũ hơn", groupedNotifications.older)}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-muted/30 mt-4">
                                <div className="bg-background p-4 rounded-full shadow-sm mb-4">
                                    <BellOff className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold">Không tìm thấy thông báo</h3>
                                <p className="text-muted-foreground text-sm">
                                    {currentTab === 'important' 
                                        ? "Bạn không có thông báo quan trọng nào." 
                                        : "Bạn chưa nhận được thông báo nào phù hợp."}
                                </p>
                            </div>
                        )}
                    </div>
                </Tabs>
            </div>
        </div>
    );
}