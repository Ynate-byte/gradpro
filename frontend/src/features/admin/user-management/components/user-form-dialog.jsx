import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from "sonner";
import { userFormSchema } from './user-form-schema';
import { createUser, updateUser, getRoles, getChuyenNganhs, getKhoaBomons } from '@/api/userService';
import { User, Mail, Hash, KeyRound, Briefcase, GraduationCap, Loader2, Building, BookOpen, Award } from 'lucide-react';
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// ID vai trò Sinh viên và các vai trò liên quan Giảng viên
const STUDENT_ROLE_ID = "3";
const GIANGVIEN_RELATED_ROLES = ["2", "4", "5"]; // 2: Giảng viên, 4: Giáo vụ, 5: Trưởng khoa

// Component Dialog để tạo/sửa người dùng
export function UserFormDialog({ isOpen, setIsOpen, editingUser, onSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const [auxData, setAuxData] = useState({ roles: [], chuyenNganhs: [], khoaBomons: [] });
    const [isLoadingAux, setIsLoadingAux] = useState(true);
    const isEditMode = !!editingUser;

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
            sinhvien_details: { ID_CHUYENNGANH: '', NIENKHOA: '', HEDAOTAO: '', TEN_LOP: '' },
            giangvien_details: { ID_KHOA_BOMON: '', HOCVI: '', CHUCVU: null },
        },
    });

    const watchedRole = form.watch("ID_VAITRO");

    // Tải dữ liệu phụ (vai trò, chuyên ngành, khoa/bộ môn)
    useEffect(() => {
        if (isOpen) {
            setIsLoadingAux(true);
            Promise.all([
                getRoles().catch(() => []),
                getChuyenNganhs().catch(() => []),
                getKhoaBomons().catch(() => [])
            ]).then(([roles, chuyenNganhs, khoaBomons]) => {
                setAuxData({ roles, chuyenNganhs, khoaBomons });
            }).finally(() => {
                setIsLoadingAux(false);
            });
        }
    }, [isOpen]);

    // Đặt lại form khi mở dialog hoặc thay đổi người dùng đang sửa
    useEffect(() => {
        if (isOpen) {
            if (isEditMode && editingUser) {
                const svDetails = editingUser.sinhvien || { ID_CHUYENNGANH: '', NIENKHOA: '', HEDAOTAO: '', TEN_LOP: '' };
                const gvDetails = editingUser.giangvien || { ID_KHOA_BOMON: '', HOCVI: '', CHUCVU: null };

                form.reset({
                    HODEM_VA_TEN: editingUser.HODEM_VA_TEN || '',
                    EMAIL: editingUser.EMAIL || '',
                    MA_DINHDANH: editingUser.MA_DINHDANH || '',
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
                        CHUCVU: gvDetails.CHUCVU || null,
                    },
                    password: '',
                });
            } else {
                form.reset({
                    HODEM_VA_TEN: '',
                    EMAIL: '',
                    MA_DINHDANH: '',
                    ID_VAITRO: '',
                    password: '',
                    TRANGTHAI_KICHHOAT: true,
                    sinhvien_details: { ID_CHUYENNGANH: '', NIENKHOA: 'K13', HEDAOTAO: 'Cử nhân', TEN_LOP: '' },
                    giangvien_details: { ID_KHOA_BOMON: '', HOCVI: 'Thạc sĩ', CHUCVU: null },
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
            ID_VAITRO: data.ID_VAITRO,
            TRANGTHAI_KICHHOAT: data.TRANGTHAI_KICHHOAT,
            ...( (!isEditMode || data.password) && { password: data.password } ),
            ...(data.ID_VAITRO === STUDENT_ROLE_ID && { sinhvien_details: data.sinhvien_details }),
            ...(GIANGVIEN_RELATED_ROLES.includes(data.ID_VAITRO) && { giangvien_details: data.giangvien_details }),
        };

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
            <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col p-6 bg-gray-50 dark:bg-gray-900 border-l-4 border-blue-500">
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
                        <ScrollArea className="flex-grow pr-6 -mr-6">
                            {isLoadingAux ? (
                                <div className="flex justify-center items-center h-48">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                </div>
                            ) : (
                                <div className="space-y-6 py-4">
                                    {/* Thông tin cơ bản */}
                                    <div className="border border-blue-200 dark:border-blue-700 shadow-md rounded-lg bg-white dark:bg-gray-800 p-4">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                                            <User className="h-5 w-5 text-blue-500" /> Thông tin cơ bản
                                        </h3>
                                        <Separator className="mb-4 bg-blue-200 dark:bg-blue-700" />
                                        <div className="space-y-4">
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
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                            </div>
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

                                    {/* Phân quyền & Chi tiết */}
                                    <div className="border border-blue-200 dark:border-blue-700 shadow-md rounded-lg bg-white dark:bg-gray-800 p-4">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2 pt-4">
                                            <Briefcase className="h-5 w-5 text-blue-500" /> Phân quyền & Chi tiết
                                        </h3>
                                        <Separator className="mb-4 bg-blue-200 dark:bg-blue-700" />
                                        <div className="space-y-4">
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

                                            {/* Thông tin Sinh viên */}
                                            {watchedRole === STUDENT_ROLE_ID && (
                                                <div className="p-4 border border-blue-100 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 shadow-sm">
                                                    <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                                        <GraduationCap className="h-5 w-5 text-blue-500" />
                                                        Thông tin Sinh viên
                                                    </h4>
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
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
                                                    </div>
                                                </div>
                                            )}

                                            {/* Thông tin Giảng viên / Chuyên viên */}
                                            {GIANGVIEN_RELATED_ROLES.includes(watchedRole) && (
                                                <div className="p-4 border border-blue-100 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 shadow-sm">
                                                    <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                                        <Briefcase className="h-5 w-5 text-blue-500" />
                                                        Thông tin Giảng viên / Chuyên viên
                                                    </h4>
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
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                                                        <FormField
                                                            name="giangvien_details.CHUCVU"
                                                            control={form.control}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-gray-700 dark:text-gray-200">Chức vụ (Tùy chọn)</FormLabel>
                                                                    <Select
                                                                        onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                                                                        value={field.value || "none"}
                                                                    >
                                                                        <FormControl>
                                                                            <SelectTrigger className="border-blue-300 dark:border-blue-600 focus:ring-blue-500">
                                                                                <SelectValue placeholder="Chọn chức vụ" />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700">
                                                                            <SelectItem value="none" className="text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20">Không có</SelectItem>
                                                                            <SelectItem value="Trưởng khoa" className="text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20">Trưởng khoa</SelectItem>
                                                                            <SelectItem value="Phó khoa" className="text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20">Phó khoa</SelectItem>
                                                                            <SelectItem value="Giáo vụ" className="text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20">Giáo vụ</SelectItem>
                                                                            <SelectItem value="Trưởng bộ môn" className="text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20">Trưởng bộ môn</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage className="text-red-500" />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Trạng thái (chỉ khi sửa) */}
                                            {isEditMode && (
                                                <FormField
                                                    name="TRANGTHAI_KICHHOAT"
                                                    control={form.control}
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-blue-200 dark:border-blue-700 p-3 shadow-sm mt-6 bg-white dark:bg-gray-800">
                                                            <div className="space-y-0.5">
                                                                <FormLabel className="text-gray-700 dark:text-gray-200">Kích hoạt tài khoản</FormLabel>
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
                                    </div>
                                </div>
                            )}
                        </ScrollArea>
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