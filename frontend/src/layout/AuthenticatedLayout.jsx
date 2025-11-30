import React, { useMemo } from 'react';
import { Outlet, Link, useNavigate, useLocation, matchPath } from 'react-router-dom';
import { AppSidebar } from '@/layout/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
    Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
    BreadcrumbPage, BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Button } from "@/components/ui/button";
import { CalendarDays, Moon, Sun } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { getUnreadCount, getNotifications } from '@/api/notificationService';
import { NotificationDropdown } from '@/components/shared/notifications/NotificationDropdown';
import { useTheme } from "@/components/theme-provider";

// ... (Giữ nguyên phần routeNameMap như cũ)
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
    '/admin/dashboard': 'Dashboard',
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

const MainSkeleton = () => (
    <main className="flex-1 overflow-hidden bg-muted/40 p-4 sm:p-6">
        <div className="bg-card text-card-foreground rounded-lg border shadow-sm h-full overflow-hidden p-4 md:p-6 space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-48 w-full" />
        </div>
    </main>
);

export default function AuthenticatedLayout() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, setTheme } = useTheme();

    const { data: countData } = useQuery({
        queryKey: ['unreadCount'],
        queryFn: getUnreadCount,
        enabled: !!user,
        refetchInterval: 30000,
        refetchOnWindowFocus: true,
    });

    const { data: latestNotiData, isLoading: loadingNoti } = useQuery({
        queryKey: ['notifications', 'latest'],
        queryFn: () => getNotifications({ page: 1, per_page: 5 }),
        enabled: !!user,
        refetchInterval: 30000,
    });

    const unreadCount = countData?.count || 0;
    const notifications = latestNotiData?.data || [];

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
                        <BreadcrumbPage>{displayName}</BreadcrumbPage>
                    </BreadcrumbItem>
                );
            } else {
                items.push(
                    <BreadcrumbItem key={currentPath}>
                        {routeName ? (
                             <BreadcrumbLink asChild>
                                <Link to={matchedRoute}>{displayName}</Link>
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

    if (!user && !authLoading) {
        return <div className="flex h-screen w-full items-center justify-center">Vui lòng đăng nhập.</div>;
    }

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
                <AppSidebar />
                <SidebarInset className="flex flex-col h-full w-full overflow-hidden">
                    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 z-10">
                        <div className="flex items-center gap-3 overflow-hidden">
                             <SidebarTrigger />
                             <Separator orientation="vertical" className="h-6" />
                             <Breadcrumb className="hidden md:flex">
                                <BreadcrumbList>{breadcrumbItems}</BreadcrumbList>
                            </Breadcrumb>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="relative h-9 w-9 rounded-full"
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            >
                                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                <span className="sr-only">Toggle theme</span>
                            </Button>

                            {isLecturerOrHigher && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="relative h-9 w-9 rounded-full text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                    onClick={() => navigate('/lecturer/calendar')}
                                    title="Lịch làm việc"
                                >
                                    <CalendarDays className="h-5 w-5" />
                                </Button>
                            )}

                            <NotificationDropdown 
                                notifications={notifications} 
                                unreadCount={unreadCount} 
                                isLoading={loadingNoti}
                            />
                        </div>
                    </header>
                    
                    <main className="flex-1 overflow-hidden bg-muted/40">
                         <div className="h-full w-full bg-card text-card-foreground rounded-2xl border-2 border-blue-200 dark:border-blue-900 shadow-lg overflow-hidden flex flex-col transition-colors">
                            <Outlet />
                        </div>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}