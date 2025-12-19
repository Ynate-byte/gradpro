import React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    LogIn, LogOut, UserCog, KeyRound, Users, UserMinus, UserPlus, UserCheck,
    BookOpen, CheckSquare, Trello, UploadCloud, Calendar, Activity,
    FileText, Shield, Monitor, FileEdit, CheckCircle, XCircle, Star, MessageSquare, RefreshCw,
    Mail, HandMetal, BookCheck, ArrowRight, Edit3
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';

// Map icon từ backend trả về sang Lucide React Icon
const iconMap = {
    'LogIn': LogIn,
    'LogOut': LogOut,
    'UserCog': UserCog,
    'KeyRound': KeyRound,
    'Users': Users,
    'UserMinus': UserMinus,
    'UserPlus': UserPlus,
    'UserCheck': UserCheck,
    'BookOpen': BookOpen,
    'CheckSquare': CheckSquare,
    'Trello': Trello,
    'UploadCloud': UploadCloud,
    'Calendar': Calendar,
    'Activity': Activity,
    'FileText': FileText,
    'Shield': Shield,
    'Monitor': Monitor,
    'Edit': FileEdit,
    'Edit3': Edit3,
    'CheckCircle': CheckCircle,
    'XCircle': XCircle,
    'Star': Star,
    'MessageSquare': MessageSquare,
    'RefreshCw': RefreshCw,
    'Mail': Mail,
    'HandMetal': HandMetal,
    'BookCheck': BookCheck,
};

// Map tên trường Database sang Tiếng Việt hiển thị tóm tắt
const FIELD_MAP = {
    'TEN_CONGVIEC': 'Tên công việc',
    'TRANGTHAI': 'Trạng thái',
    'DIEM': 'Điểm số',
    'NGAY_HETHAN': 'Hạn chót',
    'DO_UUTIEN': 'Độ ưu tiên',
    'MOTA': 'Mô tả',
    'DIADIEM': 'Địa điểm',
    'THOIGIAN_BATDAU': 'Bắt đầu',
    'THOIGIAN_KETTHUC': 'Kết thúc',
    'TEN_DETAI': 'Tên đề tài',
    'ID_COT': 'Cột Kanban',
    'NOIDUNG': 'Nội dung',
    'YEUCAU': 'Yêu cầu',
    'MUCTIEU': 'Mục tiêu',
    'KETQUA_MONGDOI': 'Kết quả',
    'ID_KHOA_BOMON': 'Bộ môn',
    'SO_NHOM_TOIDA': 'Số nhóm tối đa'
};

