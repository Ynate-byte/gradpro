import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, User, Phone, Mail, BookOpen, Hash } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getChuyenNganhs, getUser } from '@/api/userService';
import { updateProfile } from '@/api/profileService';
import { useAuth } from '@/contexts/AuthContext';

// Schema validation
const profileSchema = z.object({
    EMAIL: z.string().email("Email không hợp lệ"),
    SO_DIENTHOAI: z.string()
        .min(10, "Số điện thoại tối thiểu 10 số")
        .regex(/^[0-9\s\-\.]+$/, "Số điện thoại chỉ được chứa số"),
    ID_CHUYENNGANH: z.string().optional().nullable(),
});

export function GeneralInfoForm() {
    const { user, setUser } = useAuth(); 
    const [chuyenNganhs, setChuyenNganhs] = useState([]);
    const queryClient = useQueryClient();
    
    const isStudent = !!user?.sinhvien;
    const userId = user?.ID_NGUOIDUNG;

    const form = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            EMAIL: '',
            SO_DIENTHOAI: '',
            ID_CHUYENNGANH: '',
        }
    });

    // 1. Load danh sách chuyên ngành
    useEffect(() => {
        if (isStudent) {
            getChuyenNganhs()
                .then(res => {
                    const data = Array.isArray(res) ? res : (res.data || []);
                    // [DEBUG] Kiểm tra dữ liệu trả về để đảm bảo map đúng key
                    console.log("Danh sách chuyên ngành:", data);
                    setChuyenNganhs(data);
                })
                .catch(err => console.error("Lỗi tải chuyên ngành:", err));
        }
    }, [isStudent]);

    // 2. Fetch dữ liệu mới nhất từ Server
    const { data: profileData, isLoading: isLoadingProfile } = useQuery({
        queryKey: ['profile', userId],
        queryFn: () => getUser(userId),
        enabled: !!userId,
        refetchOnWindowFocus: false
    });

    // 3. Đồng bộ dữ liệu vào Form
    useEffect(() => {
        if (profileData) {
            console.log("Profile Data Loaded:", profileData);

            // Lấy Email & SĐT (Chấp nhận cả chữ hoa và thường)
            const email = profileData.EMAIL || profileData.email || '';
            const phone = profileData.SO_DIENTHOAI || profileData.so_dienthoai || '';
            
            // Lấy thông tin Sinh viên
            const svData = profileData.sinhvien || profileData.SINHVIEN;
            let majorId = '';
            let className = '';

            if (svData) {
                const rawId = svData.ID_CHUYENNGANH ?? svData.id_chuyennganh;
                
                if (rawId !== null && rawId !== undefined) {
                    majorId = String(rawId);
                }
                
                className = svData.TEN_LOP || svData.ten_lop || '';
            }

            // Reset form
            form.reset({
                EMAIL: email,
                SO_DIENTHOAI: phone,
                ID_CHUYENNGANH: majorId,
            });

            // Đồng bộ ngược lại context nếu dữ liệu thay đổi
            if (profileData.HODEM_VA_TEN !== user.HODEM_VA_TEN) {
               updateUserContext(profileData);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileData, form]);

    const updateUserContext = (newUserData) => {
        const storedUser = localStorage.getItem('user');
        let mergedUser = newUserData;
        if (storedUser) {
            const parsedOld = JSON.parse(storedUser);
            mergedUser = { ...parsedOld, ...newUserData };
        }
        setUser(mergedUser);
        localStorage.setItem('user', JSON.stringify(mergedUser));
    };

    const mutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: (newData) => {
            toast.success("Cập nhật thông tin thành công!");
            queryClient.invalidateQueries(['profile', userId]);
            if (newData.user) {
                updateUserContext(newData.user);
            }
        },
        onError: (err) => {
            const data = err.response?.data;
            if (err.response?.status === 422 && data?.errors) {
                Object.keys(data.errors).forEach(key => {
                    form.setError(key, { message: data.errors[key][0] });
                });
                toast.error("Vui lòng kiểm tra lại dữ liệu nhập vào.");
            } else {
                toast.error(data?.message || "Cập nhật thất bại.");
            }
        }
    });

    const onSubmit = (data) => {
        const cleanPhone = data.SO_DIENTHOAI.replace(/\D/g, '');
        const payload = {
            EMAIL: data.EMAIL,
            SO_DIENTHOAI: cleanPhone,
        };

        if (isStudent) {
            if (data.ID_CHUYENNGANH && data.ID_CHUYENNGANH !== 'null' && data.ID_CHUYENNGANH.trim() !== '') {
                payload.ID_CHUYENNGANH = parseInt(data.ID_CHUYENNGANH, 10);
            } else {
                payload.ID_CHUYENNGANH = null;
            }
        }
        mutation.mutate(payload);
    };

    if (isLoadingProfile) {
        return (
            <Card>
                <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }

    // Dữ liệu hiển thị
    const displayUser = profileData || user;
    const displaySvData = displayUser?.sinhvien || displayUser?.SINHVIEN;
    const displayClass = displaySvData?.TEN_LOP || displaySvData?.ten_lop || 'Chưa cập nhật';
    
    // Dữ liệu giảng viên (nếu có)
    const displayGvData = displayUser?.giangvien || displayUser?.GIANGVIEN;
    // Xử lý an toàn nested object cho Khoa/Bộ môn
    const displayDepartment = displayGvData?.khoabomon?.TEN_KHOA_BOMON 
                           || displayGvData?.ID_KHOA_BOMON 
                           || '';

    return (
        <Card>
            <CardHeader>
                <CardTitle>Thông tin chung</CardTitle>
                <CardDescription>Cập nhật thông tin cá nhân của bạn.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        
                        {/* Read-only Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <FormLabel className="text-muted-foreground">Họ và tên</FormLabel>
                                <div className="flex items-center h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-50 cursor-not-allowed">
                                    <User className="mr-2 h-4 w-4" /> {displayUser?.HODEM_VA_TEN}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <FormLabel className="text-muted-foreground">Mã số ({isStudent ? 'SV' : 'GV'})</FormLabel>
                                <div className="flex items-center h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-50 cursor-not-allowed">
                                    <Hash className="mr-2 h-4 w-4" /> {displayUser?.MA_DINHDANH}
                                </div>
                            </div>
                        </div>

                        {/* Editable Fields */}
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
                                                <Input className="pl-9" {...field} placeholder="09xxxxxx" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Student Specific */}
                        {isStudent && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="ID_CHUYENNGANH"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Chuyên ngành</FormLabel>
                                            <Select 
                                                onValueChange={field.onChange} 
                                                value={field.value ? String(field.value) : ""} 
                                            >
                                                <FormControl>
                                                    <div className="relative">
                                                        <BookOpen className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground z-10" />
                                                        <SelectTrigger className="pl-9">
                                                            <SelectValue placeholder="Chọn chuyên ngành" />
                                                        </SelectTrigger>
                                                    </div>
                                                </FormControl>
                                                <SelectContent>
                                                    {chuyenNganhs.map((cn) => {
                                                        const id = cn.ID_CHUYENNGANH ?? cn.id_chuyennganh;
                                                        const name = cn.TEN_CHUYENNGANH ?? cn.ten_chuyennganh;
                                                        if (!id) return null;
                                                        
                                                        return (
                                                            <SelectItem key={id} value={String(id)}>
                                                                {name}
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="space-y-2">
                                    <FormLabel className="text-muted-foreground">Lớp sinh hoạt</FormLabel>
                                    <Input 
                                        value={displayClass} 
                                        disabled 
                                        className="bg-muted opacity-50" 
                                    />
                                </div>
                            </div>
                        )}
                        
                        {/* Lecturer Specific */}
                        {!isStudent && user?.giangvien && (
                             <div className="space-y-2">
                                <FormLabel className="text-muted-foreground">Khoa / Bộ môn</FormLabel>
                                <Input 
                                    value={displayDepartment} 
                                    disabled 
                                    className="bg-muted opacity-50" 
                                />
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                Lưu thay đổi
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}