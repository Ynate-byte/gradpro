import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// import axiosClient from '@/api/axiosConfig'; // <-- BỎ DÒNG NÀY
import { login as loginService } from '@/api/authService'; // <-- THÊM DÒNG NÀY
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const auth = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // THAY ĐỔI: Gọi hàm login từ authService
            const data = await loginService(email, password);
            // Hàm login trong AuthContext vẫn được giữ nguyên
            auth.login(data.user, data.access_token, remember);
        } catch (err) {
            if (err.response && err.response.data) {
                const message = err.response.data.message || 'Có lỗi xảy ra.';
                const errors = err.response.data.errors;
                if (errors && (errors.email || errors.EMAIL)) {
                    setError((errors.email || errors.EMAIL)[0]);
                } else {
                    setError(message);
                }
            } else {
                setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Phần JSX (giao diện) bên dưới không có gì thay đổi
    return (
        <div
            className="flex min-h-screen items-center justify-center bg-cover bg-center p-4"
            style={{
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=2070&auto=format&fit=crop')`,
            }}
        >
            <div className="w-full max-w-md">
                <div className="bg-background/80 backdrop-blur-sm border border-border/20 p-8 rounded-2xl shadow-2xl text-foreground">
                    <div className="mb-8 text-center">
                        <h2 className="text-3xl font-bold">Đăng nhập GradPro</h2>
                        <p className="text-muted-foreground mt-2">Truy cập tài khoản của bạn để tiếp tục.</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Các trường input và button giữ nguyên */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                                <Input id="email" type="email" placeholder="you@example.com" className="pl-10 h-12" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Mật khẩu</Label>
                                <a href="#" className="text-sm text-primary hover:underline">Quên mật khẩu?</a>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pl-10 pr-10 h-12" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                        
                        {error && (
                            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex items-center space-x-2">
                            <Checkbox id="remember" checked={remember} onCheckedChange={setRemember} />
                            <Label htmlFor="remember" className="font-normal text-sm">Ghi nhớ đăng nhập</Label>
                        </div>

                        <Button type="submit" className="w-full h-12 font-semibold text-base" disabled={loading}>
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                                    <span>Đang xử lý...</span>
                                </div>
                            ) : (
                                'Đăng nhập'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Chưa có tài khoản?{' '}
                            <a href="#" className="font-semibold text-primary hover:underline">
                                Đăng ký ngay
                            </a>
                        </p>
                    </div>

                </div>
                <p className="text-center text-xs text-white/50 mt-8">
                    © 2025 GradPro. All Rights Reserved.
                </p>
            </div>
        </div>
    );
}