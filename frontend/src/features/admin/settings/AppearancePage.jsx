import React from 'react';
import { useTheme } from "@/components/theme-provider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Moon, Sun, Laptop, Palette, Info, Type, ZapOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AppearancePage() {
    const { theme, setTheme, fontSize, setFontSize, reduceMotion, setReduceMotion } = useTheme();

    return (
        <div className="container max-w-full p-6 md:p-8 space-y-8 animate-in fade-in duration-500">

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-x-12 gap-y-8">
                
                <div className="space-y-10">
                    
                    <section className="space-y-4">
                        <div>
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Palette className="h-5 w-5 text-primary" /> Chế độ màu sắc
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Chọn giao diện sáng hoặc tối cho hệ thống.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className={cn("cursor-pointer group relative rounded-xl border-2 p-1 transition-all hover:border-primary/50", theme === "light" ? "border-primary shadow-sm ring-2 ring-primary/20" : "border-muted")} onClick={() => setTheme("light")}>
                                <div className="space-y-2 rounded-lg bg-[#ecedef] p-2">
                                    <div className="space-y-2 rounded-md bg-white p-2 shadow-sm"><div className="h-2 w-[60%] rounded-lg bg-[#ecedef]" /><div className="h-2 w-[80%] rounded-lg bg-[#ecedef]" /></div>
                                    <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm"><div className="h-4 w-4 rounded-full bg-[#ecedef]" /><div className="h-2 w-[60%] rounded-lg bg-[#ecedef]" /></div>
                                </div>
                                <div className="p-3 text-center"><span className="font-medium flex items-center justify-center gap-2"><Sun className="h-4 w-4" /> Sáng</span></div>
                            </div>
                            <div className={cn("cursor-pointer group relative rounded-xl border-2 p-1 transition-all hover:border-primary/50", theme === "dark" ? "border-primary shadow-sm ring-2 ring-primary/20" : "border-muted")} onClick={() => setTheme("dark")}>
                                <div className="space-y-2 rounded-lg bg-slate-950 p-2">
                                    <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm"><div className="h-2 w-[60%] rounded-lg bg-slate-400" /><div className="h-2 w-[80%] rounded-lg bg-slate-400" /></div>
                                    <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm"><div className="h-4 w-4 rounded-full bg-slate-400" /><div className="h-2 w-[60%] rounded-lg bg-slate-400" /></div>
                                </div>
                                <div className="p-3 text-center"><span className="font-medium flex items-center justify-center gap-2"><Moon className="h-4 w-4" /> Tối</span></div>
                            </div>
                            <div className={cn("cursor-pointer group relative rounded-xl border-2 p-1 transition-all hover:border-primary/50", theme === "system" ? "border-primary shadow-sm ring-2 ring-primary/20" : "border-muted")} onClick={() => setTheme("system")}>
                                <div className="space-y-2 rounded-lg bg-gray-700 p-2">
                                    <div className="space-y-2 rounded-md bg-gray-500 p-2 shadow-sm"><div className="h-2 w-[60%] rounded-lg bg-gray-300" /><div className="h-2 w-[80%] rounded-lg bg-gray-300" /></div>
                                    <div className="flex items-center space-x-2 rounded-md bg-gray-500 p-2 shadow-sm"><div className="h-4 w-4 rounded-full bg-gray-300" /><div className="h-2 w-[60%] rounded-lg bg-gray-300" /></div>
                                </div>
                                <div className="p-3 text-center"><span className="font-medium flex items-center justify-center gap-2"><Laptop className="h-4 w-4" /> Hệ thống</span></div>
                            </div>
                        </div>
                    </section>

                    <Separator />

                    <section className="space-y-4">
                        <div>
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Type className="h-5 w-5 text-primary" /> Kích thước văn bản
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Điều chỉnh kích thước chữ toàn hệ thống để dễ đọc hơn.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {[
                                { value: 'extra-small', label: 'Siêu nhỏ', size: 'Aa', scale: 'text-xs' },
                                { value: 'small', label: 'Nhỏ', size: 'Aa', scale: 'text-sm' },
                                { value: 'normal', label: 'Mặc định', size: 'Aa', scale: 'text-base' },
                                { value: 'large', label: 'Lớn', size: 'Aa', scale: 'text-lg' },
                                { value: 'xl', label: 'Rất lớn', size: 'Aa', scale: 'text-xl' },
                            ].map((item) => (
                                <div 
                                    key={item.value}
                                    onClick={() => setFontSize(item.value)}
                                    className={cn(
                                        "cursor-pointer border-2 rounded-lg p-4 min-w-[100px] flex flex-col items-center justify-center gap-2 transition-all hover:border-primary/50",
                                        fontSize === item.value 
                                            ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                                            : "border-muted bg-card"
                                    )}
                                >
                                    <span className={cn("font-bold", item.scale)}>{item.size}</span>
                                    <span className="text-xs font-medium">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <Separator />

                    <section className="space-y-4">
                        <div>
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <ZapOff className="h-5 w-5 text-primary" /> Hiệu ứng chuyển động
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Giảm bớt các hiệu ứng hoạt hình nếu bạn cảm thấy chóng mặt hoặc muốn tăng tốc độ.
                            </p>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-4 bg-card">
                            <div className="space-y-0.5">
                                <Label htmlFor="reduce-motion" className="text-base">Giảm chuyển động</Label>
                                <p className="text-xs text-muted-foreground">
                                    Tắt các hiệu ứng trượt, mờ dần và animation phức tạp.
                                </p>
                            </div>
                            <Switch 
                                id="reduce-motion" 
                                checked={reduceMotion}
                                onCheckedChange={setReduceMotion}
                            />
                        </div>
                    </section>

                </div>

                <div className="space-y-6">
                    <Alert className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-200">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertTitle className="text-base font-semibold">Thông tin</AlertTitle>
                        <AlertDescription className="mt-2 text-sm leading-relaxed space-y-2">
                            <p>
                                <strong>Cỡ chữ:</strong> Ứng dụng sử dụng đơn vị `rem`. Khi bạn thay đổi cỡ chữ ở đây, toàn bộ giao diện (bao gồm nút bấm, bảng biểu, khoảng cách) sẽ tự động co giãn theo tỉ lệ.
                            </p>
                            <p>
                                <strong>Hiệu ứng:</strong> Chế độ "Giảm chuyển động" sẽ giúp ứng dụng phản hồi tức thì, loại bỏ độ trễ do animation gây ra.
                            </p>
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        </div>
    );
}