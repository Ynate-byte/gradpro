import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckSquare, MessageCircle, AlertCircle } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Helper
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
};

export function KanbanTask({ task, onClick, className }) { // Thêm props 'className'
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ 
        id: task.ID_CONGVIEC,
        data: {
            type: 'Task',
            task,
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const priorityColors = {
        'Cao': 'bg-red-100 text-red-700',
        'Trung bình': 'bg-yellow-100 text-yellow-700',
        'Thấp': 'bg-blue-100 text-blue-700',
    };

    // Tính toán checklist
    const totalChecklist = task.checklist_items?.length || 0;
    const completedChecklist = task.checklist_items?.filter(item => item.DA_HOANTHANH).length || 0;

    // Tính toán deadline
    const isOverdue = task.NGAY_HETHAN && isPast(new Date(task.NGAY_HETHAN)) && task.TRANGTHAI !== 'Hoàn thành';

    // ===== [THAY ĐỔI TẠI ĐÂY] =====
    // Gán class động cho Trạng thái và Độ ưu tiên
    // (Bỏ dấu cách và dấu tiếng Việt để làm tên class CSS)
    const priorityClass = `priority-${task.DO_UUTIEN.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '')}`;
    const statusClass = `status-${task.TRANGTHAI.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '')}`;
    // =============================

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={cn(
                "kanban-task-card",
                isDragging && "is-dragging",
                priorityClass, // <-- [THÊM MỚI]
                statusClass,   // <-- [THÊM MỚI]
                className      // <-- Thêm class từ DragOverlay
            )}
        >
            {/* Tiêu đề và Độ ưu tiên */}
            <div className="flex justify-between items-start mb-2">
                <p className={cn("text-sm font-semibold leading-snug", "kanban-task-title")}>
                    {task.TEN_CONGVIEC}
                </p>
                {task.DO_UUTIEN && (
                    <Badge className={cn("text-xs shrink-0", priorityColors[task.DO_UUTIEN])}>
                        {task.DO_UUTIEN}
                    </Badge>
                )}
            </div>

            {/* Deadline và Trạng thái (Hủy/Tạm dừng) */}
            <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground mb-3">
                {task.NGAY_HETHAN && (
                    <div className={cn("flex items-center gap-1", isOverdue && "text-destructive font-medium")}>
                        <AlertCircle className="h-3 w-3" />
                        <span>{format(new Date(task.NGAY_HETHAN), 'dd/MM/yyyy', { locale: vi })}</span>
                    </div>
                )}
                
                {/* [SỬA ĐỔI] Chỉ hiển thị badge Tạm dừng/Đã hủy nếu cần */}
                {task.TRANGTHAI !== 'Hoạt động' && (
                     <Badge 
                        variant={task.TRANGTHAI === 'Đã hủy' ? 'destructive' : 'secondary'}
                        className="bg-zinc-500 text-white"
                    >
                        {task.TRANGTHAI}
                    </Badge>
                )}
            </div>

            {/* Thanh footer: Assignees, Comments, Checklist */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t">
                <div className="flex items-center space-x-2">
                    {/* Checklist */}
                    {totalChecklist > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckSquare className="h-3 w-3" />
                            {completedChecklist}/{totalChecklist}
                        </span>
                    )}
                    {/* Comments */}
                    {task.binh_luans_count > 0 && (
                         <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageCircle className="h-3 w-3" />
                            {task.binh_luans_count}
                        </span>
                    )}
                </div>
                
                {/* Assignees */}
                <div className="flex -space-x-2">
                    {task.nguoi_duoc_phan_cong?.map(user => (
                        <Avatar key={user.ID_NGUOIDUNG} className="h-6 w-6 border-2 border-card" title={user.HODEM_VA_TEN}>
                            <AvatarFallback className="text-xs">{getInitials(user.HODEM_VA_TEN)}</AvatarFallback>
                        </Avatar>
                    ))}
                </div>
            </div>
        </div>
    );
}