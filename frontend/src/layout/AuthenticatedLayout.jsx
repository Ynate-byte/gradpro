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

// --- CẤU HÌNH TÊN HIỂN THỊ CHO BREADCRUMB ---
const routeNameMap = {
    // 1. CHUNG
    '/': 'Trang chủ',
    '/news': 'Tin tức & Sự kiện',
    '/news/:id': 'Chi tiết tin tức',
    '/notifications': 'Thông báo',
    '/history': 'Lịch sử hoạt động',
    '/starred': 'Mục đã lưu',
    '/profile': 'Hồ sơ cá nhân',
    '/settings/account': 'Cài đặt tài khoản',
    '/settings/appearance': 'Giao diện hệ thống',

    // 2. SINH VIÊN
    '/projects': 'Đồ án',
    '/projects/my-plans': 'Kế hoạch của tôi',
    '/projects/my-group': 'Nhóm của tôi',
    '/projects/my-group/kanban/:id': 'Bảng công việc (Kanban)',
    '/projects/my-group/schedule/:id': 'Lịch họp nhóm',
    '/projects/find-group': 'Tìm kiếm nhóm',
    '/projects/topics': 'Đăng ký đề tài',

    // 3. GIẢNG VIÊN
    '/lecturer': 'Giảng viên',
    '/lecturer/dashboard': 'Bảng điều khiển',
    '/lecturer/groups-management': 'Quản lý nhóm sinh viên',
    '/lecturer/groups-management/:id/details': 'Chi tiết nhóm',
    '/lecturer/groups-management/:id/kanban': 'Theo dõi tiến độ (Kanban)',
    '/lecturer/groups-management/:id/schedule': 'Lịch họp nhóm',
    '/lecturer/thesis-topics': 'Đề tài hướng dẫn',
    '/lecturer/quota-management': 'Quản lý chỉ tiêu & Phân công',
    '/lecturer/council': 'Hội đồng bảo vệ',
    '/lecturer/council/:id': 'Chi tiết Hội đồng',
    '/lecturer/grading': 'Chấm điểm khóa luận',
    '/lecturer/submissions': 'Duyệt bài nộp',
    '/lecturer/calendar': 'Lịch làm việc',

    // 4. TRƯỞNG BỘ MÔN
    '/department-head/topic-reviewer-assignment': 'Phân công phản biện',

    // 5. QUẢN TRỊ (ADMIN/GIÁO VỤ)
    '/admin': 'Quản trị',
    '/admin/users': 'Quản lý người dùng',
    '/admin/groups': 'Quản lý nhóm',
    '/admin/news': 'Quản lý tin tức',
    
    // Kế hoạch
    '/admin/thesis-plans': 'Kế hoạch khóa luận',
    '/admin/thesis-plans/create': 'Tạo kế hoạch mới',
    '/admin/thesis-plans/:id/edit': 'Chỉnh sửa kế hoạch',
    '/admin/thesis-plans/:id/participants': 'Sinh viên tham gia',
    
    // Mẫu
    '/admin/templates': 'Mẫu kế hoạch',
    '/admin/templates/create': 'Tạo mẫu mới',
    '/admin/templates/:id/edit': 'Chỉnh sửa mẫu',
    
    // Đề tài & Phân công
    '/admin/thesis-topics': 'Quản lý đề tài',
    '/admin/quota-management': 'Phân bổ chỉ tiêu',
    
    // Hội đồng & Điểm
    '/admin/hoidong': 'Quản lý Hội đồng',
    '/admin/submissions': 'Quản lý nộp bài',
    '/admin/cham-diem': 'Quản lý điểm số',
    '/admin/cham-diem/:id': 'Chi tiết bảng điểm',
    
    // Hệ thống
    '/admin/system-logs': 'Nhật ký hệ thống',
    '/admin/settings/general': 'Cấu hình chung',
};

// Component Skeleton cho header
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

// Component Skeleton cho main content
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
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, setTheme } = useTheme();

    // --- LOGIC POLLING THÔNG BÁO (30s/lần) ---
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

    // --- LOGIC BREADCRUMB (Xử lý Dynamic Route) ---
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

            // 1. Kiểm tra khớp chính xác
            if (routeNameMap[currentPath]) {
                routeName = routeNameMap[currentPath];
                matchedRoute = currentPath;
            } else {
                // 2. Kiểm tra khớp pattern (VD: /news/:id)
                for (const pattern in routeNameMap) {
                    const match = matchPath(pattern, currentPath);
                    if (match) {
                        routeName = routeNameMap[pattern];
                        matchedRoute = currentPath;
                        break;
                    }
                }
            }

            // Chỉ hiển thị breadcrumb nếu tìm thấy tên route hoặc là phần tử cuối cùng (để tránh hiện ID vô nghĩa)
            // Tuy nhiên, ở đây ta luôn hiển thị để giữ cấu trúc, nếu không tìm thấy tên thì hiển thị value (ID/slug)
            const displayName = routeName !== '...' ? routeName : value;

            items.push(<BreadcrumbSeparator key={`sep-${index}`} />);
            
            if (isLast || !matchedRoute) {
                items.push(
                    <BreadcrumbItem key={currentPath}>
                        <BreadcrumbPage>{displayName}</BreadcrumbPage>
                    </BreadcrumbItem>
                );
            } else {
                items.push(
                    <BreadcrumbItem key={currentPath}>
                        <BreadcrumbLink asChild>
                            <Link to={matchedRoute}>{displayName}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                );
            }
        });

        // Xử lý trường hợp trang chủ
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

    // --- CHECK QUYỀN HẠN ---
    const isLecturerOrHigher = ['Giảng viên', 'Trưởng khoa', 'Giáo vụ', 'Admin'].includes(user?.vaitro?.TEN_VAITRO);

    // --- RENDER ---
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
                            
                            {/* Nút chuyển đổi giao diện nhanh */}
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

                            {/* Icon Lịch họp cho Giảng viên */}
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

                            {/* Dropdown Thông báo */}
                            <NotificationDropdown 
                                notifications={notifications} 
                                unreadCount={unreadCount} 
                                isLoading={loadingNoti}
                            />
                        </div>
                    </header>
                    
                    <main className="flex-1 overflow-y-auto bg-muted/40 p-1">
                         <div className="bg-card text-card-foreground rounded-2xl border-2 border-blue-200 dark:border-blue-900 shadow-lg p-1 min-h-full transition-colors">
                            <Outlet />
                        </div>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}