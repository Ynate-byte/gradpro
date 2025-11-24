import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Trash2, Circle, ArrowRight, Clock } from 'lucide-react';
import { getNotificationStyle } from './NotificationHelpers';

export function NotificationItem({ notification, onMarkRead, onDelete }) {
    const navigate = useNavigate();
    const { icon: Icon, bgColor, textColor, borderColor } = getNotificationStyle(notification.LOAI_THONGBAO);
    
    // Parse dữ liệu kèm theo (nếu có)
    const metaData = notification.DU_LIEU_GOC || {};
    const isUnread = !notification.DA_DOC;

    const handleClick = () => {
        if (isUnread) {
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
                "group relative flex gap-4 p-4 transition-all cursor-pointer border-b last:border-0 hover:bg-muted/40",
                isUnread ? "bg-blue-50/30 dark:bg-blue-900/5" : "bg-background"
            )}
            onClick={handleClick}
        >
            {/* 1. Dải màu trạng thái bên trái */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-1", isUnread ? borderColor : "bg-transparent")} />

            {/* 2. Icon đại diện */}
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full mt-1", bgColor, textColor)}>
                <Icon className="h-5 w-5" />
            </div>

            {/* 3. Nội dung chính */}
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex justify-between items-start gap-2">
                    <h4 className={cn("text-sm leading-snug pr-6", isUnread ? "font-bold text-foreground" : "font-medium text-muted-foreground")}>
                        {notification.TIEU_DE}
                    </h4>
                    {/* Chấm xanh báo chưa đọc */}
                    {isUnread && <Circle className="h-2 w-2 fill-blue-600 text-blue-600 shrink-0 mt-1.5" />}
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {notification.NOI_DUNG}
                </p>

                {/* --- HIỂN THỊ METADATA (Deadline, Điểm, Quota...) --- */}
                {(metaData.deadline || metaData.quota || metaData.score || metaData.topic_name) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {metaData.deadline && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">
                                <Clock className="w-3 h-3 mr-1" />
                                Hạn chót: {format(new Date(metaData.deadline), 'HH:mm dd/MM')}
                            </span>
                        )}
                        {metaData.score && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200">
                                Điểm số: {metaData.score}
                            </span>
                        )}
                        {metaData.quota && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200">
                                Chỉ tiêu: {metaData.quota}
                            </span>
                        )}
                    </div>
                )}

                <p className="text-[10px] text-muted-foreground/60 font-medium pt-1">
                    {formatDistanceToNow(new Date(notification.NGAY_TAO), { addSuffix: true, locale: vi })}
                </p>
            </div>

            {/* 4. Nút xóa (Hiện khi hover) */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                onClick={handleDelete}
                title="Xóa thông báo"
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}