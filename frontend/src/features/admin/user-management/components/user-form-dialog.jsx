import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from "sonner";
import { userFormSchema } from './user-form-schema';
import { createUser, updateUser, getRoles, getChuyenNganhs, getKhoaBomons, getPositions } from '@/api/userService';
import { 
    User, Briefcase, GraduationCap, Loader2, ChevronDown, 
    Settings, Mail, Fingerprint, Calendar, Lock, 
    School, BookOpen, Award, Hash 
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ID vai trò Sinh viên và các vai trò liên quan Giảng viên
const STUDENT_ROLE_ID = "3";
const GIANGVIEN_RELATED_ROLES = ["2", "4", "5"]; 

// Component MultiSelect cho Chức vụ (Giữ nguyên logic, chỉ chỉnh UI)
const MultiSelectPosition = ({ field, availablePositions }) => {
    const selectedIds = Array.isArray(field.value) ? field.value : [];
    const selectedNames = availablePositions
        .filter(p => selectedIds.includes(p.ID_CHUCVU))
        .map(p => p.TEN_CHUCVU);

    const handleSelect = (id) => {
        const idInt = parseInt(id);
        const newIds = new Set(selectedIds);
        if (newIds.has(idInt)) {
            newIds.delete(idInt);
        } else {
            newIds.add(idInt);
        }
        field.onChange(Array.from(newIds));
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                        "w-full justify-between h-10 px-3 font-normal hover:bg-background", // UI Tweaks
                        selectedIds.length === 0 && "text-muted-foreground"
                    )}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Award className="h-4 w-4 text-muted-foreground shrink-0" /> {/* UI Icon */}
                        {selectedIds.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {selectedNames.slice(0, 2).map(name => (
                                    <Badge key={name} variant="secondary" className="text-[10px] px-1 h-5">{name}</Badge>
                                ))}
                                {selectedIds.length > 2 && (
                                    <Badge variant="secondary" className="text-[10px] px-1 h-5">+{selectedIds.length - 2}</Badge>
                                )}
                            </div>
                        ) : (
                            <span>Chọn chức vụ (Tùy chọn)</span>
                        )}
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandGroup heading="Chức vụ">
                        <CommandList>
                            <ScrollArea className="h-40">
                                {availablePositions.map((position) => {
                                    const isSelected = selectedIds.includes(position.ID_CHUCVU);
                                    return (
                                        <CommandItem
                                            key={position.ID_CHUCVU}
                                            value={position.TEN_CHUCVU}
                                            onSelect={() => handleSelect(position.ID_CHUCVU)}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                className="mr-2 h-4 w-4"
                                            />
                                            {position.TEN_CHUCVU}
                                        </CommandItem>
                                    );
                                })}
                            </ScrollArea>
                        </CommandList>
                    </CommandGroup>
                    <CommandSeparator />
                    {selectedIds.length > 0 && (
                        <CommandItem onSelect={() => field.onChange([])} className="justify-center text-red-500 cursor-pointer">
                            Xóa tất cả
                        </CommandItem>
                    )}
                </Command>
            </PopoverContent>
        </Popover>
    );
};


