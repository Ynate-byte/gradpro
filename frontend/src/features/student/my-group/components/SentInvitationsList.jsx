import React, { useState, useId } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MailOpen, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cancelInvitation } from '@/api/groupService';

// Hàm lấy chữ cái đầu
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

// Component hiển thị danh sách lời mời đã gửi (của nhóm trưởng)
export function SentInvitationsList({ invitations, groupId, refreshData }) {
    const [isProcessing, setIsProcessing] = useState(null); // Lưu ID của lời mời đang xử lý
    const [alertInfo, setAlertInfo] = useState({ isOpen: false, invitationId: null, studentName: '' });
    const alertTitleId = useId();
    const alertDescriptionId = useId();

    // Mở dialog xác nhận hủy
    const openConfirmation = (invitationId, studentName) => {
        setAlertInfo({ isOpen: true, invitationId, studentName });
    };

    // Gọi API hủy lời mời
    const onHandleCancel = async () => {
        const { invitationId } = alertInfo;
        if (!invitationId) return;

        setIsProcessing(invitationId);
        try {
            const res = await cancelInvitation(groupId, invitationId);
            toast.success(res.message);
            refreshData(); // Tải lại dữ liệu của cả trang
        } catch (error) {
            toast.error(error.response?.data?.message || 'Hủy lời mời thất bại.');
        } finally {
            setIsProcessing(null);
            setAlertInfo({ isOpen: false, invitationId: null, studentName: '' });
        }
    };

    if (!invitations || invitations.length === 0) {
        return null; // Không hiển thị gì nếu không có lời mời đã gửi
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MailOpen /> Lời mời đã gửi ({invitations.length})
                    </CardTitle>
                    <CardDescription>Các lời mời đang chờ sinh viên phản hồi.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {invitations.map(inv => (
                        <div key={inv.ID_LOIMOI} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                            <div className='flex items-center gap-3'>
                                <Avatar>
                                    <AvatarFallback>{getInitials(inv.nguoiduocmoi.HODEM_VA_TEN)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{inv.nguoiduocmoi.HODEM_VA_TEN}</p>
                                    <p className="text-sm text-muted-foreground">{inv.nguoiduocmoi.sinhvien?.chuyennganh?.TEN_CHUYENNGANH ?? inv.nguoiduocmoi.MA_DINHDANH}</p>
                                    {inv.LOINHAN && <p className="text-xs italic text-muted-foreground mt-1">"{inv.LOINHAN}"</p>}
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="destructive"
                                disabled={isProcessing === inv.ID_LOIMOI}
                                onClick={() => openConfirmation(inv.ID_LOIMOI, inv.nguoiduocmoi.HODEM_VA_TEN)}
                                className="h-8 text-xs"
                            >
                                {isProcessing === inv.ID_LOIMOI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                                Hủy lời mời
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Dialog xác nhận hủy lời mời */}
            <AlertDialog open={alertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertInfo(prev => ({ ...prev, isOpen: false }))}>
                <AlertDialogContent aria-labelledby={alertTitleId} aria-describedby={alertDescriptionId}>
                    <AlertDialogHeader>
                        <AlertDialogTitle id={alertTitleId}>Xác nhận Hủy Lời mời</AlertDialogTitle>
                        <AlertDialogDescription id={alertDescriptionId}>
                            Bạn có chắc chắn muốn hủy lời mời đã gửi cho <strong>{alertInfo.studentName}</strong> không?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Không</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onHandleCancel}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Xác nhận Hủy
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};