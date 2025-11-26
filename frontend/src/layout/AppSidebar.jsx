import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Bell, BookCopy, Users, Settings, ChevronsUpDown, ChevronRight,
    LogOut, CircleUserRound, Newspaper, Shield, CheckCircle, GraduationCap, PenSquare,
    Layers, History, FileText, Activity, Star, PieChart, Folder
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup,
    SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton,
    SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck } from 'lucide-react';

// --- Helper: Kiểm tra URL active ---
const checkActive = (href, currentUrl) => {
    if (!href) return false;
    if (href === '/') return currentUrl === '/';
    // Active nếu URL hiện tại bắt đầu bằng href (cho các trang con)
    return currentUrl === href || currentUrl.startsWith(`${href}/`);
};

// --- Component Menu Item riêng biệt ---
const MenuItem = ({ item, currentUrl }) => {
    if (item.hidden) return null;

    const isSubItemActive = item.subItems?.some(sub => checkActive(sub.href, currentUrl));
    const isDirectActive = checkActive(item.href, currentUrl);
    const isActive = isSubItemActive || isDirectActive;

    // Render menu có sub-items (Collapsible)
    if (item.subItems && item.subItems.length > 0) {
        return (
            <Collapsible defaultOpen={isActive} className="group/collapsible">
                <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                            tooltip={item.title}
                            className={`w-full ${isActive ? 'font-semibold text-primary' : ''}`}
                            isActive={isActive}
                        >
                            {item.icon && <item.icon className="size-4 shrink-0" />}
                            <span className="flex-1 text-left transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:hidden">
                                {item.title}
                            </span>
                            <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 ease-in-out group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            {item.subItems.map((subItem, idx) => {
                                if (subItem.hidden) return null;
                                const isSubActive = checkActive(subItem.href, currentUrl);
                                return (
                                    <SidebarMenuSubItem key={idx}>
                                        <SidebarMenuSubButton
                                            asChild
                                            isActive={isSubActive}
                                            className={isSubActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : ''}
                                        >
                                            <Link to={subItem.href}>{subItem.title}</Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                );
                            })}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </SidebarMenuItem>
            </Collapsible>
        );
    }

    // Render menu đơn
    if (item.href) {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive}
                    className={isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold border-r-4 border-primary' : ''}
                >
                    <Link to={item.href}>
                        {item.icon && <item.icon className={`size-4 shrink-0 ${isActive ? 'text-primary' : ''}`} />}
                        <span className="flex-1 text-left transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:hidden">
                            {item.title}
                        </span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    }

    return null;
};

