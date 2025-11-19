import React from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
    LogIn, LogOut, UserCog, KeyRound, Users, UserMinus, 
    BookOpen, CheckSquare, Trello, UploadCloud, Calendar, Activity, 
    FileText, UserPlus, UserCheck, // [THÊM] Icon mới
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
    'UserPlus': UserPlus, // [THÊM]
    'BookOpen': BookOpen,
    'CheckSquare': CheckSquare,
    'Trello': Trello,
    'UploadCloud': UploadCloud,
    'Calendar': Calendar,
    'Activity': Activity,
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
                    const details = typeof item.CHI_TIET === 'string' ? JSON.parse(item.CHI_TIET) : item.CHI_TIET;

                    return (
                        <div key={item.ID_LICHSU} className="relative group">
                            {/* Icon Node */}
                            <div className={cn(
                                "absolute -left-[31px] top-0 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm transition-all group-hover:scale-110",
                                getColorClass(item.LOAI_HANH_DONG)
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
                                        {item.nguoidung && (
                                            <Avatar className="h-8 w-8 mt-1">
                                                <AvatarImage src={item.nguoidung.AVATAR_URL} />
                                                <AvatarFallback className="text-xs">
                                                    {item.nguoidung.HODEM_VA_TEN.substring(0,2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                        
                                        <div className="flex-1">
                                            <p className="text-sm font-medium leading-none mb-1.5">
                                                {item.nguoidung ? (
                                                    <span className="font-bold mr-1">{item.nguoidung.HODEM_VA_TEN}</span>
                                                ) : 'Hệ thống '}
                                                <span className="font-normal">{item.TIEU_DE}</span>
                                            </p>

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

const DetailRenderer = ({ type, details }) => {
    if (!details || Object.keys(details).length === 0) return null;

    if (type === 'LOGIN') {
        return <p className="text-xs text-muted-foreground">IP: {details.ip}</p>;
    }
    
    if (type === 'SUBMIT_PRODUCT') {
        return (
            <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded text-xs">
                <FileText className="h-3 w-3" />
                <span>Đã nộp bài mới (ID: #{details.submission_id})</span>
            </div>
        );
    }

    if (type === 'TASK_MOVE') {
        return (
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>Chuyển sang: </span>
                <Badge variant="secondary" className="text-[10px]">{details.to_column}</Badge>
            </div>
        );
    }
    
    if (type === 'SEND_REQUEST') {
         return <p className="text-xs text-muted-foreground italic">Lời nhắn: "{details.message}"</p>;
    }

    if (type === 'INVITE_MEMBER') {
         return (
             <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                 <UserPlus className="h-3 w-3" />
                 <span>Đã mời: {details.mssv}</span>
             </div>
         );
    }

    if (type === 'JOIN_GROUP') {
        return (
             <div className="flex items-center gap-2 mt-1 text-xs text-green-600 font-medium">
                 <UserCheck className="h-3 w-3" />
                 <span>Gia nhập thành công</span>
             </div>
         );
    }

    return null;
};

// Helper: Màu sắc icon
const getColorClass = (actionType) => {
    switch (actionType) {
        case 'LOGIN': return 'text-blue-500 border-blue-200 bg-blue-50';
        case 'SUBMIT_PRODUCT': return 'text-green-600 border-green-200 bg-green-50';
        case 'LEAVE_GROUP': 
        case 'LOGOUT': return 'text-red-500 border-red-200 bg-red-50';
        case 'TASK_MOVE': return 'text-orange-500 border-orange-200 bg-orange-50';
        case 'INVITE_MEMBER': 
        case 'SEND_REQUEST': return 'text-purple-500 border-purple-200 bg-purple-50'; // [MỚI]
        case 'JOIN_GROUP': return 'text-emerald-500 border-emerald-200 bg-emerald-50'; // [MỚI]
        default: return 'text-gray-500 border-gray-200 bg-gray-50';
    }
};

export default HistoryTimeline;