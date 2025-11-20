import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationItem } from './NotificationItem';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAsRead } from '@/api/notificationService';
import { cn } from '@/lib/utils';

export function NotificationDropdown({ notifications, unreadCount, isLoading }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const markReadMutation = useMutation({
        mutationFn: markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['unreadCount']);
        }
    });

    const handleMarkAllRead = () => {
        markReadMutation.mutate(null); // null = all
    };

    const handleMarkOneRead = (id) => {
        markReadMutation.mutate(id);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in duration-300">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 md:w-96" align="end" forceMount>
                <div className="flex items-center justify-between px-4 py-2">
                    <DropdownMenuLabel className="p-0">Thông báo</DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                            onClick={handleMarkAllRead}
                            disabled={markReadMutation.isPending}
                        >
                            <CheckCheck className="mr-1 h-3 w-3" /> Đánh dấu đã đọc
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                
                <ScrollArea className="h-[300px]">
                    <div className="p-1">
                        {isLoading ? (
                            <div className="py-8 flex justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : notifications.length > 0 ? (
                            notifications.map(noti => (
                                <NotificationItem 
                                    key={noti.ID_THONGBAO} 
                                    notification={noti} 
                                    onMarkRead={handleMarkOneRead}
                                    isCompact={true}
                                />
                            ))
                        ) : (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                Không có thông báo nào.
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DropdownMenuSeparator />
                <DropdownMenuItem 
                    className="w-full cursor-pointer justify-center text-primary font-medium focus:text-primary"
                    onClick={() => navigate('/notifications')}
                >
                    Xem tất cả thông báo
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}