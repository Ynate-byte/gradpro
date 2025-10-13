import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { AppSidebar } from '@/layout/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LifeBuoy, LogOut, Settings, User } from "lucide-react";

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}


export default function AuthenticatedLayout() {
    const { user, logout } = useAuth();

    if (!user) {
        return <div>Đang tải thông tin người dùng...</div>;
    }

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full bg-background text-foreground">
                <AppSidebar user={user} handleLogout={logout} />
                <SidebarInset>
                    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background px-4">
                        <div className="flex items-center gap-3">
                            <SidebarTrigger />
                            <Separator orientation="vertical" className="h-6" />
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink asChild><Link to="/">GradPro</Link></BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>Trang chủ</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                        <div className="flex items-center gap-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback>{getInitials(user.HODEM_VA_TEN)}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.HODEM_VA_TEN}</p>
                                            <p className="text-xs leading-none text-muted-foreground">{user.EMAIL}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem><User className="mr-2 h-4 w-4" /><span>Hồ sơ</span></DropdownMenuItem>
                                    <DropdownMenuItem><Settings className="mr-2 h-4 w-4" /><span>Cài đặt</span></DropdownMenuItem>
                                    <DropdownMenuItem><LifeBuoy className="mr-2 h-4 w-4" /><span>Hỗ trợ</span></DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Đăng xuất</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
                        <Outlet />
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}