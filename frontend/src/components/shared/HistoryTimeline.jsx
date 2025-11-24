import React from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    LogIn, LogOut, UserCog, KeyRound, Users, UserMinus, UserPlus, UserCheck,
    BookOpen, CheckSquare, Trello, UploadCloud, Calendar, Activity,
    FileText, Shield, Monitor, FileEdit, CheckCircle, XCircle, Star, MessageSquare, RefreshCw,
    Mail, HandMetal, BookCheck, ArrowRight, Edit3, PlusCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

// Map tên trường Database sang Tiếng Việt
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
    'NOIDUNG': 'Nội dung'
};

// Helper: Render chi tiết log (Phiên bản gọn cho Timeline)
const DetailRenderer = ({ type, details }) => {
    if (!details || Object.keys(details).length === 0) return null;

    // 1. Hiển thị Diff (Sự thay đổi Old -> New)
    if (details.changes && Array.isArray(details.changes)) {
        return (
            <div className="mt-1.5 flex flex-col gap-1 bg-muted/40 p-2 rounded border text-[11px]">
                {details.changes.slice(0, 2).map((change, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                        <span className="font-medium text-muted-foreground min-w-[60px]">
                            {FIELD_MAP[change.field] || change.field}:
                        </span>
                        <span className="line-through opacity-60 text-red-500 truncate max-w-[80px]">
                            {change.old ?? '-'}
                        </span>
                        <ArrowRight className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                        <span className="text-green-600 font-medium truncate max-w-[80px]">
                            {change.new ?? '-'}
                        </span>
                    </div>
                ))}
                {details.changes.length > 2 && (
                    <span className="text-[10px] text-muted-foreground italic pl-1">
                        ...và {details.changes.length - 2} thay đổi khác
                    </span>
                )}
            </div>
        );
    }

    // 2. Grading Logs
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
    if (!actionType) return 'text-gray-500 border-gray-200 bg-gray-50';
    
    switch (true) {
        case actionType === 'LOGIN': return 'text-blue-500 border-blue-200 bg-blue-50';
        case actionType === 'LOGOUT': return 'text-gray-500 border-gray-200 bg-gray-50';
        case actionType === 'CHANGE_PASSWORD': 
        case actionType === 'UPDATE_PROFILE': return 'text-purple-500 border-purple-200 bg-purple-50';
        
        case actionType === 'CREATE_GROUP':
        case actionType === 'JOIN_GROUP': 
        case actionType === 'APPROVE_MEMBER': return 'text-emerald-500 border-emerald-200 bg-emerald-50';
        case actionType === 'LEAVE_GROUP': return 'text-red-500 border-red-200 bg-red-50';
        case actionType === 'INVITE_MEMBER': 
        case actionType === 'SEND_REQUEST': return 'text-indigo-500 border-indigo-200 bg-indigo-50';
        
        case actionType === 'REGISTER_TOPIC': 
        case actionType === 'PROPOSE_TOPIC': 
        case actionType === 'ASSIGN_TOPIC': return 'text-blue-600 border-blue-200 bg-blue-50';

        case actionType === 'SUBMIT_PRODUCT': 
        case actionType === 'CONFIRM_SUBMISSION': return 'text-green-600 border-green-200 bg-green-50';
        case actionType === 'REJECT_SUBMISSION': 
        case actionType === 'REJECT_REVIEW': return 'text-red-500 border-red-200 bg-red-50';
        
        case actionType.includes('GRADE'): return 'text-yellow-500 border-yellow-200 bg-yellow-50';

        case actionType === 'TASK_CREATE': return 'text-cyan-500 border-cyan-200 bg-cyan-50';
        case actionType === 'TASK_MOVE': 
        case actionType === 'TASK_UPDATE': return 'text-orange-400 border-orange-200 bg-orange-50';
        case actionType === 'CREATE_MEETING': return 'text-pink-500 border-pink-200 bg-pink-50';

        default: return 'text-gray-500 border-gray-200 bg-gray-50';
    }
};

// Helper: Lấy tên viết tắt
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
};

const HistoryTimeline = ({ items, isLoading }) => {
    if (isLoading) {
        return <div className="p-4 text-center text-muted-foreground text-sm">Đang tải hoạt động...</div>;
    }

    if (!items || items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                <Activity className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Chưa có hoạt động nào.</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-[600px] pr-4">
            <div className="relative pl-4 border-l-2 border-muted ml-3 space-y-6 py-2">
                {items.map((item) => {
                    const IconComponent = iconMap[item.ICON] || Activity;
                    // Parse JSON an toàn
                    const details = typeof item.CHI_TIET === 'string' 
                        ? JSON.parse(item.CHI_TIET) 
                        : (item.CHI_TIET || {});

                    return (
                        <div key={item.ID_LICHSU} className="relative group">
                            {/* Icon trên trục thời gian */}
                            <div className={cn(
                                "absolute -left-[23px] top-0 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm transition-all group-hover:scale-110 z-10",
                                getColorClass(item.LOAI_HANH_DONG)
                            )}>
                                <IconComponent className="h-3 w-3" />
                            </div>
                            
                            <div className="flex flex-col gap-1">
                                {/* Header: Thời gian & Tên Nhóm */}
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-0.5">
                                     <span className="font-mono">{format(new Date(item.NGAY_TAO), "HH:mm, dd/MM", { locale: vi })}</span>
                                     {item.nhom && <Badge variant="outline" className="text-[9px] h-4 px-1 font-normal border-muted-foreground/20 text-muted-foreground">{item.nhom.TEN_NHOM}</Badge>}
                                </div>

                                {/* Card Nội dung */}
                                <div className="bg-card p-3 rounded-lg border shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-start gap-3">
                                        {/* Avatar người dùng */}
                                        {item.nguoidung ? (
                                            <Avatar className="h-7 w-7 mt-0.5 border">
                                                <AvatarImage src={item.nguoidung.AVATAR_URL} />
                                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                                    {getInitials(item.nguoidung.HODEM_VA_TEN)}
                                                </AvatarFallback>
                                            </Avatar>
                                        ) : (
                                            <div className="h-7 w-7 mt-0.5 flex items-center justify-center bg-muted rounded-full border">
                                                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs leading-snug mb-1">
                                                {item.nguoidung ? (
                                                    <span className="font-bold text-foreground mr-1">{item.nguoidung.HODEM_VA_TEN}</span>
                                                ) : (
                                                    <span className="font-bold text-foreground mr-1">Hệ thống</span>
                                                )}
                                                <span className="text-muted-foreground font-normal">{item.TIEU_DE}</span>
                                            </p>
                                            
                                            {/* Render Chi tiết thay đổi */}
                                            <DetailRenderer type={item.LOAI_HANH_DONG} details={details} />
                                        </div>
                                    </div>
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