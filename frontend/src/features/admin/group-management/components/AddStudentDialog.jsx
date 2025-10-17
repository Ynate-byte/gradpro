import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { addStudentToGroup } from '@/api/adminGroupService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

const addStudentSchema = z.object({
  ID_NGUOIDUNG: z.string().min(1, 'Vui lòng nhập ID người dùng (sinh viên).')
});

export function AddStudentDialog({ isOpen, setIsOpen, group, onSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const form = useForm({
        resolver: zodResolver(addStudentSchema),
        defaultValues: { ID_NGUOIDUNG: '' },
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const payload = { ...data, ID_NHOM: group.ID_NHOM };
            const res = await addStudentToGroup(payload);
            toast.success(res.message);
            onSuccess();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Thêm thành viên thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!group) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Thêm sinh viên vào nhóm "{group.TEN_NHOM}"</DialogTitle>
                    <DialogDescription>Nhập ID Người dùng của sinh viên bạn muốn thêm.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="ID_NGUOIDUNG" render={({ field }) => (
                            <FormItem>
                                <FormLabel>ID Người dùng (Sinh viên)</FormLabel>
                                <FormControl><Input type="number" placeholder="Ví dụ: 15" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Thêm
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}