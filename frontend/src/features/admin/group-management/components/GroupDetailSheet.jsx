import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Users, User, Crown, Star, ShieldAlert,
    Info, CalendarDays, Clock, Building, BookOpen, Mail, Phone, CalendarPlus
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from "@/lib/utils";

// Helper function for initials (no changes)
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

// Reusable InfoItem component (no changes)
const InfoItem = ({ icon: Icon, label, value, className = "" }) => (
    <div className={`flex items-start ${className}`}>
        <Icon className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
        <div className="ml-3">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <div className="text-sm font-semibold break-words">
                {value || <span className="text-xs italic text-muted-foreground">Chưa có</span>}
            </div>
        </div>
    </div>
);

export function GroupDetailSheet({ group, isOpen, setIsOpen }) {
    if (!group) return null;

    // Helper to format dates safely (no changes)
    const formatNullableDate = (dateString, formatString = 'dd/MM/yyyy HH:mm') => {
        if (!dateString) return null;
        try {
            const date = parseISO(dateString);
            if (isValid(date)) { return format(date, formatString, { locale: vi }); }
        } catch (e) { console.error("Error formatting date:", dateString, e); }
        return dateString;
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            {/* *** MODIFICATION: Increased width using Tailwind classes *** */}
            <SheetContent className="w-[90vw] sm:max-w-2xl p-0 flex flex-col"> {/* Changed sm:max-w-lg to sm:max-w-2xl */}
            {/* *** END MODIFICATION *** */}

                {/* Header Section (no changes) */}
                <SheetHeader className="p-6 pb-4 border-b">
                     <SheetTitle className="text-2xl">{group.TEN_NHOM}</SheetTitle>
                     <SheetDescription>{group.MOTA || 'Không có mô tả.'}</SheetDescription>
                     <div className="flex flex-wrap items-center gap-2 pt-1">
                         {group.LA_NHOM_DACBIET && (
                             <Badge variant="destructive" className="gap-1.5"><Star className="h-3 w-3" /> Đặc biệt</Badge>
                         )}
                         {group.TRANGTHAI === 'Đã đủ thành viên' && (
                             <Badge variant="secondary">Đã đủ TV ({group.SO_THANHVIEN_HIENTAI}/4)</Badge>
                         )}
                          {group.TRANGTHAI === 'Đang mở' && (
                             <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300">Đang mở ({group.SO_THANHVIEN_HIENTAI}/4)</Badge>
                         )}
                     </div>
                 </SheetHeader>

                {/* Scrollable Content Area (no changes internally) */}
                <ScrollArea className="flex-grow overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* General Group Information Card (no changes) */}
                        <Card>
                             <CardHeader>
                                 <CardTitle className="text-base flex items-center gap-2">
                                     <Info className="h-5 w-5" /> Thông tin chung
                                 </CardTitle>
                             </CardHeader>
                             <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4">
                                <InfoItem icon={BookOpen} label="Thuộc Kế hoạch ID" value={group.ID_KEHOACH} />
                                <InfoItem icon={Building} label="Ưu tiên Khoa/BM" value={group.khoabomon?.TEN_KHOA_BOMON} />
                                <InfoItem icon={BookOpen} label="Ưu tiên Chuyên ngành" value={group.chuyennganh?.TEN_CHUYENNGANH} />
                                <InfoItem icon={CalendarDays} label="Ngày tạo" value={formatNullableDate(group.NGAYTAO)} />
                                <InfoItem icon={Clock} label="Cập nhật lần cuối" value={formatNullableDate(group.NGAYCAPNHAT)} />
                             </CardContent>
                        </Card>

                        {/* Member List Card (no changes) */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Users className="h-5 w-5" /> Thành viên ({group.thanhviens?.length ?? 0})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {group.thanhviens && group.thanhviens.length > 0 ? (
                                    group.thanhviens.map((member, index) => (
                                        <div key={member.ID_THANHVIEN} className="p-3 border rounded-md space-y-3 bg-muted/30">
                                            {/* ... Member details ... */}
                                             <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarFallback>{getInitials(member.nguoidung.HODEM_VA_TEN)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-grow">
                                                        <p className="font-semibold text-sm flex items-center gap-2">
                                                            {member.nguoidung.HODEM_VA_TEN}
                                                            {member.ID_NGUOIDUNG === group.ID_NHOMTRUONG && (
                                                                <Badge variant="outline" className="border-yellow-500 text-yellow-600 gap-1 text-xs px-1.5 py-0.5 dark:border-yellow-700 dark:text-yellow-300">
                                                                    <Crown className="h-3 w-3" />Trưởng nhóm
                                                                </Badge>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">{member.nguoidung.MA_DINHDANH}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <Separator />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-3 text-xs">
                                                <InfoItem icon={Mail} label="Email" value={member.nguoidung.EMAIL} className="col-span-2 sm:col-span-1"/>
                                                <InfoItem icon={Phone} label="Điện thoại" value={member.nguoidung.SO_DIENTHOAI || 'Chưa cập nhật'} className="col-span-2 sm:col-span-1"/>
                                                <InfoItem icon={CalendarPlus} label="Ngày vào nhóm" value={formatNullableDate(member.NGAY_VAONHOM, 'dd/MM/yyyy')} className="col-span-2 sm:col-span-1"/>
                                                <InfoItem icon={BookOpen} label="Chuyên ngành" value={member.nguoidung.sinhvien?.chuyennganh?.TEN_CHUYENNGANH ?? <span className="italic text-muted-foreground/70">N/A*</span>} className="col-span-2 sm:col-span-1"/>
                                                <InfoItem icon={Users} label="Lớp" value={member.nguoidung.sinhvien?.TEN_LOP ?? <span className="italic text-muted-foreground/70">N/A*</span>} className="col-span-2 sm:col-span-1"/>
                                            </div>
                                             {( !member.nguoidung.sinhvien?.chuyennganh || !member.nguoidung.sinhvien?.TEN_LOP) && index === 0 && (
                                                <p className="text-xs italic text-muted-foreground/70 pt-1">* Thông tin Chuyên ngành/Lớp cần cập nhật từ API.</p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">Nhóm chưa có thành viên nào.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>

                {/* Optional Footer (kept commented) */}
                {/* <SheetFooter className="p-4 border-t mt-auto">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Đóng</Button>
                </SheetFooter> */}

            </SheetContent>
        </Sheet>
    );
}