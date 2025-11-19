import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Save, User, Phone, Mail, BookOpen, Hash } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getChuyenNganhs } from '@/api/userService';
import { updateProfile } from '@/api/profileService';
import { useAuth } from '@/contexts/AuthContext';

// Schema validation
const profileSchema = z.object({
    EMAIL: z.string().email("Email không hợp lệ"),
    SO_DIENTHOAI: z.string().regex(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, "Số điện thoại không hợp lệ"),
    ID_CHUYENNGANH: z.string().optional(), // Chỉ bắt buộc với SV
});

export function GeneralInfoForm() {
    const { user, setUser } = useAuth(); // [QUAN TRỌNG] Lấy hàm setUser
    const [chuyenNganhs, setChuyenNganhs] = useState([]);
    
    // Kiểm tra vai trò
    const isStudent = !!user?.sinhvien;

    const form = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            EMAIL: '',
            SO_DIENTHOAI: '',
            ID_CHUYENNGANH: '',
        }
    });

    // Load danh sách chuyên ngành
    useEffect(() => {
        if (isStudent) {
            getChuyenNganhs().then(setChuyenNganhs).catch(console.error);
        }
    }, [isStudent]);

    // Load dữ liệu ban đầu
    useEffect(() => {
        if (user) {
            const formData = {
                EMAIL: user.EMAIL || '',
                SO_DIENTHOAI: user.SO_DIENTHOAI || '',
                ID_CHUYENNGANH: user.sinhvien?.ID_CHUYENNGANH 
                    ? String(user.sinhvien.ID_CHUYENNGANH) 
                    : '',
            };
            form.reset(formData);
        }
    }, [user, form]);

    const mutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: (newData) => {
            toast.success("Cập nhật thông tin thành công!");
            
            // [FIX LỖI] Cập nhật ngay lập tức AuthContext và LocalStorage
            // Để giao diện hiển thị tên/sđt mới mà không cần F5
            if (newData.user) {
                setUser(newData.user); 
                
                // Nếu app bạn lưu user trong localStorage, hãy cập nhật nó
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    localStorage.setItem('user', JSON.stringify(newData.user));
                }
            }
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Cập nhật thất bại.");
        }
    });

    const onSubmit = (data) => {
        mutation.mutate(data);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Thông tin chung</CardTitle>
                <CardDescription>Cập nhật thông tin cá nhân của bạn.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        
                        {/* Các trường Read-only */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <FormLabel className="text-muted-foreground">Họ và tên</FormLabel>
                                <div className="flex items-center h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-50 cursor-not-allowed">
                                    <User className="mr-2 h-4 w-4" /> {user?.HODEM_VA_TEN}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <FormLabel className="text-muted-foreground">Mã số ({isStudent ? 'SV' : 'GV'})</FormLabel>
                                <div className="flex items-center h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-50 cursor-not-allowed">
                                    <Hash className="mr-2 h-4 w-4" /> {user?.MA_DINHDANH}
                                </div>
                            </div>
                        </div>

                        {/* Các trường được phép sửa */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="EMAIL"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input className="pl-9" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="SO_DIENTHOAI"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Số điện thoại</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input className="pl-9" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Chỉ hiển thị cho SINH VIÊN */}
                        {isStudent && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="ID_CHUYENNGANH"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Chuyên ngành</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <div className="relative">
                                                        <BookOpen className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground z-10" />
                                                        <SelectTrigger className="pl-9">
                                                            <SelectValue placeholder="Chọn chuyên ngành" />
                                                        </SelectTrigger>
                                                    </div>
                                                </FormControl>
                                                <SelectContent>
                                                    {chuyenNganhs.map((cn) => (
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
                                {/* Lớp: Read-only */}
                                <div className="space-y-2">
                                    <FormLabel className="text-muted-foreground">Lớp sinh hoạt</FormLabel>
                                    <Input value={user?.sinhvien?.TEN_LOP || 'Chưa cập nhật'} disabled className="bg-muted opacity-50" />
                                </div>
                            </div>
                        )}
                        
                        {/* Hiển thị Khoa/Bộ môn cho Giảng viên (Read-only) */}
                        {!isStudent && user?.giangvien && (
                             <div className="space-y-2">
                                <FormLabel className="text-muted-foreground">Khoa / Bộ môn</FormLabel>
                                <Input value={user.giangvien.khoabomon?.TEN_KHOA_BOMON || ''} disabled className="bg-muted opacity-50" />
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" /> Lưu thay đổi
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}