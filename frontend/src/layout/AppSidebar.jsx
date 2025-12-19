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
    SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
    SidebarSeparator
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from "@/components/theme-provider";
import { cn } from '@/lib/utils';

// --- Helper (GIỮ NGUYÊN) ---
const checkActive = (href, currentUrl) => {
    if (!href) return false;
    if (href === '/') return currentUrl === '/';
    return currentUrl === href || currentUrl.startsWith(`${href}/`);
};

// --- Component Menu Item (Compact & High Contrast) ---
const MenuItem = ({ item, currentUrl }) => {
    if (item.hidden) return null;

    const isSubItemActive = item.subItems?.some(sub => checkActive(sub.href, currentUrl));
    const isDirectActive = checkActive(item.href, currentUrl);
    const isActive = isSubItemActive || isDirectActive;

    const iconClass = cn(
        "size-4 shrink-0 transition-colors duration-200",
        isActive ? "text-primary-foreground" : "text-foreground/70 group-hover/btn:text-foreground"
    );

    const inactiveTextClass = "text-foreground/80 group-hover/btn:text-foreground font-medium";

    if (item.subItems && item.subItems.length > 0) {
        return (
            <Collapsible defaultOpen={isActive} className="group/collapsible">
                <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                            tooltip={item.title}
                            className={cn(
                                "group/btn w-full justify-between pr-2 transition-all duration-200 h-9 mb-0.5 rounded-md",
                                "group-data-[collapsible=icon]:justify-center",
                                isActive 
                                    ? "text-primary font-bold bg-primary/10 hover:bg-primary/15"
                                    : "hover:bg-sidebar-accent hover:text-foreground"
                            )}
                            isActive={isActive}
                        >
                            <span className="flex items-center gap-2.5 w-full">
                                {item.icon && <item.icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-foreground/60")} />}
                                <span className={cn("truncate group-data-[collapsible=icon]:hidden transition-all", isActive ? "text-primary" : inactiveTextClass)}>
                                    {item.title}
                                </span>
                            </span>
                            <ChevronRight className="ml-auto size-4 shrink-0 text-foreground/50 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                        <SidebarMenuSub className="border-l border-border/60 ml-3.5 pl-2 my-0.5 space-y-0.5">
                            {item.subItems.map((subItem, idx) => {
                                if (subItem.hidden) return null;
                                const isSubActive = checkActive(subItem.href, currentUrl);
                                return (
                                    <SidebarMenuSubItem key={idx}>
                                        <SidebarMenuSubButton
                                            asChild
                                            isActive={isSubActive}
                                            className={cn(
                                                "h-8 transition-colors rounded-md",
                                                isSubActive 
                                                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                                                    : "text-foreground/70 hover:text-foreground hover:bg-sidebar-accent"
                                            )}
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

    // Trường hợp 2: Menu đơn
    if (item.href) {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive}
                    className={cn(
                        "group/btn transition-all duration-200 h-9 mb-0.5 rounded-md",
                        "group-data-[collapsible=icon]:justify-center",
                        isActive 
                            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 font-bold" // Active đơn: Nền đậm
                            : "hover:bg-sidebar-accent hover:text-foreground"
                    )}
                >
                    <Link to={item.href}>
                        {item.icon && <item.icon className={iconClass} />}
                        <span className={cn("flex-1 truncate group-data-[collapsible=icon]:hidden transition-all", isActive ? "text-primary-foreground" : inactiveTextClass)}>
                            {item.title}
                        </span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    }

    return null;
};

// --- AppSidebar Main ---
export function AppSidebar() {
    const { user, logout } = useAuth();
    const { reduceMotion, setReduceMotion, fontSize, setFontSize } = useTheme();
    
    const location = useLocation();
    const navigate = useNavigate();
    const currentUrl = location.pathname;

    // --- Logic Phân Quyền ---
    const roleName = user?.vaitro?.TEN_VAITRO;
    const positions = user?.giangvien?.chucvus || [];
    const positionCodes = positions.map(p => p.MA_CHUCVU);
    const positionNames = positions.map(p => p.TEN_CHUCVU);
    
    const isSinhVien = roleName === 'Sinh viên';
    const isAdminAccount = roleName === 'Admin';
    const hasLecturerProfile = !!user?.giangvien;
    
    const isTruongKhoa = isAdminAccount || positionCodes.includes('TRUONG_KHOA');
    const isGiaoVu = isAdminAccount || positionCodes.includes('GIAO_VU') || positionCodes.includes('PHO_KHOA');
    const isTruongBoMon = isAdminAccount || positionCodes.includes('TRUONG_BOMON');
    
    // [CẬP NHẬT] Thêm isTruongBoMon vào điều kiện truy cập Admin Area
    const canAccessAdminArea = isAdminAccount || isTruongKhoa || isGiaoVu || isTruongBoMon;

    // --- Config Menu ---
    const platformMenu = {
        label: "Hệ thống",
        items: [
            {
                title: "Tổng quan",
                icon: LayoutDashboard,
                href: "/",
                subItems: [
                    { href: "/student/dashboard", title: "Tổng quan", hidden: !isSinhVien },
                    { href: "/lecturer/dashboard", title: "Tổng quan", hidden: !hasLecturerProfile },
                    
                    // Dashboard admin chỉ dành cho Admin/GVu/TKhoa, TBMon không thấy
                    { href: "/admin/dashboard", title: "Bảng điều khiển", hidden: !isGiaoVu && !isTruongKhoa && !isAdminAccount },
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
                    { href: "/projects/topics", title: "Danh sách Đề tài", hidden: !isSinhVien },
                    { href: "/projects/my-plans", title: "Kế hoạch tham gia", hidden: !isSinhVien },
                    { href: "/projects/my-group", title: "Nhóm của tôi", hidden: !isSinhVien },
                    { href: "/projects/find-group", title: "Tìm kiếm nhóm", hidden: !isSinhVien },
                    { href: "/lecturer/thesis-topics", title: "Đề tài của tôi", hidden: !hasLecturerProfile },
                    { href: "/lecturer/groups-management", title: "Nhóm hướng dẫn", hidden: !hasLecturerProfile },
                    { href: "/lecturer/submissions", title: "Duyệt nộp bài", hidden: !hasLecturerProfile },
                    { href: "/lecturer/quota-management", title: "Thông tin Quota", hidden: !hasLecturerProfile },
                    { href: "/department-head/topic-reviewer-assignment", title: "Phân công Góp ý", hidden: !isTruongBoMon },
                ],
            },
            { title: "Hội đồng", href: "/lecturer/council", icon: GraduationCap, hidden: !hasLecturerProfile },
            { title: "Chấm điểm", href: "/lecturer/grading", icon: PenSquare, hidden: !hasLecturerProfile },
        ],
    };

    const adminMenu = {
        label: "Quản trị",
        items: [
            // Các mục chỉ Admin/GiaoVu/TruongKhoa mới thấy
            { title: "Tổng quan", href: "/admin/dashboard", icon: PieChart, hidden: !isGiaoVu && !isTruongKhoa },
            { title: "Người dùng", href: "/admin/users", icon: Shield, hidden: !isGiaoVu },
            { title: "Quản lý nhóm", href: "/admin/groups", icon: Users, hidden: !isGiaoVu && !isTruongKhoa },
            { title: "Kế hoạch KLTN", href: "/admin/thesis-plans", icon: BookCopy, hidden: !isGiaoVu && !isTruongKhoa },
            { title: "Mẫu kế hoạch", href: "/admin/templates", icon: FileText, hidden: !isGiaoVu },
            { title: "Phân bổ đề tài", href: "/admin/quota-management", icon: Layers, hidden: !isGiaoVu && !isTruongKhoa },
            
            // Mục này hiển thị cho cả Trưởng bộ môn
            { 
                title: "Quản lý Đề tài", 
                href: "/admin/thesis-topics", 
                icon: BookCopy, 
                hidden: !isGiaoVu && !isTruongKhoa && !isTruongBoMon && !isAdminAccount
            },
            
            { title: "Quản lý Hội đồng", href: "/admin/hoidong", icon: GraduationCap, hidden: !isGiaoVu && !isTruongKhoa },
            { title: "Bảng điểm tổng", href: "/admin/cham-diem", icon: Star, hidden: !isGiaoVu && !isTruongKhoa },
            { title: "Duyệt nộp bài", href: "/admin/submissions", icon: CheckCircle, hidden: !isGiaoVu && !isTruongKhoa },
            { title: "Quản lý File", href: "/admin/files", icon: Folder, hidden: !isGiaoVu },
            { title: "Nhật ký hệ thống", href: "/admin/system-logs", icon: Activity, hidden: !isGiaoVu },
            { title: "Thiết lập chung", href: "/admin/settings/general", icon: Settings, hidden: !isGiaoVu },
            { title: "Sao lưu dữ liệu", href: "/admin/backups", icon: ShieldCheck, hidden: !isAdminAccount },
        ],
    };

    const getUserDisplayTitle = () => {
        if (hasLecturerProfile && positionNames.length > 0) {
            return positionNames.join(', ');
        }
        return roleName || 'Thành viên';
    };

    return (
        <Sidebar collapsible="icon" className="group border-r border-sidebar-border bg-sidebar-background">
            <SidebarHeader className="pb-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-10 w-full justify-start gap-2.5 px-2 text-left hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                                <BookCopy className="size-4" />
                            </div>
                            <div className="flex flex-col items-start gap-0 overflow-hidden transition-all group-data-[collapsible=icon]:hidden min-w-0">
                                <span className="text-sm font-bold tracking-tight text-foreground truncate">HUIT GRADPRO</span>
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate w-32">
                                    {getUserDisplayTitle()}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-3 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                        </Button>
                    </DropdownMenuTrigger>
                    
                    <DropdownMenuContent side="right" align="start" className="w-56 rounded-md border-border shadow-md">
                        <DropdownMenuItem onClick={() => navigate('/')} className="cursor-pointer">
                            <LayoutDashboard className="mr-2 size-4 text-primary" /> Trang chủ
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarHeader>

            <SidebarContent 
                className="px-2 pt-2
                overflow-y-auto overflow-x-hidden
                [&::-webkit-scrollbar]:w-1.5
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20
                dark:[&::-webkit-scrollbar-thumb]:bg-white/10
                hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50
                dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/20
                [&::-webkit-scrollbar-thumb]:rounded-full"
            >
                <SidebarGroup className="p-0">
                    <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-widest px-2 mb-1 mt-1">
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

                {/* 2. Admin Group */}
                {canAccessAdminArea && (
                    <>
                    <SidebarSeparator className="my-2 mx-2 bg-border/60"/>
                    <SidebarGroup className="p-0">
                        <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-widest px-2 mb-1">
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
                    </>
                )}
            </SidebarContent>
            <SidebarFooter className="p-2 border-t border-sidebar-border/60">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-auto w-full justify-start gap-2.5 p-1.5 text-left rounded-md hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center">
                            <Avatar className="size-8 rounded-md border border-border">
                                <AvatarImage src={user?.AVATAR_URL} alt={user?.HODEM_VA_TEN} />
                                <AvatarFallback className="rounded-md text-[10px] bg-primary/10 text-primary font-bold">{user?.HODEM_VA_TEN?.charAt(0) ?? 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start gap-0 overflow-hidden transition-all group-data-[collapsible=icon]:hidden min-w-0 flex-1">
                                <span className="text-xs font-bold text-foreground truncate w-full">{user?.HODEM_VA_TEN}</span>
                                <span className="text-[10px] text-muted-foreground truncate w-full">{user?.EMAIL}</span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    
                    <DropdownMenuContent side="right" align="end" className="w-60 rounded-md shadow-lg border-border mb-1">
                            <div className="p-3 flex items-center gap-3 border-b border-border pb-3 mb-1 bg-muted/20">
                            <Avatar className="size-9 rounded-full border border-border">
                                <AvatarImage src={user?.AVATAR_URL} />
                                <AvatarFallback>{user?.HODEM_VA_TEN?.charAt(0) ?? 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-bold truncate">{user?.HODEM_VA_TEN}</span>
                                <span className="text-[11px] text-muted-foreground truncate">{user?.EMAIL}</span>
                            </div>
                        </div>
                        
                        <DropdownMenuItem asChild className="cursor-pointer text-xs font-medium py-2">
                            <Link to="/profile"><CircleUserRound className="mr-2 size-3.5" /> Thông tin cá nhân</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer text-xs font-medium py-2">
                            <Link to="/history"><History className="mr-2 size-3.5" /> Lịch sử hoạt động</Link>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="cursor-pointer text-xs font-medium py-2">
                                <Palette className="mr-2 size-3.5" />
                                <span>Giao diện</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent className="w-52 ml-2 p-1 rounded-md border-border shadow-md bg-popover">
                                    {/* 1. Phần Cỡ chữ */}
                                    <div className="px-2 py-2">
                                        <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                                            <Type className="size-3" /> Cỡ chữ hiển thị
                                        </div>
                                        <div className="flex items-center gap-1 bg-muted p-0.5 rounded border border-border/50">
                                            {[
                                                { value: 'small', sizeClass: 'text-[10px]' },
                                                { value: 'normal', sizeClass: 'text-xs' },
                                                { value: 'large', sizeClass: 'text-sm' },
                                            ].map((item) => (
                                                <button
                                                    key={item.value}
                                                    onClick={(e) => {
                                                        e.preventDefault(); e.stopPropagation();
                                                        setFontSize(item.value);
                                                    }}
                                                    className={cn(
                                                        "flex-1 flex items-center justify-center py-1 rounded transition-all",
                                                        fontSize === item.value 
                                                            ? "bg-background shadow-sm ring-1 ring-border font-bold text-primary" 
                                                            : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                                                    )}
                                                >
                                                    <span className={cn("leading-none", item.sizeClass)}>Aa</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <DropdownMenuSeparator className="my-1 opacity-50"/>

                                    {/* 2. Phần Giảm hiệu ứng */}
                                    <DropdownMenuItem 
                                        onSelect={(e) => {
                                            e.preventDefault(); 
                                            setReduceMotion(!reduceMotion);
                                        }}
                                        className="cursor-pointer text-xs font-medium px-2 py-1.5 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            {reduceMotion 
                                                ? <ZapOff className="size-3.5 text-orange-500" /> 
                                                : <Zap className="size-3.5 text-blue-500" />
                                            }
                                            <span>Giảm hiệu ứng</span>
                                        </div>
                                        {reduceMotion && <Check className="size-3.5 text-primary" />}
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator className="my-1 opacity-50"/>

                                    <DropdownMenuItem onClick={() => navigate('/settings/appearance')} className="cursor-pointer text-xs font-medium px-2 py-1.5">
                                        <Settings className="mr-2 size-3.5" /> Cài đặt chi tiết...
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer text-xs font-bold py-2 bg-destructive/5 hover:bg-destructive/10">
                            <LogOut className="mr-2 size-3.5" /> Đăng xuất
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
    );
}