// Component Dialog để tạo/sửa người dùng
export function UserFormDialog({ isOpen, setIsOpen, editingUser, onSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const [auxData, setAuxData] = useState({ roles: [], chuyenNganhs: [], khoaBomons: [], positions: [] });
    const [isLoadingAux, setIsLoadingAux] = useState(true);
    const isEditMode = !!editingUser;

    const form = useForm({
        resolver: zodResolver(userFormSchema),
        mode: 'onChange',
        defaultValues: {
            HODEM_VA_TEN: '',
            EMAIL: '',
            MA_DINHDANH: '',
            NGAYSINH: '',
            ID_VAITRO: '',
            password: '',
            TRANGTHAI_KICHHOAT: true,
            sinhvien_details: { ID_CHUYENNGANH: '', NIENKHOA: '', HEDAOTAO: '', TEN_LOP: '' },
            giangvien_details: { ID_KHOA_BOMON: '', HOCVI: '', CHUCVU_IDS: [] },
        },
    });

    const watchedRole = form.watch("ID_VAITRO");

    // Tải dữ liệu phụ
    useEffect(() => {
        if (isOpen) {
            setIsLoadingAux(true);
            Promise.all([
                getRoles().catch(() => []),
                getChuyenNganhs().catch(() => []),
                getKhoaBomons().catch(() => []),
                getPositions().catch(() => []),
            ]).then(([roles, chuyenNganhs, khoaBomons, positions]) => {
                setAuxData({ roles, chuyenNganhs, khoaBomons, positions });
            }).finally(() => {
                setIsLoadingAux(false);
            });
        }
    }, [isOpen]);

    // Đặt lại form
    useEffect(() => {
        if (isOpen) {
            if (isEditMode && editingUser) {
                const svDetails = editingUser.sinhvien || { ID_CHUYENNGANH: '', NIENKHOA: '', HEDAOTAO: '', TEN_LOP: '' };
                const gvDetails = editingUser.giangvien || { ID_KHOA_BOMON: '', HOCVI: '', CHUCVU_IDS: [] };
                const chucVuIds = editingUser.giangvien?.chucvus?.map(cv => cv.ID_CHUCVU) || [];

                let formattedNgaySinh = '';
                if (editingUser.NGAYSINH) {
                    const date = parseISO(editingUser.NGAYSINH);
                    if (isValid(date)) {
                        formattedNgaySinh = format(new Date(editingUser.NGAYSINH), 'yyyy-MM-dd');
                    }
                }
                form.reset({
                    HODEM_VA_TEN: editingUser.HODEM_VA_TEN || '',
                    EMAIL: editingUser.EMAIL || '',
                    MA_DINHDANH: editingUser.MA_DINHDANH || '',
                    NGAYSINH: formattedNgaySinh,
                    ID_VAITRO: String(editingUser.ID_VAITRO || ''),
                    TRANGTHAI_KICHHOAT: editingUser.TRANGTHAI_KICHHOAT === 1 || editingUser.TRANGTHAI_KICHHOAT === true,
                    sinhvien_details: {
                        ID_CHUYENNGANH: String(svDetails.ID_CHUYENNGANH || ''),
                        NIENKHOA: svDetails.NIENKHOA || '',
                        HEDAOTAO: svDetails.HEDAOTAO || '',
                        TEN_LOP: svDetails.TEN_LOP || '',
                    },
                    giangvien_details: {
                        ID_KHOA_BOMON: String(gvDetails.ID_KHOA_BOMON || ''),
                        HOCVI: gvDetails.HOCVI || '',
                        CHUCVU_IDS: chucVuIds,
                    },
                    password: '',
                });
            } else {
                form.reset({
                    HODEM_VA_TEN: '',
                    EMAIL: '',
                    MA_DINHDANH: '',
                    NGAYSINH: '',
                    ID_VAITRO: '',
                    password: '',
                    TRANGTHAI_KICHHOAT: true,
                    sinhvien_details: { ID_CHUYENNGANH: '', NIENKHOA: 'K13', HEDAOTAO: 'Cử nhân', TEN_LOP: '' },
                    giangvien_details: { ID_KHOA_BOMON: '', HOCVI: 'Thạc sĩ', CHUCVU_IDS: [] },
                });
            }
            form.clearErrors();
        }
    }, [isOpen, editingUser, isEditMode, form]);

    // Gửi dữ liệu form
    async function onSubmit(data) {
        setIsLoading(true);
        const payload = {
            HODEM_VA_TEN: data.HODEM_VA_TEN,
            EMAIL: data.EMAIL,
            MA_DINHDANH: data.MA_DINHDANH,
            NGAYSINH: data.NGAYSINH || null,
            ID_VAITRO: data.ID_VAITRO,
            TRANGTHAI_KICHHOAT: data.TRANGTHAI_KICHHOAT,
            ...( (!isEditMode || data.password) && { password: data.password } ),
            ...(data.ID_VAITRO === STUDENT_ROLE_ID && { sinhvien_details: data.sinhvien_details }),
            ...(GIANGVIEN_RELATED_ROLES.includes(data.ID_VAITRO) && { giangvien_details: data.giangvien_details }),
        };
        
        if (payload.giangvien_details && payload.giangvien_details.CHUCVU_IDS && payload.giangvien_details.CHUCVU_IDS.length === 0) {
            delete payload.giangvien_details.CHUCVU_IDS;
        }

        try {
            if (isEditMode) {
                await updateUser(editingUser.ID_NGUOIDUNG, payload);
                toast.success("Cập nhật người dùng thành công!");
            } else {
                await createUser(payload);
                toast.success("Tạo người dùng mới thành công!");
            }
            onSuccess();
            setIsOpen(false);
        } catch (error) {
            console.error("Form submission error:", error.response?.data || error);
            if (error.response?.status === 422 && error.response?.data?.errors) {
                Object.entries(error.response.data.errors).forEach(([field, messages]) => {
                    const formField = field.includes('.') ? field : field;
                    try {
                        form.setError(formField, { type: 'manual', message: messages.join(', ') });
                    } catch (e) {
                        toast.error(`Lỗi validation: ${messages.join(', ')}`);
                    }
                });
            } else {
                toast.error(error.response?.data?.message || "Đã có lỗi xảy ra.");
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[900px] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* Header với Gradient nhẹ */}
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/20 dark:to-background border-b">
                    <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
                        {isEditMode ? <User className="h-6 w-6" /> : <div className="bg-primary text-primary-foreground p-1 rounded"><User className="h-5 w-5" /></div>}
                        {isEditMode ? 'Chỉnh sửa Hồ sơ' : 'Thêm Người dùng mới'}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {isEditMode ? 'Cập nhật thông tin cá nhân và quyền hạn.' : 'Khởi tạo tài khoản mới vào hệ thống.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow min-h-0">
                        <ScrollArea className="flex-grow p-6">
                            {isLoadingAux ? (
                                <div className="flex flex-col justify-center items-center h-64 gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    
                                    {/* CỘT TRÁI: THÔNG TIN CÁ NHÂN (Chiếm 7/12) */}
                                    <div className="md:col-span-7 space-y-6">
                                        <div className="bg-card border rounded-lg p-4 shadow-sm">
                                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md dark:bg-blue-900/30 dark:text-blue-400"><User className="h-4 w-4" /></div>
                                                Thông tin định danh
                                            </h3>
                                            <div className="space-y-4">
                                                <FormField
                                                    control={form.control}
                                                    name="HODEM_VA_TEN"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Họ và tên <span className="text-destructive">*</span></FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                    <Input className="pl-9" placeholder="Nhập họ tên đầy đủ" {...field} />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="MA_DINHDANH"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Mã số (ID) <span className="text-destructive">*</span></FormLabel>
                                                                <FormControl>
                                                                    <div className="relative">
                                                                        <Fingerprint className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                        <Input className="pl-9 font-mono" placeholder="VD: 200123..." {...field} />
                                                                    </div>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="NGAYSINH"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Ngày sinh</FormLabel>
                                                                <FormControl>
                                                                    <div className="relative">
                                                                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                        <Input className="pl-9" type="date" {...field} value={field.value || ''} />
                                                                    </div>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <FormField
                                                    control={form.control}
                                                    name="EMAIL"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                    <Input className="pl-9" type="email" placeholder="example@domain.com" {...field} />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-card border rounded-lg p-4 shadow-sm">
                                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                                <div className="p-1.5 bg-orange-100 text-orange-600 rounded-md dark:bg-orange-900/30 dark:text-orange-400"><Lock className="h-4 w-4" /></div>
                                                Bảo mật
                                            </h3>
                                            <FormField
                                                control={form.control}
                                                name="password"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Mật khẩu {isEditMode && <span className="text-muted-foreground font-normal">(Để trống nếu không đổi)</span>}</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                <Input className="pl-9" type="password" placeholder={isEditMode ? "••••••••" : "Mặc định: 123456"} {...field} />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {/* CỘT PHẢI: PHÂN QUYỀN & CHI TIẾT (Chiếm 5/12) */}
                                    <div className="md:col-span-5 space-y-6">
                                        <div className="bg-card border rounded-lg p-4 shadow-sm h-full flex flex-col">
                                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                                <div className="p-1.5 bg-green-100 text-green-600 rounded-md dark:bg-green-900/30 dark:text-green-400"><Settings className="h-4 w-4" /></div>
                                                Thiết lập tài khoản
                                            </h3>
                                            
                                            <div className="space-y-5 flex-grow">
                                                <FormField
                                                    control={form.control}
                                                    name="ID_VAITRO"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Vai trò hệ thống <span className="text-destructive">*</span></FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value} disabled={isEditMode}>
                                                                <FormControl>
                                                                    <SelectTrigger className="pl-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                                                                            <SelectValue placeholder="Chọn vai trò" />
                                                                        </div>
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {auxData.roles.map(role => (
                                                                        <SelectItem key={role.ID_VAITRO} value={String(role.ID_VAITRO)}>
                                                                            {role.TEN_VAITRO}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                {/* Form con: Sinh viên */}
                                                {watchedRole === STUDENT_ROLE_ID && (
                                                    <div className="space-y-4 pt-2 border-t animate-in slide-in-from-top-2 fade-in">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thông tin sinh viên</p>
                                                        <FormField
                                                            control={form.control}
                                                            name="sinhvien_details.ID_CHUYENNGANH"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs">Chuyên ngành <span className="text-destructive">*</span></FormLabel>
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <FormControl>
                                                                            <SelectTrigger className="h-9 text-sm">
                                                                                 <SelectValue placeholder="Chọn chuyên ngành" />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent>
                                                                            {auxData.chuyenNganhs.map(cn => (
                                                                                <SelectItem key={cn.ID_CHUYENNGANH} value={String(cn.ID_CHUYENNGANH)}>{cn.TEN_CHUYENNGANH}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <FormField control={form.control} name="sinhvien_details.NIENKHOA" render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs">Niên khóa *</FormLabel>
                                                                    <FormControl><Input className="h-9 text-sm" placeholder="K13" {...field} value={field.value ?? ''} /></FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )} />
                                                            <FormField control={form.control} name="sinhvien_details.TEN_LOP" render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs">Lớp</FormLabel>
                                                                    <FormControl><Input className="h-9 text-sm" placeholder="DH20IT" {...field} value={field.value ?? ''} /></FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )} />
                                                        </div>
                                                        <FormField
                                                            control={form.control}
                                                            name="sinhvien_details.HEDAOTAO"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs">Hệ đào tạo *</FormLabel>
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger></FormControl>
                                                                        <SelectContent>
                                                                            {['Cử nhân', 'Kỹ sư', 'Thạc sỹ'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                )}

                                                {/* Form con: Giảng viên */}
                                                {watchedRole && GIANGVIEN_RELATED_ROLES.includes(watchedRole) && (
                                                    <div className="space-y-4 pt-2 border-t animate-in slide-in-from-top-2 fade-in">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thông tin công tác</p>
                                                        <FormField
                                                            control={form.control}
                                                            name="giangvien_details.ID_KHOA_BOMON"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs">Khoa / Bộ môn <span className="text-destructive">*</span></FormLabel>
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <FormControl>
                                                                            <SelectTrigger className="h-9 text-sm">
                                                                                 <div className="flex items-center gap-2 truncate">
                                                                                    <School className="h-3 w-3 text-muted-foreground shrink-0" />
                                                                                    <SelectValue placeholder="Chọn đơn vị" />
                                                                                 </div>
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent>
                                                                            {auxData.khoaBomons.map(kb => (
                                                                                <SelectItem key={kb.ID_KHOA_BOMON} value={String(kb.ID_KHOA_BOMON)}>{kb.TEN_KHOA_BOMON}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="giangvien_details.HOCVI"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs">Học vị <span className="text-destructive">*</span></FormLabel>
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <FormControl>
                                                                             <SelectTrigger className="h-9 text-sm">
                                                                                <div className="flex items-center gap-2">
                                                                                    <GraduationCap className="h-3 w-3 text-muted-foreground" />
                                                                                    <SelectValue />
                                                                                </div>
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent>
                                                                            {['Thạc sĩ', 'Tiến sĩ', 'Phó Giáo sư', 'Giáo sư'].map(hv => <SelectItem key={hv} value={hv}>{hv}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="giangvien_details.CHUCVU_IDS"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs">Chức vụ</FormLabel>
                                                                    <FormControl>
                                                                        <MultiSelectPosition field={field} availablePositions={auxData.positions} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                )}

                                                {isEditMode && (
                                                    <FormField
                                                        control={form.control}
                                                        name="TRANGTHAI_KICHHOAT"
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-auto bg-muted/30">
                                                                <div className="space-y-0.5">
                                                                    <FormLabel className="text-sm">Trạng thái hoạt động</FormLabel>
                                                                    <FormDescription className="text-xs">
                                                                        Bật để cho phép đăng nhập
                                                                    </FormDescription>
                                                                </div>
                                                                <FormControl>
                                                                    <Switch
                                                                        checked={field.value}
                                                                        onCheckedChange={field.onChange}
                                                                        className="data-[state=checked]:bg-green-500"
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </ScrollArea>

                        <DialogFooter className="p-6 border-t bg-muted/10 mt-auto shrink-0">
                            <div className="flex w-full justify-between items-center">
                                <p className="text-xs text-muted-foreground italic">
                                    * Các trường bắt buộc
                                </p>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
                                        Hủy
                                    </Button>
                                    <Button type="submit" disabled={isLoading || isLoadingAux || !form.formState.isValid} className="min-w-[120px]">
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {isEditMode ? 'Lưu thay đổi' : 'Tạo mới'}
                                    </Button>
                                </div>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}