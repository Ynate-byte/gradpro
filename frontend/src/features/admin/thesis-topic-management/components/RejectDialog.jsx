import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const RejectDialog = ({ open, onOpenChange, onSubmit, topic, actionType }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isReject = actionType === 'reject';
    const title = isReject ? 'Từ chối đề tài' : 'Yêu cầu chỉnh sửa đề tài';
    const description = isReject
        ? `Từ chối đề tài "${topic?.TEN_DETAI}"`
        : `Yêu cầu chỉnh sửa đề tài "${topic?.TEN_DETAI}"`;
    const buttonText = isReject ? 'Từ chối' : 'Yêu cầu chỉnh sửa';
    const labelText = isReject ? 'Lý do từ chối' : 'Lý do yêu cầu chỉnh sửa';

    const handleSubmit = async () => {
        const trimmedReason = reason.trim();

        if (!trimmedReason) {
            setError('Vui lòng nhập lý do');
            return;
        }

        if (trimmedReason.length < 10) {
            setError('Lý do phải có ít nhất 10 ký tự');
            return;
        }

        if (trimmedReason.length > 500) {
            setError('Lý do không được vượt quá 500 ký tự');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await onSubmit(trimmedReason);
            setReason('');
            onOpenChange(false);
        } catch (error) {
            console.error('Error submitting:', error);
            // Error handling is done in parent component
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (open) => {
        if (!open) {
            setReason('');
            setError('');
        }
        onOpenChange(open);
    };

    const handleReasonChange = (e) => {
        setReason(e.target.value);
        if (error) setError('');
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="reason">
                            {labelText} <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="reason"
                            placeholder={`Nhập ${labelText.toLowerCase()} (tối thiểu 10 ký tự, tối đa 500 ký tự)...`}
                            value={reason}
                            onChange={handleReasonChange}
                            rows={4}
                            className={error ? 'border-red-500' : ''}
                        />
                        <div className="text-xs text-gray-500 text-right">
                            {reason.length}/500 ký tự
                        </div>
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Hủy
                    </Button>
                    <Button variant="destructive" onClick={handleSubmit} disabled={!reason.trim() || loading}>
                        {loading ? 'Đang xử lý...' : buttonText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RejectDialog;