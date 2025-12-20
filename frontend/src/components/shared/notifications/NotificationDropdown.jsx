import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, Inbox, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationItem } from './NotificationItem';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAsRead, deleteNotification } from '@/api/notificationService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function NotificationDropdown({ notifications, unreadCount, isLoading }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("all");

    // Check tin khẩn cấp
    const hasUrgentUnread = notifications.some(n => !n.DA_DOC && n.DO_UU_TIEN === 'URGENT');

    // --- MUTATIONS ---
    const markReadMutation = useMutation({
        mutationFn: markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['unreadCount']);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteNotification,
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['unreadCount']);
            toast.success("Đã xóa thông báo");
        }
    });

    // --- HANDLERS ---
    const handleMarkAllRead = () => {
        if (unreadCount === 0) return;
        markReadMutation.mutate(null, {
            onSuccess: () => toast.success("Đã đánh dấu tất cả là đã đọc")
        });
    };

    // Filter logic
    const getFilteredNotifications = () => {
        if (activeTab === 'unread') return notifications.filter(n => !n.DA_DOC);
        if (activeTab === 'academic') return notifications.filter(n => n.LOAI_THONGBAO === 'ACADEMIC');
        if (activeTab === 'work') return notifications.filter(n => ['TASK', 'GROUP'].includes(n.LOAI_THONGBAO));
        return notifications;
    };

    const displayNotifications = getFilteredNotifications();

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-muted transition-colors">
                    <Bell 
                        className={cn(
                            "h-5 w-5 transition-all", 
                            open ? "fill-current text-primary" : 
                            hasUrgentUnread ? "text-red-500 animate-bell-shake" : "text-muted-foreground"
                        )} 
                    />
                    {unreadCount > 0 && (
                        <span className={cn(
                            "absolute top-1.5 right-1.5 flex h-2.5 w-2.5 rounded-full ring-2 ring-background animate-in zoom-in duration-300",
                            hasUrgentUnread ? "bg-red-600" : "bg-red-500"
                        )} />
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[400px] p-0 overflow-hidden shadow-xl border-border/60" align="end" sideOffset={8}>
                
                {/* HEADER */}
                <div className="p-3 px-4 border-b bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm">Thông báo</h3>
                        {unreadCount > 0 && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                                {unreadCount} mới
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={handleMarkAllRead}
                            disabled={markReadMutation.isPending}
                        >
                            <CheckCheck className="mr-1.5 h-3 w-3" /> 
                            Đọc tất cả
                        </Button>
                    )}
                </div>

                {/* TABS & FILTER */}
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="px-4 pt-2 border-b">
                        <TabsList className="w-full justify-start h-9 bg-transparent p-0 gap-4">
                            <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2 text-xs">Tất cả</TabsTrigger>
                            <TabsTrigger value="unread" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2 text-xs">Chưa đọc</TabsTrigger>
                            <TabsTrigger value="academic" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2 text-xs">Học tập</TabsTrigger>
                            <TabsTrigger value="work" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2 text-xs">Công việc</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* CONTENT LIST */}
                    <div className="relative min-h-[300px] bg-background/50">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : null}

                        <ScrollArea className="h-[350px]">
                            {displayNotifications.length > 0 ? (
                                <div className="flex flex-col">
                                    {displayNotifications.map((noti) => (
                                        <NotificationItem 
                                            key={noti.ID_THONGBAO} 
                                            notification={noti} 
                                            onMarkRead={(id) => markReadMutation.mutate(id)}
                                            onDelete={(id) => deleteMutation.mutate(id)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[300px] text-center p-4">
                                    <div className="bg-muted/50 p-4 rounded-full mb-3">
                                        <Inbox className="h-8 w-8 text-muted-foreground/40" />
                                    </div>
                                    <p className="text-sm font-medium text-foreground">Không có thông báo mới</p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                                        {activeTab === 'unread' 
                                            ? "Bạn đã đọc hết tất cả thông báo quan trọng." 
                                            : "Hiện tại bạn chưa nhận được thông báo nào."}
                                    </p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </Tabs>

                {/* FOOTER */}
                <div className="p-2 border-t bg-muted/10">
                    <Button 
                        variant="ghost" 
                        className="w-full h-8 text-xs font-medium justify-center text-muted-foreground hover:text-primary"
                        onClick={() => {
                            setOpen(false);
                            navigate('/notifications');
                        }}
                    >
                        Xem toàn bộ lịch sử
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}