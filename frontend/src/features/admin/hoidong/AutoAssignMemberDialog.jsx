import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Shuffle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { autoAssignMembers } from '@/api/adminHoiDongService';

// Schema validation cho Modal phân công
const assignSchema = z.object({
    LOAI: z.enum(['hoidong', 'phanbien'], { message: "Vui lòng chọn loại Hội đồng." }),
    ID_KEHOACH: z.string({ message: "Vui lòng chọn Kế hoạch." }),
    replaceExisting: z.boolean().default(false),
});

export const AutoAssignMemberDialog = ({ isOpen, setIsOpen, selectedPlanId, planOptions, onSuccess }) => {
    const form = useForm({
        resolver: zodResolver(assignSchema),
        defaultValues: {
            LOAI: 'hoidong',
            ID_KEHOACH: selectedPlanId || '',
            replaceExisting: false,
        },
    });

    // Reset form khi plan ID thay đổi hoặc modal mở/đóng
    useEffect(() => {
        form.reset({
            LOAI: 'hoidong',
            ID_KEHOACH: selectedPlanId || '',
            replaceExisting: false,
        });
    }, [selectedPlanId, isOpen]);

    const planOptionsFormatted = useMemo(() => {
        if (!planOptions) return [];
        // Chỉ cho phép chọn các kế hoạch chưa kết thúc
        return planOptions.filter(p => p.TRANGTHAI !== 'Đã hoàn thành'); 
    }, [planOptions]);


    const onSubmit = async (data) => {
        const payload = {
            ...data,
            ID_KEHOACH: Number(data.ID_KEHOACH), // Chuyển ID về dạng số
        };
        
        try {
            const res = await autoAssignMembers(payload);
            toast.success(res.message);
            onSuccess(); // Yêu cầu tải lại dữ liệu Hội đồng
            setIsOpen(false);
        } catch (error) {
            console.error("Lỗi phân công tự động:", error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || "Phân công thất bại. Vui lòng kiểm tra log server.";
            toast.error(errorMsg);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shuffle className="h-6 w-6 text-primary" /> Phân công Thành viên Hội đồng Tự động
                    </DialogTitle>
                    <DialogDescription>
                        Hệ thống sẽ tự động tìm kiếm Giảng viên (cùng Bộ môn), cân bằng tải và gán vai trò Chủ tịch/Thư ký cho các Hội đồng còn thiếu.
                    </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        
                        <FormField
                            control={form.control}
                            name="ID_KEHOACH"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kế hoạch Khóa luận *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!planOptionsFormatted.length || form.formState.isSubmitting}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Chọn kế hoạch" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {planOptionsFormatted.map(p => (
                                                <SelectItem key={p.value} value={p.value}>
                                                    {p.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {!planOptionsFormatted.length && (
                                        <FormDescription className="text-destructive flex items-center gap-1"><Info className="h-3 w-3"/> Không có kế hoạch đang hoạt động.</FormDescription>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="LOAI"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Loại Hội đồng *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={form.formState.isSubmitting}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Chọn loại" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="hoidong">Hội đồng Bảo vệ</SelectItem>
                                            <SelectItem value="phanbien">Hội đồng Phản biện</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="replaceExisting"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Ghi đè phân công cũ</FormLabel>
                                        <FormDescription>
                                            Xóa tất cả các phân công thành viên đã tồn tại (nếu có) trong các Hội đồng thuộc loại này trước khi phân công lại.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={form.formState.isSubmitting}/>
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={form.formState.isSubmitting}>Hủy</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting || !form.getValues('ID_KEHOACH')}>
                                {form.formState.isSubmitting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Shuffle className="mr-2 h-4 w-4" />
                                )}
                                Phân công ngay
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};