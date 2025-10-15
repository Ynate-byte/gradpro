import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { inviteMember } from '@/api/groupService';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from 'lucide-react';

const inviteSchema = z.object({
    MA_DINHDANH: z.string().min(1, 'MSSV không được để trống.'),
    LOINHAN: z.string().max(150, 'Lời nhắn không quá 150 ký tự.').optional(),
});

export function InviteMemberDialog({ isOpen, setIsOpen, groupId }) {
    const [isLoading, setIsLoading] = useState(false);
    const form = useForm({
        resolver: zodResolver(inviteSchema),
        defaultValues: { MA_DINHDANH: '', LOINHAN: '' },
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const response = await inviteMember(groupId, data);
            toast.success(response.message);
            setIsOpen(false);
            form.reset();
        } catch (error) {
            toast.error(error.response?.data?.message || "Gửi lời mời thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Mời thành viên</DialogTitle>
                    <DialogDescription>Nhập MSSV của sinh viên bạn muốn mời vào nhóm.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="MA_DINHDANH" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mã số sinh viên *</FormLabel>
                                <FormControl><Input placeholder="200120..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="LOINHAN" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Lời nhắn (Tùy chọn)</FormLabel>
                                <FormControl><Textarea placeholder="Vào nhóm tớ nhé..." className="resize-none" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Gửi lời mời
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
