import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markAsRead, deleteNotification, getUnreadCount } from '@/api/notificationService';
import { useDebounce } from 'use-debounce';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// [SỬA] Import StatCard dùng chung
import StatCard from '@/components/shared/StatCard';

// UI Components
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Icons
import { 
    Bell, BellOff, Star, Calendar, Search, MoreVertical, 
    CheckCircle, Trash2, MailOpen, BookOpen, Info, AlertTriangle, Clock 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// --- 1. COMPONENTS CON ---

// Helper lấy style cho từng loại thông báo
const getNotificationStyle = (type, isRead) => {
    if (isRead) return { bg: 'bg-white', border: 'border-gray-100', iconBg: 'bg-gray-100 text-gray-500', icon: Bell };

    switch (type) {
        case 'ACADEMIC': // Quan trọng
            return { bg: 'bg-yellow-50', border: 'border-yellow-200', iconBg: 'bg-yellow-500 text-white', icon: Star };
        case 'SYSTEM': // Cảnh báo
            return { bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-500 text-white', icon: AlertTriangle };
        case 'GROUP': 
            return { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-500 text-white', icon: Info };
        case 'TASK':
            return { bg: 'bg-white', border: 'border-gray-200', iconBg: 'bg-orange-100 text-orange-600', icon: Calendar };
        default:
            return { bg: 'bg-white', border: 'border-gray-200', iconBg: 'bg-gray-100 text-gray-600', icon: Bell };
    }
};

// Item thông báo (Card Style)
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
                    {/* Badge Loại (Mobile hidden) */}
                     {!notification.DA_DOC && (
                        <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] h-5 px-1.5 bg-white/80 backdrop-blur-sm shadow-sm">
                            Mới
                        </Badge>
                    )}
                </div>
                
                <p className={cn("text-sm line-clamp-2 mb-2", notification.DA_DOC ? "text-muted-foreground" : "text-gray-700")}>
                    {notification.NOI_DUNG}
                </p>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.NGAY_TAO), { addSuffix: true, locale: vi })}
                    </span>
                    {/* Nút Điểm/Chi tiết giả lập nếu là loại Academic */}
                    {notification.LOAI_THONGBAO === 'ACADEMIC' && (
                        <Badge variant="outline" className="bg-white h-5 px-2 cursor-pointer hover:bg-gray-50">
                            Chi tiết
                        </Badge>
                    )}
                </div>
            </div>

            {/* Actions Dropdown (Absolute top-right) */}
            <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-white/50">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {!notification.DA_DOC && (
                            <DropdownMenuItem onClick={() => onMarkRead(notification.ID_THONGBAO)}>
                                <MailOpen className="mr-2 h-4 w-4" /> Đánh dấu đã đọc
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onDelete(notification.ID_THONGBAO)} className="text-red-600 focus:text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Xóa thông báo
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            {/* Blue dot indicator for unread */}
            {!notification.DA_DOC && (
                <div className="absolute top-4 left-[-6px] w-2 h-2 bg-blue-500 rounded-full shadow-sm" />
            )}
        </div>
    );
};

