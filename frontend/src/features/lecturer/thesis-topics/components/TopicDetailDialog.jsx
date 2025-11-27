import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Send, BookOpen, User, Layers, Users,
    Target, Check, MessageSquare, Loader2,
    CheckCircle, Edit, XCircle, ChevronLeft, ChevronRight,
    Clock, Info, AlertCircle // Đảm bảo import AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { thesisTopicService } from '@/api/thesisTopicService';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
// [THÊM] Import Alert components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- HELPER COMPONENTS ---
const CompactInfoItem = ({ icon: Icon, label, value }) => {
    if (!value) return null;
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="p-2 rounded-md bg-background text-primary shadow-sm border border-border shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                    {label}
                </p>
                <p className="font-medium text-foreground truncate text-sm" title={value}>
                    {value}
                </p>
            </div>
        </div>
    );
};

const ChatBubble = ({ user, message, isMe, time, role }) => (
    // (Code ChatBubble giữ nguyên)
    <div className={cn("flex gap-3 max-w-[90%]", isMe ? "ml-auto flex-row-reverse" : "")}>
        <Avatar className="h-8 w-8 mt-1 border border-border">
            <AvatarImage src={user?.AVATAR_URL} />
            <AvatarFallback className={cn("text-xs font-medium", isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {getInitials(user?.HODEM_VA_TEN)}
            </AvatarFallback>
        </Avatar>
        <div className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
            <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-medium text-foreground">
                    {user?.HODEM_VA_TEN || 'Người dùng'}
                </span>
                {role && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-medium border border-border">
                        {role}
                    </span>
                )}
                <span className="text-[10px] text-muted-foreground">
                    {time ? formatDistanceToNow(new Date(time), { addSuffix: true, locale: vi }) : ''}
                </span>
            </div>
            <div className={cn(
                "px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words shadow-sm",
                isMe
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground border border-border"
            )}>
                {message}
            </div>
        </div>
    </div>
);

const DialogLoadingSkeleton = () => (
    // (Code Skeleton giữ nguyên)
    <div className="h-full flex flex-col p-6 space-y-6 bg-background">
        <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
            </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
        <Skeleton className="flex-1 w-full rounded-lg" />
    </div>
);

const getStatusBadge = (status) => {
    // (Code StatusBadge giữ nguyên)
    let variant = "outline";
    let className = "border-border font-medium";

    switch (status) {
        case 'Đã duyệt':
            className = "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
            break;
        case 'Chờ duyệt':
            className = "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";
            break;
        case 'Yêu cầu chỉnh sửa':
            className = "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
            break;
        case 'Từ chối':
        case 'Đã khóa':
            className = "bg-destructive/10 text-destructive border-destructive/20";
            break;
        default:
            className = "bg-secondary text-secondary-foreground border-border";
    }

    return (
        <Badge variant={variant} className={cn("px-2.5 py-0.5 text-xs shadow-none", className)}>
            {status}
        </Badge>
    );
};

const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

// --- COMPONENT CHÍNH ---

const TopicDetailDialog = ({
    open,
    onOpenChange,
    topicId,
    showAdminActions = false,
    onApprove,
    onReject,
    onRequestEdit,
    onNext,
    onPrevious,
    hasNext,
    hasPrevious,
    onDataChange
}) => {
    const { user } = useAuth();
    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(false);

    // State chat
    const [replyInputs, setReplyInputs] = useState({});
    const [newSuggestion, setNewSuggestion] = useState('');
    const [sendingState, setSendingState] = useState({});

    const chatEndRef = useRef(null);
    const scrollAreaRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!open) return;
            const activeEl = document.activeElement;
            const isTyping = activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable;
            if (isTyping) return;

            if (e.key === 'ArrowLeft') {
                if (hasPrevious && onPrevious) {
                    e.preventDefault();
                    onPrevious();
                }
            }
            if (e.key === 'ArrowRight') {
                if (hasNext && onNext) {
                    e.preventDefault();
                    onNext();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, hasPrevious, hasNext, onPrevious, onNext]);

    useEffect(() => {
        if (open && topicId) {
            loadTopicDetails(true);
        } else if (!open) {
            setTopic(null);
            setReplyInputs({});
            setNewSuggestion('');
        }
    }, [open, topicId]);

    useEffect(() => {
        if (topic?.goiyDetai && chatEndRef.current) {
            setTimeout(() => {
                chatEndRef.current.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }
    }, [topic?.goiyDetai?.length, topic?.goiyDetai?.map(t => t.phanhois?.length).join(',')]);

    const loadTopicDetails = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const response = await thesisTopicService.getTopicById(topicId);
            setTopic(response.data);
        } catch (error) {
            console.error('Error loading details:', error);
            toast.error("Không thể tải chi tiết đề tài.");
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleSendReply = async (suggestionId) => {
        const content = replyInputs[suggestionId]?.trim();
        if (!content) return;

        const tempReply = {
            ID_PHANHOI: Date.now(),
            NOIDUNG: content,
            created_at: new Date().toISOString(),
            ID_GIANGVIEN: user?.giangvien?.ID_GIANGVIEN,
            giangvien: { nguoidung: user }
        };

        setTopic(prev => ({
            ...prev,
            goiyDetai: prev.goiyDetai.map(g => {
                if (g.ID_GOIY === suggestionId) {
                    return { ...g, phanhois: [...(g.phanhois || []), tempReply] };
                }
                return g;
            })
        }));

        setReplyInputs(prev => ({ ...prev, [suggestionId]: '' }));

        try {
            await thesisTopicService.addReplyToSuggestion(suggestionId, { NOIDUNG: content });
            await loadTopicDetails(false);
            if (onDataChange) onDataChange();
        } catch (error) {
            toast.error("Gửi thất bại.");
        }
    };

    const handleSendNewSuggestion = async () => {
        const content = newSuggestion.trim();
        if (!content) return;

        const tempThread = {
            ID_GOIY: Date.now(),
            NOIDUNG_GOIY: content,
            NGAYTAO: new Date().toISOString(),
            ID_GIANGVIEN: user?.giangvien?.ID_GIANGVIEN,
            giangvien: { nguoidung: user },
            phanhois: []
        };

        setTopic(prev => ({
            ...prev,
            goiyDetai: [...(prev.goiyDetai || []), tempThread]
        }));

        setNewSuggestion('');
        setSendingState(prev => ({ ...prev, NEW: true }));

        try {
            await thesisTopicService.addSuggestion(topic.ID_DETAI, { NOIDUNG_GOIY: content });
            await loadTopicDetails(false);
            if (onDataChange) onDataChange();
        } catch (error) {
            toast.error("Lỗi khi gửi tin nhắn.");
        } finally {
            setSendingState(prev => ({ ...prev, NEW: false }));
        }
    };

    const canComment = topic && ['Nháp', 'Chờ duyệt', 'Yêu cầu chỉnh sửa', 'Đang chỉnh sửa'].includes(topic.TRANGTHAI);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] lg:max-w-[85vw] xl:max-w-7xl h-[90vh] p-0 flex flex-col bg-background gap-0 overflow-hidden border border-border shadow-2xl sm:rounded-xl">

                {loading || !topic ? (
                    <DialogLoadingSkeleton />
                ) : (
                    <div className="flex flex-col h-full overflow-hidden">

                        {/* --- 1. HEADER --- */}
                        <DialogHeader className="px-6 py-4 border-b border-border shrink-0 flex flex-row items-center justify-between space-y-0 bg-background">
                            <div className="flex items-start gap-4 overflow-hidden">
                                <div className="h-10 w-10 mt-1 flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <DialogTitle className="text-lg font-bold text-foreground leading-tight mb-1.5">
                                        {topic.TEN_DETAI}
                                    </DialogTitle>
                                    <div className="flex items-center gap-3">
                                        <code className="text-[11px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono border border-border">
                                            {topic.MA_DETAI}
                                        </code>
                                        {getStatusBadge(topic.TRANGTHAI)}
                                    </div>
                                </div>
                            </div>
                        </DialogHeader>

                        {/* --- 2. BODY: SPLIT VIEW --- */}
                        <div className="flex flex-1 overflow-hidden">

                            {/* CỘT TRÁI: THÔNG TIN */}
                            <ScrollArea className="flex-1 border-r border-border bg-card">
                                <div className="p-6 space-y-8">
                                    
                                    {/* [MỚI] HIỂN THỊ LÝ DO TỪ CHỐI / YÊU CẦU CHỈNH SỬA */}
                                    {(topic.TRANGTHAI === 'Yêu cầu chỉnh sửa' || topic.TRANGTHAI === 'Từ chối') && topic.LYDO_TUCHOI && (
                                        <Alert className={cn(
                                            "mb-6",
                                            topic.TRANGTHAI === 'Từ chối' 
                                                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" 
                                                : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                                        )}>
                                            <AlertCircle className={cn(
                                                "h-4 w-4",
                                                topic.TRANGTHAI === 'Từ chối' ? "text-red-600" : "text-orange-600"
                                            )} />
                                            <AlertTitle className={cn(
                                                "ml-2 font-semibold",
                                                topic.TRANGTHAI === 'Từ chối' ? "text-red-800 dark:text-red-200" : "text-orange-800 dark:text-orange-200"
                                            )}>
                                                {topic.TRANGTHAI === 'Từ chối' ? 'Lý do từ chối:' : 'Yêu cầu chỉnh sửa:'}
                                            </AlertTitle>
                                            <AlertDescription className={cn(
                                                "mt-2 text-sm pl-6", // Thêm padding left để thẳng hàng với text trên
                                                topic.TRANGTHAI === 'Từ chối' ? "text-red-700 dark:text-red-300" : "text-orange-700 dark:text-orange-300"
                                            )}>
                                                {topic.LYDO_TUCHOI}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Stats Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                                        <CompactInfoItem icon={User} label="Giảng viên" value={topic.ten_giang_vien} />
                                        
                                        {/* Chuyên ngành -> Bộ môn */}
                                        <CompactInfoItem icon={Layers} label="Bộ môn" value={topic.ten_bo_mon || topic.khoaBomon?.TEN_KHOA_BOMON} />
                                        
                                        <CompactInfoItem icon={Users} label="Nhóm tối đa" value={topic.SO_NHOM_TOIDA} />
                                        <CompactInfoItem icon={Clock} label="Đã đăng ký" value={`${topic.SO_NHOM_HIENTAI} nhóm`} />
                                    </div>

                                    {/* Yêu cầu & Kết quả */}
                                    {(topic.YEUCAU || topic.KETQUA_MONGDOI) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {topic.YEUCAU && (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-foreground font-semibold text-sm uppercase tracking-wide">
                                                        <Check className="w-4 h-4 text-primary" /> Yêu cầu
                                                    </div>
                                                    <div className="text-sm text-muted-foreground leading-relaxed bg-secondary/30 p-4 rounded-lg border border-border/50">
                                                        {topic.YEUCAU}
                                                    </div>
                                                </div>
                                            )}
                                            {topic.KETQUA_MONGDOI && (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-foreground font-semibold text-sm uppercase tracking-wide">
                                                        <Target className="w-4 h-4 text-primary" /> Kết quả mong đợi
                                                    </div>
                                                    <div className="text-sm text-muted-foreground leading-relaxed bg-secondary/30 p-4 rounded-lg border border-border/50">
                                                        {topic.KETQUA_MONGDOI}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Mô tả chi tiết */}
                                    <div className="space-y-3">
                                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                            <Info className="w-4 h-4 text-muted-foreground" /> Mô tả chi tiết
                                        </h3>
                                        <div className="text-sm text-foreground leading-7 whitespace-pre-wrap bg-background p-4 border border-border rounded-lg shadow-sm">
                                            {topic.MOTA}
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>

                            {/* CỘT PHẢI: CHAT */}
                            <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col border-l border-border bg-secondary/20">
                                <div className="p-3 border-b border-border bg-background flex items-center justify-between shrink-0">
                                    <span className="font-semibold text-sm flex items-center gap-2 text-foreground">
                                        <MessageSquare className="w-4 h-4 text-primary" /> Thảo luận ({topic.goiyDetai?.length || 0})
                                    </span>
                                </div>

                                <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                                    <div className="space-y-6">
                                        {(!topic.goiyDetai || topic.goiyDetai.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                                                <div className="p-4 rounded-full bg-secondary mb-3">
                                                    <MessageSquare className="w-8 h-8 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm text-muted-foreground">Chưa có thảo luận nào</p>
                                            </div>
                                        ) : (
                                            topic.goiyDetai.map((thread) => (
                                                <div key={thread.ID_GOIY} className="space-y-3 relative group">
                                                    <ChatBubble
                                                        user={thread.giangvien?.nguoidung}
                                                        message={thread.NOIDUNG_GOIY}
                                                        isMe={thread.ID_GIANGVIEN === user?.giangvien?.ID_GIANGVIEN}
                                                        time={thread.NGAYTAO}
                                                        role="Người góp ý"
                                                    />

                                                    {/* Replies */}
                                                    {thread.phanhois && thread.phanhois.map((reply) => (
                                                        <div key={reply.ID_PHANHOI} className="pl-8 relative">
                                                            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-border" />
                                                            <ChatBubble
                                                                user={reply.giangvien?.nguoidung}
                                                                message={reply.NOIDUNG}
                                                                isMe={reply.ID_GIANGVIEN === user?.giangvien?.ID_GIANGVIEN}
                                                                time={reply.created_at}
                                                                role={reply.ID_GIANGVIEN === topic.ID_NGUOI_DEXUAT ? "Tác giả" : null}
                                                            />
                                                        </div>
                                                    ))}

                                                    {/* Reply Input Inline */}
                                                    {canComment && (
                                                        <div className="pl-8 pt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Trả lời..."
                                                                    className="flex-1 bg-background border border-input rounded-md text-xs px-3 py-1.5 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                                                    value={replyInputs[thread.ID_GOIY] || ''}
                                                                    onChange={(e) => setReplyInputs(prev => ({ ...prev, [thread.ID_GOIY]: e.target.value }))}
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleSendReply(thread.ID_GOIY)}
                                                                />
                                                                <Button size="icon" className="h-7 w-7" variant="ghost" onClick={() => handleSendReply(thread.ID_GOIY)}>
                                                                    <Send className="w-3 h-3 text-muted-foreground" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>
                                </ScrollArea>

                                {canComment && (
                                    <div className="p-3 bg-background border-t border-border">
                                        <div className="relative flex items-end gap-2">
                                            <Textarea
                                                placeholder="Nhập nội dung thảo luận mới..."
                                                className="min-h-[44px] max-h-[120px] resize-none text-sm bg-secondary/30 focus:bg-background border-transparent focus:border-input pr-10 shadow-none"
                                                value={newSuggestion}
                                                onChange={(e) => setNewSuggestion(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendNewSuggestion();
                                                    }
                                                }}
                                            />
                                            <Button
                                                size="icon"
                                                className="absolute right-1 bottom-1 h-8 w-8"
                                                disabled={!newSuggestion.trim() || sendingState['NEW']}
                                                onClick={handleSendNewSuggestion}
                                            >
                                                {sendingState['NEW'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* --- 3. FOOTER --- */}
                        <div className="p-4 bg-background border-t border-border shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="px-1.5 py-0.5 border border-border rounded bg-secondary font-mono">←</div>
                                    <div className="px-1.5 py-0.5 border border-border rounded bg-secondary font-mono">→</div>
                                    <span>Điều hướng</span>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={onPrevious}
                                        disabled={!onPrevious || !hasPrevious}
                                        className="w-28"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" /> Trước
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={onNext}
                                        disabled={!onNext || !hasNext}
                                        className="w-28"
                                    >
                                        Sau <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>

                                <div className="flex gap-2">
                                    {showAdminActions && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                onClick={() => onReject(topic)}
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <XCircle className="w-4 h-4 mr-2" /> Từ chối
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => onRequestEdit(topic)}
                                                className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:text-orange-400 dark:border-orange-900 dark:hover:bg-orange-900/20"
                                            >
                                                <Edit className="w-4 h-4 mr-2" /> Yêu cầu sửa
                                            </Button>
                                            <Button
                                                onClick={() => onApprove(topic.ID_DETAI)}
                                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" /> Duyệt đề tài
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default TopicDetailDialog;