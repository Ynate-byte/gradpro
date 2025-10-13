import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Hash, Briefcase, GraduationCap, Calendar, Clock, ShieldCheck, ShieldOff, Building, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const DetailRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start py-3">
        <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="ml-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium">{value || 'Chưa có thông tin'}</p>
        </div>
    </div>
);

export function UserDetailSheet({ user, isOpen, setIsOpen }) {
    if (!user) return null;

    const roleName = user.vaitro.TEN_VAITRO;
    const isActive = user.TRANGTHAI_KICHHOAT;

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent className="w-[400px] sm:w-[540px] p-0">
                <div className="flex flex-col h-full">
                    <SheetHeader className="p-6">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarFallback className="text-xl">{getInitials(user.HODEM_VA_TEN)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <SheetTitle className="text-2xl">{user.HODEM_VA_TEN}</SheetTitle>
                                <SheetDescription>{user.EMAIL}</SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                    <div className="flex-grow overflow-y-auto px-6">
                        <div className="space-y-2">
                            <DetailRow icon={User} label="Họ tên" value={user.HODEM_VA_TEN} />
                            <Separator />
                            <DetailRow icon={Mail} label="Email" value={user.EMAIL} />
                            <Separator />
                            <DetailRow icon={Hash} label="Mã định danh" value={user.MA_DINHDANH} />
                            <Separator />
                            {isActive ? (
                                <DetailRow icon={ShieldCheck} label="Trạng thái" value={<Badge className="bg-green-100 text-green-800">Hoạt động</Badge>} />
                            ) : (
                                <DetailRow icon={ShieldOff} label="Trạng thái" value={<Badge variant="destructive">Vô hiệu hóa</Badge>} />
                            )}
                            <Separator />
                            <DetailRow icon={Calendar} label="Ngày tham gia" value={format(new Date(user.NGAYTAO), 'dd/MM/yyyy', { locale: vi })} />
                            <Separator />
                            <DetailRow icon={Clock} label="Đăng nhập cuối" value={user.DANGNHAP_CUOI ? format(new Date(user.DANGNHAP_CUOI), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'Chưa đăng nhập'} />
                        </div>
                        
                        {roleName === 'Sinh viên' && user.sinhvien && (
                            <div className="mt-6">
                                <h4 className="text-sm font-semibold mb-2 text-primary flex items-center gap-2"><GraduationCap /> Thông tin Sinh viên</h4>
                                <div className="space-y-2 rounded-md border p-4">
                                    <DetailRow icon={BookOpen} label="Chuyên ngành" value={user.sinhvien.chuyennganh?.TEN_CHUYENNGANH} />
                                    <Separator />
                                    <DetailRow icon={Hash} label="Niên khóa" value={user.sinhvien.NIENKHOA} />
                                    <Separator />
                                    <DetailRow icon={Briefcase} label="Hệ đào tạo" value={user.sinhvien.HEDAOTAO} />
                                </div>
                            </div>
                        )}

                        {roleName === 'Giảng viên' && user.giangvien && (
                             <div className="mt-6">
                                <h4 className="text-sm font-semibold mb-2 text-primary flex items-center gap-2"><Briefcase /> Thông tin Giảng viên</h4>
                                <div className="space-y-2 rounded-md border p-4">
                                    <DetailRow icon={Building} label="Khoa/Bộ môn" value={user.giangvien.khoabomon?.TEN_KHOA_BOMON} />
                                    <Separator />
                                    <DetailRow icon={GraduationCap} label="Học vị" value={user.giangvien.HOCVI} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}