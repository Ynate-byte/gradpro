import React, { useMemo } from 'react';
import { Outlet, Link, useNavigate, useLocation, matchPath, Navigate } from 'react-router-dom';
import { AppSidebar } from '@/layout/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
    Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
    BreadcrumbPage, BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Button } from "@/components/ui/button";
import { CalendarDays, Moon, Sun, Bell, LogOut, ShieldAlert } from "lucide-react"; // Thêm LogOut, ShieldAlert
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { getUnreadCount, getNotifications } from '@/api/notificationService';
import { NotificationDropdown } from '@/components/shared/notifications/NotificationDropdown';
import { useTheme } from "@/components/theme-provider";
import { ChangePasswordForm } from '@/features/profile/components/ChangePasswordForm'; 

const routeNameMap = {
    '/': 'Trang chủ',
    '/news': 'Tin tức & Sự kiện',
    '/news/:id': 'Chi tiết tin tức',
    '/notifications': 'Thông báo',
    '/history': 'Lịch sử hoạt động',
    '/starred': 'Mục đã lưu',
    '/profile': 'Hồ sơ cá nhân',
    '/settings': 'Cài đặt',
    '/settings/account': 'Tài khoản',
    '/settings/appearance': 'Giao diện',
    '/student': 'Sinh viên',
    '/student/dashboard': 'Tổng quan',
    '/student/dashboard/:planId': 'Chi tiết Đồ án',
    '/projects': 'Đồ án',
    '/projects/my-plans': 'Kế hoạch tham gia',
    '/projects/my-group': 'Nhóm của tôi',
    '/projects/my-group/kanban': 'Quản lý công việc',
    '/projects/my-group/kanban/:id': 'Bảng Kanban',
    '/projects/my-group/schedule': 'Lịch họp',
    '/projects/my-group/schedule/:id': 'Chi tiết Lịch họp',
    '/projects/find-group': 'Tìm kiếm nhóm',
    '/projects/topics': 'Đăng ký đề tài',
    '/lecturer': 'Giảng viên',
    '/lecturer/dashboard': 'Bảng điều khiển',
    '/lecturer/groups-management': 'Quản lý nhóm SV',
    '/lecturer/groups-management/:id': 'Chi tiết nhóm',
    '/lecturer/groups-management/:id/details': 'Thông tin nhóm',
    '/lecturer/groups-management/:id/kanban': 'Tiến độ (Kanban)',
    '/lecturer/groups-management/:id/schedule': 'Lịch họp nhóm',
    '/lecturer/thesis-topics': 'Đề tài hướng dẫn',
    '/lecturer/quota-management': 'Phân bổ chỉ tiêu',
    '/lecturer/council': 'Hội đồng bảo vệ',
    '/lecturer/grading': 'Chấm điểm',
    '/lecturer/submissions': 'Duyệt bài nộp',
    '/lecturer/calendar': 'Lịch làm việc',
    '/department-head/topic-reviewer-assignment': 'Phân công phản biện',
    '/admin': 'Quản trị',
    '/admin/dashboard': 'Tổng quan',
    '/admin/users': 'Người dùng',
    '/admin/groups': 'Nhóm sinh viên',
    '/admin/news': 'Tin tức',
    '/admin/backups': 'Sao lưu dữ liệu',
    '/admin/thesis-plans': 'Kế hoạch khóa luận',
    '/admin/thesis-plans/create': 'Tạo mới',
    '/admin/thesis-plans/:id/edit': 'Chỉnh sửa',
    '/admin/thesis-plans/:id/participants': 'Danh sách sinh viên',
    '/admin/templates': 'Mẫu kế hoạch',
    '/admin/thesis-topics': 'Quản lý đề tài',
    '/admin/quota-management': 'Phân bổ Quota',
    '/admin/hoidong': 'Quản lý Hội đồng',
    '/admin/submissions': 'Quản lý nộp bài',
    '/admin/cham-diem': 'Bảng điểm tổng hợp',
    '/admin/cham-diem/:id': 'Chi tiết điểm',
    '/admin/system-logs': 'Nhật ký hệ thống',
    '/admin/files': 'Quản lý tập tin',
    '/admin/settings/general': 'Cấu hình chung',
};

const HeaderSkeleton = () => (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
        <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Skeleton className="h-4 w-48 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
        </div>
    </header>
);

const MainSkeleton = () => (
    <main className="flex-1 p-6">
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
            </div>
            <Skeleton className="h-[400px] rounded-xl" />
        </div>
    </main>
);

