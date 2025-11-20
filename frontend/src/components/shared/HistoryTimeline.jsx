import React from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    LogIn, LogOut, UserCog, KeyRound, Users, UserMinus, UserPlus, UserCheck,
    BookOpen, CheckSquare, Trello, UploadCloud, Calendar, Activity,
    FileText, Shield, Monitor, FileEdit, CheckCircle, XCircle, Star, MessageSquare, RefreshCw,
    Mail, HandMetal, BookCheck
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
    'CheckCircle': CheckCircle,
    'XCircle': XCircle,
    'Star': Star,
    'MessageSquare': MessageSquare,
    'RefreshCw': RefreshCw,
    'Mail': Mail,
    'HandMetal': HandMetal,
    'BookCheck': BookCheck,
};

const HistoryTimeline = ({ items, isLoading }) => {
    if (isLoading) {
        return <div className="p-4 text-center text-muted-foreground">Đang tải lịch sử...</div>;
    }

    if (!items || items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <Activity className="w-10 h-10 mb-2 opacity-20" />
                <p>Chưa có hoạt động nào được ghi lại.</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-[600px] pr-4">
            <div className="relative pl-6 border-l-2 border-muted ml-4 space-y-8 py-2">
                {items.map((item) => {
                    const IconComponent = iconMap[item.ICON] || Activity;
                    // Parse JSON chi tiết
                    const details = typeof item.CHI_TIET === 'string' ? JSON.parse(item.CHI_TIET) : (item.CHI_TIET || {});

                    return (
                        <div key={item.ID_LICHSU} className="relative group">
                            {/* Icon Node trên dòng kẻ */}
                            <div className={cn(
                                "absolute -left-[31px] top-0 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm transition-all group-hover:scale-110",
                                getColorClass(item.LOAI_HANH_DONG) // Hàm helper màu sắc
                            )}>
                                <IconComponent className="h-4 w-4" />
                            </div>

                            {/* Nội dung Log */}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                                    <span className="font-medium text-primary/80">
                                        {format(new Date(item.NGAY_TAO), "HH:mm, dd 'thg' MM, yyyy", { locale: vi })}
                                    </span>
                                    {item.nhom && (
                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                            {item.nhom.TEN_NHOM}
                                        </Badge>
                                    )}
                                </div>

                                <div className="bg-card p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-3">
                                        {/* Avatar người thực hiện */}
                                        {item.nguoidung ? (
                                            <Avatar className="h-8 w-8 mt-1">
                                                <AvatarImage src={item.nguoidung.AVATAR_URL} />
                                                <AvatarFallback className="text-xs">
                                                    {getInitials(item.nguoidung.HODEM_VA_TEN)}
                                                </AvatarFallback>
                                            </Avatar>
                                        ) : (
                                            <div className="h-8 w-8 mt-1 flex items-center justify-center bg-muted rounded-full">
                                                <Shield className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        )}
                                        
                                        <div className="flex-1">
                                            <p className="text-sm font-medium leading-none mb-1.5">
                                                {item.nguoidung ? (
                                                    <span className="font-bold mr-1">{item.nguoidung.HODEM_VA_TEN}</span>
                                                ) : (
                                                    <span className="font-bold mr-1">Hệ thống</span>
                                                )}
                                                <span className="font-normal">{item.TIEU_DE}</span>
                                            </p>

                                            {/* Render chi tiết dựa trên loại hành động */}
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

// Helper: Lấy chữ cái đầu
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
};

// Helper: Render chi tiết thông minh
const DetailRenderer = ({ type, details }) => {
    if (!details || Object.keys(details).length === 0) return null;

    // 1. Auth & System
    if (type === 'LOGIN') {
        return <p className="text-xs text-muted-foreground">IP: {details.ip}</p>;
    }

    // 2. Group Actions
    if (type === 'SEND_REQUEST') {
         return (
             <div className="flex flex-col gap-1 mt-1">
                 <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                     <UserPlus className="h-3 w-3" />
                     <span>Xin gia nhập</span>
                 </div>
                 {details.message && (
                    <p className="text-xs text-muted-foreground italic border-l-2 pl-2">"{details.message}"</p>
                 )}
             </div>
        );
    }
    if (type === 'INVITE_MEMBER') {
         return (
             <div className="flex flex-col gap-1 mt-1">
                 <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
                     <Mail className="h-3 w-3" />
                     {details.count ? (
                        <span>Đã gửi lời mời cho {details.count} người</span>
                     ) : (
                        <span>Đã mời: {details.name} ({details.mssv})</span>
                     )}
                 </div>
                 {/* Hiển thị danh sách tên nếu mời nhiều người */}
                 {details.names && (
                     <p className="text-xs text-muted-foreground pl-5">
                        {details.names.join(', ')}
                     </p>
                 )}
             </div>
         );
    }
    if (type === 'JOIN_GROUP' || type === 'APPROVE_MEMBER') {
        return (
             <div className="flex items-center gap-2 mt-1 text-xs text-green-600 font-medium">
                 <UserCheck className="h-3 w-3" />
                 <span>Đã duyệt: {details.name || 'Thành viên mới'} {details.mssv ? `(${details.mssv})` : ''}</span>
             </div>
         );
    }
    if (type === 'TRANSFER_LEADER') {
         return (
             <div className="flex items-center gap-2 mt-1 text-xs text-orange-600">
                 <RefreshCw className="h-3 w-3" />
                 <span>Chuyển quyền cho: <strong>{details.new_leader}</strong></span>
             </div>
         );
    }

    if (type === 'ASSIGN_TOPIC') {
        return (
             <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
                 <p><strong>Đề tài:</strong> {details.topic_name}</p>
                 {details.supervisor && <p><strong>GVHD:</strong> {details.supervisor}</p>}
             </div>
        );
    }
    
    // 3. Topic Actions
    if (type === 'PROPOSE_TOPIC') {
        return <p className="text-xs text-muted-foreground">Mã đề tài: {details.topic_code}</p>;
    }
    if (type === 'ADD_SUGGESTION') {
        return <p className="text-xs text-muted-foreground italic">"{details.content_preview}"</p>;
    }

    // 4. Submission Actions
    if (type === 'SUBMIT_PRODUCT') {
        return (
            <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded text-xs">
                <FileText className="h-3 w-3" />
                <span>Đã nộp bài mới (ID: #{details.submission_id})</span>
            </div>
        );
    }
    if (type === 'CONFIRM_SUBMISSION') {
        return <p className="text-xs text-green-600 font-medium">Đã duyệt bài nộp</p>;
    }
    if (type === 'REJECT_SUBMISSION') {
        return <p className="text-xs text-red-600">Lý do: "{details.reason}"</p>;
    }

    // 5. Kanban Actions
    if (type === 'TASK_MOVE') {
        return (
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>Chuyển sang: </span>
                <Badge variant="secondary" className="text-[10px]">{details.to_column}</Badge>
            </div>
        );
    }

    // 6. Grading Actions
    if (type && type.includes('GRADE')) {
         return (
             <div className="flex items-center gap-2 mt-1">
                 <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                     {details.score} điểm
                 </Badge>
                 {details.comment && <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">"{details.comment}"</span>}
             </div>
         );
    }
    if (type === 'REJECT_REVIEW') {
        return (
             <div className="flex items-center gap-2 mt-1 text-red-600">
                 <XCircle className="h-3 w-3" />
                 <span className="text-xs">Không chấp thuận đề tài</span>
             </div>
         );
    }

    return null;
};

// Helper: Màu sắc icon
const getColorClass = (actionType) => {
    if (!actionType) return 'text-gray-500 border-gray-200 bg-gray-50';
    
    switch (true) {
        // Auth
        case actionType === 'LOGIN': return 'text-blue-500 border-blue-200 bg-blue-50';
        case actionType === 'LOGOUT': return 'text-gray-500 border-gray-200 bg-gray-50';
        case actionType === 'CHANGE_PASSWORD': 
        case actionType === 'UPDATE_PROFILE': return 'text-purple-500 border-purple-200 bg-purple-50';
        
        // Group
        case actionType === 'CREATE_GROUP':
        case actionType === 'JOIN_GROUP': 
        case actionType === 'APPROVE_MEMBER': return 'text-emerald-500 border-emerald-200 bg-emerald-50';
        case actionType === 'LEAVE_GROUP': return 'text-red-500 border-red-200 bg-red-50';
        case actionType === 'INVITE_MEMBER': 
        case actionType === 'SEND_REQUEST': return 'text-indigo-500 border-indigo-200 bg-indigo-50';
        case actionType === 'TRANSFER_LEADER': return 'text-orange-500 border-orange-200 bg-orange-50';
        case actionType === 'ASSIGN_TOPIC':
        case actionType === 'REGISTER_TOPIC': 
        case actionType === 'PROPOSE_TOPIC': return 'text-blue-600 border-blue-200 bg-blue-50';

        // Topic & Submission
        case actionType === 'REGISTER_TOPIC': 
        case actionType === 'PROPOSE_TOPIC': return 'text-blue-600 border-blue-200 bg-blue-50';
        case actionType === 'SUBMIT_PRODUCT': 
        case actionType === 'CONFIRM_SUBMISSION': return 'text-green-600 border-green-200 bg-green-50';
        case actionType === 'REJECT_SUBMISSION': 
        case actionType === 'REJECT_REVIEW': return 'text-red-500 border-red-200 bg-red-50';
        case actionType === 'ADD_SUGGESTION': return 'text-violet-500 border-violet-200 bg-violet-50';
        
        // Grading
        case actionType.includes('GRADE'): return 'text-yellow-500 border-yellow-200 bg-yellow-50';

        // Kanban & Meeting
        case actionType === 'TASK_CREATE': return 'text-cyan-500 border-cyan-200 bg-cyan-50';
        case actionType === 'TASK_MOVE': 
        case actionType === 'TASK_UPDATE': return 'text-orange-400 border-orange-200 bg-orange-50';
        case actionType === 'CREATE_MEETING': return 'text-pink-500 border-pink-200 bg-pink-50';

        default: return 'text-gray-500 border-gray-200 bg-gray-50';
    }
};

export default HistoryTimeline;