import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, Inbox } from 'lucide-react';
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

    // Mutation: Đánh dấu đã đọc
    const markReadMutation = useMutation({
        mutationFn: markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['unreadCount']);
        }
    });

    // Mutation: Xóa thông báo
    const deleteMutation = useMutation({
        mutationFn: deleteNotification,
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['unreadCount']);
            toast.success("Đã xóa thông báo");
        }
    });

    const handleMarkAllRead = () => markReadMutation.mutate(null);
    const handleMarkOneRead = (id) => markReadMutation.mutate(id);
    const handleDeleteOne = (id) => deleteMutation.mutate(id);

    // Lọc danh sách hiển thị theo Tab
    const displayNotifications = activeTab === 'unread' 
        ? notifications.filter(n => !n.DA_DOC) 
        : notifications;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-muted/60 transition-colors">
                    <Bell className={cn("h-5 w-5 transition-all", open ? "fill-current text-primary" : "text-muted-foreground")} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-in zoom-in duration-300">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[380px] p-0 overflow-hidden shadow-xl border-border/60" align="end" sideOffset={8}>
                
                {/* HEADER */}
                <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Thông báo</h3>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                            onClick={handleMarkAllRead}
                            disabled={markReadMutation.isPending}
                        >
                            <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> 
                            Đánh dấu đã đọc
                        </Button>
                    )}
                </div>

                {/* TABS */}
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="px-4 pt-2">
                        <TabsList className="w-full grid grid-cols-2 h-9">
                            <TabsTrigger value="all" className="text-xs">Tất cả</TabsTrigger>
                            <TabsTrigger value="unread" className="text-xs">
                                Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* CONTENT AREA */}
                    <div className="relative min-h-[300px]">
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
                                            onMarkRead={handleMarkOneRead}
                                            onDelete={handleDeleteOne}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground px-4 text-center">
                                    <div className="bg-muted/50 p-4 rounded-full mb-3">
                                        <Inbox className="h-8 w-8 opacity-40" />
                                    </div>
                                    <p className="text-sm font-medium">Không có thông báo nào</p>
                                    <p className="text-xs mt-1 opacity-70">
                                        {activeTab === 'unread' ? "Bạn đã đọc hết tất cả thông báo." : "Bạn chưa nhận được thông báo nào."}
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
                        className="w-full h-9 text-xs font-medium justify-center text-muted-foreground hover:text-primary"
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