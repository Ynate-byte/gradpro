import React from 'react';
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Moon, Sun, Laptop } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AppearancePage() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="container max-w-4xl p-6 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Giao diện</h1>
                <p className="text-muted-foreground">Tùy chỉnh giao diện hiển thị của hệ thống.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Chủ đề</CardTitle>
                    <CardDescription>
                        Chọn giao diện sáng hoặc tối cho ứng dụng.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                    
                    {/* Light Mode */}
                    <div className="space-y-2 cursor-pointer group" onClick={() => setTheme("light")}>
                        <div className={cn(
                            "items-center rounded-md border-2 p-1 hover:border-primary transition-all",
                            theme === "light" ? "border-primary" : "border-muted"
                        )}>
                            <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
                                <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
                                    <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                                    <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                                </div>
                                <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                                    <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                                    <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                                </div>
                                <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                                    <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                                    <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between px-1">
                            <span className="font-medium flex items-center gap-2"><Sun className="h-4 w-4" /> Sáng</span>
                            {theme === "light" && <Check className="h-4 w-4 text-primary" />}
                        </div>
                    </div>

                    {/* Dark Mode */}
                    <div className="space-y-2 cursor-pointer group" onClick={() => setTheme("dark")}>
                        <div className={cn(
                            "items-center rounded-md border-2 p-1 hover:border-primary transition-all",
                            theme === "dark" ? "border-primary" : "border-muted"
                        )}>
                            <div className="space-y-2 rounded-sm bg-slate-950 p-2">
                                <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                                    <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                                    <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                </div>
                                <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                                    <div className="h-4 w-4 rounded-full bg-slate-400" />
                                    <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                </div>
                                <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                                    <div className="h-4 w-4 rounded-full bg-slate-400" />
                                    <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between px-1">
                            <span className="font-medium flex items-center gap-2"><Moon className="h-4 w-4" /> Tối</span>
                            {theme === "dark" && <Check className="h-4 w-4 text-primary" />}
                        </div>
                    </div>

                    {/* System Mode */}
                    <div className="space-y-2 cursor-pointer group" onClick={() => setTheme("system")}>
                        <div className={cn(
                            "items-center rounded-md border-2 p-1 hover:border-primary transition-all",
                            theme === "system" ? "border-primary" : "border-muted"
                        )}>
                            <div className="space-y-2 rounded-sm bg-slate-300 p-2">
                                <div className="space-y-2 rounded-md bg-slate-600 p-2 shadow-sm">
                                    <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                                    <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                </div>
                                <div className="flex items-center space-x-2 rounded-md bg-slate-600 p-2 shadow-sm">
                                    <div className="h-4 w-4 rounded-full bg-slate-400" />
                                    <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                </div>
                                <div className="flex items-center space-x-2 rounded-md bg-slate-600 p-2 shadow-sm">
                                    <div className="h-4 w-4 rounded-full bg-slate-400" />
                                    <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between px-1">
                            <span className="font-medium flex items-center gap-2"><Laptop className="h-4 w-4" /> Hệ thống</span>
                            {theme === "system" && <Check className="h-4 w-4 text-primary" />}
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}