import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Bell,
  BookCopy,
  Users,
  Settings,
  ChevronsUpDown,
  ChevronRight,
  LogOut,
  CircleUserRound,
  History,
  Star,
  Shield,
  FileText,
  Newspaper,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';

import { useAuth } from '@/contexts/AuthContext';

/**
 * AppSidebar
 * Thanh sidebar của ứng dụng với menu động, dropdown tài khoản và phân quyền hiển thị menu quản trị.
 */
export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUrl = location.pathname || '/';

  // Lấy vai trò và chức vụ từ user (nếu có)
  const userRoleName = user?.vaitro?.TEN_VAITRO;
  const userPositionName = user?.giangvien?.CHUCVU;

  // Quyền: Admin / Trưởng khoa / Giáo vụ
  const isAdmin = userRoleName === 'Admin';
  const isTruongKhoa = userRoleName === 'Trưởng khoa' || userPositionName === 'Trưởng khoa';
  const isGiaoVu = userRoleName === 'Giáo vụ' || userPositionName === 'Giáo vụ';

  // Những role có quyền xem menu Quản trị
  const canViewAdminMenu = isAdmin || isTruongKhoa || isGiaoVu;

  // Cấu hình menu chính
  const menuConfig = [
    {
      label: 'Platform',
      items: [
        {
          title: 'Tổng quan',
          icon: LayoutDashboard,
          subItems: [
            { href: '/', title: 'Trang chủ' },
            { href: '/notifications', title: 'Thông báo' },
            { href: '/history', title: 'Lịch sử' },
            { href: '/starred', title: 'Đã lưu' },
          ],
        },
        { title: 'Tin tức', href: '/news', icon: Newspaper },
        {
          title: 'Đồ án',
          icon: BookCopy,
          subItems: [
            { href: '/projects/topics', title: 'Đề tài' },
            // Nếu là sinh viên thì show thêm các mục liên quan tới sinh viên
            ...(user?.vaitro?.TEN_VAITRO === 'Sinh viên'
              ? [
                  { href: '/projects/my-plans', title: 'Kế hoạch KLTN' },
                  { href: '/projects/my-group', title: 'Nhóm của tôi' },
                  { href: '/projects/find-group', title: 'Tìm nhóm' },
                ]
              : []),
          ],
        },
      ],
    },
  ];

  // Cấu hình menu quản trị
  const adminMenuConfig = [
    {
      label: 'Quản trị',
      items: [
        { title: 'Người dùng', href: '/admin/users', icon: Shield },
        { title: 'Quản lý nhóm', href: '/admin/groups', icon: Users },
        { title: 'Kế hoạch KLTN', href: '/admin/thesis-plans', icon: BookCopy },
        { title: 'Kế hoạch Mẫu', href: '/admin/templates', icon: FileText },
      ],
    },
  ];

  /**
   * Component con: render một mục menu (có thể có subItems hoặc link trực tiếp)
   * - item: { title, href?, icon?, subItems? }
   */
  const MenuItem = ({ item }) => {
    // Kiểm tra active:
    // - Nếu có subItems, kiểm tra nếu có sub.href phù hợp với currentUrl
    // - Nếu link trực tiếp, kiểm tra startsWith để highlight nhóm route
    const isSubItemActive =
      item.subItems &&
      item.subItems.some(
        (sub) => (sub.href === '/' && currentUrl === '/') || (sub.href !== '/' && currentUrl.startsWith(sub.href))
      );

    const isDirectActive =
      item.href &&
      ((item.href === '/' && currentUrl === '/') || (item.href !== '/' && currentUrl.startsWith(item.href)));

    const isActive = Boolean(isSubItemActive || isDirectActive);

    if (item.subItems) {
      const visibleSubItems = item.subItems.filter(Boolean);
      if (visibleSubItems.length === 0) return null;

      return (
        <Collapsible defaultOpen={isActive} className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton 
                className={cn(
                  "w-full hover:bg-sidebar-accent/50 transition-colors",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                )}
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
                {visibleSubItems.map((subItem, subIdx) => (
                  <SidebarMenuSubItem key={subIdx}>
                    <SidebarMenuSubButton 
                      asChild 
                      className={cn(
                        "hover:bg-sidebar-accent/30 transition-colors",
                        currentUrl === subItem.href && "bg-sidebar-accent/50 text-sidebar-accent-foreground font-medium"
                      )}
                    >
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
          <SidebarMenuButton 
            asChild 
            className={cn(
              "hover:bg-sidebar-accent/50 transition-colors",
              isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            )}
          >
            <Link to={item.href} className="flex items-center w-full">
              {item.icon && <item.icon className="size-4 shrink-0" />}
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

  // Avatar fallback: lấy chữ cái đầu của HỌ VÀ TÊN nếu có
  const avatarFallback = (name) => {
    if (!name) return '?';
    return name.trim().charAt(0).toUpperCase();
  };

  return (
    <Sidebar collapsible="icon" className="group border-r border-sidebar-border">
      {/* Header: logo + dropdown user */}
      <SidebarHeader className="border-b border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 p-3 text-left group-data-[collapsible=icon]:justify-center hover:bg-sidebar-accent/50 transition-colors"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BookCopy className="size-5" />
              </div>

              <div className="flex flex-col items-start transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden">
                <span className="text-base font-bold">GradPro</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {userPositionName || userRoleName || 'User'}
                </span>
              </div>

              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>{user?.HODEM_VA_TEN ?? 'Tài khoản'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="truncate">
              {user?.EMAIL ?? ''}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      {/* Nội dung sidebar: menu groups */}
      <SidebarContent className="py-2">
        {menuConfig.map((group, idx) => (
          <SidebarGroup key={idx} className="px-2">
            <SidebarGroupLabel className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item, itemIdx) => (
                  <MenuItem key={itemIdx} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* Admin menu (hiện khi user có quyền) */}
        {canViewAdminMenu &&
          adminMenuConfig.map((group, idx) => (
            <SidebarGroup key={`admin-${idx}`} className="px-2 mt-2">
              <SidebarGroupLabel className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {group.items.map((item, itemIdx) => (
                    <MenuItem key={itemIdx} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
      </SidebarContent>

      {/* Footer: thông tin tài khoản + menu cài đặt + logout */}
      <SidebarFooter className="border-t border-sidebar-border mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 p-3 text-left group-data-[collapsible=icon]:justify-center hover:bg-sidebar-accent/50 transition-colors"
            >
              <Avatar className="size-8 bg-primary/10 text-primary">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {avatarFallback(user?.HODEM_VA_TEN)}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col items-start transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden min-w-0 flex-1">
                <span className="text-sm font-semibold truncate w-full">{user?.HODEM_VA_TEN ?? 'User'}</span>
                <span className="text-xs text-muted-foreground truncate w-full">{user?.EMAIL ?? ''}</span>
              </div>

              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden shrink-0" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="right" align="start" className="w-56">
            <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>

            <DropdownMenuItem onClick={() => navigate('/settings/account')}>
              <CircleUserRound className="mr-2 size-4" /> Thông tin
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate('/settings/appearance')}>
              <Settings className="mr-2 size-4" /> Giao diện
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate('/notifications')}>
              <Bell className="mr-2 size-4" /> Thông báo
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate('/history')}>
              <History className="mr-2 size-4" /> Lịch sử
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate('/starred')}>
              <Star className="mr-2 size-4" /> Đã lưu
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                // Gọi logout (context) — nếu logout trả về promise, xử lý thêm tại đây nếu cần
                logout();
              }}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 size-4" /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;