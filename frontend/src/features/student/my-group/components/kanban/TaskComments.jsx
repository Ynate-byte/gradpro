import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge'; // <-- [ĐÃ THÊM] SỬA LỖI TẠI ĐÂY

// Helper (Lấy 2 chữ cái đầu)
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
};

// Component con: Hiển thị 1 bình luận
const CommentItem = ({ comment, onReplyClick }) => {
    return (
        <div className="flex gap-3">
            <Avatar className="h-8 w-8">
                <AvatarFallback>{getInitials(comment.nguoi_binh_luan?.HODEM_VA_TEN)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="text-sm bg-muted rounded-lg px-3 py-2">
                    <span className="font-semibold">{comment.nguoi_binh_luan?.HODEM_VA_TEN}</span>
                    <p className="whitespace-pre-wrap">{comment.NOIDUNG_BINHLUAN}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 mt-1">
                    <span>{format(new Date(comment.NGAYTAO), 'dd/MM/yyyy, HH:mm', { locale: vi })}</span>
                    <button 
                        className="font-medium hover:underline"
                        onClick={() => onReplyClick(comment)}
                    >
                        Trả lời
                    </button>
                </div>

                {/* Render các trả lời (Replies) */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 space-y-3">
                        {comment.replies.map(reply => (
                            <CommentItem key={reply.ID_BINHLUAN} comment={reply} onReplyClick={onReplyClick} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Component chính
export function TaskComments({ comments = [], onAddComment, isSubmitting }) {
    const [commentContent, setCommentContent] = useState('');
    const [replyingTo, setReplyingTo] = useState(null); // { ID_BINHLUAN, HODEM_VA_TEN }

    const handleSubmit = () => {
        if (!commentContent.trim()) return;

        onAddComment(
            commentContent.trim(),
            replyingTo?.ID_BINHLUAN || null // Gửi ID_BINHLUAN_CHA nếu đang trả lời
        );
        
        setCommentContent('');
        setReplyingTo(null);
    };

    const handleReplyClick = (comment) => {
        setReplyingTo({
            ID_BINHLUAN: comment.ID_BINHLUAN,
            HODEM_VA_TEN: comment.nguoi_binh_luan?.HODEM_VA_TEN
        });
    };

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold">Bình luận</h4>
            
            {/* Danh sách bình luận */}
            <div className="space-y-4">
                {comments.map(comment => (
                    <CommentItem 
                        key={comment.ID_BINHLUAN} 
                        comment={comment}
                        onReplyClick={handleReplyClick}
                    />
                ))}
            </div>

            {/* Form viết bình luận */}
            <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarFallback>You</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                    {replyingTo && (
                        <Badge variant="secondary">
                            Đang trả lời {replyingTo.HODEM_VA_TEN}
                            <button className="ml-2 font-bold" onClick={() => setReplyingTo(null)}>X</button>
                        </Badge>
                    )}
                    <Textarea
                        placeholder="Viết bình luận..."
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        disabled={isSubmitting}
                    />
                    <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !commentContent.trim()}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}