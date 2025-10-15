import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { AppSidebar } from '@/layout/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LifeBuoy, LogOut, Settings, User, Bell, Mail, UserPlus } from "lucide-react";
import { getUnreadCount, getUnreadNotifications, markAllAsRead } from '@/api/notificationService';

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
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const [countRes, notificationsRes] = await Promise.all([
                getUnreadCount(),
                getUnreadNotifications()
            ]);
            
            setUnreadCount(countRes.count);
            setNotifications(notificationsRes);

        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 30000);
        return () => clearInterval(intervalId);
    }, [fetchNotifications]);

    const handleOpenNotificationChange = (isOpen) => {
        if (!isOpen && unreadCount > 0) {
            markAllAsRead()
                .then(() => {
                    fetchNotifications();
                })
                .catch(err => console.error("Failed to mark as read", err));
        }
    };

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
                            <DropdownMenu onOpenChange={handleOpenNotificationChange}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                        <Bell className="h-5 w-5" />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                                                {unreadCount > 5 ? '5+' : unreadCount}
                                            </span>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-80" align="end" forceMount>
                                    <DropdownMenuLabel>Thông báo</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {notifications.length > 0 ? (
                                        notifications.map(noti => (
                                            <DropdownMenuItem key={noti.id} asChild className="p-2">
                                                <Link to="/projects/my-group" className="flex items-start gap-3 cursor-pointer">
                                                    {noti.type === 'GROUP_INVITATION' ? <Mail className="mt-1 h-4 w-4 text-sky-500 shrink-0" /> : <UserPlus className="mt-1 h-4 w-4 text-green-500 shrink-0" />}
                                                    <div className="flex flex-col">
                                                        <p className="text-sm font-medium leading-tight">
                                                            {noti.type === 'GROUP_INVITATION' ? `Lời mời vào nhóm` : `Yêu cầu tham gia`}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground whitespace-normal">
                                                            {noti.type === 'GROUP_INVITATION' 
                                                                ? `${noti.data.inviter_name} đã mời bạn vào nhóm "${noti.data.group_name}".`
                                                                : `${noti.data.requester_name} muốn tham gia nhóm "${noti.data.group_name}".`
                                                            }
                                                        </p>
                                                    </div>
                                                </Link>
                                            </DropdownMenuItem>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-sm text-muted-foreground">Không có thông báo mới.</div>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>

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