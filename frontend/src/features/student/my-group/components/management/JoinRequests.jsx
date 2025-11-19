import React, { useState, useId } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { handleJoinRequest } from '@/api/groupService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

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

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

export function JoinRequests({ requests, groupId, planId }) {
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, action: null, requestId: null, studentName: '' });
  const alertTitleId = useId();
  const alertDescriptionId = useId();
  const queryClient = useQueryClient();

  const handleRequestMutation = useMutation({
    mutationFn: ({ requestId, action }) => handleJoinRequest(groupId, requestId, action),
    onSuccess: (res) => {
      toast.success(res.message);
      // [FIX] Làm mới cả thông tin nhóm VÀ lịch sử hoạt động
      queryClient.invalidateQueries({ queryKey: ['myGroupDetails', planId] });
      queryClient.invalidateQueries({ queryKey: ['group-history', groupId] }); // <--- THÊM DÒNG NÀY
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Thao tác thất bại.');
    },
    onSettled: () => {
      setAlertInfo({ isOpen: false, action: null, requestId: null, studentName: '' });
    }
  });

  const openConfirmation = (action, requestId, studentName) => {
    setAlertInfo({ isOpen: true, action, requestId, studentName });
  };

  const onHandle = () => {
    const { action, requestId } = alertInfo;
    if (!action || !requestId) return;
    handleRequestMutation.mutate({ requestId, action });
  };

  if (!requests || requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-2">Chưa có yêu cầu nào.</p>
    );
  }

  const pendingRequests = requests.filter(r => r.TRANGTHAI === 'Đang chờ');

  return (
    <>
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Yêu cầu xin gia nhập ({pendingRequests.length} đang chờ)</h4>
        {requests.map(req => {
          const isProcessing = handleRequestMutation.isPending && handleRequestMutation.variables?.requestId === req.ID_YEUCAU;
          const isPending = req.TRANGTHAI === 'Đang chờ';

          return (
            <div key={req.ID_YEUCAU} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
              <div className='flex items-center gap-3'>
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{getInitials(req.nguoidung.HODEM_VA_TEN)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{req.nguoidung.HODEM_VA_TEN}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.nguoidung.sinhvien?.chuyennganh?.TEN_CHUYENNGANH ?? req.nguoidung.MA_DINHDANH}
                  </p>
                  {req.LOINHAN && (
                    <p className="text-xs italic text-muted-foreground mt-1">"{req.LOINHAN}"</p>
                  )}
                </div>
              </div>

              {isPending ? (
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        className="h-8 w-8"
                        disabled={isProcessing}
                        onClick={() => openConfirmation('accept', req.ID_YEUCAU, req.nguoidung.HODEM_VA_TEN)}
                      >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Chấp nhận</p></TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8"
                        disabled={isProcessing}
                        onClick={() => openConfirmation('decline', req.ID_YEUCAU, req.nguoidung.HODEM_VA_TEN)}
                      >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Từ chối</p></TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <StatusBadge status={req.TRANGTHAI} />
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={alertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertInfo(prev => ({ ...prev, isOpen: false }))}>
        <AlertDialogContent aria-labelledby={alertTitleId} aria-describedby={alertDescriptionId}>
          <AlertDialogHeader>
            <AlertDialogTitle id={alertTitleId}>
              Xác nhận {alertInfo.action === 'accept' ? 'chấp nhận' : 'từ chối'}?
            </AlertDialogTitle>
            <AlertDialogDescription id={alertDescriptionId}>
              Bạn có chắc chắn muốn {alertInfo.action === 'accept' ? 'chấp nhận' : 'từ chối'} yêu cầu tham gia của <strong>{alertInfo.studentName}</strong> không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={onHandle} disabled={handleRequestMutation.isPending}>
              {handleRequestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}