import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Trash2, Circle, Clock, AlertTriangle, AlertCircle, Zap } from 'lucide-react';
import { getNotificationStyle } from './NotificationHelpers';

export function NotificationItem({ notification, onMarkRead, onDelete }) {
    const navigate = useNavigate();
    
    // Lấy style dựa trên LOAI_THONGBAO (Hệ thống, Học tập,...)
    const { icon: Icon, bgColor, textColor, borderColor } = getNotificationStyle(notification.LOAI_THONGBAO);
    
    // Parse dữ liệu kèm theo
    const metaData = notification.DU_LIEU_GOC || {};
    const isUnread = !notification.DA_DOC;
    const priority = notification.DO_UU_TIEN || 'NORMAL'; // NORMAL, HIGH, URGENT

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

    // --- LOGIC STYLE CHO ĐỘ ƯU TIÊN ---
    const getPriorityStyles = () => {
        if (!isUnread) return "bg-background hover:bg-muted/40"; // Đã đọc thì nền trắng/xám nhẹ

        switch (priority) {
            case 'URGENT':
                // Nền đỏ nhạt, border đỏ
                return "bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 border-l-4 border-l-red-500";
            case 'HIGH':
                // Nền cam nhạt, border cam
                return "bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border-l-4 border-l-orange-500";
            default:
                // Mặc định: Nền xanh nhạt, border theo loại thông báo (Task/Academic...)
                return cn("bg-blue-50/30 dark:bg-blue-900/10 hover:bg-muted/50 border-l-4", borderColor);
        }
    };

    return (
        <div 
            className={cn(
                "group relative flex gap-4 p-4 transition-all cursor-pointer border-b last:border-0",
                getPriorityStyles()
            )}
            onClick={handleClick}
        >
            {/* 1. Icon đại diện (Theo loại thông báo) */}
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full mt-1 shadow-sm", bgColor, textColor)}>
                <Icon className="h-5 w-5" />
            </div>

            {/* 2. Nội dung chính */}
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 pr-6">
                        {/* Icon cảnh báo nếu là Urgent/High */}
                        {priority === 'URGENT' && (
                            <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse shrink-0" />
                        )}
                        {priority === 'HIGH' && (
                            <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                        )}

                        <h4 className={cn(
                            "text-sm leading-snug", 
                            isUnread ? "font-bold text-foreground" : "font-medium text-muted-foreground",
                            priority === 'URGENT' && isUnread ? "text-red-700 dark:text-red-400" : ""
                        )}>
                            {notification.TIEU_DE}
                        </h4>
                    </div>
                    
                    {/* Chấm xanh báo chưa đọc (chỉ hiện nếu không phải urgent/high để đỡ rối, hoặc giữ lại tùy ý) */}
                    {isUnread && priority === 'NORMAL' && (
                        <Circle className="h-2 w-2 fill-blue-600 text-blue-600 shrink-0 mt-1.5" />
                    )}
                </div>
                
                <p className={cn(
                    "text-xs line-clamp-2 leading-relaxed",
                    isUnread ? "text-foreground/80" : "text-muted-foreground"
                )}>
                    {notification.NOI_DUNG}
                </p>

                {/* --- HIỂN THỊ METADATA (Deadline, Điểm, Quota...) --- */}
                {(metaData.deadline || metaData.quota || metaData.score || metaData.topic_name || metaData.plan_name) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {metaData.plan_name && (
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                                {metaData.plan_name}
                            </span>
                        )}
                        {metaData.deadline && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">
                                <Clock className="w-3 h-3 mr-1" />
                                Hạn: {format(new Date(metaData.deadline), 'HH:mm dd/MM')}
                            </span>
                        )}
                        {metaData.score && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200">
                                <Zap className="w-3 h-3 mr-1" />
                                Điểm: {metaData.score}
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

            {/* 3. Nút xóa (Hiện khi hover) */}
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