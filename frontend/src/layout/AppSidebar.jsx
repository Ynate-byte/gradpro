import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, Bell, BookCopy, Users, Settings, ChevronsUpDown, ChevronRight, LogOut, CircleUserRound, History, Star, Shield,
    FileText, Newspaper
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
    SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';

// Component chính hiển thị thanh Sidebar của ứng dụng
export function AppSidebar() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const currentUrl = location.pathname;

    // ----- THÊM MỚI: Logic kiểm tra quyền Admin/Quản lý -----
    const userRoleName = user?.vaitro?.TEN_VAITRO;
    const userPositionName = user?.giangvien?.CHUCVU;

    const isAdmin = userRoleName === 'Admin';
    const isTruongKhoa = userRoleName === 'Trưởng khoa' || userPositionName === 'Trưởng khoa';
    const isGiaoVu = userRoleName === 'Giáo vụ' || userPositionName === 'Giáo vụ';

    // Admin, Trưởng khoa, Giáo vụ đều có thể xem menu Quản trị
    const canViewAdminMenu = isAdmin || isTruongKhoa || isGiaoVu;
    // ----- KẾT THÚC THÊM MỚI -----

    // --- Cấu hình Menu Chính ---
    const menuConfig = [
        {
            label: "Platform",
            items: [
                {
                    title: "Tổng quan",
                    icon: LayoutDashboard,
                    subItems: [
                        { href: "/", title: "Trang chủ" },
                        { href: "/notifications", title: "Thông báo" },
                        { href: "/history", title: "Lịch sử" },
                        { href: "/starred", title: "Đã lưu" },
                    ],
                },
                { title: "Tin tức", href: "/news", icon: Newspaper },
                {
                    title: "Đồ án",
                    icon: BookCopy,
                    subItems: [
                        { href: "/projects/topics", title: "Đề tài" },
                        ...(user?.vaitro?.TEN_VAITRO === 'Sinh viên' ? [
                            { href: "/projects/my-plans", title: "Kế hoạch KLTN" },
                            { href: "/projects/my-group", title: "Nhóm của tôi" },
                            { href: "/projects/find-group", title: "Tìm nhóm" },
                        ] : []),
                    ],
                },
            ]
        }
    ];

    // --- Cấu hình Menu Quản trị ---
    const adminMenuConfig = [
        {
            label: "Quản trị",
            items: [
                { title: "Người dùng", href: "/admin/users", icon: Shield },
                { title: "Quản lý nhóm", href: "/admin/groups", icon: Users },
                { title: "Kế hoạch KLTN", href: "/admin/thesis-plans", icon: BookCopy },
                { title: "Kế hoạch Mẫu", href: "/admin/templates", icon: FileText },
            ]
        }
    ];

    // --- Component MenuItem (Hàm render đệ quy các mục menu) ---
    const MenuItem = ({ item }) => {
        // ... (Không có thay đổi trong hàm MenuItem)
        const isSubItemActive = item.subItems && item.subItems.some(sub =>
            (sub.href === '/' && currentUrl === '/') || (sub.href !== '/' && currentUrl.startsWith(sub.href))
        );
        const isDirectActive = item.href && (
            (item.href === '/' && currentUrl === '/') || (item.href !== '/' && currentUrl.startsWith(item.href))
        );
        const isActive = !!(isSubItemActive || isDirectActive);

        if (item.subItems) {
            const visibleSubItems = item.subItems;
            if (visibleSubItems.length === 0) return null;

            return (
                <Collapsible defaultOpen={isActive} className="group/collapsible">
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton className="w-full" isActive={isActive}>
                                <item.icon className="size-4 shrink-0" />
                                <span className="flex-1 text-left transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:hidden">{item.title}</span>
                                <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 ease-in-out group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {visibleSubItems.map((subItem, subIdx) => (
                                    <SidebarMenuSubItem key={subIdx}>
                                        <SidebarMenuSubButton asChild isActive={currentUrl === subItem.href}>
                                            <Link to={subItem.href}>{subItem.title}</Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </Collapsible>
            );
        }

        if (item.href) {
            return (
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive}>
                        <Link to={item.href}>
                            <item.icon className="size-4 shrink-0" />
                            <span className="flex-1 text-left transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:hidden">{item.title}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            );
        }
        return null;
    };
    // --- END MenuItem ---

    return (
        <Sidebar collapsible="icon" className="group">
            {/* Header: Logo và vai trò người dùng */}
            <SidebarHeader>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start gap-3 p-2 text-left group-data-[collapsible=icon]:justify-center">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <BookCopy className="size-4" />
                            </div>
                            <div className="flex flex-col items-start transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden">
                                <span className="text-sm font-semibold">GradPro</span>
                                <span className="text-xs text-muted-foreground">
                                    {/* Sửa: Hiển thị Chức vụ nếu có, nếu không thì hiển thị Vai trò */}
                                    {userPositionName || userRoleName || '...'}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden" />
                        </Button>
                    </DropdownMenuTrigger>
                    {/* Dropdown Menu Content - Tùy chỉnh nếu cần */}
                </DropdownMenu>
            </SidebarHeader>

            {/* Nội dung chính: Các nhóm menu */}
            <SidebarContent className="py-3">
                {/* Render menu chính */}
                {menuConfig.map((group, idx) => (
                    <SidebarGroup key={idx}>
                        <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{group.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item, itemIdx) => (
                                    <MenuItem key={itemIdx} item={item} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}

                {/* ----- SỬA ĐỔI: Dùng canViewAdminMenu ----- */}
                {/* Render menu quản trị nếu người dùng là Admin, Trưởng khoa, Giáo vụ */}
                {canViewAdminMenu && adminMenuConfig.map((group, idx) => (
                    <SidebarGroup key={`admin-${idx}`}>
                        <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{group.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item, itemIdx) => (
                                    <MenuItem key={itemIdx} item={item} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
                {/* ----- KẾT THÚC SỬA ĐỔI ----- */}
            </SidebarContent>

            {/* Footer: Thông tin và cài đặt tài khoản */}
            <SidebarFooter>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start gap-3 p-2 text-left group-data-[collapsible=icon]:justify-center">
                            <Avatar className="size-8">
                                <AvatarFallback>{user?.HODEM_VA_TEN?.charAt(0) ?? '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden">
                                <span className="text-sm font-semibold truncate max-w-[150px]">{user?.HODEM_VA_TEN}</span>
                                <span className="text-xs text-muted-foreground truncate max-w-[150px]">{user?.EMAIL}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-56">
                        <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigate('/settings/account')}>
                            <CircleUserRound className="mr-2 size-4" /> Thông tin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/settings/appearance')}>
                            <Settings className='mr-2 size-4'/> Giao diện
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                            <LogOut className="mr-2 size-4" /> Đăng xuất
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
    );
}