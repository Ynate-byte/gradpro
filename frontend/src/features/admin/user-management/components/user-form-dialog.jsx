import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { userFormSchema } from './user-form-schema';
import { createUser, updateUser, getRoles, getChuyenNganhs, getKhoaBomons } from '@/api/userService';
import { toast } from "sonner";
import { User, Mail, Hash, KeyRound, Briefcase, GraduationCap } from 'lucide-react';

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const StepIndicator = ({ currentStep, totalSteps }) => (
    <div className="flex justify-center items-center mb-4 space-x-2">
        {Array.from({ length: totalSteps }).map((_, index) => (
            <motion.div
                key={index}
                className={`h-1.5 rounded-full`}
                animate={{
                    width: index + 1 === currentStep ? '2rem' : '0.5rem',
                    backgroundColor: index + 1 === currentStep ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)'
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            />
        ))}
    </div>
);

const stepVariants = {
    hidden: (direction) => ({
        x: direction > 0 ? '100%' : '-100%',
        opacity: 0
    }),
    visible: {
        x: '0%',
        opacity: 1,
        transition: { type: 'tween', ease: 'easeInOut', duration: 0.4 }
    },
    exit: (direction) => ({
        x: direction < 0 ? '100%' : '-100%',
        opacity: 0,
        transition: { type: 'tween', ease: 'easeInOut', duration: 0.4 }
    })
};

export function UserFormDialog({ isOpen, setIsOpen, editingUser, onSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const [auxData, setAuxData] = useState({ roles: [], chuyenNganhs: [], khoaBomons: [] });
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1);

    const isEditMode = !!editingUser;
    const totalSteps = isEditMode ? 2 : 3;

    const form = useForm({
        resolver: zodResolver(userFormSchema),
        mode: 'onChange',
        defaultValues: {
            HODEM_VA_TEN: '',
            EMAIL: '',
            MA_DINHDANH: '',
            ID_VAITRO: '',
            password: '',
            TRANGTHAI_KICHHOAT: true,
            sinhvien_details: { ID_CHUYENNGANH: '', NIENKHOA: 'K13', HEDAOTAO: 'Cử nhân', TEN_LOP: '' },
            giangvien_details: { ID_KHOA_BOMON: '', HOCVI: 'Thạc sĩ' },
        },
    });

    const watchedRole = form.watch("ID_VAITRO");

    useEffect(() => {
        if (isOpen) {
            Promise.all([
                getRoles().catch(() => []), getChuyenNganhs().catch(() => []), getKhoaBomons().catch(() => [])
            ]).then(([roles, chuyenNganhs, khoaBomons]) => {
                setAuxData({ roles, chuyenNganhs, khoaBomons });
            });
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            if (isEditMode && editingUser) {
                form.reset({
                    HODEM_VA_TEN: editingUser.HODEM_VA_TEN,
                    EMAIL: editingUser.EMAIL,
                    MA_DINHDANH: editingUser.MA_DINHDANH,
                    ID_VAITRO: String(editingUser.ID_VAITRO),
                    TRANGTHAI_KICHHOAT: editingUser.TRANGTHAI_KICHHOAT,
                    sinhvien_details: editingUser.sinhvien || { ID_CHUYENNGANH: '', NIENKHOA: '', HEDAOTAO: '' , TEN_LOP: ''},
                    giangvien_details: editingUser.giangvien || { ID_KHOA_BOMON: '', HOCVI: '' },
                    password: '',
                });
            } else {
                form.reset();
            }
        }
    }, [isOpen, editingUser, isEditMode, form]);

    const handleNextStep = async () => {
        let fieldsToValidate = [];
        if (step === 1) fieldsToValidate = ['HODEM_VA_TEN', 'EMAIL', 'MA_DINHDANH'];
        if (step === 2 && !isEditMode) fieldsToValidate = ['ID_VAITRO'];
        
        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) {
            setDirection(1);
            setStep(step + 1);
        }
    };

    const handlePrevStep = () => {
        setDirection(-1);
        setStep(step - 1);
    };

    async function onSubmit(data) {
        setIsLoading(true);
        try {
            if (isEditMode) {
                await updateUser(editingUser.ID_NGUOIDUNG, data);
                toast.success("Cập nhật người dùng thành công!");
            } else {
                await createUser(data);
                toast.success("Tạo người dùng mới thành công!");
            }
            onSuccess();
            setIsOpen(false);
        } catch (error) {
            console.error("Form submission error:", error);
            toast.error(error.response?.data?.message || "Đã có lỗi xảy ra.");
        } finally {
            setIsLoading(false);
        }
    }

    const renderStepContent = () => {
        const currentStep = isEditMode ? step + 1 : step;

        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <FormField name="HODEM_VA_TEN" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Họ và tên</FormLabel>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <FormControl><Input className="pl-10" placeholder="Nguyễn Văn A" {...field} /></FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField name="EMAIL" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <FormControl><Input type="email" className="pl-10" placeholder="example@email.com" {...field} /></FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField name="MA_DINHDANH" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mã định danh</FormLabel>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <FormControl><Input className="pl-10" placeholder="MSSV/MSGV" {...field} /></FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        {!isEditMode && (
                             <FormField name="password" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mật khẩu</FormLabel>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <FormControl><Input type="password" className="pl-10" placeholder="••••••••" {...field} /></FormControl>
                                    </div>
                                    <FormDescription>Để trống để dùng mật khẩu mặc định (123456).</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        )}
                    </div>
                );
            case 2:
                return (
                     <FormField name="ID_VAITRO" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Vai trò của người dùng</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isEditMode}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Chọn vai trò" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {auxData.roles.map(role => (
                                        <SelectItem key={role.ID_VAITRO} value={String(role.ID_VAITRO)}>
                                            <div className="flex items-center gap-2">
                                                {role.TEN_VAITRO === 'Sinh viên' && <GraduationCap className="h-4 w-4 text-muted-foreground" />}
                                                {role.TEN_VAITRO === 'Giảng viên' && <Briefcase className="h-4 w-4 text-muted-foreground" />}
                                                {role.TEN_VAITRO}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                             <FormDescription>Vai trò không thể thay đổi sau khi tạo.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />
                );
            case 3:
                return (
                    <>
                        {watchedRole === "3" && (
                            <div className="p-4 border rounded-md space-y-4 bg-muted/50">
                                <h4 className="font-semibold text-sm flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary"/>Thông tin Sinh viên</h4>
                                <FormField name="sinhvien_details.ID_CHUYENNGANH" control={form.control} render={({ field }) => (
                                   <FormItem>
                                       <FormLabel>Chuyên ngành</FormLabel>
                                        <Select onValueChange={field.onChange} value={String(field.value)}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Chọn chuyên ngành" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {auxData.chuyenNganhs.map(cn => (
                                                    <SelectItem key={cn.ID_CHUYENNGANH} value={String(cn.ID_CHUYENNGANH)}>{cn.TEN_CHUYENNGANH}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                       <FormMessage />
                                   </FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-4">
                                     <FormField name="sinhvien_details.NIENKHOA" control={form.control} render={({ field }) => (
                                        <FormItem> <FormLabel>Niên khóa</FormLabel> <FormControl><Input placeholder="K13" {...field} /></FormControl> <FormMessage /> </FormItem>
                                    )} />
                                     <FormField name="sinhvien_details.HEDAOTAO" control={form.control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Hệ đào tạo</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Cử nhân">Cử nhân</SelectItem>
                                                    <SelectItem value="Kỹ sư">Kỹ sư</SelectItem>
                                                    <SelectItem value="Thạc sỹ">Thạc sỹ</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                        )}
                        {watchedRole === "2" && (
                             <div className="p-4 border rounded-md space-y-4 bg-muted/50">
                                <h4 className="font-semibold text-sm flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary"/>Thông tin Giảng viên</h4>
                                <FormField name="giangvien_details.ID_KHOA_BOMON" control={form.control} render={({ field }) => (
                                   <FormItem>
                                       <FormLabel>Khoa/Bộ môn</FormLabel>
                                        <Select onValueChange={field.onChange} value={String(field.value)}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Chọn Khoa/Bộ môn" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {auxData.khoaBomons.map(kb => (
                                                    <SelectItem key={kb.ID_KHOA_BOMON} value={String(kb.ID_KHOA_BOMON)}>{kb.TEN_KHOA_BOMON}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                       <FormMessage />
                                   </FormItem>
                                )} />
                                <FormField name="giangvien_details.HOCVI" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Học vị</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Thạc sĩ">Thạc sĩ</SelectItem>
                                                <SelectItem value="Tiến sĩ">Tiến sĩ</SelectItem>
                                                <SelectItem value="Phó Giáo sư">Phó Giáo sư</SelectItem>
                                                <SelectItem value="Giáo sư">Giáo sư</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        )}
                        {isEditMode && (
                             <FormField name="TRANGTHAI_KICHHOAT" control={form.control} render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Kích hoạt tài khoản</FormLabel>
                                        <FormDescription>Nếu tắt, người dùng sẽ không thể đăng nhập.</FormDescription>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )} />
                        )}
                    </>
                );
            default: return null;
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Chỉnh sửa Người dùng' : 'Thêm Người dùng mới'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Cập nhật thông tin cho người dùng.' : 'Điền thông tin theo từng bước để tạo tài khoản mới.'}
                    </DialogDescription>
                </DialogHeader>

                <StepIndicator currentStep={step} totalSteps={totalSteps} />

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="overflow-hidden relative min-h-[350px]">
                        <AnimatePresence initial={false} custom={direction} mode="wait">
                            <motion.div
                                key={step}
                                custom={direction}
                                variants={stepVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="absolute w-full"
                            >
                                {renderStepContent()}
                            </motion.div>
                        </AnimatePresence>
                        
                        <DialogFooter className="mt-8 pt-4 border-t absolute bottom-0 left-0 right-0 bg-background px-6 pb-6">
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                            {step > 1 && <Button type="button" variant="secondary" onClick={handlePrevStep}>Quay lại</Button>}
                            {step < totalSteps && <Button type="button" onClick={handleNextStep}>Tiếp theo</Button>}
                            {step === totalSteps && <Button type="submit" disabled={isLoading}>{isLoading ? 'Đang lưu...' : 'Lưu thông tin'}</Button>}
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}