import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createGroup } from '@/api/groupService'; // Admin có thể dùng API này
import { updateGroup } from '@/api/adminGroupService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

const groupSchema = z.object({
  TEN_NHOM: z.string().min(3, "Tên nhóm phải có ít nhất 3 ký tự.").max(100),
  MOTA: z.string().max(255, "Mô tả không quá 255 ký tự.").nullable(),
});

export function GroupFormDialog({ isOpen, setIsOpen, editingGroup, onSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const isEditMode = !!editingGroup;

    const form = useForm({
        resolver: zodResolver(groupSchema),
    });
    
    useEffect(() => {
        if(editingGroup) {
            form.reset({
                TEN_NHOM: editingGroup.TEN_NHOM,
                MOTA: editingGroup.MOTA || '',
            });
        } else {
             form.reset({ TEN_NHOM: '', MOTA: '' });
        }
    }, [editingGroup, form]);

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            if (isEditMode) {
                await updateGroup(editingGroup.ID_NHOM, data);
                toast.success("Cập nhật nhóm thành công!");
            } else {
                // Logic tạo nhóm mới của admin có thể khác, tạm thời chưa làm
                toast.info("Chức năng tạo nhóm mới cho admin sẽ được phát triển sau.");
            }
            onSuccess();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Thao tác thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Chỉnh sửa Nhóm' : 'Tạo Nhóm Mới'}</DialogTitle>
                    <DialogDescription>{isEditMode ? 'Cập nhật thông tin cho nhóm.' : 'Tạo một nhóm mới với quyền Admin.'}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <FormField control={form.control} name="TEN_NHOM" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tên nhóm</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="MOTA" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mô tả</FormLabel>
                                <FormControl><Textarea {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                            <Button type="submit" disabled={isLoading || !isEditMode}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Lưu
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}