export default function AuthenticatedLayout() {
    const { user, logout, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, setTheme } = useTheme();

    const isFirstLogin = user?.LA_DANGNHAP_LANDAU == true || user?.LA_DANGNHAP_LANDAU == 1;

    const { data: countData } = useQuery({
        queryKey: ['unreadCount'],
        queryFn: getUnreadCount,
        enabled: !!user && !isFirstLogin,
        refetchInterval: 300000,
        refetchOnWindowFocus: true,
        retry: false,
    });

    const { data: latestNotiData, isLoading: loadingNoti } = useQuery({
        queryKey: ['notifications', 'latest'],
        queryFn: () => getNotifications({ page: 1, per_page: 5 }),
        enabled: !!user && !isFirstLogin,
        refetchInterval: 300000,
        retry: false,
    });

    const unreadCount = countData?.count || 0;
    const notifications = latestNotiData?.data || [];

    const breadcrumbItems = useMemo(() => {
        // ... (Giữ nguyên logic breadcrumb cũ) ...
        const pathnames = location.pathname.split('/').filter(x => x);
        let currentPath = '';
        const items = [];

        items.push(
            <BreadcrumbItem key="root">
                <BreadcrumbLink asChild>
                    <Link to="/" className="hover:text-foreground">HUIT</Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
        );

        pathnames.forEach((value, index) => {
            currentPath += `/${value}`;
            const isLast = index === pathnames.length - 1;
            let routeName = null;
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

            const displayName = routeName || (value.charAt(0).toUpperCase() + value.slice(1));

            items.push(<BreadcrumbSeparator key={`sep-${index}`} />);
            
            if (isLast) {
                items.push(
                    <BreadcrumbItem key={currentPath}>
                        <BreadcrumbPage className="font-semibold">{displayName}</BreadcrumbPage>
                    </BreadcrumbItem>
                );
            } else {
                items.push(
                    <BreadcrumbItem key={currentPath}>
                        {routeName ? (
                            <BreadcrumbLink asChild>
                                <Link to={matchedRoute} className="hover:text-foreground">{displayName}</Link>
                            </BreadcrumbLink>
                        ) : (
                            <span className="text-muted-foreground">{displayName}</span>
                        )}
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
        } 

        return items;
    }, [location.pathname]);

    const isLecturerOrHigher = ['Giảng viên', 'Trưởng khoa', 'Giáo vụ'].includes(user?.vaitro?.TEN_VAITRO);

    // 1. Xử lý Loading Auth
    if (authLoading) {
        return (
            <SidebarProvider>
                <div className="flex h-screen w-full bg-background text-foreground">
                    {/* Ẩn Sidebar khi loading để tránh giật */}
                    <div className="w-64 h-full border-r bg-muted/10 hidden md:block" /> 
                    <SidebarInset>
                        <HeaderSkeleton />
                        <MainSkeleton />
                    </SidebarInset>
                </div>
            </SidebarProvider>
        );
    }

    if (!user && !authLoading) {
        return <div className="flex h-screen w-full items-center justify-center">Vui lòng đăng nhập.</div>;
    }

    if (isFirstLogin) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-muted/30 p-4">
                <div className="w-full max-w-md space-y-6">
                    <div className="text-center space-y-2">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 mb-2">
                            <ShieldAlert className="h-8 w-8 text-orange-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">Cần đổi mật khẩu</h1>
                        <p className="text-sm text-muted-foreground">
                            Đây là lần đăng nhập đầu tiên của bạn.<br/>
                            Vui lòng đổi mật khẩu mới để bảo mật tài khoản và tiếp tục sử dụng hệ thống.
                        </p>
                    </div>
                    
                    <ChangePasswordForm />

                    <div className="flex justify-center">
                        <Button variant="ghost" onClick={logout} className="text-muted-foreground hover:text-foreground">
                            <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full bg-sidebar-muted/20 text-foreground overflow-hidden">
                <AppSidebar />
                <SidebarInset className="flex flex-col h-full w-full overflow-hidden transition-all duration-300 ease-in-out">
                    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/80 backdrop-blur-md px-4 sm:px-6 z-10 sticky top-0 transition-all">
                        <div className="flex items-center gap-2">
                            <SidebarTrigger className="-ml-1" />
                            <Separator orientation="vertical" className="mr-2 h-4" />
                            <Breadcrumb className="hidden md:flex">
                                <BreadcrumbList>{breadcrumbItems}</BreadcrumbList>
                            </Breadcrumb>
                        </div>
                        
                        <div className="flex items-center gap-1 sm:gap-2">
                            {isLecturerOrHigher && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                                    onClick={() => navigate('/lecturer/calendar')}
                                    title="Lịch làm việc"
                                >
                                    <CalendarDays className="h-5 w-5" />
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            >
                                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                <span className="sr-only">Toggle theme</span>
                            </Button>

                            <NotificationDropdown 
                                notifications={notifications} 
                                unreadCount={unreadCount} 
                                isLoading={loadingNoti}
                            />
                        </div>
                    </header>
                    <main className="flex-1 overflow-auto bg-muted/20 p-4 md:p-0">
                        <div className="mx-auto max-w-full h-full flex flex-col">
                            <div className="relative flex-1 rounded-xl bg-background shadow-sm border border-border/60 overflow-hidden flex flex-col">
                                <Outlet />
                            </div>
                        </div>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}