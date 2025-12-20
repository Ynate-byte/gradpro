import React, { useState, useId } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MailOpen, X, Loader2, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { cancelInvitation } from '@/api/groupService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const StatusBadge = ({ status }) => {
  const statusMap = {
    'Chấp nhận': 'bg-green-100 text-green-800 hover:bg-green-100',
    'Từ chối': 'bg-red-100 text-red-800 hover:bg-red-100',
    'Đã hủy': 'bg-zinc-100 text-zinc-600 hover:bg-zinc-100',
    'Hết hạn': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  };
  const className = statusMap[status] || 'bg-gray-100 text-gray-800';
  return (
    <Badge className={cn("text-xs font-medium cursor-default", className)} variant="secondary">
      {status}
    </Badge>
  );
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Nhận prop isLeader
export function SentInvitationsList({ invitations, groupId, planId, isLeader }) {
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, invitationId: null, studentName: '' });
  const alertTitleId = useId();
  const alertDescriptionId = useId();
  const queryClient = useQueryClient();

  const cancelInviteMutation = useMutation({
    mutationFn: (invitationId) => cancelInvitation(groupId, invitationId),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['myGroupDetails', planId] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Hủy lời mời thất bại.');
    },
    onSettled: () => {
      setAlertInfo({ isOpen: false, invitationId: null, studentName: '' });
    }
  });

  const openConfirmation = (invitationId, studentName) => {
    setAlertInfo({ isOpen: true, invitationId, studentName });
  };

  const onHandleCancel = () => {
    const { invitationId } = alertInfo;
    if (!invitationId) return;
    cancelInviteMutation.mutate(invitationId);
  };

  if (!invitations || invitations.length === 0) {
    return (
      <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
              <MailOpen className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Chưa có lời mời nào được gửi đi.</p>
          </CardContent>
      </Card>
    );
  }

  const pendingInvitations = invitations.filter(inv => inv.TRANGTHAI === 'Đang chờ');

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <MailOpen className="h-5 w-5 text-indigo-500" /> Lời mời đã gửi ({pendingInvitations.length} đang chờ)
          </CardTitle>
          <CardDescription>
             Các lời mời đã gửi. Nếu sinh viên vào nhóm khác, trạng thái sẽ tự động chuyển thành "Từ chối".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {invitations.map(inv => {
            const isProcessing = cancelInviteMutation.isPending && cancelInviteMutation.variables === inv.ID_LOIMOI;
            const isPending = inv.TRANGTHAI === 'Đang chờ';

            return (
              <div key={inv.ID_LOIMOI} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md bg-white hover:bg-slate-50 transition-colors gap-3">
                <div className='flex items-center gap-3'>
                  <Avatar className="h-9 w-9 border">
                    <AvatarFallback className="bg-indigo-50 text-indigo-700 text-xs font-bold">
                        {getInitials(inv.nguoiduocmoi.HODEM_VA_TEN)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{inv.nguoiduocmoi.HODEM_VA_TEN}</p>
                    <p className="text-xs text-muted-foreground">
                        {inv.nguoiduocmoi.sinhvien?.chuyennganh?.TEN_CHUYENNGANH || inv.nguoiduocmoi.MA_DINHDANH}
                    </p>
                    {inv.LOINHAN && <p className="text-xs italic text-muted-foreground mt-0.5">"{inv.LOINHAN}"</p>}
                  </div>
                </div>

                <div className="flex gap-2 self-end sm:self-center">
                  {/* LOGIC CHÍNH: Chỉ hiển thị nút hủy khi Đang chờ VÀ Là Nhóm trưởng */}
                  {isPending && isLeader ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => openConfirmation(inv.ID_LOIMOI, inv.nguoiduocmoi.HODEM_VA_TEN)} 
                      disabled={isProcessing}
                      className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    >
                      {isProcessing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <X className="mr-2 h-3.5 w-3.5" />}
                      Hủy mời
                    </Button>
                  ) : (
                    // Nếu không phải leader hoặc không đang chờ, hiển thị Badge trạng thái
                    <StatusBadge status={inv.TRANGTHAI} />
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <AlertDialog open={alertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertInfo(prev => ({ ...prev, isOpen: false }))}>
        <AlertDialogContent aria-labelledby={alertTitleId} aria-describedby={alertDescriptionId}>
          <AlertDialogHeader>
            <AlertDialogTitle id={alertTitleId}>Xác nhận Hủy Lời mời</AlertDialogTitle>
            <AlertDialogDescription id={alertDescriptionId}>
              Bạn có chắc chắn muốn hủy lời mời đã gửi cho <strong>{alertInfo.studentName}</strong> không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelInviteMutation.isPending}>Không</AlertDialogCancel>
            <AlertDialogAction 
              onClick={onHandleCancel} 
              disabled={cancelInviteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelInviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận Hủy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}