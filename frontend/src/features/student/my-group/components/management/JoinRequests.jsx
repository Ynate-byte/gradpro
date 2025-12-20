import React, { useState, useId } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, UserCheck, UserX, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { handleJoinRequest } from '@/api/groupService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

const StatusBadge = ({ status }) => {
  const statusMap = {
    'Chấp nhận': 'bg-green-100 text-green-800 hover:bg-green-100',
    'Từ chối': 'bg-red-100 text-red-800 hover:bg-red-100',
    'Đã hủy': 'bg-gray-100 text-gray-500 hover:bg-gray-100 border-gray-200 line-through', // Style cho Đã hủy
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
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

export function JoinRequests({ requests, groupId, planId, isLeader }) {
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, action: null, requestId: null, studentName: '' });
  const alertTitleId = useId();
  const alertDescriptionId = useId();
  const queryClient = useQueryClient();

  const handleRequestMutation = useMutation({
    mutationFn: ({ requestId, action }) => handleJoinRequest(groupId, requestId, action),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['myGroupDetails', planId] });
      queryClient.invalidateQueries({ queryKey: ['group-history', groupId] });
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
       <Card className="mb-6 border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Chưa có yêu cầu xin gia nhập nào.</p>
          </CardContent>
       </Card>
    );
  }

  const pendingRequests = requests.filter(r => r.TRANGTHAI === 'Đang chờ');

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                Yêu cầu xin gia nhập ({pendingRequests.length} đang chờ)
            </CardTitle>
            <CardDescription>
                Sinh viên muốn tham gia nhóm của bạn. Chỉ nhóm trưởng mới có quyền chấp nhận/từ chối.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
            {requests.map(req => {
                const isProcessing = handleRequestMutation.isPending && handleRequestMutation.variables?.requestId === req.ID_YEUCAU;
                const isPending = req.TRANGTHAI === 'Đang chờ';

                return (
                <div key={req.ID_YEUCAU} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md bg-white hover:bg-slate-50 transition-colors gap-3">
                    <div className='flex items-center gap-3'>
                    <Avatar className="h-9 w-9 border">
                        <AvatarFallback className="bg-green-50 text-green-700 text-xs font-bold">
                            {getInitials(req.nguoidung.HODEM_VA_TEN)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold text-sm">{req.nguoidung.HODEM_VA_TEN}</p>
                        <p className="text-xs text-muted-foreground">
                        {req.nguoidung.sinhvien?.chuyennganh?.TEN_CHUYENNGANH ?? req.nguoidung.MA_DINHDANH}
                        </p>
                        {req.LOINHAN && (
                        <p className="text-xs italic text-muted-foreground mt-0.5">"{req.LOINHAN}"</p>
                        )}
                    </div>
                    </div>

                    <div className="flex gap-2 self-end sm:self-center">
                    {/* LOGIC CHÍNH: Chỉ hiện nút thao tác khi Đang chờ VÀ Là nhóm trưởng */}
                    {isPending && isLeader ? (
                        <div className="flex gap-2">
                        <TooltipProvider>
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                size="icon"
                                className="h-8 w-8 bg-green-600 hover:bg-green-700"
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
                        </TooltipProvider>
                        </div>
                    ) : (
                        // Nếu không phải đang chờ hoặc không phải leader, hiện badge trạng thái
                        <StatusBadge status={req.TRANGTHAI} />
                    )}
                    </div>
                </div>
                );
            })}
        </CardContent>
      </Card>

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
            <AlertDialogCancel disabled={handleRequestMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={onHandle} disabled={handleRequestMutation.isPending} className={alertInfo.action === 'decline' ? "bg-destructive hover:bg-destructive/90" : ""}>
              {handleRequestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}