import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { thesisTopicService } from '@/api/thesisTopicService';
import { Loader2, PenTool } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ReplyDialog = ({ open, onOpenChange, suggestion, onReplySuccess }) => {
    const { user } = useAuth();
    const [replyContent, setReplyContent] = useState('');
    const [loading, setLoading] = useState(false);
    const currentGvId = user?.giangvien?.ID_GIANGVIEN;
    const isPendingApproval = suggestion?.detai?.TRANGTHAI === 'Chờ duyệt';
    const isOwner = String(suggestion?.detai?.ID_NGUOI_DEXUAT) === String(currentGvId);
    const isReviewer = suggestion?.detai?.phancong_nguoi_gop_y?.some(
        pc => String(pc.ID_GIANGVIEN) === String(currentGvId)
    );

    const handleSubmit = async (isEditRequest = false) => {
        let contentToSend = replyContent;

        if (isEditRequest) {
            contentToSend = "Tôi muốn chỉnh sửa một chút.";
        } else {
            const trimmedContent = replyContent.trim();
            if (!trimmedContent) {
                toast.error('Vui lòng nhập nội dung phản hồi');
                return;
            }
            if (trimmedContent.length > 1000) {
                toast.error('Nội dung phản hồi không được vượt quá 1000 ký tự');
                return;
            }
            contentToSend = trimmedContent;
        }

        try {
            setLoading(true);

            const response = await thesisTopicService.addReplyToSuggestion(suggestion.ID_GOIY, {
                NOIDUNG: contentToSend,
                is_edit_request: isEditRequest 
            });

            toast.success(response.data.message || 'Phản hồi đã được gửi thành công!');
            
            setReplyContent('');
            onOpenChange(false);
            
            if (onReplySuccess) {
                onReplySuccess();
            }
        } catch (error) {
            console.error('Error replying to suggestion:', error);
            const errorMessage = error.response?.data?.message ||
                (error.response?.data?.errors?.NOIDUNG && error.response.data.errors.NOIDUNG[0]) ||
                'Có lỗi xảy ra khi gửi phản hồi.';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setReplyContent('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Phản hồi góp ý</DialogTitle>
                    <DialogDescription>
                        Phản hồi cho góp ý của giảng viên {suggestion?.giangvien?.nguoidung?.HODEM_VA_TEN || 'N/A'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Góp ý gốc</Label>
                        <p className="text-sm text-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                            {suggestion?.NOIDUNG_GOIY}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <Label htmlFor="reply" className="text-sm font-medium">
                                Nội dung phản hồi <span className="text-red-500">*</span>
                            </Label>

                            {/* NÚT PHẢN HỒI NHANH (Chỉ hiện khi đủ điều kiện) */}
                            {isPendingApproval && (isOwner || isReviewer) && (
                                <Button 
                                    type="button"
                                    variant="secondary" 
                                    size="sm" 
                                    className="h-7 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200 shadow-sm"
                                    onClick={() => handleSubmit(true)}
                                    disabled={loading}
                                >
                                    <PenTool className="w-3 h-3 mr-1.5" />
                                    Mẫu: Yêu cầu chỉnh sửa
                                </Button>
                            )}
                        </div>
                        
                        <Textarea
                            id="reply"
                            placeholder="Nhập nội dung phản hồi..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={4}
                            className="resize-none focus-visible:ring-primary/20"
                            disabled={loading}
                        />
                        
                        <div className="text-xs text-muted-foreground text-right">
                            {replyContent.length}/1000 ký tự
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button 
                        variant="outline" 
                        onClick={handleClose} 
                        disabled={loading}
                    >
                        Hủy
                    </Button>
                    <Button 
                        onClick={() => handleSubmit(false)} 
                        disabled={loading || !replyContent.trim()}
                        className="min-w-[100px]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang gửi...
                            </>
                        ) : (
                            'Gửi phản hồi'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ReplyDialog;