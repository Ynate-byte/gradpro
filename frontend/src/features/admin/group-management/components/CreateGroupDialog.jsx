import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { searchUngroupedStudents, createGroupWithMembers } from '@/api/adminGroupService';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, X, Crown, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

const createGroupSchema = z.object({
  TEN_NHOM: z.string().min(3, "Tên nhóm phải có ít nhất 3 ký tự.").max(100),
  MOTA: z.string().max(255, "Mô tả không quá 255 ký tự.").optional(),
});

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const motionVariants = {
    hidden: { x: 30, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { x: -30, opacity: 0, transition: { duration: 0.2, ease: "easeInOut" } },
};

export function CreateGroupDialog({ isOpen, setIsOpen, onSuccess, planId }) {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    const [members, setMembers] = useState([]);
    const [leaderId, setLeaderId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [ungroupedStudents, setUngroupedStudents] = useState([]);
    const [isFetchingStudents, setIsFetchingStudents] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const form = useForm({
        resolver: zodResolver(createGroupSchema),
        defaultValues: { TEN_NHOM: '', MOTA: '' },
    });
    
    useEffect(() => {
        if (step === 2 && planId) {
            setIsFetchingStudents(true);
            searchUngroupedStudents(planId, '')
                .then(setUngroupedStudents)
                .catch(() => toast.error("Lỗi khi tải danh sách sinh viên."))
                .finally(() => setIsFetchingStudents(false));
        }
    }, [step, planId]);

    const filteredStudents = useMemo(() => {
        if (!debouncedSearchTerm) return ungroupedStudents;
        return ungroupedStudents.filter(student =>
            student.HODEM_VA_TEN.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
    }, [debouncedSearchTerm, ungroupedStudents]);

    const handleNextStep = async () => {
        const isValid = await form.trigger(['TEN_NHOM', 'MOTA']);
        if (isValid) setStep(2);
    };

    const handleCheckboxChange = (student, isChecked) => {
        if (isChecked) {
            const newMembers = [...members, student];
            setMembers(newMembers);
            if (newMembers.length === 1) setLeaderId(student.ID_NGUOIDUNG);
        } else {
            const newMembers = members.filter(m => m.ID_NGUOIDUNG !== student.ID_NGUOIDUNG);
            setMembers(newMembers);
            if (leaderId === student.ID_NGUOIDUNG) {
                setLeaderId(newMembers.length > 0 ? newMembers[0].ID_NGUOIDUNG : null);
            }
        }
    };
    
    const onSubmit = async (data) => {
        if (members.length === 0) {
            toast.error("Nhóm phải có ít nhất một thành viên.");
            return;
        }
        if (!leaderId) {
            toast.error("Vui lòng chỉ định một nhóm trưởng.");
            return;
        }
        
        setIsLoading(true);
        try {
            await createGroupWithMembers({
                plan_id: planId,
                ...data,
                ID_NHOMTRUONG: leaderId,
                member_ids: members.map(m => m.ID_NGUOIDUNG),
            });
            toast.success("Tạo nhóm thành công!");
            onSuccess();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Tạo nhóm thất bại.");
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                form.reset();
                setMembers([]);
                setLeaderId(null);
                setSearchTerm('');
                setUngroupedStudents([]);
                setStep(1);
            }, 200);
        }
    }, [isOpen, form]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className={cn(
                "flex flex-col transition-all duration-300 ease-in-out",
                step === 1 ? 'sm:max-w-lg' : 'sm:max-w-4xl'
            )}>
                <DialogHeader>
                    <DialogTitle>Tạo Nhóm Mới (Bước {step}/2)</DialogTitle>
                    <DialogDescription>
                        {step === 1 ? 'Điền thông tin cơ bản của nhóm.' : 'Chọn thành viên và chỉ định nhóm trưởng.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow min-h-0 flex flex-col space-y-4">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div key="step1" variants={motionVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 py-4">
                                   <FormField control={form.control} name="TEN_NHOM" render={({ field }) => (
                                       <FormItem>
                                           <FormLabel>Tên nhóm *</FormLabel>
                                           <FormControl><Input placeholder="Ví dụ: Nhóm Alpha" {...field} /></FormControl>
                                           <FormMessage />
                                       </FormItem>
                                   )} />
                                   <FormField control={form.control} name="MOTA" render={({ field }) => (
                                       <FormItem>
                                           <FormLabel>Mô tả (tùy chọn)</FormLabel>
                                           <FormControl><Textarea rows={5} placeholder="Mô tả ngắn về nhóm..." {...field} /></FormControl>
                                           <FormMessage />
                                       </FormItem>
                                   )} />
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div key="step2" variants={motionVariants} initial="hidden" animate="visible" exit="exit" className="grid grid-cols-2 gap-6 flex-grow min-h-0">
                                    <div className="flex flex-col space-y-2">
                                        <FormLabel>Sinh viên chưa có nhóm</FormLabel>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input placeholder="Tìm theo tên..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                        </div>
                                        <ScrollArea className="border rounded-md flex-grow h-[400px]">
                                            {isFetchingStudents ? (
                                                <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin"/></div>
                                            ) : (
                                                <Table>
                                                    <TableHeader><TableRow><TableHead className="w-[50px]"></TableHead><TableHead>Họ và tên</TableHead><TableHead>MSSV</TableHead></TableRow></TableHeader>
                                                    <TableBody>
                                                        {filteredStudents.map(student => (
                                                            <TableRow key={student.ID_NGUOIDUNG}>
                                                                <TableCell><Checkbox checked={members.some(m => m.ID_NGUOIDUNG === student.ID_NGUOIDUNG)} onCheckedChange={(checked) => handleCheckboxChange(student, checked)}/></TableCell>
                                                                <TableCell className="font-medium">{student.HODEM_VA_TEN}</TableCell>
                                                                <TableCell>{student.MA_DINHDANH}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            )}
                                            {!isFetchingStudents && filteredStudents.length === 0 && (<p className="text-center text-sm text-muted-foreground p-4">Không tìm thấy sinh viên.</p>)}
                                        </ScrollArea>
                                    </div>
                                    
                                    <div className="flex flex-col space-y-2">
                                        <FormLabel>Thành viên đã chọn ({members.length})</FormLabel>
                                        <ScrollArea className="border rounded-md flex-grow h-[400px] p-2 space-y-2">
                                            {members.length > 0 ? (
                                                members.map(member => (
                                                    <div key={member.ID_NGUOIDUNG} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9"><AvatarFallback>{getInitials(member.HODEM_VA_TEN)}</AvatarFallback></Avatar>
                                                            <div>
                                                                <p className="text-sm font-semibold">{member.HODEM_VA_TEN}</p>
                                                                <p className="text-xs text-muted-foreground">{member.MA_DINHDANH}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Button type="button" variant={leaderId === member.ID_NGUOIDUNG ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setLeaderId(member.ID_NGUOIDUNG)} title="Đặt làm nhóm trưởng"><Crown className={`h-4 w-4 ${leaderId === member.ID_NGUOIDUNG ? "" : "text-muted-foreground"}`} /></Button>
                                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleCheckboxChange(member, false)}><X className="h-4 w-4" /></Button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Chọn sinh viên từ danh sách bên trái.</div>
                                            )}
                                        </ScrollArea>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <DialogFooter className="pt-4 border-t mt-auto shrink-0">
                            {step === 1 && (
                                <>
                                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                                    <Button type="button" onClick={handleNextStep}>Tiếp theo <ArrowRight className="ml-2 h-4 w-4" /></Button>
                                </>
                            )}
                            {step === 2 && (
                                <>
                                    <Button type="button" variant="outline" onClick={() => setStep(1)}>Quay lại</Button>
                                    <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Tạo nhóm</Button>
                                </>
                            )}
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}