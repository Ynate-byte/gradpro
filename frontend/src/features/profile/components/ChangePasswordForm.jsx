import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { Loader2, KeyRound } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { changePassword } from '@/api/profileService';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const passwordSchema = z.object({
    current_password: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    new_password: z.string()
        .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
        .regex(/[A-Z]/, "Phải chứa ít nhất 1 chữ hoa")
        .regex(/[a-z]/, "Phải chứa ít nhất 1 chữ thường")
        .regex(/[0-9]/, "Phải chứa ít nhất 1 số"),
    new_password_confirmation: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
}).refine((data) => data.new_password === data.new_password_confirmation, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["new_password_confirmation"],
});

export function ChangePasswordForm() {
    const { login } = useAuth(); 
    const navigate = useNavigate();

    const form = useForm({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            current_password: '',
            new_password: '',
            new_password_confirmation: '',
        }
    });

    const mutation = useMutation({
        mutationFn: changePassword,
        onSuccess: (data) => {
            if (data.access_token && data.user) {
                toast.success("Đổi mật khẩu thành công!");
                
                login(data.user, data.access_token);
                
                form.reset();

                navigate('/');
            } else {
                toast.success("Đổi mật khẩu thành công!");
                form.reset();
            }
        },
        onError: (err) => {
            const msg = err.response?.data?.message || "Đổi mật khẩu thất bại.";
            if (err.response?.status === 422 && err.response?.data?.errors) {
                const errors = err.response.data.errors;
                if (errors.current_password) {
                    form.setError('current_password', { message: errors.current_password[0] });
                }
                if (errors.new_password) {
                    form.setError('new_password', { message: errors.new_password[0] });
                }
            } else {
                toast.error(msg);
            }
        }
    });

    const onSubmit = (data) => {
        mutation.mutate(data);
    };

    return (
        <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-orange-500"/> Bảo mật
                </CardTitle>
                <CardDescription>
                    Đổi mật khẩu để bảo vệ tài khoản.<br/>
                    <span className="text-xs text-muted-foreground">Yêu cầu: Tối thiểu 8 ký tự, bao gồm chữ hoa, thường và số.</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="current_password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mật khẩu hiện tại</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="new_password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mật khẩu mới</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="new_password_confirmation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Xác nhận</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button type="submit" variant="secondary" disabled={mutation.isPending} className="bg-orange-100 hover:bg-orange-200 text-orange-900 border-orange-200">
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Đổi mật khẩu
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}