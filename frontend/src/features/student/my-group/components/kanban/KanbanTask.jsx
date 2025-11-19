import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckSquare, MessageCircle, AlertCircle, Crown, ShieldAlert } from 'lucide-react';
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

export function KanbanTask({ task, onClick, className }) {
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
        'Cao': 'bg-red-100 text-red-700 border-red-200',
        'Trung bình': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'Thấp': 'bg-blue-100 text-blue-700 border-blue-200',
    };

    // Tính toán checklist
    const totalChecklist = task.checklist_items?.length || 0;
    const completedChecklist = task.checklist_items?.filter(item => item.DA_HOANTHANH).length || 0;

    // Tính toán deadline
    const isOverdue = task.NGAY_HETHAN && isPast(new Date(task.NGAY_HETHAN)) && task.TRANGTHAI !== 'Hoàn thành';

    // Gán class động cho Trạng thái và Độ ưu tiên
    const priorityClass = `priority-${task.DO_UUTIEN?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '') || 'Trungbinh'}`;
    const statusClass = `status-${task.TRANGTHAI?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '') || 'Hoatdong'}`;

    // [LOGIC MỚI] Kiểm tra vai trò người tạo
    // Dữ liệu `task.nguoi_tao.vaitro.TEN_VAITRO` được load từ backend
    const creatorRole = task.nguoi_tao?.vaitro?.TEN_VAITRO;
    
    // Nếu có role và KHÔNG PHẢI là "Sinh viên" thì coi là task đặc biệt
    const isAuthorityTask = creatorRole && creatorRole !== 'Sinh viên';
    
    // Xác định nhãn hiển thị (Admin giao / GV giao)
    const authorityLabel = creatorRole === 'Admin' ? 'Admin giao' : 'GV giao';

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
                // Nếu là task GV, dùng class đặc biệt, ngược lại dùng class độ ưu tiên thường
                isAuthorityTask ? "is-authority-task" : priorityClass,
                statusClass,
                className
            )}
        >
            {/* [HIỂN THỊ ĐẶC BIỆT] Badge cho Giảng viên/Admin */}
            {isAuthorityTask && (
                <div className="authority-badge">
                    {creatorRole === 'Admin' ? <ShieldAlert className="h-3 w-3" /> : <Crown className="h-3 w-3 fill-white" />}
                    {authorityLabel}
                </div>
            )}

            {/* Tiêu đề và Độ ưu tiên */}
            <div className="flex justify-between items-start mb-2 gap-2">
                <p className={cn("text-sm font-semibold leading-snug", "kanban-task-title")}>
                    {task.TEN_CONGVIEC}
                </p>
                {/* Chỉ hiện badge ưu tiên thường nếu không phải task GV, hoặc vẫn hiện nếu muốn */}
                {task.DO_UUTIEN && (
                    <Badge className={cn("text-[10px] px-1.5 h-5 shrink-0 border", priorityColors[task.DO_UUTIEN])} variant="outline">
                        {task.DO_UUTIEN}
                    </Badge>
                )}
            </div>

            {/* Deadline và Trạng thái (Hủy/Tạm dừng) */}
            <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground mb-3">
                {task.NGAY_HETHAN && (
                    <div className={cn("flex items-center gap-1", isOverdue && "text-destructive font-medium")}>
                        <AlertCircle className="h-3 w-3" />
                        <span>{format(new Date(task.NGAY_HETHAN), 'dd/MM', { locale: vi })}</span>
                    </div>
                )}
                
                {task.TRANGTHAI !== 'Hoạt động' && (
                     <Badge 
                        variant={task.TRANGTHAI === 'Đã hủy' ? 'destructive' : 'secondary'}
                        className="h-5 px-1.5 text-[10px]"
                    >
                        {task.TRANGTHAI}
                    </Badge>
                )}
            </div>

            {/* Thanh footer: Assignees, Comments, Checklist */}
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                    {/* Checklist */}
                    {totalChecklist > 0 && (
                        <span className={cn(
                            "flex items-center gap-1 text-xs",
                            completedChecklist === totalChecklist ? "text-green-600 font-medium" : "text-muted-foreground"
                        )}>
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
                <div className="flex -space-x-1.5">
                    {task.nguoi_duoc_phan_cong?.slice(0, 3).map(user => (
                        <Avatar key={user.ID_NGUOIDUNG} className="h-5 w-5 border border-white dark:border-gray-800" title={user.HODEM_VA_TEN}>
                            <AvatarFallback className="text-[9px] bg-gray-200 dark:bg-gray-700">
                                {user.HODEM_VA_TEN ? user.HODEM_VA_TEN.substring(0, 2).toUpperCase() : '?'}
                            </AvatarFallback>
                        </Avatar>
                    ))}
                    {task.nguoi_duoc_phan_cong?.length > 3 && (
                         <div className="h-5 w-5 rounded-full bg-gray-100 dark:bg-gray-800 border border-white dark:border-gray-800 flex items-center justify-center text-[9px] text-muted-foreground font-medium">
                            +{task.nguoi_duoc_phan_cong.length - 3}
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
}