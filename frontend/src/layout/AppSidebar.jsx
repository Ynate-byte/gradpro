import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, Bell, BookCopy, Users, Settings, ChevronsUpDown, ChevronRight, LogOut, CircleUserRound, History, Star, Shield
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

export function AppSidebar({ user, handleLogout }) {
    const location = useLocation();
    const currentUrl = location.pathname;

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
                {
                    title: "Đồ án",
                    icon: BookCopy,
                    subItems: [
                        { href: "/projects/topics", title: "Đề tài" },
                        { href: "/projects/my-group", title: "Nhóm của tôi" },
                    ],
                },
                { title: "Sinh viên", href: "/students", icon: Users },
                { title: "Thiết lập", href: "/settings/account", icon: Settings },
            ]
        }
    ];

    // Cấu hình menu dành riêng cho Admin
    const adminMenuConfig = [
        {
            label: "Quản trị",
            items: [
                { title: "Người dùng", href: "/admin/users", icon: Shield },
            ]
        }
    ];

    const MenuItem = ({ item }) => {
        const isParentActive = item.subItems && item.subItems.some(sub => currentUrl.startsWith(sub.href));
        if (item.subItems) {
            return (
                <Collapsible defaultOpen={isParentActive} className="group/collapsible">
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton className="w-full">
                                <item.icon className="size-4 shrink-0" />
                                <span className="flex-1 text-left transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:hidden">{item.title}</span>
                                <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 ease-in-out group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {item.subItems.map((subItem, subIdx) => (
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
        return (
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={currentUrl === item.href}>
                    <Link to={item.href}>
                        <item.icon className="size-4 shrink-0" />
                        <span className="flex-1 text-left transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    };

    return (
        <Sidebar collapsible="icon" className="group">
            {/* --- Header của Sidebar --- */}
            <SidebarHeader>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start gap-3 p-2 text-left group-data-[collapsible=icon]:justify-center">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <BookCopy className="size-4" />
                            </div>
                            <div className="flex flex-col items-start transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:hidden">
                                <span className="text-sm font-semibold">GradPro</span>
                                <span className="text-xs text-muted-foreground">
                                    {user?.vaitro?.TEN_VAITRO ?? '...'}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:hidden" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-56">
                        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                        <DropdownMenuItem>GradPro</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarHeader>

            {/* --- Nội dung chính của Sidebar --- */}
            <SidebarContent className="py-3">
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
                
                {/* Render menu admin nếu đúng vai trò */}
                {user?.vaitro?.TEN_VAITRO === 'Admin' && adminMenuConfig.map((group, idx) => (
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
            </SidebarContent>

            {/* --- Footer của Sidebar --- */}
            <SidebarFooter>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start gap-3 p-2 text-left group-data-[collapsible=icon]:justify-center">
                            <Avatar className="size-8">
                                <AvatarFallback>{user?.HODEM_VA_TEN?.charAt(0) ?? '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:hidden">
                                <span className="text-sm font-semibold">{user?.HODEM_VA_TEN}</span>
                                <span className="text-xs text-muted-foreground">{user?.EMAIL}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:hidden" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-56">
                        <DropdownMenuItem><CircleUserRound className="mr-2 size-4" /> Tài khoản</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                            <LogOut className="mr-2 size-4" /> Đăng xuất
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
    );
}