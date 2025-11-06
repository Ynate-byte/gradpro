import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { thesisTopicService } from '@/api/thesisTopicService';

const ReplyDialog = ({ open, onOpenChange, suggestion, onReplySuccess }) => {
    const [replyContent, setReplyContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        const trimmedContent = replyContent.trim();

        if (!trimmedContent) {
            toast.error('Vui lòng nhập nội dung phản hồi');
            return;
        }

        if (trimmedContent.length < 1) { // Gỡ bỏ giới hạn 10 ký tự cho phản hồi nhanh
            toast.error('Nội dung phản hồi phải có ít nhất 1 ký tự');
            return;
        }

        if (trimmedContent.length > 1000) {
            toast.error('Nội dung phản hồi không được vượt quá 1000 ký tự');
            return;
        }

        try {
            setLoading(true);
            // ----- [SỬA LỖI] -----
            // Gọi hàm API mới và truyền ID của Góp Ý
            const response = await thesisTopicService.addReplyToSuggestion(suggestion.ID_GOIY, {
                NOIDUNG: trimmedContent
            });
            // ----- [KẾT THÚC SỬA LỖI] -----

            toast.success(response.data.message || 'Phản hồi đã được gửi thành công!');
            setReplyContent('');
            onOpenChange(false);
            if (onReplySuccess) {
                onReplySuccess();
            }
        } catch (error) {
            console.error('Error replying to suggestion:', error);
            const errorMessage = error.response?.data?.message ||
                (error.response?.data?.errors?.NOIDUNG && error.response.data.errors.NOIDUNG[0]) || // Sửa key lỗi
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
                        {/* Sửa lại tên trường cho nhất quán (nếu đã sửa ở file trước) */}
                        Phản hồi cho góp ý của giảng viên {suggestion?.giangvien?.nguoidung?.HODEM_VA_TEN || 'N/A'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Original suggestion */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <Label className="text-sm font-medium text-gray-700">Góp ý gốc:</Label>
                        <p className="text-sm text-gray-600 mt-1">{suggestion?.NOIDUNG_GOIY}</p>
                    </div>

                    {/* Reply textarea */}
                    <div>
                        <Label htmlFor="reply" className="text-sm font-medium">
                            Nội dung phản hồi <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="reply"
                            placeholder="Nhập nội dung phản hồi..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={4}
                            className="mt-1"
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || !replyContent.trim()}
                        >
                            {loading ? 'Đang gửi...' : 'Gửi phản hồi'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ReplyDialog;