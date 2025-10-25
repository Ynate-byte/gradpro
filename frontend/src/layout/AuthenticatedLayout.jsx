import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, Link, useNavigate, useLocation, matchPath } from 'react-router-dom';
import { AppSidebar } from '@/layout/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, Mail, UserPlus } from "lucide-react";
import { getUnreadCount, getUnreadNotifications, markAllAsRead } from '@/api/notificationService';
import { Skeleton } from '@/components/ui/skeleton';

// Định nghĩa route và tên hiển thị
const routeNameMap = {
    '/': 'Trang chủ',
    '/news': 'Tin tức',
    '/news/:id': 'Chi tiết tin tức',
    '/projects/my-plans': 'Kế hoạch KLTN',
    '/projects/my-group': 'Nhóm của tôi',
    '/projects/find-group': 'Tìm nhóm',
    '/projects/topics': 'Đề tài',
    '/admin/users': 'Quản lý Người dùng',
    '/admin/groups': 'Quản lý Nhóm',
    '/admin/news': 'Quản lý Tin tức',
    '/admin/thesis-plans': 'Quản lý Kế hoạch',
    '/admin/thesis-plans/create': 'Tạo Kế hoạch',
    '/admin/thesis-plans/:planId/edit': 'Chỉnh sửa Kế hoạch',
    '/admin/thesis-plans/:planId/participants': 'Quản lý Sinh viên Tham gia',
    '/admin/templates': 'Quản lý Mẫu',
    '/admin/templates/create': 'Tạo Mẫu',
    '/admin/templates/:templateId/edit': 'Chỉnh sửa Mẫu',
    '/notifications': 'Thông báo',
    '/history': 'Lịch sử',
    '/starred': 'Đã lưu',
    '/settings/account': 'Tài khoản',
    '/settings/appearance': 'Giao diện',
};

// Component Skeleton cho header khi user chưa load
const HeaderSkeleton = () => (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background px-4">
        <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Separator orientation="vertical" className="h-6" />
            <Skeleton className="h-5 w-32 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
        </div>
    </header>
);

// Component Skeleton cho main content khi user chưa load
const MainSkeleton = () => (
    <main className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
        <div className="bg-card text-card-foreground rounded-lg border shadow-sm h-full overflow-y-auto p-4 md:p-6 space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-48 w-full" />
        </div>
    </main>
);


export default function AuthenticatedLayout() {
    const { user, logout, loading: authLoading } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

    // Logic tạo Breadcrumb động
    const breadcrumbItems = useMemo(() => {
        const pathnames = location.pathname.split('/').filter(x => x);
        let currentPath = '';
        const items = [];

        items.push(
            <BreadcrumbItem key="root">
                <BreadcrumbLink asChild>
                    <Link to="/">GradPro</Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
        );

        pathnames.forEach((value, index) => {
            currentPath += `/${value}`;
            const isLast = index === pathnames.length - 1;
            let routeName = '...';
            let matchedRoute = null;

            if (routeNameMap[currentPath]) {
                routeName = routeNameMap[currentPath];
                matchedRoute = currentPath;
            } else {
                for (const pattern in routeNameMap) {
                    const match = matchPath(pattern, currentPath);
                    if (match) {
                        routeName = routeNameMap[pattern];
                        matchedRoute = currentPath;
                        break;
                    }
                }
            }

            items.push(<BreadcrumbSeparator key={`sep-${index}`} />);
            if (isLast || !matchedRoute) {
                items.push(
                    <BreadcrumbItem key={currentPath}>
                        <BreadcrumbPage>{routeName}</BreadcrumbPage>
                    </BreadcrumbItem>
                );
            } else {
                items.push(
                    <BreadcrumbItem key={currentPath}>
                        <BreadcrumbLink asChild>
                            <Link to={matchedRoute}>{routeName}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                );
            }
        });

        if (items.length <= 1 && location.pathname === '/') {
            items.push(<BreadcrumbSeparator key="sep-home" />);
            items.push(
                <BreadcrumbItem key="home">
                    <BreadcrumbPage>Trang chủ</BreadcrumbPage>
                </BreadcrumbItem>
            );
        } else if (items.length === 1 && location.pathname !== '/') {
             items.push(<BreadcrumbSeparator key="sep-unknown" />);
             items.push(
                 <BreadcrumbItem key="unknown">
                     <BreadcrumbPage>Trang không xác định</BreadcrumbPage>
                 </BreadcrumbItem>
             );
        }
        return items;
    }, [location.pathname]);

    // Fetch Notifications
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
        if (user) {
            fetchNotifications();
            const intervalId = setInterval(fetchNotifications, 30000);
            return () => clearInterval(intervalId);
        }
    }, [fetchNotifications, user]);

    // Mark notifications as read
    const handleOpenNotificationChange = (isOpen) => {
        if (!isOpen && unreadCount > 0) {
            markAllAsRead()
                .then(fetchNotifications)
                .catch(err => console.error("Failed to mark as read", err));
        }
    };

    // Nếu đang tải thông tin user từ context, hiển thị skeleton
    if (authLoading) {
        return (
            <SidebarProvider>
                <div className="flex h-screen w-full bg-background text-foreground">
                    <AppSidebar />
                    <SidebarInset>
                         <HeaderSkeleton />
                         <MainSkeleton />
                    </SidebarInset>
                </div>
            </SidebarProvider>
        );
    }

    // Nếu không có user (sau khi đã load xong), có thể redirect hoặc hiển thị lỗi
     if (!user && !authLoading) {
         return <div className="flex h-screen w-full items-center justify-center">Lỗi xác thực người dùng.</div>;
     }

    // Giao diện chính khi đã có user
    return (
        <SidebarProvider>
            <div className="flex h-screen w-full bg-background text-foreground">
                <AppSidebar />
                <SidebarInset>
                    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background px-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <SidebarTrigger />
                            <Separator orientation="vertical" className="h-6" />
                            <Breadcrumb>
                                <BreadcrumbList>{breadcrumbItems}</BreadcrumbList>
                            </Breadcrumb>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Thông báo */}
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
                                                    {noti.type === 'GROUP_INVITATION'
                                                        ? <Mail className="mt-1 h-4 w-4 shrink-0 text-blue-500" />
                                                        : <UserPlus className="mt-1 h-4 w-4 shrink-0 text-green-500" />
                                                    }
                                                    <div className="flex flex-col">
                                                        <p className="text-sm font-medium leading-tight">
                                                            {noti.type === 'GROUP_INVITATION' ? 'Lời mời vào nhóm' : 'Yêu cầu tham gia'}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground whitespace-normal">
                                                            {noti.type === 'GROUP_INVITATION'
                                                                ? `${noti.data.inviter_name} đã mời bạn vào nhóm "${noti.data.group_name}".`
                                                                : `${noti.data.requester_name} muốn tham gia nhóm "${noti.data.group_name}".`}
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
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto bg-muted/40 p-1">
                        <div className="bg-card text-card-foreground rounded-2xl border-2 border-blue-200 shadow-lg p-1 min-h-full">
                            <Outlet />
                        </div>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}