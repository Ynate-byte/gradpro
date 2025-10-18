import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User, Crown, Star, ShieldAlert } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

export function GroupDetailSheet({ group, isOpen, setIsOpen }) {
    if (!group) return null;

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent className="w-[440px] sm:max-w-lg p-0 flex flex-col">
                <SheetHeader className="p-6 pb-4 space-y-2">
                    <SheetTitle className="text-2xl">{group.TEN_NHOM}</SheetTitle>
                    <SheetDescription>{group.MOTA || 'Không có mô tả.'}</SheetDescription>
                     <div className="flex items-center gap-2 pt-1">
                        {group.LA_NHOM_DACBIET && (
                            <Badge variant="destructive" className="gap-1.5"><Star className="h-3 w-3" /> Đặc biệt</Badge>
                        )}
                        {group.TRANGTHAI === 'Đã đủ thành viên' && (
                            <Badge variant="secondary">{group.TRANGTHAI}</Badge>
                        )}
                    </div>
                </SheetHeader>
                <ScrollArea className="flex-grow px-6 pb-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Thành viên ({group.SO_THANHVIEN_HIENTAI})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {group.thanhviens.map(member => (
                                <div key={member.ID_THANHVIEN} className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarFallback>{getInitials(member.nguoidung.HODEM_VA_TEN)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow">
                                        <p className="font-semibold text-sm">{member.nguoidung.HODEM_VA_TEN}</p>
                                        <p className="text-xs text-muted-foreground">{member.nguoidung.MA_DINHDANH}</p>
                                    </div>
                                    {member.ID_NGUOIDUNG === group.ID_NHOMTRUONG && (
                                        <Badge variant="outline" className="border-yellow-500 text-yellow-600 gap-1 text-xs">
                                            <Crown className="h-3 w-3" />Trưởng nhóm
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}