// Helper: Render chi tiết log (Phiên bản gọn cho Timeline)
const DetailRenderer = ({ type, details }) => {
    if (!details || Object.keys(details).length === 0) return null;

    // 1. Hiển thị Diff (Sự thay đổi Old -> New) - Dạng tóm tắt
    if (details.changes && Array.isArray(details.changes)) {
        return (
            <div className="mt-2 flex flex-col gap-1.5 bg-muted/40 p-2.5 rounded-md border border-border/50 text-[11px]">
                {details.changes.slice(0, 3).map((change, idx) => { // Giới hạn hiển thị 3 dòng đầu
                    const fieldName = FIELD_MAP[change.field] || change.field;
                    
                    // Kiểm tra độ dài để hiển thị rút gọn
                    const oldText = String(change.old || '(Trống)');
                    const newText = String(change.new || '(Trống)');
                    const isLong = oldText.length > 20 || newText.length > 20;

                    return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 border-b border-dashed border-border/60 last:border-0 pb-1.5 last:pb-0">
                            <span className="font-semibold text-muted-foreground min-w-[90px] shrink-0 mt-0.5">
                                {fieldName}:
                            </span>
                            
                            {isLong ? (
                                <span className="text-muted-foreground italic">
                                    (Đã thay đổi nội dung)
                                </span>
                            ) : (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="line-through opacity-60 text-red-600 truncate max-w-[80px] bg-red-50 dark:bg-red-950/30 px-1 rounded decoration-red-400">
                                        {oldText}
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <span className="text-green-600 font-medium truncate max-w-[80px] bg-green-50 dark:bg-green-950/30 px-1 rounded">
                                        {newText}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {details.changes.length > 3 && (
                    <span className="text-[10px] text-muted-foreground italic pl-1 block">
                        ...và {details.changes.length - 3} trường khác
                    </span>
                )}
            </div>
        );
    }
    
    // 2. Grading Logs (Chấm điểm)
    if (type && type.includes('GRADE')) {
         return (
             <div className="flex items-center gap-2 mt-1">
                 <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50 px-1.5 py-0 h-5 text-[10px]">
                     {details.new_score ?? details.score} điểm
                 </Badge>
                 {details.old_score !== undefined && (
                     <span className="text-[10px] text-muted-foreground line-through">
                        (Cũ: {details.old_score})
                     </span>
                 )}
             </div>
         );
    }

    // 3. Các loại khác
    if (type === 'LOGIN') return <p className="text-[10px] text-muted-foreground">IP: {details.ip}</p>;
    if (type === 'SUBMIT_PRODUCT') return <p className="text-[10px] text-blue-600 mt-0.5">Đã nộp bài (ID: #{details.submission_id})</p>;
    if (details.topic_name) return <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">Đề tài: {details.topic_name}</p>;

    return null;
};

// Helper: Màu sắc icon dựa trên loại hành động
const getColorClass = (actionType) => {
    if (!actionType) return 'text-gray-500 border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700';
    
    // Nhóm Tạo/Thêm/Duyệt -> Xanh lá/Emerald
    if (actionType.includes('CREATE') || actionType.includes('ADD') || actionType.includes('APPROVE') || actionType.includes('JOIN')) 
        return 'text-emerald-500 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800';
    
    // Nhóm Sửa/Update -> Xanh dương
    if (actionType.includes('UPDATE') || actionType.includes('EDIT') || actionType.includes('CHANGE')) 
        return 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800';
    
    // Nhóm Xóa/Hủy/Từ chối -> Đỏ
    if (actionType.includes('DELETE') || actionType.includes('REMOVE') || actionType.includes('REJECT') || actionType.includes('LEAVE')) 
        return 'text-red-500 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800';
    
    // Mời/Gửi -> Tím/Indigo
    if (actionType.includes('INVITE') || actionType.includes('SEND'))
        return 'text-indigo-500 border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800';

    // Chấm điểm -> Vàng
    if (actionType.includes('GRADE')) 
        return 'text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800';

    // Task/Meeting -> Màu riêng
    if (actionType === 'TASK_CREATE') return 'text-cyan-500 border-cyan-200 bg-cyan-50 dark:bg-cyan-900/20 dark:border-cyan-800';
    if (actionType === 'TASK_MOVE' || actionType === 'TASK_UPDATE') return 'text-orange-400 border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800';
    if (actionType === 'CREATE_MEETING') return 'text-pink-500 border-pink-200 bg-pink-50 dark:bg-pink-900/20 dark:border-pink-800';

    return 'text-gray-500 border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700';
};

// Helper: Lấy Initials tên user
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
};

const HistoryTimeline = ({ items, isLoading, onSelect, selectedItemId }) => { 
    if (isLoading) {
        return <div className="p-4 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
            <Activity className="w-4 h-4 animate-spin" /> Đang tải hoạt động...
        </div>;
    }

    if (!items || items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10 h-full min-h-[200px]">
                <Activity className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Chưa có hoạt động nào.</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full pr-4">
            <div className="relative pl-4 border-l-2 border-muted ml-3 space-y-6 py-2 pb-10">
                {items.map((item) => {
                    const IconComponent = iconMap[item.ICON] || Activity;
                    let details = {};
                    try {
                        details = typeof item.CHI_TIET === 'string' ? JSON.parse(item.CHI_TIET) : (item.CHI_TIET || {});
                    } catch (e) {
                        details = {};
                    }
                    
                    const isSelected = selectedItemId === item.ID_LICHSU;
                    
                    // Chỉ cho phép click nếu có onSelect VÀ item có changes (diff)
                    const hasDiff = details.changes && Array.isArray(details.changes) && details.changes.length > 0;
                    const isClickable = onSelect && hasDiff;

                    return (
                        <div key={item.ID_LICHSU} className="relative group">
                            {/* Icon trên trục thời gian */}
                            <div className={cn(
                                "absolute -left-[23px] top-0 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm transition-all z-10",
                                isSelected 
                                    ? "scale-110 ring-2 ring-primary border-primary bg-primary text-primary-foreground" 
                                    : "group-hover:scale-110",
                                !isSelected && getColorClass(item.LOAI_HANH_DONG)
                            )}>
                                <IconComponent className="h-3 w-3" />
                            </div>
                            
                            <div className="flex flex-col gap-1">
                                {/* Header: Thời gian */}
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-0.5 pl-1">
                                     <span className="font-mono">{format(new Date(item.NGAY_TAO), "HH:mm, dd/MM/yyyy", { locale: vi })}</span>
                                </div>

                                {/* Card Nội dung */}
                                <div 
                                    className={cn(
                                        "bg-card p-3 rounded-lg border shadow-sm transition-all relative overflow-hidden text-left",
                                        isClickable 
                                            ? "hover:shadow-md cursor-pointer hover:border-primary/50 hover:bg-accent/5" 
                                            : "opacity-80 hover:opacity-100",
                                        isSelected 
                                            ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20 opacity-100" 
                                            : ""
                                    )}
                                    onClick={() => isClickable && onSelect(item)}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Avatar người dùng */}
                                        {item.nguoidung ? (
                                            <Avatar className="h-8 w-8 mt-0.5 border shadow-sm">
                                                <AvatarImage src={item.nguoidung.AVATAR_URL} />
                                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                                    {getInitials(item.nguoidung.HODEM_VA_TEN)}
                                                </AvatarFallback>
                                            </Avatar>
                                        ) : (
                                            <div className="h-8 w-8 mt-0.5 flex items-center justify-center bg-muted rounded-full border">
                                                <Shield className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs leading-snug mb-1.5">
                                                {item.nguoidung ? (
                                                    <span className="font-bold text-foreground mr-1.5 text-sm block sm:inline">
                                                        {item.nguoidung.HODEM_VA_TEN}
                                                    </span>
                                                ) : (
                                                    <span className="font-bold text-foreground mr-1.5 text-sm block sm:inline">
                                                        Hệ thống
                                                    </span>
                                                )}
                                                <span className="text-muted-foreground font-normal break-words">
                                                    {item.TIEU_DE}
                                                </span>
                                            </div>
                                            
                                            <DetailRenderer type={item.LOAI_HANH_DONG} details={details} />
                                            
                                            {/* Button Xem so sánh (chỉ hiện khi có diff và có onSelect) */}
                                            {isClickable && (
                                                <div className={cn(
                                                    "mt-2 flex items-center gap-1 text-[10px] font-medium transition-all",
                                                    isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100"
                                                )}>
                                                    <FileText className="w-3 h-3" />
                                                    {isSelected ? "Đang xem so sánh" : "Nhấn để xem chi tiết so sánh"}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Indicator active bar */}
                                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
};

export default HistoryTimeline;