import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { login as loginService } from '@/api/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { UserSquare, Lock, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function Login() {
    const [identifier, setIdentifier] = useState('');
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
            const data = await loginService(identifier, password);
            auth.login(data.user, data.access_token, remember);
        } catch (err) {
            if (err.response && err.response.data) {
                const message = err.response.data.message || 'Có lỗi xảy ra.';
                const errors = err.response.data.errors;
                if (errors && (errors.identifier || errors.IDENTIFIER)) {
                    setError((errors.identifier || errors.IDENTIFIER)[0]);
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

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 md:p-8">
            <style jsx>{`
                input:-webkit-autofill,
                input:-webkit-autofill:hover, 
                input:-webkit-autofill:focus, 
                input:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 30px rgba(255, 255, 255, 0.8) inset !important;
                    -webkit-text-fill-color: #0f172a !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
                :global(.dark) input:-webkit-autofill,
                :global(.dark) input:-webkit-autofill:hover, 
                :global(.dark) input:-webkit-autofill:focus, 
                :global(.dark) input:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 30px rgba(15, 23, 42, 0.6) inset !important;
                    -webkit-text-fill-color: #ffffff !important;
                }
            `}</style>
            <div 
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 dark:opacity-0"
                style={{
                    backgroundImage: `url('https://statictuoitre.mediacdn.vn/thumb_w/640/2017/7-1512755474943.jpg')`,
                }}
            />
            <div 
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-0 transition-opacity duration-700 dark:opacity-100"
                style={{
                    backgroundImage: `url('https://cdn-media.sforum.vn/storage/app/media/anh-dep-83.jpg')`,
                }}
            />

            <div className="absolute inset-0 z-0 bg-black/10 dark:bg-black/40 transition-colors duration-700" />
            <div className="z-10 w-full max-w-[440px]">
                <div className="relative overflow-hidden rounded-3xl p-8 shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-all sm:p-10
                                backdrop-blur-xl border border-white/20
                                bg-white/10 
                                dark:bg-slate-900/50 dark:border-white/10">
                    
                    <div className="mb-8 text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
                            ĐĂNG NHẬP
                        </h2>
                        <p className="mt-2 text-sm text-slate-100 font-medium drop-shadow-sm opacity-90">
                            Nhập thông tin xác thực để tiếp tục.
                        </p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="relative group">
                            <UserSquare 
                                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-slate-500 transition-colors group-focus-within:text-blue-600 dark:text-slate-400 dark:group-focus-within:text-blue-400" 
                                size={20} 
                            />
                            <div className="relative">
                                <Input 
                                    id="identifier" 
                                    type="text" 
                                    className="peer block w-full h-14 pl-11 pt-6 pb-2 rounded-xl transition-all shadow-sm
                                               border-white/20 bg-white/80 text-slate-900 placeholder-transparent 
                                               focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                                               dark:bg-slate-900/60 dark:text-white dark:border-white/10 
                                               dark:focus:bg-slate-900/80 dark:focus:border-blue-400"
                                    placeholder=" "
                                    value={identifier} 
                                    onChange={(e) => setIdentifier(e.target.value)} 
                                    required 
                                />
                                <Label 
                                    htmlFor="identifier" 
                                    className="absolute left-11 top-1/2 -translate-y-1/2 text-base transition-all duration-200 cursor-text pointer-events-none origin-[0]
                                               text-slate-500 font-medium
                                               peer-placeholder-shown:top-1/2 peer-placeholder-shown:scale-100
                                               
                                               peer-focus:top-4 peer-focus:scale-75 peer-focus:font-bold peer-focus:text-blue-600
                                               peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:text-blue-600
                                               
                                               dark:text-slate-400 
                                               dark:peer-focus:text-blue-400 
                                               dark:peer-[:not(:placeholder-shown)]:text-blue-400"
                                >
                                    MSSV hoặc Email/Mã GV
                                </Label>
                            </div>
                        </div>
                        <div className="relative group">
                            <Lock 
                                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-slate-500 transition-colors group-focus-within:text-blue-600 dark:text-slate-400 dark:group-focus-within:text-blue-400" 
                                size={20} 
                            />
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? 'text' : 'password'} 
                                    className="peer block w-full h-14 pl-11 pr-11 pt-6 pb-2 rounded-xl transition-all shadow-sm
                                               border-white/20 bg-white/80 text-slate-900 placeholder-transparent 
                                               focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                                               dark:bg-slate-900/60 dark:text-white dark:border-white/10 
                                               dark:focus:bg-slate-900/80 dark:focus:border-blue-400"
                                    placeholder=" " 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required 
                                />
                                <Label 
                                    htmlFor="password" 
                                    className="absolute left-11 top-1/2 -translate-y-1/2 text-base transition-all duration-200 cursor-text pointer-events-none origin-[0]
                                               text-slate-500 font-medium
                                               peer-placeholder-shown:top-1/2 peer-placeholder-shown:scale-100
                                               
                                               peer-focus:top-4 peer-focus:scale-75 peer-focus:font-bold peer-focus:text-blue-600
                                               peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:text-blue-600
                                               
                                               dark:text-slate-400 
                                               dark:peer-focus:text-blue-400 
                                               dark:peer-[:not(:placeholder-shown)]:text-blue-400"
                                >
                                    Mật khẩu
                                </Label>
                                
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)} 
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 z-20 transition-colors rounded-full
                                               text-slate-500 hover:text-slate-700 
                                               dark:text-slate-400 dark:hover:text-white"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        
                        {error && (
                            <div className="flex items-center gap-3 rounded-xl p-3 text-sm backdrop-blur-md shadow-sm
                                            border border-red-200 bg-red-100/90 text-red-700
                                            dark:border-red-500/30 dark:bg-red-900/50 dark:text-red-200">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex items-center space-x-2.5 pt-2">
                            <Checkbox 
                                id="remember" 
                                checked={remember} 
                                onCheckedChange={setRemember}
                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600
                                           border-white/70 bg-white/10 backdrop-blur-sm"
                            />
                            <Label htmlFor="remember" className="cursor-pointer text-sm font-semibold text-white drop-shadow-md hover:text-blue-200 transition-colors">
                                Ghi nhớ đăng nhập
                            </Label>
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-12 rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 border border-blue-400/20" 
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                                    <span>Đang xử lý...</span>
                                </div>
                            ) : (
                                'Đăng nhập'
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}