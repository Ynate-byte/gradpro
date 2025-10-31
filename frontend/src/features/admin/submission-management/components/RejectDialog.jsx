import React, { useState, useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { rejectSubmission } from '@/api/adminSubmissionService';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const rejectSchema = z.object({
    ly_do: z.string().min(10, "Lý do phải có ít nhất 10 ký tự.").max(1000, "Lý do không quá 1000 ký tự."),
});

export function RejectSubmissionDialog({ isOpen, setIsOpen, submission, onSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const form = useForm({
        resolver: zodResolver(rejectSchema),
        defaultValues: { ly_do: '' },
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const res = await rejectSubmission(submission.ID_NOP_SANPHAM, data.ly_do);
            toast.success(res.message);
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Yêu cầu nộp lại thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!submission) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <DialogHeader>
                            <DialogTitle>Yêu cầu nộp lại</DialogTitle>
                            <DialogDescription>
                                Nhóm "{submission.phancong?.nhom?.TEN_NHOM}" sẽ nhận được thông báo này và phải nộp lại.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <FormField
                                control={form.control}
                                name="ly_do"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Lý do *</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Ví dụ: File báo cáo thiếu chữ ký, file source code bị lỗi, link demo không hoạt động..."
                                                rows={5}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                            <Button type="submit" variant="destructive" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Gửi yêu cầu
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}