// --- Component Chính ---
export function AppSidebar() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const currentUrl = location.pathname;

    // --- 1. Lấy thông tin Role & Permissions ---
    const roleName = user?.vaitro?.TEN_VAITRO;
    const positions = user?.giangvien?.chucvus || [];
    const positionCodes = positions.map(p => p.MA_CHUCVU);
    const positionNames = positions.map(p => p.TEN_CHUCVU);

    // Check Vai trò chính
    const isSinhVien = roleName === 'Sinh viên';
    const isAdminAccount = roleName === 'Admin'; // Admin hệ thống (có thể không phải GV)
    
    // Check Hồ sơ Giảng viên (Quan trọng: Trưởng khoa cũng là GV)
    const hasLecturerProfile = !!user?.giangvien; 

    // Check Chức vụ quản lý
    const isTruongKhoa = positionCodes.includes('TRUONG_KHOA');
    const isGiaoVu = positionCodes.includes('GIAO_VU');
    const isTruongBoMon = positionCodes.includes('TRUONG_BOMON');

    // Quyền truy cập khu vực Admin/Quản lý
    const canAccessAdminArea = isAdminAccount || isTruongKhoa || isGiaoVu;

    // --- 2. Cấu hình Menu Platform (Cá nhân) ---
    const platformMenu = {
        label: "Platform",
        items: [
            {
                title: "Tổng quan",
                icon: LayoutDashboard,
                href: "/", // Mặc định
                subItems: [
                    // Dashboard Sinh viên
                    { href: "/student/dashboard", title: "Tổng quan (SV)", hidden: !isSinhVien },
                    // Dashboard Giảng viên (Dành cho ai có hồ sơ GV)
                    { href: "/lecturer/dashboard", title: "Tổng quan (GV)", hidden: !hasLecturerProfile },
                    // Dashboard Admin (Dành cho quản lý)
                    { href: "/admin/dashboard", title: "Dashboard (Admin)", hidden: !canAccessAdminArea },
                    // Chung
                    { href: "/notifications", title: "Thông báo" },
                    { href: "/history", title: "Lịch sử hoạt động" },
                ],
            },
            { title: "Tin tức", href: "/news", icon: Newspaper },
            {
                title: "Đồ án",
                icon: BookCopy,
                href: "/projects",
                hidden: isAdminAccount && !hasLecturerProfile, // Ẩn với Admin thuần không phải GV
                subItems: [
                    // --- Sinh viên ---
                    { href: "/projects/topics", title: "Danh sách Đề tài", hidden: !isSinhVien },
                    { href: "/projects/my-plans", title: "Kế hoạch tham gia", hidden: !isSinhVien },
                    { href: "/projects/my-group", title: "Nhóm của tôi", hidden: !isSinhVien },
                    { href: "/projects/find-group", title: "Tìm nhóm", hidden: !isSinhVien },
                    
                    // --- Giảng viên (Cá nhân) ---
                    { href: "/lecturer/thesis-topics", title: "Đề tài của tôi", hidden: !hasLecturerProfile },
                    { href: "/lecturer/groups-management", title: "Nhóm hướng dẫn", hidden: !hasLecturerProfile },
                    { href: "/lecturer/submissions", title: "Duyệt nộp bài", hidden: !hasLecturerProfile },
                    { href: "/lecturer/quota-management", title: "Thông tin Quota", hidden: !hasLecturerProfile },
                    
                    // --- Trưởng bộ môn ---
                    { 
                        href: "/department-head/topic-reviewer-assignment", 
                        title: "Phân công Góp ý", 
                        hidden: !isTruongBoMon 
                    },
                ],
            },
            // [FIXED]: Luôn trỏ về trang cá nhân, chỉ hiện nếu là Giảng viên
            {
                title: "Hội đồng",
                href: "/lecturer/council", 
                icon: GraduationCap,
                hidden: !hasLecturerProfile 
            },
            // [FIXED]: Luôn trỏ về trang chấm điểm cá nhân
            {
                title: "Chấm điểm",
                href: "/lecturer/grading",
                icon: PenSquare,
                hidden: !hasLecturerProfile
            },
        ],
    };

    // --- 3. Cấu hình Menu Admin (Quản trị) ---
    const adminMenu = {
        label: "Quản trị",
        items: [
            { title: "Tổng quan", href: "/admin/dashboard", icon: PieChart },
            { title: "Người dùng", href: "/admin/users", icon: Shield },
            { title: "Quản lý nhóm", href: "/admin/groups", icon: Users },
            { title: "Kế hoạch KLTN", href: "/admin/thesis-plans", icon: BookCopy },
            { title: "Mẫu kế hoạch", href: "/admin/templates", icon: FileText },
            
            { title: "Phân công Quota", href: "/admin/quota-management", icon: Layers },
            { title: "Quản lý Đề tài", href: "/admin/thesis-topics", icon: BookCopy },
            
            // Menu quản lý Hội đồng dành cho Admin/TK/GVụ
            { title: "Quản lý Hội đồng", href: "/admin/hoidong", icon: GraduationCap },
            
            // Menu xem bảng điểm tổng hợp
            { title: "Bảng điểm tổng", href: "/admin/cham-diem", icon: Star },
            
            { title: "Duyệt nộp bài", href: "/admin/submissions", icon: CheckCircle },
            { title: "Quản lý File", href: "/admin/files", icon: Folder },
            { title: "Nhật ký hệ thống", href: "/admin/system-logs", icon: Activity },
            { title: "Thiết lập chung", href: "/admin/settings/general", icon: Settings },
            { title: "Sao lưu dữ liệu", href: "/admin/backups", icon: ShieldCheck },
        ],
    };

    // --- Helper hiển thị tên dưới logo ---
    const getUserDisplayTitle = () => {
        if (hasLecturerProfile && positionNames.length > 0) {
            return positionNames.join(', ');
        }
        return roleName || 'Thành viên';
    };

    return (
        <Sidebar collapsible="icon" className="group">
            {/* Header */}
            <SidebarHeader>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start gap-3 p-2 text-left group-data-[collapsible=icon]:justify-center">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <BookCopy className="size-4" />
                            </div>
                            <div className="flex flex-col items-start transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden">
                                <span className="text-sm font-semibold">GradPro</span>
                                <span className="text-xs text-muted-foreground truncate w-32">
                                    {getUserDisplayTitle()}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-56">
                        <DropdownMenuLabel>GradPro System</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/')}>
                            <LayoutDashboard className="mr-2 size-4" /> Trang chủ
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarHeader>

            {/* Content */}
            <SidebarContent className="py-2">
                {/* 1. Nhóm Menu Platform (Cá nhân) */}
                <SidebarGroup>
                    <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
                        {platformMenu.label}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {platformMenu.items.map((item, idx) => (
                                <MenuItem key={`plat-${idx}`} item={item} currentUrl={currentUrl} />
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* 2. Nhóm Menu Quản trị (Chỉ hiện nếu có quyền) */}
                {canAccessAdminArea && (
                    <SidebarGroup className="border-t mt-2 pt-2">
                        <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-primary font-semibold">
                            {adminMenu.label}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {adminMenu.items.map((item, idx) => (
                                    <MenuItem key={`admin-${idx}`} item={item} currentUrl={currentUrl} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>

            {/* Footer */}
            <SidebarFooter>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start gap-3 p-2 text-left group-data-[collapsible=icon]:justify-center">
                            <Avatar className="size-8">
                                <AvatarFallback>{user?.HODEM_VA_TEN?.charAt(0) ?? 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden min-w-0 flex-1">
                                <span className="text-sm font-semibold truncate w-full">{user?.HODEM_VA_TEN}</span>
                                <span className="text-xs text-muted-foreground truncate w-full">{user?.EMAIL}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden shrink-0" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-56">
                        <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link to="/profile" className="cursor-pointer w-full flex items-center">
                                <CircleUserRound className="mr-2 size-4" /> Thông tin cá nhân
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link to="/history" className="cursor-pointer w-full flex items-center">
                                <History className="mr-2 size-4" /> Lịch sử hoạt động
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/settings/appearance')}>
                            <Settings className="mr-2 size-4" /> Giao diện
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                            <LogOut className="mr-2 size-4" /> Đăng xuất
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
    );
}