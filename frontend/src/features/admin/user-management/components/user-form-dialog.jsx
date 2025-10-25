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
    const isEditMode = !!editingUser;

    const form = useForm({
        resolver: zodResolver(userFormSchema),
        mode: 'onChange', // Validate khi thay đổi
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

    const watchedRole = form.watch("ID_VAITRO"); // Theo dõi sự thay đổi của trường vai trò

    // Tải dữ liệu phụ (vai trò, chuyên ngành, khoa/bộ môn)
    useEffect(() => {
        if (isOpen) {
            Promise.all([
                getRoles().catch(() => []),
                getChuyenNganhs().catch(() => []),
                getKhoaBomons().catch(() => [])
            ]).then(([roles, chuyenNganhs, khoaBomons]) => {
                setAuxData({ roles, chuyenNganhs, khoaBomons });
            });
        }
    }, [isOpen]);

    // Đặt lại form khi mở dialog hoặc thay đổi người dùng đang sửa
    useEffect(() => {
        if (isOpen) {
            if (isEditMode && editingUser) {
                // Đảm bảo details luôn là object, kể cả khi null từ API
                const svDetails = editingUser.sinhvien || { ID_CHUYENNGANH: '', NIENKHOA: '', HEDAOTAO: '', TEN_LOP: '' };
                const gvDetails = editingUser.giangvien || { ID_KHOA_BOMON: '', HOCVI: '', CHUCVU: null };

                form.reset({
                    HODEM_VA_TEN: editingUser.HODEM_VA_TEN || '',
                    EMAIL: editingUser.EMAIL || '',
                    MA_DINHDANH: editingUser.MA_DINHDANH || '',
                    ID_VAITRO: String(editingUser.ID_VAITRO || ''), // Chuyển sang chuỗi
                    TRANGTHAI_KICHHOAT: editingUser.TRANGTHAI_KICHHOAT === 1 || editingUser.TRANGTHAI_KICHHOAT === true, // Chuyển sang boolean
                    sinhvien_details: {
                        ID_CHUYENNGANH: String(svDetails.ID_CHUYENNGANH || ''), // Chuyển sang chuỗi
                        NIENKHOA: svDetails.NIENKHOA || '',
                        HEDAOTAO: svDetails.HEDAOTAO || '',
                        TEN_LOP: svDetails.TEN_LOP || '',
                    },
                    giangvien_details: {
                        ID_KHOA_BOMON: String(gvDetails.ID_KHOA_BOMON || ''), // Chuyển sang chuỗi
                        HOCVI: gvDetails.HOCVI || '',
                        CHUCVU: gvDetails.CHUCVU || null,
                    },
                    password: '', // Luôn reset password khi mở form sửa
                });
            } else {
                // Reset về giá trị mặc định cho form tạo mới
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
             // Reset trạng thái lỗi khi mở lại dialog
             form.clearErrors();
        }
    }, [isOpen, editingUser, isEditMode, form]); // Thêm form vào dependency


    // Gửi dữ liệu form
    async function onSubmit(data) {
        setIsLoading(true);

        // Chuẩn bị payload gửi đi API
        const payload = {
            HODEM_VA_TEN: data.HODEM_VA_TEN,
            EMAIL: data.EMAIL,
            MA_DINHDANH: data.MA_DINHDANH,
            ID_VAITRO: data.ID_VAITRO, // Giữ nguyên dạng chuỗi nếu API cần
            TRANGTHAI_KICHHOAT: data.TRANGTHAI_KICHHOAT,
            // Chỉ gửi password nếu là tạo mới hoặc có nhập giá trị khi sửa
            ...( (!isEditMode || data.password) && { password: data.password } ),
            // Gửi details tương ứng với vai trò
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
            // Hiển thị lỗi validation từ backend nếu có
            if (error.response?.status === 422 && error.response?.data?.errors) {
                 Object.entries(error.response.data.errors).forEach(([field, messages]) => {
                    // Cố gắng map lỗi về đúng trường trong form
                    const formField = field.includes('.') ? field : field; // Giữ nguyên nếu có dấu chấm
                    try {
                         form.setError(formField, { type: 'manual', message: messages.join(', ') });
                    } catch (e) {
                         console.warn(`Could not set error for field ${formField}: ${e}`);
                         // Hiển thị lỗi chung nếu không map được field
                         toast.error(`Lỗi validation: ${messages.join(', ')}`);
                    }
                 });
                 // Tìm trường lỗi đầu tiên và focus
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
            <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Chỉnh sửa Người dùng' : 'Thêm Người dùng mới'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Cập nhật thông tin chi tiết.' : 'Điền đầy đủ thông tin để tạo tài khoản.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow min-h-0 flex flex-col">
                        <ScrollArea className="flex-grow pr-6 -mr-6">
                            <div className="space-y-6 py-4">
                                {/* Thông tin cơ bản */}
                                <div>
                                    <h3 className="text-lg font-medium mb-2 flex items-center gap-2"><User /> Thông tin cơ bản</h3>
                                    <Separator className="mb-4" />
                                    <div className="space-y-4">
                                        <FormField
                                            name="HODEM_VA_TEN"
                                            control={form.control}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Họ và tên *</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Nguyễn Văn A" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                name="EMAIL"
                                                control={form.control}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Email *</FormLabel>
                                                        <FormControl>
                                                            <Input type="email" placeholder="example@email.com" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                name="MA_DINHDANH"
                                                control={form.control}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Mã định danh (MSSV/MSGV) *</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="200120..." {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                         {/* Trường mật khẩu chỉ hiển thị khi tạo mới hoặc tùy chọn khi sửa */}
                                         <FormField
                                            name="password"
                                            control={form.control}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Mật khẩu {isEditMode ? '(Để trống nếu không đổi)' : ''}</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="••••••••" {...field} />
                                                    </FormControl>
                                                    <FormDescription>
                                                         {isEditMode ? 'Nhập mật khẩu mới nếu muốn thay đổi.' : 'Mặc định là "123456" nếu để trống.'}
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Phân quyền & Chi tiết */}
                                <div>
                                    <h3 className="text-lg font-medium mb-2 flex items-center gap-2 pt-4"><Briefcase /> Phân quyền & Chi tiết</h3>
                                    <Separator className="mb-4" />
                                    <div className="space-y-4">
                                        <FormField
                                            name="ID_VAITRO"
                                            control={form.control}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Vai trò *</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value} // Value là string
                                                        disabled={isEditMode} // Không cho đổi vai trò khi sửa
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Chọn vai trò cho người dùng" />
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
                                                    {isEditMode && <FormDescription>Vai trò không thể thay đổi sau khi tạo.</FormDescription>}
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Thông tin Sinh viên */}
                                        {watchedRole === STUDENT_ROLE_ID && (
                                            <div className="p-4 border rounded-md space-y-4 bg-muted/30">
                                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                                    <GraduationCap className="h-5 w-5 text-sky-600" />
                                                    Thông tin Sinh viên
                                                </h4>
                                                <FormField
                                                    name="sinhvien_details.ID_CHUYENNGANH"
                                                    control={form.control}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Chuyên ngành *</FormLabel>
                                                            <Select
                                                                onValueChange={field.onChange}
                                                                value={field.value}
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Chọn chuyên ngành" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {auxData.chuyenNganhs.map(cn => (
                                                                        <SelectItem key={cn.ID_CHUYENNGANH} value={String(cn.ID_CHUYENNGANH)}>
                                                                            {cn.TEN_CHUYENNGANH}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <FormField
                                                        name="sinhvien_details.TEN_LOP"
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Tên lớp</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="DH20IT01" {...field} value={field.value ?? ''} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        name="sinhvien_details.NIENKHOA"
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Niên khóa *</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="K13" {...field} value={field.value ?? ''} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        name="sinhvien_details.HEDAOTAO"
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Hệ đào tạo *</FormLabel>
                                                                <Select
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="Cử nhân">Cử nhân</SelectItem>
                                                                        <SelectItem value="Kỹ sư">Kỹ sư</SelectItem>
                                                                        <SelectItem value="Thạc sỹ">Thạc sỹ</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Thông tin Giảng viên / Chuyên viên */}
                                        {GIANGVIEN_RELATED_ROLES.includes(watchedRole) && (
                                            <div className="p-4 border rounded-md space-y-4 bg-muted/30">
                                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                                    <Briefcase className="h-5 w-5 text-blue-600" />
                                                    Thông tin Giảng viên / Chuyên viên
                                                </h4>
                                                <FormField
                                                    name="giangvien_details.ID_KHOA_BOMON"
                                                    control={form.control}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Khoa/Bộ môn *</FormLabel>
                                                            <Select
                                                                onValueChange={field.onChange}
                                                                value={field.value}
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Chọn Khoa/Bộ môn" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {auxData.khoaBomons.map(kb => (
                                                                        <SelectItem key={kb.ID_KHOA_BOMON} value={String(kb.ID_KHOA_BOMON)}>
                                                                            {kb.TEN_KHOA_BOMON}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField
                                                        name="giangvien_details.HOCVI"
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Học vị *</FormLabel>
                                                                <Select
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="Thạc sĩ">Thạc sĩ</SelectItem>
                                                                        <SelectItem value="Tiến sĩ">Tiến sĩ</SelectItem>
                                                                        <SelectItem value="Phó Giáo sư">Phó Giáo sư</SelectItem>
                                                                        <SelectItem value="Giáo sư">Giáo sư</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        name="giangvien_details.CHUCVU"
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Chức vụ (Tùy chọn)</FormLabel>
                                                                <Select
                                                                    onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                                                                    value={field.value || "none"} // Hiển thị 'none' nếu null
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Chọn chức vụ" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="none">Không có</SelectItem>
                                                                        <SelectItem value="Trưởng khoa">Trưởng khoa</SelectItem>
                                                                        <SelectItem value="Phó khoa">Phó khoa</SelectItem>
                                                                        <SelectItem value="Giáo vụ">Giáo vụ</SelectItem>
                                                                        <SelectItem value="Trưởng bộ môn">Trưởng bộ môn</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
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
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-6 bg-background">
                                                        <div className="space-y-0.5">
                                                            <FormLabel>Kích hoạt tài khoản</FormLabel>
                                                            <FormDescription>Nếu tắt, người dùng sẽ không thể đăng nhập.</FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <Switch
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                        <DialogFooter className="pt-6 border-t mt-auto shrink-0">
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={isLoading || !form.formState.isValid}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditMode ? 'Lưu thay đổi' : 'Tạo người dùng'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}