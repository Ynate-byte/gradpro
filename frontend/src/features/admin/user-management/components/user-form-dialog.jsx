import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from "sonner";
import { userFormSchema } from './user-form-schema';
// Thêm getPositions
import { createUser, updateUser, getRoles, getChuyenNganhs, getKhoaBomons, getPositions } from '@/api/userService';
import { User, Briefcase, GraduationCap, Loader2, ChevronDown, Settings } from 'lucide-react';
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
// Import các component cần thiết cho MultiSelect
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
const GIANGVIEN_RELATED_ROLES = ["2", "4", "5"]; // 2: Giảng viên, 4: Giáo vụ, 5: Trưởng khoa

// Component MultiSelect cho Chức vụ (Giữ nguyên)
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
                        "w-full justify-between h-10 border-blue-300 dark:border-blue-600 focus:ring-blue-500",
                        selectedIds.length === 0 && "text-muted-foreground"
                    )}
                >
                    {selectedIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {selectedNames.slice(0, 2).map(name => (
                                <Badge key={name} variant="secondary" className="text-xs">{name}</Badge>
                            ))}
                            {selectedIds.length > 2 && (
                                <Badge variant="secondary" className="text-xs">+{selectedIds.length - 2}</Badge>
                            )}
                        </div>
                    ) : (
                        "Chọn chức vụ (Tùy chọn)"
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="start">
                <Command>
                    <CommandGroup heading="Chức vụ">
                        <CommandList>
                            <ScrollArea className="h-32">
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
                        <CommandItem onSelect={() => field.onChange([])} className="text-center text-red-500">
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
    // Thêm state cho positions
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
            // Sửa CHUCVU thành CHUCVU_IDS (dạng mảng ID)
            giangvien_details: { ID_KHOA_BOMON: '', HOCVI: '', CHUCVU_IDS: [] },
        },
    });

    const watchedRole = form.watch("ID_VAITRO");

    // Tải dữ liệu phụ (Logic giữ nguyên)
    useEffect(() => {
        if (isOpen) {
            setIsLoadingAux(true);
            Promise.all([
                getRoles().catch(() => []),
                getChuyenNganhs().catch(() => []),
                getKhoaBomons().catch(() => []),
                getPositions().catch(() => []), // Lấy danh sách chức vụ
            ]).then(([roles, chuyenNganhs, khoaBomons, positions]) => {
                setAuxData({ roles, chuyenNganhs, khoaBomons, positions });
            }).finally(() => {
                setIsLoadingAux(false);
            });
        }
    }, [isOpen]);

    // Đặt lại form (Logic giữ nguyên)
    useEffect(() => {
        if (isOpen) {
            if (isEditMode && editingUser) {
                const svDetails = editingUser.sinhvien || { ID_CHUYENNGANH: '', NIENKHOA: '', HEDAOTAO: '', TEN_LOP: '' };
                const gvDetails = editingUser.giangvien || { ID_KHOA_BOMON: '', HOCVI: '', CHUCVU_IDS: [] };
                
                // Lấy mảng ID chức vụ từ quan hệ N-N
                const chucVuIds = editingUser.giangvien?.chucvus?.map(cv => cv.ID_CHUCVU) || [];

                let formattedNgaySinh = '';
                if (editingUser.NGAYSINH) {
                    const date = parseISO(editingUser.NGAYSINH);
                    if (isValid(date)) {
                        // Fix date issue when displaying
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
                        CHUCVU_IDS: chucVuIds, // Gán mảng ID chức vụ
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
                    giangvien_details: { ID_KHOA_BOMON: '', HOCVI: 'Thạc sĩ', CHUCVU_IDS: [] }, // Default mới
                });
            }
            form.clearErrors();
        }
    }, [isOpen, editingUser, isEditMode, form]);

    // Gửi dữ liệu form (Logic giữ nguyên)
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
            // Lọc sinhvien_details chỉ khi vai trò là Sinh viên
            ...(data.ID_VAITRO === STUDENT_ROLE_ID && { sinhvien_details: data.sinhvien_details }),
            // Lọc giangvien_details chỉ khi vai trò là Giảng viên liên quan
            ...(GIANGVIEN_RELATED_ROLES.includes(data.ID_VAITRO) && { giangvien_details: data.giangvien_details }),
        };
        
        // Loại bỏ trường CHUCVU_IDS nếu nó là mảng rỗng (để không bị lỗi validation nếu backend không mong đợi trường này)
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
                        console.warn(`Could not set error for field ${formField}: ${e}`);
                        toast.error(`Lỗi validation: ${messages.join(', ')}`);
                    }
                });
                const firstErrorField = Object.keys(error.response.data.errors)[0];
                if (firstErrorField) {
                    try { form.setFocus(firstErrorField); } catch { /* Ignore focus error */ }
                }
            } else {
                toast.error(error.response?.data?.message || "Đã có lỗi xảy ra.");
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {/* Giữ DialogContent rộng sm:max-w-5xl và flex-col */}
            <DialogContent className="sm:max-w-5xl max-h-[95vh] flex flex-col p-6 bg-gray-50 dark:bg-gray-900 border-l-4 border-blue-500">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        {isEditMode ? 'Chỉnh sửa Người dùng' : 'Thêm Người dùng mới'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-300">
                        {isEditMode ? 'Cập nhật thông tin chi tiết.' : 'Điền đầy đủ thông tin để tạo tài khoản.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow min-h-0 flex flex-col">
                        {/* THAY ĐỔI LỚN NHẤT: Bọc toàn bộ nội dung trong một ScrollArea và chia thành lưới 2 cột lớn */}
                        <ScrollArea className="flex-grow pr-4 -mr-4 max-h-[75vh]">
                            {isLoadingAux ? (
                                <div className="flex justify-center items-center h-48">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                </div>
                            ) : (
                                // ĐÃ SỬA LỖI: Thêm khối điều kiện đóng
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                    
                                    {/* CỘT 1: THÔNG TIN CƠ BẢN */}
                                    <div className="space-y-6">
                                        <div className="border border-blue-200 dark:border-blue-700 shadow-md rounded-lg bg-white dark:bg-gray-800 p-4">
                                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                                                <User className="h-5 w-5 text-blue-500" /> Thông tin cơ bản
                                            </h3>
                                            <Separator className="mb-4 bg-blue-200 dark:bg-blue-700" />
                                            
                                            {/* Lưới 2x2 cho 4 trường đầu tiên */}
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <FormField
                                                        name="HODEM_VA_TEN"
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-gray-700 dark:text-gray-200">Họ và tên *</FormLabel>
                                                                <FormControl>
                                                                    <Input className="border-blue-300 dark:border-blue-600 focus:ring-blue-500" placeholder="Nguyễn Văn A" {...field} />
                                                                </FormControl>
                                                                <FormMessage className="text-red-500" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        name="EMAIL"
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-gray-700 dark:text-gray-200">Email *</FormLabel>
                                                                <FormControl>
                                                                    <Input className="border-blue-300 dark:border-blue-600 focus:ring-blue-500" type="email" placeholder="example@email.com" {...field} />
                                                                </FormControl>
                                                                <FormMessage className="text-red-500" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <FormField
                                                        name="MA_DINHDANH"
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-gray-700 dark:text-gray-200">Mã định danh (MSSV/MSGV) *</FormLabel>
                                                                <FormControl>
                                                                    <Input className="border-blue-300 dark:border-blue-600 focus:ring-blue-500" placeholder="200120..." {...field} />
                                                                </FormControl>
                                                                <FormMessage className="text-red-500" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        name="NGAYSINH"
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-gray-700 dark:text-gray-200">Ngày sinh</FormLabel>
                                                                <FormControl>
                                                                    <Input className="border-blue-300 dark:border-blue-600 focus:ring-blue-500" type="date" {...field} value={field.value || ''} />
                                                                </FormControl>
                                                                <FormMessage className="text-red-500" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                            
                                            {/* Mật khẩu full-width */}
                                            <div className="mt-4">
                                                <FormField
                                                    name="password"
                                                    control={form.control}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-gray-700 dark:text-gray-200">Mật khẩu {isEditMode ? '(Để trống nếu không đổi)' : ''}</FormLabel>
                                                            <FormControl>
                                                                <Input className="border-blue-300 dark:border-blue-600 focus:ring-blue-500" type="password" placeholder="••••••••" {...field} />
                                                            </FormControl>
                                                            <FormDescription className="text-gray-500 dark:text-gray-400">
                                                                {isEditMode ? 'Nhập mật khẩu mới nếu muốn thay đổi.' : 'Mặc định là "123456" nếu để trống.'}
                                                            </FormDescription>
                                                            <FormMessage className="text-red-500" />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* CỘT 2: PHÂN QUYỀN & CHI TIẾT */}
                                    <div className="space-y-6">
                                        {/* Phần Vai trò và Trạng thái kích hoạt */}
                                        <div className="border border-blue-200 dark:border-blue-700 shadow-md rounded-lg bg-white dark:bg-gray-800 p-4">
                                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                                                <Briefcase className="h-5 w-5 text-blue-500" /> Phân quyền
                                            </h3>
                                            <Separator className="mb-4 bg-blue-200 dark:bg-blue-700" />
                                            <FormField
                                                name="ID_VAITRO"
                                                control={form.control}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-gray-700 dark:text-gray-200">Vai trò *</FormLabel>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            value={field.value}
                                                            disabled={isEditMode}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="border-blue-300 dark:border-blue-600 focus:ring-blue-500">
                                                                    <SelectValue placeholder="Chọn vai trò cho người dùng" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700">
                                                                {auxData.roles.map(role => (
                                                                    <SelectItem key={role.ID_VAITRO} value={String(role.ID_VAITRO)} className="text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                                        {role.TEN_VAITRO}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {isEditMode && <FormDescription className="text-gray-500 dark:text-gray-400">Vai trò không thể thay đổi sau khi tạo.</FormDescription>}
                                                        <FormMessage className="text-red-500" />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Trạng thái (chỉ khi sửa) */}
                                            {isEditMode && (
                                                <FormField
                                                    name="TRANGTHAI_KICHHOAT"
                                                    control={form.control}
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-blue-200 dark:border-blue-700 p-3 shadow-sm mt-6 bg-blue-50 dark:bg-blue-900/10">
                                                            <div className="space-y-0.5">
                                                                <FormLabel className="text-gray-700 dark:text-gray-200 flex items-center gap-2"><Settings className="h-4 w-4 text-blue-500"/> Kích hoạt tài khoản</FormLabel>
                                                                <FormDescription className="text-gray-500 dark:text-gray-400">Nếu tắt, người dùng sẽ không thể đăng nhập.</FormDescription>
                                                            </div>
                                                            <FormControl>
                                                                <Switch
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                    className="data-[state=checked]:bg-blue-500"
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            )}
                                        </div>

                                        {/* Thông tin Chi tiết (Sinh viên/Giảng viên) - Conditional rendering */}
                                        {watchedRole === STUDENT_ROLE_ID && (
                                            <div className="p-4 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 shadow-md">
                                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                                                    <GraduationCap className="h-5 w-5 text-blue-500" /> Thông tin Sinh viên
                                                </h3>
                                                <Separator className="mb-4 bg-blue-200 dark:bg-blue-700" />
                                                
                                                {/* Lưới 2 cột cho chi tiết sinh viên */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className='col-span-1 md:col-span-2'>
                                                        <FormField
                                                            name="sinhvien_details.ID_CHUYENNGANH"
                                                            control={form.control}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-gray-700 dark:text-gray-200">Chuyên ngành *</FormLabel>
                                                                    <Select
                                                                        onValueChange={field.onChange}
                                                                        value={field.value}
                                                                    >
                                                                        <FormControl>
                                                                            <SelectTrigger className="border-blue-300 dark:border-blue-600 focus:ring-blue-500">
                                                                                <SelectValue placeholder="Chọn chuyên ngành" />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700">
                                                                            {auxData.chuyenNganhs.map(cn => (
                                                                                <SelectItem key={cn.ID_CHUYENNGANH} value={String(cn.ID_CHUYENNGANH)} className="text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                                                    {cn.TEN_CHUYENNGANH}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage className="text-red-500" />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    
                                                    <FormField
                                                        name="sinhvien_details.NIENKHOA"
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-gray-700 dark:text-gray-200">Niên khóa *</FormLabel>
                                                                <FormControl>
                                                                    <Input className="border-blue-300 dark:border-blue-600 focus:ring-blue-500" placeholder="K13" {...field} value={field.value ?? ''} />
                                                                </FormControl>
                                                                <FormMessage className="text-red-500" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        name="sinhvien_details.HEDAOTAO"
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-gray-700 dark:text-gray-200">Hệ đào tạo *</FormLabel>
                                                                <Select
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="border-blue-300 dark:border-blue-600 focus:ring-blue-500">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700">
                                                                        <SelectItem value="Cử nhân" className="text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20">Cử nhân</SelectItem>
                                                                        <SelectItem value="Kỹ sư" className="text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20">Kỹ sư</SelectItem>
                                                                        <SelectItem value="Thạc sỹ" className="text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20">Thạc sỹ</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage className="text-red-500" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <div className='col-span-1 md:col-span-2'>
                                                        <FormField
                                                            name="sinhvien_details.TEN_LOP"
                                                            control={form.control}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-gray-700 dark:text-gray-200">Tên lớp</FormLabel>
                                                                    <FormControl>
                                                                        <Input className="border-blue-300 dark:border-blue-600 focus:ring-blue-500" placeholder="DH20IT01" {...field} value={field.value ?? ''} />
                                                                    </FormControl>
                                                                    <FormMessage className="text-red-500" />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {watchedRole && GIANGVIEN_RELATED_ROLES.includes(watchedRole) && (
                                            <div className="p-4 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 shadow-md">
                                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                                                    <Briefcase className="h-5 w-5 text-blue-500" /> Chi tiết Giảng viên/Chuyên viên
                                                </h3>
                                                <Separator className="mb-4 bg-blue-200 dark:bg-blue-700" />
                                                
                                                {/* Lưới 2 cột cho chi tiết giảng viên */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className='col-span-1 md:col-span-2'>
                                                        <FormField
                                                            name="giangvien_details.ID_KHOA_BOMON"
                                                            control={form.control}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-gray-700 dark:text-gray-200">Khoa/Bộ môn *</FormLabel>
                                                                    <Select
                                                                        onValueChange={field.onChange}
                                                                        value={field.value}
                                                                    >
                                                                        <FormControl>
                                                                            <SelectTrigger className="border-blue-300 dark:border-blue-600 focus:ring-blue-500">
                                                                                <SelectValue placeholder="Chọn Khoa/Bộ môn" />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700">
                                                                            {auxData.khoaBomons.map(kb => (
                                                                                <SelectItem key={kb.ID_KHOA_BOMON} value={String(kb.ID_KHOA_BOMON)} className="text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                                                    {kb.TEN_KHOA_BOMON}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage className="text-red-500" />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <FormField
                                                        name="giangvien_details.HOCVI"
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-gray-700 dark:text-gray-200">Học vị *</FormLabel>
                                                                <Select
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="border-blue-300 dark:border-blue-600 focus:ring-blue-500">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700">
                                                                        <SelectItem value="Thạc sĩ" className="text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20">Thạc sĩ</SelectItem>
                                                                        <SelectItem value="Tiến sĩ" className="text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20">Tiến sĩ</SelectItem>
                                                                        <SelectItem value="Phó Giáo sư" className="text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20">Phó Giáo sư</SelectItem>
                                                                        <SelectItem value="Giáo sư" className="text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20">Giáo sư</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage className="text-red-500" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    {/* Đã sửa: CHUCVU thành CHUCVU_IDS (multi-select) */}
                                                    <FormField
                                                        name="giangvien_details.CHUCVU_IDS"
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-gray-700 dark:text-gray-200">Chức vụ (Tùy chọn)</FormLabel>
                                                                <FormControl>
                                                                    <MultiSelectPosition
                                                                        field={field}
                                                                        availablePositions={auxData.positions}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage className="text-red-500" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </ScrollArea>
                        {/* Footer giữ nguyên */}
                        <DialogFooter className="pt-6 border-t border-blue-200 dark:border-blue-700 mt-auto shrink-0 bg-white dark:bg-gray-800">
                            <Button type="button" variant="outline" className="border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => setIsOpen(false)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={isLoading || isLoadingAux || !form.formState.isValid} className="bg-blue-500 hover:bg-blue-600 text-white">
                                {(isLoading || isLoadingAux) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditMode ? 'Lưu thay đổi' : 'Tạo người dùng'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}