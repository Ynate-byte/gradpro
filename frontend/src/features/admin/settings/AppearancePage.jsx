import React from 'react';
import { useTheme } from "@/components/theme-provider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
    Moon, Sun, Laptop, 
    Type, Zap, Monitor, 
    Check
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AppearancePage() {
    const { theme, setTheme, fontSize, setFontSize, reduceMotion, setReduceMotion } = useTheme();

    const fontOptions = [
        { value: 'extra-small', label: 'Rất nhỏ' },
        { value: 'small', label: 'Nhỏ' },
        { value: 'normal', label: 'Vừa' },
        { value: 'large', label: 'Lớn' },
        { value: 'xl', label: 'Rất lớn' },
    ];

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-10 py-6 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-4">
                    <Label className="text-lg font-semibold">Chế độ màu sắc</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        
                        {/* Light Mode */}
                        <button
                            onClick={() => setTheme("light")}
                            className={cn(
                                "group relative flex flex-col gap-3 p-1 rounded-xl border-2 transition-all text-left outline-none",
                                theme === "light" 
                                    ? "border-primary bg-primary/5 ring-0" 
                                    : "border-transparent hover:bg-muted/50"
                            )}
                        >
                            <div className="w-full aspect-video rounded-lg bg-[#e2e8f0] border shadow-sm p-4 flex flex-col gap-3 overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-3 bg-white border-b opacity-50"></div>
                                <div className="h-2.5 w-1/3 bg-white rounded-md shadow-sm mt-2" />
                                <div className="flex-1 bg-white rounded-md shadow-sm p-2 flex gap-2">
                                    <div className="w-1/4 h-full bg-slate-100 rounded" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-2 w-full bg-slate-100 rounded" />
                                        <div className="h-2 w-3/4 bg-slate-100 rounded" />
                                    </div>
                                </div>
                            </div>
                            <span className="font-medium flex items-center justify-between px-2 py-1">
                                <span className="flex items-center gap-2"><Sun className="h-4 w-4" /> Sáng</span>
                                {theme === "light" && <div className="bg-primary text-primary-foreground rounded-full p-0.5"><Check className="h-3 w-3" /></div>}
                            </span>
                        </button>

                        {/* Dark Mode */}
                        <button
                            onClick={() => setTheme("dark")}
                            className={cn(
                                "group relative flex flex-col gap-3 p-1 rounded-xl border-2 transition-all text-left outline-none",
                                theme === "dark" 
                                    ? "border-primary bg-primary/5 ring-0" 
                                    : "border-transparent hover:bg-muted/50"
                            )}
                        >
                            <div className="w-full aspect-video rounded-lg bg-[#0f172a] border border-gray-700 shadow-sm p-4 flex flex-col gap-3 overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-3 bg-slate-800 border-b border-slate-700"></div>
                                <div className="h-2.5 w-1/3 bg-slate-800 rounded-md mt-2" />
                                <div className="flex-1 bg-slate-800 rounded-md border border-slate-700 p-2 flex gap-2">
                                    <div className="w-1/4 h-full bg-slate-900 rounded" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-2 w-full bg-slate-900 rounded" />
                                        <div className="h-2 w-3/4 bg-slate-900 rounded" />
                                    </div>
                                </div>
                            </div>
                            <span className="font-medium flex items-center justify-between px-2 py-1">
                                <span className="flex items-center gap-2"><Moon className="h-4 w-4" /> Tối</span>
                                {theme === "dark" && <div className="bg-primary text-primary-foreground rounded-full p-0.5"><Check className="h-3 w-3" /></div>}
                            </span>
                        </button>

                        {/* System Mode */}
                        <button
                            onClick={() => setTheme("system")}
                            className={cn(
                                "group relative flex flex-col gap-3 p-1 rounded-xl border-2 transition-all text-left outline-none",
                                theme === "system" 
                                    ? "border-primary bg-primary/5 ring-0" 
                                    : "border-transparent hover:bg-muted/50"
                            )}
                        >
                            <div className="w-full aspect-video rounded-lg bg-gradient-to-br from-slate-200 to-slate-800 border shadow-sm flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]"></div>
                                <div className="bg-background/90 p-3 rounded-full shadow-lg z-10">
                                    <Laptop className="h-8 w-8 text-foreground" />
                                </div>
                            </div>
                            <span className="font-medium flex items-center justify-between px-2 py-1">
                                <span className="flex items-center gap-2"><Monitor className="h-4 w-4" /> Hệ thống</span>
                                {theme === "system" && <div className="bg-primary text-primary-foreground rounded-full p-0.5"><Check className="h-3 w-3" /></div>}
                            </span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* 2. Font Size */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <Label className="text-lg font-semibold flex items-center gap-2">
                                <Type className="h-5 w-5 text-primary" /> Cỡ chữ hiển thị
                            </Label>
                            <span className="text-xs font-mono font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                                {fontOptions.find(f => f.value === fontSize)?.label}
                            </span>
                        </div>
                        
                        {/* Thanh chọn font size */}
                        <div className="bg-secondary/30 p-1.5 rounded-xl border flex justify-between items-center">
                            {fontOptions.map((item, index) => (
                                <button
                                    key={item.value}
                                    onClick={() => setFontSize(item.value)}
                                    className={cn(
                                        "flex-1 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                                        fontSize === item.value 
                                            ? "bg-background text-primary shadow-sm font-bold border border-border" 
                                            : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                                    )}
                                    title={item.label}
                                >
                                    <span style={{ fontSize: `${14 + (index * 2)}px`, lineHeight: 1 }}>Aa</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Điều chỉnh kích thước văn bản cho toàn bộ hệ thống.
                        </p>
                    </div>

                    {/* 3. Reduce Motion */}
                    <div className="space-y-4">
                        <Label className="text-lg font-semibold flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" /> Hiệu ứng chuyển động
                        </Label>
                        
                        <div 
                            className="flex items-center justify-between p-4 rounded-xl border bg-card/50 hover:border-primary/30 transition-colors cursor-pointer"
                            onClick={() => setReduceMotion(!reduceMotion)}
                        >
                            <div className="space-y-1">
                                <Label className="text-base cursor-pointer">Giảm hiệu ứng</Label>
                                <p className="text-xs text-muted-foreground">
                                    Tắt các hoạt ảnh phức tạp để tăng tốc độ phản hồi.
                                </p>
                            </div>
                            <Switch
                                checked={reduceMotion}
                                onCheckedChange={setReduceMotion}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}