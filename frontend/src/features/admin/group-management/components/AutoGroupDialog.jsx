import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { autoGroupStudents } from '@/api/adminGroupService';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

const autoGroupSchema = z.object({
    desiredMembers: z.preprocess(
        (val) => Number(val),
        z.number().min(2, "Số TV phải lớn hơn 1").max(5, "Số TV không quá 5")
    ),
    priority: z.string().min(1, "Vui lòng chọn tiêu chí ưu tiên."),
});

export function AutoGroupDialog({ isOpen, setIsOpen, onSuccess, planId }) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm({
        resolver: zodResolver(autoGroupSchema),
        defaultValues: { desiredMembers: 4, priority: 'chuyennganh' },
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const payload = { ...data, plan_id: planId };
            const result = await autoGroupStudents(payload);
            toast.success(result.message, {
                description: `Đã tạo ${result.newGroupsCreated} nhóm mới và ghép ${result.membersAdded} thành viên.`,
            });
            onSuccess();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Ghép nhóm thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cài đặt thuật toán ghép nhóm</DialogTitle>
                    <DialogDescription>
                        Hệ thống sẽ lấp đầy các nhóm còn trống và tạo nhóm mới từ các sinh viên chưa có nhóm trong kế hoạch này.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                        <FormField control={form.control} name="desiredMembers" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Số thành viên mong muốn mỗi nhóm</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <FormField control={form.control} name="priority" render={({ field }) => (
                             <FormItem>
                                <FormLabel>Ưu tiên ghép nhóm theo</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="chuyennganh">Cùng chuyên ngành</SelectItem>
                                        <SelectItem value="lop" disabled>Cùng lớp (sắp có)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Bắt đầu ghép nhóm
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}