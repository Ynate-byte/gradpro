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
  Users, Activity, Loader2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

// Helper: Lấy chữ cái đầu
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

// Cấu hình vai trò
const roleConfig = {
  'Admin': { icon: ShieldCheck, className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  'Giảng viên': { icon: Briefcase, className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  'Sinh viên': { icon: GraduationCap, className: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
  'Giáo vụ': { icon: Briefcase, className: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  'Trưởng khoa': { icon: Briefcase, className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" },
};

// Cấu hình trạng thái kế hoạch
const planStatusConfig = {
  'Đang thực hiện': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'Đang chấm điểm': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Chờ phê duyệt': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Chờ duyệt chỉnh sửa': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'Đã phê duyệt': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
};

// Component hiển thị thông tin
const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start">
    <Icon className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
    <div className="ml-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm font-semibold break-words">
        {value || value === 0 ? value : (
          <span className="text-muted-foreground italic text-xs">Chưa có thông tin</span>
        )}
      </div>
    </div>
  </div>
);

// Skeleton khi đang load
const SheetLoadingSkeleton = () => (
  <div className="p-6 space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton className="h-20 w-20 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    </div>
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

// Component chính
export function UserDetailSheet({ userId, isOpen, setIsOpen }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
    }
  }, [userId, isOpen, setIsOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <div className="flex flex-col h-full">
          {isLoading ? (
            <SheetLoadingSkeleton />
          ) : !user ? (
            <div className="p-6">Không thể tải dữ liệu người dùng.</div>
          ) : (
            <>
              <SheetHeader className="p-6 pb-4 space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border">
                    <AvatarFallback className="text-2xl">{getInitials(user.HODEM_VA_TEN)}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <SheetTitle className="text-2xl">{user.HODEM_VA_TEN}</SheetTitle>
                    <SheetDescription>{user.EMAIL}</SheetDescription>
                    <div className="flex items-center gap-2 pt-1">
                      {(() => {
                        const roleName = user.vaitro.TEN_VAITRO;
                        const positionName = user.giangvien?.CHUCVU;
                        const displayRoleName = positionName || roleName;
                        const roleInfo = roleConfig[roleName] || {};
                        const RoleIcon = roleInfo.icon;
                        const isActive = user.TRANGTHAI_KICHHOAT;
                        return (
                          <>
                            <Badge variant="outline" className={`border-0 ${roleInfo.className}`}>
                              {RoleIcon && <RoleIcon className="h-3.5 w-3.5 mr-1.5" />}
                              {displayRoleName}
                            </Badge>
                            <Badge
                              variant={isActive ? "secondary" : "destructive"}
                              className={isActive ? "bg-green-100 text-green-800 border-0" : ""}
                            >
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
                  <Card>
                    <CardHeader><CardTitle className="text-base">Thông tin chung</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-2 text-sm">
                      <InfoItem icon={Hash} label="Mã định danh" value={user.MA_DINHDANH} />
                      <InfoItem icon={Calendar} label="Ngày tham gia" value={format(new Date(user.NGAYTAO), 'dd/MM/yyyy', { locale: vi })} />
                      <InfoItem icon={Clock} label="Đăng nhập cuối" value={user.DANGNHAP_CUOI ? format(new Date(user.DANGNHAP_CUOI), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'Chưa đăng nhập'} />
                    </CardContent>
                  </Card>

                  {/* Thông tin Sinh viên */}
                  {user.vaitro.TEN_VAITRO === 'Sinh viên' && user.sinhvien && (
                    <Card>
                      <CardHeader><CardTitle className="text-base">Thông tin Sinh viên</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-2 text-sm">
                        <InfoItem icon={BookOpen} label="Chuyên ngành" value={user.sinhvien.chuyennganh?.TEN_CHUYENNGANH} />
                        <InfoItem icon={Bookmark} label="Lớp" value={user.sinhvien.TEN_LOP} />
                        <InfoItem icon={Hash} label="Niên khóa" value={user.sinhvien.NIENKHOA} />
                        <InfoItem icon={Briefcase} label="Hệ đào tạo" value={user.sinhvien.HEDAOTAO} />
                      </CardContent>
                    </Card>
                  )}

                  {/* Thông tin Giảng viên */}
                  {user.vaitro.TEN_VAITRO !== 'Sinh viên' && user.giangvien && (
                    <Card>
                      <CardHeader><CardTitle className="text-base">Thông tin Giảng viên / Chuyên viên</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-2 text-sm">
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
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Các khóa luận đang tham gia
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* ----- SỬA LỖI TẠI ĐÂY: cacDotThamGia -> cac_dot_tham_gia ----- */}
                        {user.sinhvien?.cac_dot_tham_gia && user.sinhvien.cac_dot_tham_gia.length > 0 ? (
                          user.sinhvien.cac_dot_tham_gia.map(thamgia => {
                            {/* ----- KẾT THÚC SỬA LỖI ----- */}
                            const plan = thamgia.kehoach;
                            if (!plan) return null;
                            const status = plan.TRANGTHAI;
                            const statusStyle = planStatusConfig[status] || 'bg-gray-100 text-gray-800';

                            return (
                              <Link
                                to={`/projects/my-group`}
                                key={thamgia.ID_THAMGIA || `plan-${plan.ID_KEHOACH}`}
                                className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors"
                              >
                                <div className="space-y-1">
                                  <p className="font-semibold">{plan.TEN_DOT}</p>
                                  <p className="text-xs text-muted-foreground">{plan.NAMHOC} - HK {plan.HOCKY}</p>
                                </div>
                                <Badge variant="outline" className={`border-0 text-xs ${statusStyle}`}>
                                  {status}
                                </Badge>
                              </Link>
                            );
                          })
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
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
