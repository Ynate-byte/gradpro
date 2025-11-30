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
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Icons
import { 
    Bell, BellOff, Star, Calendar, Search, MoreVertical, 
    Trash2, MailOpen, Clock, AlertTriangle, AlertCircle, 
    Megaphone, BookOpen, Info, Zap, Users, CheckCircle
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

// --- 2. ITEM COMPONENT (COMPACT VERSION) ---
const NotificationCard = ({ notification, onMarkRead, onDelete }) => {
    const navigate = useNavigate();
    const { icon: Icon, color, bg } = getNotificationStyle(notification.LOAI_THONGBAO);
    
    const priority = notification.DO_UU_TIEN || 'NORMAL';
    const metaData = notification.DU_LIEU_GOC || {};
    const isUnread = !notification.DA_DOC;

    const handleClick = () => {
        if (isUnread) onMarkRead(notification.ID_THONGBAO);
        if (notification.LIEN_KET) navigate(notification.LIEN_KET);
    };

    const getPriorityClasses = () => {
        if (!isUnread) return "bg-white dark:bg-card border-gray-200 dark:border-border opacity-70 hover:opacity-100"; 

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
                "group relative flex items-start gap-3 p-3 rounded-lg border transition-all mb-2 hover:shadow-md cursor-pointer", 
                getPriorityClasses()
            )} 
            onClick={handleClick}
        >
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5 shadow-sm", bg, color)}>
                <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-1.5 pr-6">
                        {priority === 'URGENT' && <AlertTriangle className="h-3.5 w-3.5 text-red-600 animate-pulse shrink-0" />}
                        {priority === 'HIGH' && <AlertCircle className="h-3.5 w-3.5 text-orange-500 shrink-0" />}

                        {/* [COMPACT] Font size nhỏ gọn */}
                        <h4 className={cn("text-sm font-semibold leading-tight", isUnread ? "text-foreground" : "text-muted-foreground")}>
                            {notification.TIEU_DE}
                        </h4>
                    </div>
                    
                    {isUnread && priority === 'NORMAL' && (
                        <Badge variant="secondary" className="shrink-0 text-[9px] h-4 px-1">Mới</Badge>
                    )}
                </div>
                
                {/* [COMPACT] Giảm line-clamp xuống 2 và chỉnh text size */}
                <p className={cn("text-xs line-clamp-2 leading-relaxed", isUnread ? "text-foreground/80" : "text-muted-foreground")}>
                    {notification.NOI_DUNG}
                </p>

                {/* Metadata Chips */}
                {(metaData.deadline || metaData.quota || metaData.score) && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {metaData.deadline && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 border border-red-200">
                                <Clock className="w-3 h-3 mr-1" />
                                Hạn: {format(new Date(metaData.deadline), 'HH:mm dd/MM')}
                            </span>
                        )}
                        {metaData.score && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                <Zap className="w-3 h-3 mr-1" />
                                Điểm: {metaData.score}
                            </span>
                        )}
                        {metaData.quota && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                                Chỉ tiêu: {metaData.quota}
                            </span>
                        )}
                    </div>
                )}
                
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.NGAY_TAO), { addSuffix: true, locale: vi })}
                    </span>
                </div>
            </div>

            {/* Dropdown Actions */}
            <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {!notification.DA_DOC && (
                            <DropdownMenuItem onClick={() => onMarkRead(notification.ID_THONGBAO)}>
                                <MailOpen className="mr-2 h-3.5 w-3.5" /> Đánh dấu đã đọc
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onDelete(notification.ID_THONGBAO)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Xóa thông báo
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};

// --- 3. MAIN PAGE ---
export default function NotificationPage() {
    const [currentTab, setCurrentTab] = useState('all'); 
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebounce(search, 300);
    const queryClient = useQueryClient();
    
    const { user } = useAuth();
    const role = user?.vaitro?.TEN_VAITRO;
    const positionCodes = user?.giangvien?.chucvus?.map(c => c.MA_CHUCVU) || [];
    const canBroadcast = role === 'Admin' || positionCodes.includes('TRUONG_KHOA') || positionCodes.includes('GIAO_VU');

    const { data: countData } = useQuery({
        queryKey: ['unreadCount'],
        queryFn: getUnreadCount,
        refetchInterval: 30000,
    });
    const unreadCount = countData?.count || 0;

    const { data: notiData, isLoading } = useQuery({
        queryKey: ['notifications-page', currentTab, debouncedSearch], 
        queryFn: () => getNotifications({ 
            page: 1, 
            per_page: 50, 
            filter: currentTab === 'unread' ? 'unread' : null,
            priority: currentTab === 'important' ? 'important' : null,
            search: debouncedSearch 
        }),
        keepPreviousData: true,
    });

    const allNotifications = notiData?.data || [];

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

    const filteredNotifications = useMemo(() => {
        let items = allNotifications;
        if (debouncedSearch) {
            const s = debouncedSearch.toLowerCase();
            items = items.filter(n => n.TIEU_DE.toLowerCase().includes(s) || n.NOI_DUNG.toLowerCase().includes(s));
        }
        return items;
    }, [allNotifications, debouncedSearch]);

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
        total: notiData?.total || 0,
        unread: unreadCount,
        important: allNotifications.filter(n => ['HIGH', 'URGENT'].includes(n.DO_UU_TIEN)).length,
        today: allNotifications.filter(n => isToday(new Date(n.NGAY_TAO))).length
    };

    const renderGroup = (title, items) => {
        if (!items || items.length === 0) return null;
        return (
            <div className="mb-6 animate-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center justify-between mb-2 px-1 sticky top-0 bg-background/95 backdrop-blur z-10 py-1">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</h3>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">{items.length}</Badge>
                </div>
                <div>
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

    const compactStatCardClass = "p-2 shadow-sm border bg-card hover:bg-accent/5 transition-colors cursor-pointer"; 

    return (
        <div className="h-full flex flex-col p-8 gap-4 bg-background overflow-hidden animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">          
                {canBroadcast && (
                    <div className="flex shrink-0">
                        <CreateNotificationDialog />
                    </div>
                )}
            </div>

            {/* 2. Stat Cards (Shrink 0) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                <StatCard 
                    title="Tất cả" 
                    value={stats.total} 
                    icon={Bell} 
                    isActive={currentTab === 'all'}
                    onClick={() => setCurrentTab('all')}
                    className={compactStatCardClass}
                />
                <StatCard 
                    title="Chưa đọc" 
                    value={stats.unread} 
                    icon={BellOff} 
                    iconBgClass="bg-blue-100 dark:bg-blue-900/20" 
                    iconColorClass="text-blue-600 dark:text-blue-400" 
                    isActive={currentTab === 'unread'}
                    onClick={() => setCurrentTab('unread')}
                    hasStatusDot={stats.unread > 0}
                    className={compactStatCardClass}
                />
                <StatCard 
                    title="Quan trọng" 
                    value={null} 
                    icon={Star} 
                    iconBgClass="bg-orange-100 dark:bg-orange-900/20" 
                    iconColorClass="text-orange-600 dark:text-orange-400" 
                    isActive={currentTab === 'important'}
                    onClick={() => setCurrentTab('important')}
                    className={compactStatCardClass}
                />
                <StatCard 
                    title="Hôm nay" 
                    value={stats.today} 
                    icon={Calendar} 
                    iconBgClass="bg-emerald-100 dark:bg-emerald-900/20" 
                    iconColorClass="text-emerald-600 dark:text-emerald-400" 
                    className={compactStatCardClass}
                />
            </div>

            {/* 3. Filter & Content (Flex 1 + Overflow) */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Tìm kiếm thông báo..." 
                            className="pl-9 h-9 bg-muted/30"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    
                    <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full sm:w-auto">
                        <TabsList className="h-9 w-full sm:w-auto">
                            <TabsTrigger value="all" className="text-xs px-3">Tất cả</TabsTrigger>
                            <TabsTrigger value="unread" className="text-xs px-3">Chưa đọc</TabsTrigger>
                            <TabsTrigger value="important" className="text-xs px-3 text-orange-700 dark:text-orange-400">
                                Quan trọng
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <Button variant="ghost" size="sm" onClick={() => markReadMutation.mutate(null)} disabled={unreadCount === 0} className="h-9">
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Đọc tất cả
                    </Button>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                    {isLoading ? (
                        <div className="space-y-3 mt-2">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                        </div>
                    ) : filteredNotifications.length > 0 ? (
                        <div className="pb-10">
                            {renderGroup("Hôm nay", groupedNotifications.today)}
                            {renderGroup("Hôm qua", groupedNotifications.yesterday)}
                            {renderGroup("Cũ hơn", groupedNotifications.older)}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-muted/20 mt-4">
                            <div className="bg-background p-3 rounded-full shadow-sm mb-3">
                                <BellOff className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-sm font-semibold">Không có thông báo</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                {currentTab === 'important' ? "Bạn không có thông báo quan trọng nào." : "Chưa có thông báo mới."}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}