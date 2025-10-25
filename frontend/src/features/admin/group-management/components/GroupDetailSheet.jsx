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
    Users,
    Info,
    CalendarDays,
    Clock,
    BookOpen,
    Mail,
    Phone,
    CalendarPlus,
    Crown,
    Star,
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Hàm trợ giúp để lấy chữ cái đầu của họ và tên.
 */
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

/**
 * Component tái sử dụng để hiển thị một mục thông tin với icon, nhãn và giá trị.
 */
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

/**
 * Component chính hiển thị chi tiết thông tin nhóm trong một giao diện Sheet.
 */
export function GroupDetailSheet({ group, isOpen, setIsOpen }) {
    if (!group) return null;

    /**
     * Hàm trợ giúp để định dạng chuỗi ngày tháng một cách an toàn.
     */
    const formatNullableDate = (dateString, formatString = 'dd/MM/yyyy HH:mm') => {
        if (!dateString) return null;
        try {
            const date = parseISO(dateString);
            if (isValid(date)) {
                return format(date, formatString, { locale: vi });
            }
        } catch (e) {
            console.error("Lỗi định dạng ngày:", dateString, e);
        }
        return dateString;
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent className="w-[90vw] sm:max-w-2xl p-0 flex flex-col">
                {/* Phần Header */}
                <SheetHeader className="p-6 pb-4 border-b">
                    <SheetTitle className="text-2xl">{group.TEN_NHOM}</SheetTitle>
                    <SheetDescription>{group.MOTA || 'Không có mô tả.'}</SheetDescription>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        {group.LA_NHOM_DACBIET && (
                            <Badge variant="destructive" className="gap-1.5">
                                <Star className="h-3 w-3" /> Đặc biệt
                            </Badge>
                        )}
                        {group.TRANGTHAI === 'Đã đủ thành viên' && (
                            <Badge variant="secondary">
                                Đã đủ TV ({group.SO_THANHVIEN_HIENTAI}/4)
                            </Badge>
                        )}
                        {group.TRANGTHAI === 'Đang mở' && (
                            <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300">
                                Đang mở ({group.SO_THANHVIEN_HIENTAI}/4)
                            </Badge>
                        )}
                    </div>
                </SheetHeader>

                {/* Khu vực nội dung có thể cuộn */}
                <ScrollArea className="flex-grow overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* Card thông tin chung của nhóm */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Info className="h-5 w-5" /> Thông tin chung
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4">
                                <InfoItem icon={BookOpen} label="Thuộc Kế hoạch ID" value={group.ID_KEHOACH} />
                                <InfoItem icon={CalendarDays} label="Ngày tạo" value={formatNullableDate(group.NGAYTAO)} />
                                <InfoItem icon={Clock} label="Cập nhật lần cuối" value={formatNullableDate(group.NGAYCAPNHAT)} />
                            </CardContent>
                        </Card>

                        {/* Card danh sách thành viên */}
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
                                            {/* Thông tin cơ bản của thành viên */}
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
                                            {/* Thông tin chi tiết của thành viên */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-3 text-xs">
                                                <InfoItem icon={Mail} label="Email" value={member.nguoidung.EMAIL} className="col-span-2 sm:col-span-1" />
                                                <InfoItem icon={Phone} label="Điện thoại" value={member.nguoidung.SO_DIENTHOAI || 'Chưa cập nhật'} className="col-span-2 sm:col-span-1" />
                                                <InfoItem icon={CalendarPlus} label="Ngày vào nhóm" value={formatNullableDate(member.NGAY_VAONHOM, 'dd/MM/yyyy')} className="col-span-2 sm:col-span-1" />
                                                <InfoItem icon={BookOpen} label="Chuyên ngành" value={member.nguoidung.sinhvien?.chuyennganh?.TEN_CHUYENNGANH ?? <span className="italic text-muted-foreground/70">N/A</span>} className="col-span-2 sm:col-span-1" />
                                                <InfoItem icon={Users} label="Lớp" value={member.nguoidung.sinhvien?.TEN_LOP ?? <span className="italic text-muted-foreground/70">N/A</span>} className="col-span-2 sm:col-span-1" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">Nhóm chưa có thành viên nào.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