// --- 2. MAIN PAGE ---
export default function NotificationPage() {
    // Mặc định vào tab 'important'
    const [currentTab, setCurrentTab] = useState('important'); 
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebounce(search, 300);
    const queryClient = useQueryClient();

    // 1. Lấy thống kê số lượng (Badge)
    const { data: countData } = useQuery({
        queryKey: ['unreadCount'],
        queryFn: getUnreadCount,
        refetchInterval: 30000,
    });
    const unreadCount = countData?.count || 0;

    // 2. Lấy danh sách thông báo (Client-side filter cho mượt với số lượng ít, 
    // hoặc Server-side filter nếu data lớn. Ở đây dùng Server-side cơ bản + Client logic)
    const { data: notiData, isLoading } = useQuery({
        queryKey: ['notifications-page', currentTab], 
        queryFn: () => getNotifications({ 
            page: 1, 
            per_page: 50, // Lấy nhiều chút để filter client-side cho tab Quan trọng
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

    // --- LOGIC LỌC DỮ LIỆU ---
    const filteredNotifications = useMemo(() => {
        let items = allNotifications;

        // 1. Lọc theo Tab
        if (currentTab === 'important') {
            // Quan trọng = ACADEMIC hoặc SYSTEM
            items = items.filter(n => ['ACADEMIC', 'SYSTEM'].includes(n.LOAI_THONGBAO));
        } else if (currentTab === 'unread') {
            items = items.filter(n => !n.DA_DOC);
        }
        // 'all' -> lấy hết

        // 2. Lọc theo Search
        if (debouncedSearch) {
            const s = debouncedSearch.toLowerCase();
            items = items.filter(n => n.TIEU_DE.toLowerCase().includes(s) || n.NOI_DUNG.toLowerCase().includes(s));
        }

        return items;
    }, [allNotifications, currentTab, debouncedSearch]);

    // --- GOM NHÓM THEO NGÀY ---
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

    // Mock stats cho các thẻ (Ngoài unreadCount là thật)
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
                    <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-gray-100 text-gray-600">{items.length}</Badge>
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
        // [SỬA] Max-width 7xl
        <div className="container mx-auto p-4 md:p-8 max-w-7xl space-y-6">
            
            {/* 1. Header Stats [SỬA] Dùng Shared StatCard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Tất cả" 
                    value={stats.total} 
                    description="Tổng thông báo" // Dùng description thay vì subtitle
                    icon={Bell} 
                    iconBgClass="bg-gray-100" 
                    iconColorClass="text-gray-600" 
                />
                <StatCard 
                    title="Chưa đọc" 
                    value={stats.unread} 
                    description="Cần xem ngay" 
                    icon={BellOff} 
                    iconBgClass="bg-orange-100" 
                    iconColorClass="text-orange-600" 
                />
                <StatCard 
                    title="Quan trọng" 
                    value={stats.important} 
                    description="Ưu tiên cao" 
                    icon={Star} 
                    iconBgClass="bg-red-100" 
                    iconColorClass="text-red-600" 
                />
                <StatCard 
                    title="Hôm nay" 
                    value={stats.today} 
                    description="Thông báo mới" 
                    icon={Calendar} 
                    iconBgClass="bg-blue-100" 
                    iconColorClass="text-blue-600" 
                />
            </div>

            {/* 2. Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Tìm kiếm thông báo..." 
                    className="pl-12 h-12 rounded-xl bg-white dark:bg-card border-gray-200 shadow-sm text-base focus-visible:ring-1 focus-visible:ring-primary"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* 3. Tabs & Content */}
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                <div className="flex items-center justify-between mb-6">
                    {/* Tab Pills */}
                    <TabsList className="h-10 bg-muted/50 p-1 rounded-full">
                        <TabsTrigger 
                            value="important" 
                            className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
                        >
                            <Star className="w-4 h-4 mr-2" /> Quan trọng
                        </TabsTrigger>
                        <TabsTrigger 
                            value="all" 
                            className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
                        >
                            Tất cả <Badge className="ml-2 h-4 px-1 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-200">{stats.total}</Badge>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="unread" 
                            className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
                        >
                            Chưa đọc <Badge className="ml-2 h-4 px-1 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-100">{stats.unread}</Badge>
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => markReadMutation.mutate(null)}>
                            <CheckCircle className="w-4 h-4 mr-2" /> Đọc tất cả
                        </Button>
                    </div>
                </div>

                <div className="bg-transparent min-h-[400px]">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                        </div>
                    ) : filteredNotifications.length > 0 ? (
                        <>
                            {renderGroup("Hôm nay", groupedNotifications.today)}
                            {renderGroup("Hôm qua", groupedNotifications.yesterday)}
                            {renderGroup("Cũ hơn", groupedNotifications.older)}
                        </>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed rounded-xl border-gray-200 bg-gray-50/50">
                            <div className="bg-white p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center shadow-sm mb-4">
                                <BellOff className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Không có thông báo</h3>
                            <p className="text-gray-500">Bạn đã xem hết tất cả thông báo trong mục này.</p>
                        </div>
                    )}
                </div>
            </Tabs>
        </div>
    );
}