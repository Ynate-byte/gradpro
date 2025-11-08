import React, { useState, useId } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Mail } from 'lucide-react'; // Thêm Loader2
import { toast } from 'sonner';
import { handleInvitation } from '@/api/groupService';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // <-- THÊM MỚI

export function PendingInvitationsList({ invitations, planId }) { // <-- Bỏ refreshData, thêm planId
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, action: null, invitationId: null });
  const alertTitleId = useId();
  const alertDescriptionId = useId();
  const queryClient = useQueryClient(); // <-- THÊM MỚI

  // Nâng cấp: Sử dụng useMutation để xử lý lời mời
  const handleInviteMutation = useMutation({
    mutationFn: ({ invitationId, action }) => handleInvitation(invitationId, action),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: ['myGroupDetails', planId] }); // Tự động refresh
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Thao tác thất bại.");
    },
    onSettled: () => {
      setAlertInfo({ isOpen: false, action: null, invitationId: null });
    }
  });

  const openConfirmation = (action, invitationId) => {
    setAlertInfo({ isOpen: true, action, invitationId });
  };

  const handleAction = () => {
    const { action, invitationId } = alertInfo;
    if (!action || !invitationId) return;
    handleInviteMutation.mutate({ invitationId, action }); // Gọi mutate
  };

  return (
    <>
      <Card>
        {/* ... (CardHeader - không đổi) ... */}
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail /> Lời mời tham gia nhóm</CardTitle>
          <CardDescription>Bạn có {invitations.length} lời mời đang chờ. Chấp nhận một lời mời sẽ tự động từ chối các lời mời còn lại.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitations.map(inv => (
            <div key={inv.ID_LOIMOI} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
              {/* ... (Nội dung lời mời - không đổi) ... */}
              <div className="flex items-center gap-4">
                <Avatar><AvatarFallback>{inv.nhom.TEN_NHOM.charAt(0)}</AvatarFallback></Avatar>
                <div>
                  <p className="font-semibold">{inv.nhom.TEN_NHOM}</p>
                  <p className="text-sm text-muted-foreground">Trưởng nhóm: {inv.nhom.nhomtruong.HODEM_VA_TEN}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {/* Cập nhật trạng thái disabled */}
                <Button size="sm" onClick={() => openConfirmation('accept', inv.ID_LOIMOI)} disabled={handleInviteMutation.isPending}>
                  {handleInviteMutation.isPending && alertInfo.invitationId === inv.ID_LOIMOI && alertInfo.action === 'accept' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Chấp nhận
                </Button>
                <Button size="sm" variant="outline" onClick={() => openConfirmation('decline', inv.ID_LOIMOI)} disabled={handleInviteMutation.isPending}>
                  {handleInviteMutation.isPending && alertInfo.invitationId === inv.ID_LOIMOI && alertInfo.action === 'decline' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Từ chối
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AlertDialog (Đã sửa lỗi Accessibility và thêm trạng thái loading) */}
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
            <AlertDialogCancel disabled={handleInviteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={handleInviteMutation.isPending}>
              {handleInviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}