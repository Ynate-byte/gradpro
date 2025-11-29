import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Newspaper, BookCopy, Users, Settings, ChevronsUpDown, ChevronRight,
    LogOut, CircleUserRound, Shield, CheckCircle, GraduationCap, PenSquare,
    Layers, History, FileText, Activity, Star, PieChart, Folder, ShieldCheck,
    Palette, Zap, ZapOff, Type, Check
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
    DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal
} from '@/components/ui/dropdown-menu';
import {
    Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup,
    SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton,
    SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from "@/components/theme-provider";
import { cn } from '@/lib/utils';

// --- 1. Helper: Kiểm tra URL active ---
const checkActive = (href, currentUrl) => {
    if (!href) return false;
    if (href === '/') return currentUrl === '/';
    return currentUrl === href || currentUrl.startsWith(`${href}/`);
};

// --- 2. Component Menu Item (Xử lý logic hiển thị từng mục) ---
const MenuItem = ({ item, currentUrl }) => {
    if (item.hidden) return null;

    // Kiểm tra xem mục này hoặc con của nó có đang active không
    const isSubItemActive = item.subItems?.some(sub => checkActive(sub.href, currentUrl));
    const isDirectActive = checkActive(item.href, currentUrl);
    const isActive = isSubItemActive || isDirectActive;

    // Trường hợp 1: Menu có cấp con (Collapsible)
    if (item.subItems && item.subItems.length > 0) {
        return (
            <Collapsible defaultOpen={isActive} className="group/collapsible">
                <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                            tooltip={item.title}
                            className={cn("w-full", isActive && "font-semibold text-primary")}
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

    // Trường hợp 2: Menu đơn (Link trực tiếp)
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
                        {item.icon && <item.icon className={cn("size-4 shrink-0", isActive && "text-primary")} />}
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

// --- 3. Component Chính: AppSidebar ---
export function AppSidebar() {
    const { user, logout } = useAuth();
    // Lấy context Theme & Settings
    const { reduceMotion, setReduceMotion, fontSize, setFontSize } = useTheme();
    
    const location = useLocation();
    const navigate = useNavigate();
    const currentUrl = location.pathname;

    // --- A. Logic Phân Quyền ---
    const roleName = user?.vaitro?.TEN_VAITRO;
    const positions = user?.giangvien?.chucvus || [];
    const positionCodes = positions.map(p => p.MA_CHUCVU);
    const positionNames = positions.map(p => p.TEN_CHUCVU);

    const isSinhVien = roleName === 'Sinh viên';
    const isAdminAccount = roleName === 'Admin';
    const hasLecturerProfile = !!user?.giangvien;
    const isTruongKhoa = positionCodes.includes('TRUONG_KHOA');
    const isGiaoVu = positionCodes.includes('GIAO_VU') || positionCodes.includes('PHO_KHOA');
    const isTruongBoMon = positionCodes.includes('TRUONG_BOMON');
    
    // Admin Area: Admin hệ thống, Trưởng khoa, Giáo vụ
    const canAccessAdminArea = isAdminAccount || isTruongKhoa || isGiaoVu;

    // --- B. Cấu hình Menu Platform (Người dùng) ---
    const platformMenu = {
        label: "Platform",
        items: [
            {
                title: "Tổng quan",
                icon: LayoutDashboard,
                href: "/",
                subItems: [
                    { href: "/student/dashboard", title: "Tổng quan (SV)", hidden: !isSinhVien },
                    { href: "/lecturer/dashboard", title: "Tổng quan (GV)", hidden: !hasLecturerProfile },
                    { href: "/admin/dashboard", title: "Dashboard (Admin)", hidden: !canAccessAdminArea },
                    { href: "/notifications", title: "Thông báo" },
                    { href: "/history", title: "Lịch sử hoạt động" },
                ],
            },
            { title: "Tin tức", href: "/news", icon: Newspaper },
            {
                title: "Đồ án",
                icon: BookCopy,
                href: "/projects",
                hidden: isAdminAccount && !hasLecturerProfile,
                subItems: [
                    // Sinh viên
                    { href: "/projects/topics", title: "Danh sách Đề tài", hidden: !isSinhVien },
                    { href: "/projects/my-plans", title: "Kế hoạch tham gia", hidden: !isSinhVien },
                    { href: "/projects/my-group", title: "Nhóm của tôi", hidden: !isSinhVien },
                    { href: "/projects/find-group", title: "Tìm nhóm", hidden: !isSinhVien },
                    // Giảng viên
                    { href: "/lecturer/thesis-topics", title: "Đề tài của tôi", hidden: !hasLecturerProfile },
                    { href: "/lecturer/groups-management", title: "Nhóm hướng dẫn", hidden: !hasLecturerProfile },
                    { href: "/lecturer/submissions", title: "Duyệt nộp bài", hidden: !hasLecturerProfile },
                    { href: "/lecturer/quota-management", title: "Thông tin Quota", hidden: !hasLecturerProfile },
                    // Trưởng bộ môn
                    { href: "/department-head/topic-reviewer-assignment", title: "Phân công Góp ý", hidden: !isTruongBoMon },
                ],
            },
            { title: "Hội đồng", href: "/lecturer/council", icon: GraduationCap, hidden: !hasLecturerProfile },
            { title: "Chấm điểm", href: "/lecturer/grading", icon: PenSquare, hidden: !hasLecturerProfile },
        ],
    };

    // --- C. Cấu hình Menu Admin (Quản trị) ---
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
            { title: "Quản lý Hội đồng", href: "/admin/hoidong", icon: GraduationCap },
            { title: "Bảng điểm tổng", href: "/admin/cham-diem", icon: Star },
            { title: "Duyệt nộp bài", href: "/admin/submissions", icon: CheckCircle },
            { title: "Quản lý File", href: "/admin/files", icon: Folder },
            { title: "Nhật ký hệ thống", href: "/admin/system-logs", icon: Activity },
            { title: "Thiết lập chung", href: "/admin/settings/general", icon: Settings },
            { title: "Sao lưu dữ liệu", href: "/admin/backups", icon: ShieldCheck },
        ],
    };

    // Helper hiển thị tên chức vụ/vai trò
    const getUserDisplayTitle = () => {
        if (hasLecturerProfile && positionNames.length > 0) {
            return positionNames.join(', ');
        }
        return roleName || 'Thành viên';
    };

    return (
        <Sidebar collapsible="icon" className="group border-r border-border/50">
            {/* === HEADER === */}
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

            {/* === CONTENT === */}
            <SidebarContent className="py-2">
                {/* 1. Nhóm Menu Platform */}
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

                {/* 2. Nhóm Menu Quản trị */}
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

            {/* === FOOTER (User Menu) === */}
            <SidebarFooter>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start gap-3 p-2 text-left group-data-[collapsible=icon]:justify-center">
                            <Avatar className="size-8 rounded-lg">
                                <AvatarImage src={user?.AVATAR_URL} alt={user?.HODEM_VA_TEN} />
                                <AvatarFallback className="rounded-lg">{user?.HODEM_VA_TEN?.charAt(0) ?? 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden min-w-0 flex-1">
                                <span className="text-sm font-semibold truncate w-full">{user?.HODEM_VA_TEN}</span>
                                <span className="text-xs text-muted-foreground truncate w-full">{user?.EMAIL}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden shrink-0" />
                        </Button>
                    </DropdownMenuTrigger>
                    
                    <DropdownMenuContent side="right" align="start" className="w-64">
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
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Palette className="mr-2 size-4" />
                                <span>Giao diện</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent className="w-56 ml-2 p-2">
                                    <div className="mb-3">
                                        <div className="text-xs font-semibold text-muted-foreground mb-2 px-1 flex items-center gap-1">
                                            <Type className="size-3" /> Cỡ chữ hiển thị
                                        </div>
                                        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border">
                                            {[
                                                { label: 'Nhỏ', value: 'small', sizeClass: 'text-xs' },
                                                { label: 'Vừa', value: 'normal', sizeClass: 'text-sm' },
                                                { label: 'Lớn', value: 'large', sizeClass: 'text-base' },
                                            ].map((item) => (
                                                <button
                                                    key={item.value}
                                                    onClick={(e) => {
                                                        e.preventDefault(); // QUAN TRỌNG: Chặn sự kiện đóng menu
                                                        e.stopPropagation();
                                                        setFontSize(item.value);
                                                    }}
                                                    className={cn(
                                                        "flex-1 flex flex-col items-center justify-center py-1.5 rounded-md transition-all duration-200 outline-none focus:ring-2 focus:ring-primary/20",
                                                        fontSize === item.value 
                                                            ? "bg-background text-primary shadow-sm ring-1 ring-border font-bold" 
                                                            : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                                                    )}
                                                    title={item.label}
                                                >
                                                    <span className={cn("leading-none", item.sizeClass)}>Aa</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                        onSelect={(e) => {
                                            e.preventDefault();
                                            setReduceMotion(!reduceMotion);
                                        }}
                                        className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                                    >
                                        {reduceMotion 
                                            ? <ZapOff className="mr-2 size-4 text-orange-500" /> 
                                            : <Zap className="mr-2 size-4 text-blue-500" />
                                        }
                                        <div className="flex flex-col">
                                            <span>Giảm hiệu ứng</span>
                                            <span className="text-[10px] text-muted-foreground font-normal">
                                                {reduceMotion ? "Đang bật (Nhanh)" : "Đang tắt (Mượt)"}
                                            </span>
                                        </div>
                                        {reduceMotion && <Check className="ml-auto size-4" />}
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem onClick={() => navigate('/settings/appearance')}>
                                        <Settings className="mr-2 size-4" />
                                        <span>Cài đặt chi tiết...</span>
                                    </DropdownMenuItem>

                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
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