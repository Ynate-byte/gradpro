import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Hash, Briefcase, GraduationCap, Calendar, Clock, ShieldCheck, ShieldOff, Building, BookOpen, Award, Bookmark, BookText, Users } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const roleConfig = {
    'Admin': { icon: ShieldCheck, className: "bg-red-100 text-red-800" },
    'Giảng viên': { icon: Briefcase, className: "bg-blue-100 text-blue-800" },
    'Sinh viên': { icon: GraduationCap, className: "bg-sky-100 text-sky-800" },
};

const InfoItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-start">
        <Icon className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
        <div className="ml-3">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {/* SỬA TẠI ĐÂY: Thay thế <p> bằng <div> để chứa được component <Badge> */}
            <div className="text-sm font-semibold break-words">{value || 'Chưa có thông tin'}</div>
        </div>
    </div>
);

export function UserDetailSheet({ user, isOpen, setIsOpen }) {
    if (!user) return null;

    const roleName = user.vaitro.TEN_VAITRO;
    const roleInfo = roleConfig[roleName] || {};
    const RoleIcon = roleInfo.icon;
    const isActive = user.TRANGTHAI_KICHHOAT;

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent className="w-[440px] sm:max-w-lg p-0 flex flex-col">
                <div className="flex flex-col h-full">
                    <SheetHeader className="p-6 pb-4 space-y-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20 border">
                                <AvatarFallback className="text-2xl">{getInitials(user.HODEM_VA_TEN)}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <SheetTitle className="text-2xl">{user.HODEM_VA_TEN}</SheetTitle>
                                <SheetDescription>{user.EMAIL}</SheetDescription>
                                <div className="flex items-center gap-2 pt-1">
                                    <Badge variant="outline" className={`border-0 ${roleInfo.className}`}>
                                        {RoleIcon && <RoleIcon className="h-3.5 w-3.5 mr-1.5" />}
                                        {roleName}
                                    </Badge>
                                    <Badge variant={isActive ? "secondary" : "destructive"} className={isActive ? "bg-green-100 text-green-800 border-0" : ""}>
                                        {isActive ? "Hoạt động" : "Vô hiệu hóa"}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </SheetHeader>
                    <div className="flex-grow overflow-y-auto px-6 pb-6 space-y-6">
                        <Card>
                            <CardHeader><CardTitle className="text-base">Thông tin chung</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-2 text-sm">
                                <InfoItem icon={Hash} label="Mã định danh" value={user.MA_DINHDANH} />
                                <InfoItem icon={Calendar} label="Ngày tham gia" value={format(new Date(user.NGAYTAO), 'dd/MM/yyyy', { locale: vi })} />
                                <InfoItem icon={Clock} label="Đăng nhập cuối" value={user.DANGNHAP_CUOI ? format(new Date(user.DANGNHAP_CUOI), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'Chưa đăng nhập'} />
                            </CardContent>
                        </Card>
                        
                        {roleName === 'Sinh viên' && user.sinhvien && (
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

                        {roleName === 'Giảng viên' && user.giangvien && (
                             <Card>
                                <CardHeader><CardTitle className="text-base">Thông tin Giảng viên</CardTitle></CardHeader>
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
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}