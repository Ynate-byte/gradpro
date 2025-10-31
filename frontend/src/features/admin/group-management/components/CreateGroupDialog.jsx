import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { searchUngroupedStudents, createGroupWithMembers } from '@/api/adminGroupService';
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, X, Crown, ArrowRight, ArrowLeft, Users, UserCheck } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

// Schema không đổi
const createGroupSchema = z.object({
    TEN_NHOM: z.string().min(3, "Tên nhóm phải có ít nhất 3 ký tự.").max(100),
    MOTA: z.string().max(255, "Mô tả không quá 255 ký tự.").optional(),
});

// Hàm lấy chữ cái đầu không đổi
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

// Animation không đổi
const motionVariants = {
    hidden: { x: 30, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { x: -30, opacity: 0, transition: { duration: 0.2, ease: "easeInOut" } },
};

// Component Skeleton cho danh sách sinh viên
const StudentListSkeleton = ({ count = 5 }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-[50px]"><Skeleton className="h-5 w-5" /></TableHead>
                <TableHead><Skeleton className="h-5 w-3/4" /></TableHead>
                <TableHead><Skeleton className="h-5 w-1/2" /></TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {Array.from({ length: count }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                    <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);


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

    const fetchUngroupedStudents = useCallback(async () => {
        if (step === 2 && planId && ungroupedStudents.length === 0) {
            setIsFetchingStudents(true);
            try {
                const data = await searchUngroupedStudents(planId, '');
                setUngroupedStudents(data || []);
            } catch {
                toast.error("Lỗi khi tải danh sách sinh viên.");
            } finally {
                setIsFetchingStudents(false);
            }
        }
    }, [step, planId, ungroupedStudents.length]);

    useEffect(() => {
        fetchUngroupedStudents();
    }, [fetchUngroupedStudents]);


    const filteredStudents = useMemo(() => {
        if (!debouncedSearchTerm) return ungroupedStudents;
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        return ungroupedStudents.filter(student =>
            student.HODEM_VA_TEN.toLowerCase().includes(lowerSearch) ||
            student.MA_DINHDANH.toLowerCase().includes(lowerSearch)
        );
    }, [debouncedSearchTerm, ungroupedStudents]);

    const handleNextStep = async () => {
        const isValid = await form.trigger(['TEN_NHOM', 'MOTA']);
        if (isValid) setStep(2);
    };

    const handleCheckboxChange = (student, isChecked) => {
        setMembers(prevMembers => {
            const newMembers = isChecked
                ? [...prevMembers, student]
                : prevMembers.filter(m => m.ID_NGUOIDUNG !== student.ID_NGUOIDUNG);

            if (!isChecked && leaderId === student.ID_NGUOIDUNG) {
                setLeaderId(newMembers.length > 0 ? newMembers[0].ID_NGUOIDUNG : null);
            } else if (isChecked && newMembers.length === 1) {
                setLeaderId(student.ID_NGUOIDUNG);
            }
            return newMembers;
        });
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
                setIsFetchingStudents(false);
                setStep(1);
            }, 300);
        }
    }, [isOpen, form]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className={cn(
                "flex flex-col transition-all duration-300 ease-in-out p-0 max-h-[90vh]",
                step === 1 ? 'sm:max-w-lg' : 'sm:max-w-4xl'
            )}>
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle>Tạo Nhóm Mới (Bước {step}/2)</DialogTitle>
                    <DialogDescription>
                        {step === 1 ? 'Điền thông tin cơ bản của nhóm.' : 'Chọn thành viên và chỉ định nhóm trưởng.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow min-h-0 flex flex-col">
                        <ScrollArea className="flex-grow">
                            <div className="p-6">
                                <AnimatePresence mode="wait">
                                    {step === 1 && (
                                        <motion.div key="step1" variants={motionVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                                            <FormField control={form.control} name="TEN_NHOM" render={({ field }) => ( <FormItem> <FormLabel>Tên nhóm *</FormLabel> <FormControl><Input placeholder="Ví dụ: Nhóm Alpha" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                            <FormField control={form.control} name="MOTA" render={({ field }) => ( <FormItem> <FormLabel>Mô tả (tùy chọn)</FormLabel> <FormControl><Textarea rows={5} placeholder="Mô tả ngắn về nhóm..." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                        </motion.div>
                                    )}

                                    {step === 2 && (
                                        <motion.div key="step2" variants={motionVariants} initial="hidden" animate="visible" exit="exit" className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                            {/* Cột danh sách sinh viên */}
                                            <div className="flex flex-col space-y-3">
                                                <FormLabel className="flex items-center gap-2"><Users className="h-5 w-5"/> Sinh viên chưa có nhóm</FormLabel>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input placeholder="Lọc theo tên, MSSV..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                                </div>
                                                <div className="border rounded-md overflow-hidden max-h-[450px]">
                                                    <ScrollArea className="h-full max-h-[450px]">
                                                        {isFetchingStudents ? (
                                                            <StudentListSkeleton count={7} />
                                                        ) : (
                                                            <Table className="relative">
                                                                {/* --- SỬA LỖI HYDRATION --- */}
                                                                <TableHeader className="sticky top-0 bg-card z-10">
                                                                    <TableRow>
                                                                        <TableHead className="w-[50px]"></TableHead>
                                                                        <TableHead>Họ và tên</TableHead>
                                                                        <TableHead>MSSV</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {filteredStudents.length > 0 ? filteredStudents.map(student => (
                                                                        <TableRow
                                                                            key={student.ID_NGUOIDUNG}
                                                                            data-state={members.some(m => m.ID_NGUOIDUNG === student.ID_NGUOIDUNG) ? 'selected' : ''}
                                                                            className="cursor-pointer"
                                                                            // --- SỬA LỖI LẶP UPDATE ---
                                                                            // Bỏ onClick ở đây
                                                                        >
                                                                            <TableCell>
                                                                                <Checkbox
                                                                                    checked={members.some(m => m.ID_NGUOIDUNG === student.ID_NGUOIDUNG)}
                                                                                    onCheckedChange={(checked) => handleCheckboxChange(student, checked)}
                                                                                    aria-label={`Select ${student.HODEM_VA_TEN}`}
                                                                                    // Bỏ onClick stopPropagation nếu có
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell className="font-medium">{student.HODEM_VA_TEN}</TableCell>
                                                                            <TableCell>{student.MA_DINHDANH}</TableCell>
                                                                        </TableRow>
                                                                    )) : (
                                                                        <TableRow>
                                                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                                                {ungroupedStudents.length === 0 ? 'Không có sinh viên nào chưa có nhóm.' : 'Không tìm thấy sinh viên phù hợp.'}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    )}
                                                                </TableBody>
                                                                {/* --- KẾT THÚC SỬA LỖI HYDRATION --- */}
                                                            </Table>
                                                        )}
                                                    </ScrollArea>
                                                </div>
                                            </div>

                                            {/* Cột thành viên đã chọn */}
                                            <div className="flex flex-col space-y-3">
                                                <FormLabel className="flex items-center gap-2"><UserCheck className="h-5 w-5"/> Thành viên đã chọn ({members.length})</FormLabel>
                                                <Card className="flex-grow min-h-[300px] max-h-[calc(450px+48px)]">
                                                    <ScrollArea className="h-full max-h-[calc(450px+48px)]">
                                                        <CardContent className="p-3 space-y-2">
                                                            {members.length > 0 ? (
                                                                members.map(member => (
                                                                    <div key={member.ID_NGUOIDUNG} className="flex items-center justify-between p-2.5 rounded-md border bg-background hover:bg-muted/50 transition-colors">
                                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                                            <Avatar className="h-9 w-9 shrink-0"><AvatarFallback>{getInitials(member.HODEM_VA_TEN)}</AvatarFallback></Avatar>
                                                                            <div className="flex-grow min-w-0">
                                                                                <p className="text-sm font-semibold truncate" title={member.HODEM_VA_TEN}>{member.HODEM_VA_TEN}</p>
                                                                                <p className="text-xs text-muted-foreground truncate" title={member.MA_DINHDANH}>{member.MA_DINHDANH}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                            <Button
                                                                                type="button"
                                                                                variant={leaderId === member.ID_NGUOIDUNG ? "default" : "ghost"}
                                                                                size="icon"
                                                                                className={cn(
                                                                                    "h-8 w-8 transition-colors",
                                                                                    leaderId === member.ID_NGUOIDUNG ? "text-primary-foreground bg-primary hover:bg-primary/90" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                                                )}
                                                                                onClick={() => setLeaderId(member.ID_NGUOIDUNG)}
                                                                                title="Đặt làm nhóm trưởng"
                                                                            >
                                                                                <Crown className="h-4 w-4" />
                                                                            </Button>
                                                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleCheckboxChange(member, false)} title="Xóa khỏi nhóm">
                                                                                <X className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-10 text-center">
                                                                    Chọn sinh viên từ danh sách bên trái để thêm vào nhóm.
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </ScrollArea>
                                                </Card>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </ScrollArea>

                        <DialogFooter className="p-6 border-t mt-auto shrink-0 flex justify-between sm:justify-between">
                            <div>
                                {step === 1 && <DialogClose asChild><Button type="button" variant="outline">Hủy</Button></DialogClose>}
                                {step === 2 && <Button type="button" variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Quay lại</Button>}
                            </div>
                            <div>
                                {step === 1 && <Button type="button" onClick={handleNextStep}>Tiếp theo <ArrowRight className="ml-2 h-4 w-4" /></Button>}
                                {step === 2 && (
                                    <Button type="submit" disabled={isLoading || members.length === 0 || !leaderId}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Tạo nhóm ({members.length})
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}