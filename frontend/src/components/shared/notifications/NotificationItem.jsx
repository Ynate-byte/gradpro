import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Trash2, Circle } from 'lucide-react';
import { getNotificationStyle } from './NotificationHelpers';

export function NotificationItem({ notification, onMarkRead, onDelete, isCompact = false }) {
    const navigate = useNavigate();
    const { icon: Icon, colorClass } = getNotificationStyle(notification.LOAI_THONGBAO);

    const handleClick = () => {
        if (!notification.DA_DOC) {
            onMarkRead(notification.ID_THONGBAO);
        }
        if (notification.LIEN_KET) {
            navigate(notification.LIEN_KET);
        }
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        onDelete(notification.ID_THONGBAO);
    };

    return (
        <div 
            className={cn(
                "relative flex gap-3 p-3 rounded-lg transition-all cursor-pointer group",
                notification.DA_DOC ? "bg-background hover:bg-muted/50" : "bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-900/10",
                !isCompact && "border mb-2"
            )}
            onClick={handleClick}
        >
            {/* Icon */}
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full mt-0.5", colorClass)}>
                <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-1 min-w-0">
                <div className="flex justify-between items-start">
                    <p className={cn("text-sm font-medium leading-none", !notification.DA_DOC && "text-primary font-bold")}>
                        {notification.TIEU_DE}
                    </p>
                    {!notification.DA_DOC && isCompact && (
                        <Circle className="h-2 w-2 fill-blue-600 text-blue-600" />
                    )}
                </div>
                
                <p className={cn("text-xs text-muted-foreground line-clamp-2", !notification.DA_DOC && "text-gray-600 dark:text-gray-300")}>
                    {notification.NOI_DUNG}
                </p>
                
                <p className="text-[10px] text-muted-foreground pt-1">
                    {formatDistanceToNow(new Date(notification.NGAY_TAO), { addSuffix: true, locale: vi })}
                </p>
            </div>

            {/* Delete Button (Show on hover) */}
            {!isCompact && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity absolute top-2 right-2"
                    onClick={handleDelete}
                    title="Xóa thông báo"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}