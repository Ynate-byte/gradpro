import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, Bell, BookCopy, Users, Settings, ChevronsUpDown, ChevronRight, LogOut, CircleUserRound, History, Star, Shield, Sparkles
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
    const [hoveredItem, setHoveredItem] = useState(null);

    const menuConfig = [
        {
            label: "Platform",
            items: [
                {
                    title: "Tổng quan",
                    icon: LayoutDashboard,
                    subItems: [
                        { href: "/", title: "Trang chủ" },
                        { href: "/notifications", title: "Thông báo", badge: "3" },
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

    const adminMenuConfig = [
        {
            label: "Quản trị",
            items: [
                { title: "Người dùng", href: "/admin/users", icon: Shield },
                { title: "Quản lý nhóm", href: "/admin/groups", icon: Users },
                { title: "Kế hoạch KLTN", href: "/admin/thesis-plans", icon: BookCopy },
            ]
        }
    ];

    const MenuItem = ({ item, index }) => {
        const isParentActive = item.subItems && item.subItems.some(sub => currentUrl.startsWith(sub.href));
        const isHovered = hoveredItem === `item-${index}`;
        
        if (item.subItems) {
            return (
                <Collapsible defaultOpen={isParentActive} className="group/collapsible">
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton 
                                className={cn(
                                    "w-full relative overflow-hidden transition-all duration-300",
                                    "hover:bg-gradient-to-r hover:from-accent/80 hover:to-accent/40",
                                    "before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/0 before:via-primary/5 before:to-primary/0",
                                    "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
                                    isParentActive && "bg-gradient-to-r from-accent/60 to-accent/30 font-medium"
                                )}
                                onMouseEnter={() => setHoveredItem(`item-${index}`)}
                                onMouseLeave={() => setHoveredItem(null)}
                            >
                                <div className="flex items-center gap-3 relative z-10 w-full">
                                    <div className={cn(
                                        "p-1.5 rounded-lg transition-all duration-300",
                                        isParentActive ? "bg-primary/15 text-primary" : "bg-accent/50",
                                        isHovered && "bg-primary/20 scale-110 rotate-3"
                                    )}>
                                        <item.icon className="size-4 shrink-0" />
                                    </div>
                                    <span className="flex-1 text-left transition-all duration-200 ease-in-out group-data-[collapsible=icon]:hidden">
                                        {item.title}
                                    </span>
                                    <ChevronRight className={cn(
                                        "ml-auto size-4 shrink-0 transition-all duration-300 ease-out group-data-[collapsible=icon]:hidden",
                                        "group-data-[state=open]/collapsible:rotate-90 group-data-[state=open]/collapsible:text-primary"
                                    )} />
                                </div>
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="transition-all duration-300 ease-out data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                            <SidebarMenuSub className="ml-1 border-l-2 border-border/50 pl-4 space-y-0.5">
                                {item.subItems.map((subItem, subIdx) => {
                                    const isActive = currentUrl === subItem.href;
                                    return (
                                        <SidebarMenuSubItem key={subIdx}>
                                            <SidebarMenuSubButton 
                                                asChild 
                                                isActive={isActive}
                                                className={cn(
                                                    "transition-all duration-200 group/sublink relative",
                                                    isActive && "bg-primary/10 font-medium text-primary hover:bg-primary/15"
                                                )}
                                            >
                                                <Link to={subItem.href} className="flex items-center gap-2">
                                                    {isActive && (
                                                        <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-primary/0 via-primary to-primary/0 rounded-full" />
                                                    )}
                                                    <span className={cn(
                                                        "transition-all duration-200 group-hover/sublink:translate-x-1",
                                                        isActive && "font-medium"
                                                    )}>
                                                        {subItem.title}
                                                    </span>
                                                    {subItem.badge && (
                                                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-xs font-medium text-primary">
                                                            {subItem.badge}
                                                        </span>
                                                    )}
                                                </Link>
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

        const isActive = currentUrl === item.href;
        return (
            <SidebarMenuItem>
                <SidebarMenuButton 
                    asChild 
                    isActive={isActive}
                    className={cn(
                        "transition-all duration-300 relative overflow-hidden",
                        "hover:bg-gradient-to-r hover:from-accent/80 hover:to-accent/40",
                        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/0 before:via-primary/5 before:to-primary/0",
                        "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
                        isActive && "bg-gradient-to-r from-accent/60 to-accent/30 font-medium"
                    )}
                    onMouseEnter={() => setHoveredItem(`item-${index}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                >
                    <Link to={item.href} className="flex items-center gap-3 relative z-10">
                        <div className={cn(
                            "p-1.5 rounded-lg transition-all duration-300",
                            isActive ? "bg-primary/15 text-primary" : "bg-accent/50",
                            isHovered && "bg-primary/20 scale-110 rotate-3"
                        )}>
                            <item.icon className="size-4 shrink-0" />
                        </div>
                        <span className="flex-1 text-left transition-all duration-200 ease-in-out group-data-[collapsible=icon]:hidden">
                            {item.title}
                        </span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    };

    return (
        <Sidebar collapsible="icon" className="group border-r bg-gradient-to-b from-background via-background to-accent/5">
            <SidebarHeader className="border-b border-border/40 bg-gradient-to-br from-background via-accent/5 to-background">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            className="w-full justify-start gap-3 p-2 text-left transition-all duration-300 hover:bg-accent/50 active:scale-[0.98] group-data-[collapsible=icon]:justify-center"
                        >
                            <div className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground shadow-lg transition-all duration-300 hover:shadow-primary/25 hover:scale-110 hover:rotate-6">
                                <BookCopy className="size-4 relative z-10" />
                                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                            <div className="flex flex-col items-start transition-all duration-300 ease-in-out group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0">
                                <span className="text-sm font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">GradPro</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Sparkles className="size-3" />
                                    {user?.vaitro?.TEN_VAITRO ?? '...'}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground transition-all duration-300 ease-in-out group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:opacity-0" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-56">
                        <DropdownMenuLabel className="flex items-center gap-2">
                            <Sparkles className="size-4 text-primary" />
                            Workspaces
                        </DropdownMenuLabel>
                        <DropdownMenuItem className="cursor-pointer">GradPro</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarHeader>

            <SidebarContent className="py-3 px-2">
                {menuConfig.map((group, idx) => (
                    <SidebarGroup key={idx} className="px-0">
                        <SidebarGroupLabel className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/60 transition-all duration-200 group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:opacity-0">
                            {group.label}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-1">
                                {group.items.map((item, itemIdx) => (
                                    <MenuItem key={itemIdx} item={item} index={`${idx}-${itemIdx}`} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
                
                {user?.vaitro?.TEN_VAITRO === 'Admin' && adminMenuConfig.map((group, idx) => (
                    <SidebarGroup key={`admin-${idx}`} className="mt-3 pt-3 border-t-2 border-dashed border-border/40 px-0">
                        <SidebarGroupLabel className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-2 transition-all duration-200 group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:opacity-0">
                            <Shield className="size-3" />
                            {group.label}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-1">
                                {group.items.map((item, itemIdx) => (
                                    <MenuItem key={itemIdx} item={item} index={`admin-${idx}-${itemIdx}`} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter className="border-t border-border/40 bg-gradient-to-br from-background via-accent/5 to-background p-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            className="w-full justify-start gap-3 p-2 text-left transition-all duration-300 hover:bg-accent/50 active:scale-[0.98] group-data-[collapsible=icon]:justify-center rounded-lg"
                        >
                            <div className="relative">
                                <Avatar className="size-8 ring-2 ring-border/50 transition-all duration-300 hover:ring-primary/50 hover:scale-110">
                                    <AvatarFallback className="bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary font-bold text-sm">
                                        {user?.HODEM_VA_TEN?.charAt(0) ?? '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-green-500 ring-2 ring-background" />
                            </div>
                            <div className="flex flex-col items-start min-w-0 transition-all duration-300 ease-in-out group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0">
                                <span className="text-sm font-semibold truncate w-full">{user?.HODEM_VA_TEN}</span>
                                <span className="text-xs text-muted-foreground truncate w-full">{user?.EMAIL}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground transition-all duration-300 ease-in-out group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:opacity-0" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-56">
                        <DropdownMenuLabel className="flex items-center gap-2">
                            <div className="size-2 rounded-full bg-green-500" />
                            Đang hoạt động
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer">
                            <CircleUserRound className="mr-2 size-4" /> Tài khoản
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            onClick={handleLogout} 
                            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                            <LogOut className="mr-2 size-4" /> Đăng xuất
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
    );
}