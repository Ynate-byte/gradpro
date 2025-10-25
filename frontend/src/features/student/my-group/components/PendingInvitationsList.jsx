import React, { useState, useId } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { handleInvitation } from '@/api/groupService';

// Component hiển thị danh sách lời mời tham gia nhóm đang chờ
export function PendingInvitationsList({ invitations, refreshData }) {
    const [alertInfo, setAlertInfo] = useState({ isOpen: false, action: null, invitationId: null });
    const alertTitleId = useId();
    const alertDescriptionId = useId();

    // Mở dialog xác nhận hành động (chấp nhận/từ chối)
    const openConfirmation = (action, invitationId) => {
        setAlertInfo({ isOpen: true, action, invitationId });
    };

    // Xử lý logic chấp nhận hoặc từ chối lời mời
    const handleAction = async () => {
        const { action, invitationId } = alertInfo;
        if (!action || !invitationId) return;
        try {
            const response = await handleInvitation(invitationId, action);
            toast.success(response.message);
            refreshData();
        } catch (error) { 
            toast.error(error.response?.data?.message || "Thao tác thất bại."); 
        } finally { 
            setAlertInfo({ isOpen: false, action: null, invitationId: null }); 
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Mail /> Lời mời tham gia nhóm</CardTitle>
                    <CardDescription>Bạn có {invitations.length} lời mời đang chờ. Chấp nhận một lời mời sẽ tự động từ chối các lời mời còn lại.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {invitations.map(inv => (
                        <div key={inv.ID_LOIMOI} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                            <div className="flex items-center gap-4">
                                <Avatar><AvatarFallback>{inv.nhom.TEN_NHOM.charAt(0)}</AvatarFallback></Avatar>
                                <div>
                                    <p className="font-semibold">{inv.nhom.TEN_NHOM}</p>
                                    <p className="text-sm text-muted-foreground">Trưởng nhóm: {inv.nhom.nhomtruong.HODEM_VA_TEN}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => openConfirmation('accept', inv.ID_LOIMOI)}>Chấp nhận</Button>
                                <Button size="sm" variant="outline" onClick={() => openConfirmation('decline', inv.ID_LOIMOI)}>Từ chối</Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Dialog xác nhận hành động */}
            <AlertDialog open={alertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertInfo({ isOpen: false, action: null, invitationId: null })}>
                <AlertDialogContent aria-labelledby={alertTitleId} aria-describedby={alertDescriptionId}>
                    <AlertDialogHeader>
                        <AlertDialogTitle id={alertTitleId}>Xác nhận hành động</AlertDialogTitle>
                        <AlertDialogDescription id={alertDescriptionId}>
                            {alertInfo.action === 'accept'
                                ? "Bạn có chắc chắn muốn tham gia nhóm này không? Các lời mời khác sẽ bị từ chối."
                                : "Bạn có chắc chắn muốn từ chối lời mời này không?"}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAction}>Xác nhận</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}