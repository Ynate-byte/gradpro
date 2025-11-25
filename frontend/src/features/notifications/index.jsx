import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markAsRead, deleteNotification, getUnreadCount } from '@/api/notificationService';
import { useDebounce } from 'use-debounce';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';
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
    CheckCircle, Trash2, MailOpen, Clock, AlertTriangle, Info, Megaphone, BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- 1. HELPER STYLES ---
const getNotificationStyle = (type, isRead) => {
    if (isRead) return { bg: 'bg-white dark:bg-card', border: 'border-gray-100 dark:border-border', iconBg: 'bg-gray-100 text-gray-500', icon: Bell };

    switch (type) {
        case 'ACADEMIC':
            return { bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-200 dark:border-emerald-800', iconBg: 'bg-emerald-100 text-emerald-600', icon: BookOpen };
        case 'SYSTEM':
            return { bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800', iconBg: 'bg-blue-100 text-blue-600', icon: Megaphone };
        case 'GROUP':
            return { bg: 'bg-violet-50 dark:bg-violet-900/10', border: 'border-violet-200 dark:border-violet-800', iconBg: 'bg-violet-100 text-violet-600', icon: Info };
        case 'TASK':
            return { bg: 'bg-orange-50 dark:bg-orange-900/10', border: 'border-orange-200 dark:border-orange-800', iconBg: 'bg-orange-100 text-orange-600', icon: Calendar };
        default:
            return { bg: 'bg-white dark:bg-card', border: 'border-gray-200', iconBg: 'bg-gray-100 text-gray-600', icon: Bell };
    }
};

// --- 2. ITEM COMPONENT ---
const NotificationCard = ({ notification, onMarkRead, onDelete }) => {
    const navigate = useNavigate();
    const { bg, border, iconBg, icon: Icon } = getNotificationStyle(notification.LOAI_THONGBAO, notification.DA_DOC);

    const handleClick = () => {
        if (!notification.DA_DOC) onMarkRead(notification.ID_THONGBAO);
        if (notification.LIEN_KET) navigate(notification.LIEN_KET);
    };

    return (
        <div className={cn("group relative flex items-start gap-4 p-4 rounded-xl border transition-all mb-3 hover:shadow-md cursor-pointer", bg, border)} onClick={handleClick}>
            {/* Icon */}
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm mt-1", iconBg)}>
                <Icon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <h4 className={cn("text-sm font-semibold pr-8", notification.DA_DOC ? "text-muted-foreground" : "text-foreground")}>
                        {notification.TIEU_DE}
                    </h4>
                    {!notification.DA_DOC && (
                        <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] h-5 px-1.5 bg-background/80 backdrop-blur-sm shadow-sm">
                            Mới
                        </Badge>
                    )}
                </div>
                
                <p className={cn("text-sm line-clamp-2 mb-2", notification.DA_DOC ? "text-muted-foreground" : "text-foreground/80")}>
                    {notification.NOI_DUNG}
                </p>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-background/50">
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
            
            {/* Blue dot for unread */}
            {!notification.DA_DOC && (
                <div className="absolute top-4 left-[-6px] w-2 h-2 bg-blue-500 rounded-full shadow-sm" />
            )}
        </div>
    );
};

// --- 3. MAIN PAGE ---
export default function NotificationPage() {
    const [currentTab, setCurrentTab] = useState('all'); // Mặc định xem tất cả
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

    // 2. Lấy danh sách thông báo
    const { data: notiData, isLoading } = useQuery({
        queryKey: ['notifications-page', currentTab], 
        queryFn: () => getNotifications({ 
            page: 1, 
            per_page: 50, 
            filter: currentTab === 'unread' ? 'unread' : null 
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

    // Filter Logic
    const filteredNotifications = useMemo(() => {
        let items = allNotifications;

        if (currentTab === 'important') {
            items = items.filter(n => ['ACADEMIC', 'SYSTEM'].includes(n.LOAI_THONGBAO));
        } else if (currentTab === 'unread') {
            items = items.filter(n => !n.DA_DOC);
        }

        if (debouncedSearch) {
            const s = debouncedSearch.toLowerCase();
            items = items.filter(n => n.TIEU_DE.toLowerCase().includes(s) || n.NOI_DUNG.toLowerCase().includes(s));
        }
        return items;
    }, [allNotifications, currentTab, debouncedSearch]);

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

    const stats = {
        total: allNotifications.length,
        unread: unreadCount,
        important: allNotifications.filter(n => ['ACADEMIC', 'SYSTEM'].includes(n.LOAI_THONGBAO) && !n.DA_DOC).length,
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
        <div className="container mx-auto p-4 md:p-8 max-w-7xl space-y-6">
            
            {/* 1. HEADER & ACTIONS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Thông báo</h1>
                    <p className="text-muted-foreground text-sm">Cập nhật các hoạt động mới nhất từ hệ thống.</p>
                </div>
                
                {/* [THÊM] Nút Gửi thông báo chung (Chỉ hiện với Admin/Quản lý) */}
                {canBroadcast && (
                    <div className="flex shrink-0">
                        <CreateNotificationDialog />
                    </div>
                )}
            </div>

            {/* 2. Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Tất cả" 
                    value={stats.total} 
                    description="Tổng thông báo"
                    icon={Bell} 
                    iconBgClass="bg-gray-100 dark:bg-gray-800" 
                    iconColorClass="text-gray-600 dark:text-gray-400" 
                    isActive={currentTab === 'all'}
                    onClick={() => setCurrentTab('all')}
                />
                <StatCard 
                    title="Chưa đọc" 
                    value={stats.unread} 
                    description="Cần xem ngay" 
                    icon={BellOff} 
                    iconBgClass="bg-orange-100 dark:bg-orange-900/20" 
                    iconColorClass="text-orange-600 dark:text-orange-400" 
                    isActive={currentTab === 'unread'}
                    onClick={() => setCurrentTab('unread')}
                    hasStatusDot={stats.unread > 0}
                />
                <StatCard 
                    title="Quan trọng" 
                    value={stats.important} 
                    description="Học tập & Hệ thống" 
                    icon={Star} 
                    iconBgClass="bg-red-100 dark:bg-red-900/20" 
                    iconColorClass="text-red-600 dark:text-red-400" 
                    isActive={currentTab === 'important'}
                    onClick={() => setCurrentTab('important')}
                />
                <StatCard 
                    title="Hôm nay" 
                    value={stats.today} 
                    description="Thông báo mới" 
                    icon={Calendar} 
                    iconBgClass="bg-blue-100 dark:bg-blue-900/20" 
                    iconColorClass="text-blue-600 dark:text-blue-400" 
                />
            </div>

            {/* 3. Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Tìm kiếm theo tiêu đề hoặc nội dung..." 
                    className="pl-12 h-12 rounded-xl bg-background border-input shadow-sm text-base focus-visible:ring-1 focus-visible:ring-primary"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* 4. Main Content */}
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                    <TabsList className="h-10 bg-muted p-1 rounded-lg">
                        <TabsTrigger value="all" className="px-4">Tất cả</TabsTrigger>
                        <TabsTrigger value="unread" className="px-4">Chưa đọc</TabsTrigger>
                        <TabsTrigger value="important" className="px-4">Quan trọng</TabsTrigger>
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
                            <p className="text-muted-foreground text-sm">Bạn không có thông báo nào phù hợp với bộ lọc hiện tại.</p>
                        </div>
                    )}
                </div>
            </Tabs>
        </div>
    );
}