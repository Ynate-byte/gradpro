import React, { useState, useId } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MailOpen, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cancelInvitation } from '@/api/groupService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge'; // <-- THÊM MỚI
import { cn } from '@/lib/utils'; // <-- THÊM MỚI

// --- THÊM MỚI: Component hiển thị Trạng thái ---
const StatusBadge = ({ status }) => {
  const statusMap = {
    'Chấp nhận': 'bg-green-100 text-green-800',
    'Từ chối': 'bg-red-100 text-red-800',
    'Đã hủy': 'bg-zinc-100 text-zinc-600',
    'Hết hạn': 'bg-yellow-100 text-yellow-800',
  };
  const className = statusMap[status] || 'bg-gray-100 text-gray-800';
  return (
    <Badge className={cn("text-xs font-medium", className)}>
      {status}
    </Badge>
  );
};
// --- KẾT THÚC THÊM MỚI ---

// Hàm getInitials (Không đổi)
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Component hiển thị danh sách lời mời đã gửi (của nhóm trưởng)
export function SentInvitationsList({ invitations, groupId, planId }) {
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, invitationId: null, studentName: '' });
  const alertTitleId = useId();
  const alertDescriptionId = useId();
  const queryClient = useQueryClient();

  // ... (useMutation - không đổi)
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
      <p className="text-sm text-muted-foreground text-center py-2">Chưa có lời mời nào được gửi đi.</p>
    );
  }

  const pendingInvitations = invitations.filter(inv => inv.TRANGTHAI === 'Đang chờ');

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <MailOpen /> Lời mời đã gửi ({pendingInvitations.length} đang chờ)
          </CardTitle>
          <CardDescription>Các lời mời đã gửi và trạng thái của chúng.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {invitations.map(inv => {
            const isProcessing = cancelInviteMutation.isPending && cancelInviteMutation.variables === inv.ID_LOIMOI;
            const isPending = inv.TRANGTHAI === 'Đang chờ';

            return (
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

                {/* --- SỬA ĐỔI: Hiển thị Nút hoặc Trạng thái --- */}
                {isPending ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isProcessing}
                    onClick={() => openConfirmation(inv.ID_LOIMOI, inv.nguoiduocmoi.HODEM_VA_TEN)}
                    className="h-8 text-xs"
                  >
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                    Hủy lời mời
                  </Button>
                ) : (
                  <StatusBadge status={inv.TRANGTHAI} />
                )}
                {/* --- KẾT THÚC SỬA ĐỔI --- */}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* ... (AlertDialog - không đổi) ... */}
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
};