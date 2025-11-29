import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { rejectSubmission } from '@/api/adminSubmissionService';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, FileWarning } from 'lucide-react';

const rejectSchema = z.object({
    ly_do: z.string().min(10, "Vui lòng nhập lý do cụ thể (tối thiểu 10 ký tự).").max(1000, "Lý do không quá 1000 ký tự."),
});

export function RejectSubmissionDialog({ isOpen, setIsOpen, submission, onSuccess, rejectedFileIds = [] }) {
    const [isLoading, setIsLoading] = useState(false);
    const form = useForm({
        resolver: zodResolver(rejectSchema),
        defaultValues: { ly_do: '' },
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const res = await rejectSubmission(submission.ID_NOP_SANPHAM, data.ly_do, rejectedFileIds);
            toast.success(res.message);
            onSuccess();
            setIsOpen(false);
            form.reset();
        } catch (error) {
            toast.error(error.response?.data?.message || "Thao tác thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!submission) return null;

    const filesCount = rejectedFileIds.length;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[500px] gap-0 p-0 overflow-hidden">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="p-6 pb-4 bg-red-50/50 border-b border-red-100">
                            <DialogHeader>
                                <DialogTitle className="text-red-600 flex items-center gap-2 text-xl">
                                    <div className="p-2 bg-red-100 rounded-full">
                                        <AlertTriangle className="h-5 w-5" />
                                    </div>
                                    Yêu cầu nộp lại
                                </DialogTitle>
                                <DialogDescription className="pt-2 text-red-900/80">
                                    Nhóm <strong>{submission.phancong?.nhom?.TEN_NHOM}</strong> sẽ nhận được thông báo và phải nộp lại các nội dung chưa đạt.
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Cảnh báo file được chọn */}
                            {filesCount > 0 ? (
                                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex gap-3">
                                    <FileWarning className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                                    <div className="text-sm text-orange-900">
                                        <span className="font-semibold">Bạn đã chọn {filesCount} file bị lỗi.</span>
                                        <p className="text-xs mt-1 opacity-80">Hệ thống sẽ đánh dấu đỏ các file này trong giao diện sinh viên để họ dễ dàng nhận biết.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                                    Bạn chưa chọn file cụ thể nào. Yêu cầu này sẽ áp dụng chung cho toàn bộ lần nộp.
                                </div>
                            )}

                            <FormField
                                control={form.control}
                                name="ly_do"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground">Lý do / Hướng dẫn sửa đổi <span className="text-red-500">*</span></FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Nhập lý do chi tiết giúp sinh viên hiểu cần sửa gì..."
                                                rows={4}
                                                {...field}
                                                className="resize-none focus-visible:ring-red-500/20"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="p-4 bg-muted/10 border-t">
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Hủy bỏ</Button>
                            <Button 
                                type="submit" 
                                variant="destructive" 
                                disabled={isLoading}
                                className="gap-2 shadow-sm shadow-red-200"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <div className="h-4 w-4 font-bold flex items-center justify-center">!</div>}
                                Xác nhận Gửi
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}