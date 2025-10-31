import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { getUser } from '@/api/userService';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  User, Mail, Hash, Briefcase, GraduationCap, Calendar, Clock,
  ShieldCheck, Building, BookOpen, Award, Bookmark, BookText,
  Users, Activity, Loader2, Circle
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Helper: Lấy chữ cái đầu
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

// Cấu hình vai trò
const roleConfig = {
  'Admin': { icon: ShieldCheck, color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700" },
  'Giảng viên': { icon: Briefcase, color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700" },
  'Sinh viên': { icon: GraduationCap, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700" },
  'Giáo vụ': { icon: Briefcase, color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-700" },
  'Trưởng khoa': { icon: Briefcase, color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-700" },
};

// Cấu hình trạng thái kế hoạch
const planStatusConfig = {
  'Đang thực hiện': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-600',
  'Đang chấm điểm': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-600',
  'Chờ phê duyệt': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-600',
  'Chờ duyệt chỉnh sửa': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 border-orange-200 dark:border-orange-600',
  'Đã phê duyệt': 'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-300 border-sky-200 dark:border-sky-600',
};

// Component hiển thị thông tin
const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start">
    <Icon className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
    <div className="ml-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</p>
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
        {value || value === 0 ? value : (
          <span className="text-xs italic text-gray-400 dark:text-gray-500">Chưa có thông tin</span>
        )}
      </div>
    </div>
  </div>
);

// Skeleton khi đang load
const SheetLoadingSkeleton = () => (
  <div className="p-6 space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-20 w-20 rounded-full shrink-0 border-2 border-blue-200 dark:border-blue-700" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full max-w-xs" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
    <Skeleton className="h-40 w-full rounded-lg shadow-sm border border-blue-200 dark:border-blue-700" />
    <Skeleton className="h-40 w-full rounded-lg shadow-sm border border-blue-200 dark:border-blue-700" />
    <Skeleton className="h-32 w-full rounded-lg shadow-sm border border-blue-200 dark:border-blue-700" />
  </div>
);

// Component chính
export function UserDetailSheet({ userId, isOpen, setIsOpen }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      setIsLoading(true);
      setUser(null);
      getUser(userId)
        .then(data => setUser(data))
        .catch(err => {
          console.error("Failed to fetch user details:", err);
          toast.error("Không thể tải chi tiết người dùng.");
          setIsOpen(false);
        })
        .finally(() => setIsLoading(false));
    } else if (!isOpen) {
      setUser(null);
      setIsLoading(false);
    }
  }, [userId, isOpen, setIsOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col bg-gray-50 dark:bg-gray-900 border-l-4 border-blue-500">
        <div className="flex flex-col h-full">
          {isLoading ? (
            <SheetLoadingSkeleton />
          ) : !user ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">Không thể tải dữ liệu người dùng.</div>
          ) : (
            <>
              <SheetHeader className="p-6 pb-4 space-y-4 bg-white dark:bg-gray-800 border-b border-blue-200 dark:border-blue-700 shadow-sm">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-2 border-blue-300 dark:border-blue-600">
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 text-2xl">
                      {getInitials(user.HODEM_VA_TEN)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <SheetTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">{user.HODEM_VA_TEN}</SheetTitle>
                    <SheetDescription className="text-gray-600 dark:text-gray-300 break-all">{user.EMAIL}</SheetDescription>
                    <div className="flex items-center flex-wrap gap-2 pt-2">
                      {(() => {
                        const roleName = user.vaitro.TEN_VAITRO;
                        const positionName = user.giangvien?.CHUCVU;
                        const displayRoleName = positionName || roleName;
                        const roleInfo = roleConfig[displayRoleName] || roleConfig[roleName] || {};
                        const RoleIcon = roleInfo.icon;
                        const isActive = user.TRANGTHAI_KICHHOAT;
                        return (
                          <>
                            <Badge variant="outline" className={cn('gap-1.5 border-blue-400 text-blue-600 dark:border-blue-600 dark:text-blue-300 text-xs py-0.5')}>
                              {RoleIcon && <RoleIcon className="h-3.5 w-3.5 text-blue-500" />}
                              {displayRoleName}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                'gap-1.5 border-blue-400 text-blue-600 dark:border-blue-600 dark:text-blue-300 text-xs py-0.5',
                                isActive
                                  ? 'bg-blue-50 dark:bg-blue-900/20'
                                  : 'bg-red-50 dark:bg-red-900/20'
                              )}
                            >
                              <Circle className={cn("h-2.5 w-2.5", isActive ? 'fill-blue-500 text-blue-500' : 'fill-red-500 text-red-500')} />
                              {isActive ? "Hoạt động" : "Vô hiệu hóa"}
                            </Badge>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-grow overflow-y-auto">
                <div className="px-6 pb-6 space-y-6">
                  {/* Thông tin chung */}
                  <Card className="border border-blue-200 dark:border-blue-700 shadow-md bg-white dark:bg-gray-800">
                    <CardHeader><CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Hash className="h-5 w-5 text-blue-500" />Thông tin chung</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4 text-sm">
                      <InfoItem icon={Hash} label="Mã định danh" value={user.MA_DINHDANH} />
                      <InfoItem icon={Calendar} label="Ngày tham gia" value={format(new Date(user.NGAYTAO), 'dd/MM/yyyy', { locale: vi })} />
                      <InfoItem icon={Clock} label="Đăng nhập cuối" value={user.DANGNHAP_CUOI ? format(new Date(user.DANGNHAP_CUOI), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'Chưa đăng nhập'} />
                    </CardContent>
                  </Card>

                  {/* Thông tin Sinh viên */}
                  {user.vaitro.TEN_VAITRO === 'Sinh viên' && user.sinhvien && (
                    <Card className="border border-blue-200 dark:border-blue-700 shadow-md bg-white dark:bg-gray-800">
                      <CardHeader><CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2"><GraduationCap className="h-5 w-5 text-blue-500" />Thông tin Sinh viên</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4 text-sm">
                        <InfoItem icon={BookOpen} label="Chuyên ngành" value={user.sinhvien.chuyennganh?.TEN_CHUYENNGANH} />
                        <InfoItem icon={Bookmark} label="Lớp" value={user.sinhvien.TEN_LOP} />
                        <InfoItem icon={Hash} label="Niên khóa" value={user.sinhvien.NIENKHOA} />
                        <InfoItem icon={Briefcase} label="Hệ đào tạo" value={user.sinhvien.HEDAOTAO} />
                      </CardContent>
                    </Card>
                  )}

                  {/* Thông tin Giảng viên */}
                  {user.vaitro.TEN_VAITRO !== 'Sinh viên' && user.giangvien && (
                    <Card className="border border-blue-200 dark:border-blue-700 shadow-md bg-white dark:bg-gray-800">
                      <CardHeader><CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Briefcase className="h-5 w-5 text-blue-500" />Thông tin Giảng viên / Chuyên viên</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4 text-sm">
                        <InfoItem icon={Building} label="Khoa/Bộ môn" value={user.giangvien.khoabomon?.TEN_KHOA_BOMON} />
                        <InfoItem icon={GraduationCap} label="Học vị" value={user.giangvien.HOCVI} />
                        {user.giangvien.CHUCVU && (
                          <InfoItem icon={Award} label="Chức vụ" value={user.giangvien.CHUCVU} />
                        )}
                        <InfoItem icon={Users} label="Số nhóm HD tối đa" value={user.giangvien.SO_NHOM_TOIDA} />
                        <div className="sm:col-span-2">
                          <InfoItem icon={BookText} label="Chuyên môn" value={user.giangvien.CHUYENMON} />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Các khóa luận đang tham gia */}
                  {user.vaitro.TEN_VAITRO === 'Sinh viên' && (
                    <Card className="border border-blue-200 dark:border-blue-700 shadow-md bg-white dark:bg-gray-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                          <Activity className="h-5 w-5 text-blue-500" />
                          Các khóa luận đang tham gia
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {user.sinhvien?.cac_dot_tham_gia && user.sinhvien.cac_dot_tham_gia.length > 0 ? (
                          user.sinhvien.cac_dot_tham_gia.map(thamgia => {
                            const plan = thamgia.kehoach;
                            if (!plan) return null;
                            const status = plan.TRANGTHAI;
                            const statusStyle = planStatusConfig[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-600';
                            return (
                              <Link
                                to={`/projects/my-plans`}
                                key={thamgia.ID_THAMGIA || `plan-${plan.ID_KEHOACH}`}
                                className="flex items-center justify-between p-3 border border-blue-100 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 shadow-sm hover:shadow-md transition-colors"
                              >
                                <div className="space-y-1">
                                  <p className="font-semibold text-gray-900 dark:text-gray-100">{plan.TEN_DOT}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{plan.NAMHOC} - HK {plan.HOCKY}</p>
                                </div>
                                <Badge variant="outline" className={cn('border-blue-400 text-blue-600 dark:border-blue-600 dark:text-blue-300 text-xs', statusStyle)}>
                                  {status}
                                </Badge>
                              </Link>
                            );
                          })
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                            Không tham gia kế hoạch nào đang hoạt động.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}