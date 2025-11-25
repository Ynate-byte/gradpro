import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Trash2, Clock, Zap } from 'lucide-react';
import { getNotificationStyle, getPriorityStyles, getPriorityIcon } from './NotificationHelpers';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, MailOpen } from 'lucide-react';

export function NotificationItem({ notification, onMarkRead, onDelete }) {
    const navigate = useNavigate();
    
    // Lấy styles từ Helper
    const { icon: Icon, color, bg } = getNotificationStyle(notification.LOAI_THONGBAO);
    const priority = notification.DO_UU_TIEN || 'NORMAL';
    const PriorityIcon = getPriorityIcon(priority);
    const containerClass = getPriorityStyles(priority, !notification.DA_DOC);
    
    const metaData = notification.DU_LIEU_GOC || {};
    const isUnread = !notification.DA_DOC;

    const handleClick = () => {
        if (isUnread) onMarkRead(notification.ID_THONGBAO);
        if (notification.LIEN_KET) navigate(notification.LIEN_KET);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        onDelete(notification.ID_THONGBAO);
    };

    return (
        <div 
            className={cn(
                "group relative flex gap-4 p-4 transition-all cursor-pointer border-b last:border-0 border-l-4", 
                containerClass
            )} 
            onClick={handleClick}
        >
            {/* Icon đại diện */}
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full mt-1 shadow-sm", bg, color)}>
                <Icon className="h-5 w-5" />
            </div>

            {/* Nội dung */}
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 pr-6">
                        {/* Icon Priority */}
                        {PriorityIcon && (
                            <PriorityIcon className={cn(
                                "h-4 w-4 shrink-0", 
                                priority === 'URGENT' ? "text-red-600 animate-pulse" : "text-orange-500"
                            )} />
                        )}

                        <h4 className={cn("text-sm leading-snug", isUnread ? "font-bold text-foreground" : "font-medium text-muted-foreground")}>
                            {notification.TIEU_DE}
                        </h4>
                    </div>
                    
                    {/* Badge Mới */}
                    {isUnread && priority === 'NORMAL' && (
                        <Badge variant="secondary" className="shrink-0 text-[10px] h-5 px-1.5">Mới</Badge>
                    )}
                </div>
                
                <p className={cn("text-xs line-clamp-2 leading-relaxed", isUnread ? "text-foreground/80" : "text-muted-foreground")}>
                    {notification.NOI_DUNG}
                </p>

                {/* Metadata Chips */}
                {(metaData.deadline || metaData.quota || metaData.score || metaData.plan_name) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {metaData.plan_name && (
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300">
                                {metaData.plan_name}
                            </span>
                        )}
                        {metaData.deadline && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300">
                                <Clock className="w-3 h-3 mr-1" />
                                Hạn: {format(new Date(metaData.deadline), 'HH:mm dd/MM')}
                            </span>
                        )}
                        {metaData.score && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300">
                                <Zap className="w-3 h-3 mr-1" />
                                Điểm: {metaData.score}
                            </span>
                        )}
                        {metaData.quota && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300">
                                Chỉ tiêu: {metaData.quota}
                            </span>
                        )}
                    </div>
                )}
                
                <p className="text-[10px] text-muted-foreground/60 font-medium pt-1">
                    {formatDistanceToNow(new Date(notification.NGAY_TAO), { addSuffix: true, locale: vi })}
                </p>
            </div>

            {/* Dropdown Menu */}
            <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
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
                        <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Xóa thông báo
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}