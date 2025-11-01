import React, { useState, useId } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Crown, UserPlus, LogOut, Info, UserCheck, UserX, Loader2, RefreshCw, CheckCircle, MoreHorizontal, FileText, ClipboardList,
  Users, UploadCloud
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InviteMemberDialog } from './InviteMemberDialog';
import { SentInvitationsList } from './SentInvitationsList';
import { handleJoinRequest, leaveGroup } from '@/api/groupService';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SubmissionArea } from './SubmissionArea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemberSheet } from './MemberSheet';
import { cn } from '@/lib/utils';

// Component con: Hiển thị Trạng thái
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

// Component con: Lấy chữ cái đầu
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

// Component con: Xử lý Yêu cầu (Đã nâng cấp)
const JoinRequests = ({ requests, groupId, planId }) => {
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, action: null, requestId: null, studentName: '' });
  const alertTitleId = useId();
  const alertDescriptionId = useId();
  const queryClient = useQueryClient();

  // Mutation xử lý yêu cầu
  const handleRequestMutation = useMutation({
    mutationFn: ({ requestId, action }) => handleJoinRequest(groupId, requestId, action),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['myGroupDetails', planId] });
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

  if (!requests || requests.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-2">Chưa có yêu cầu nào.</p>
  );

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
                <Avatar className="h-9 w-9"><AvatarFallback>{getInitials(req.nguoidung.HODEM_VA_TEN)}</AvatarFallback></Avatar>
                <div>
                  <p className="font-semibold text-sm">{req.nguoidung.HODEM_VA_TEN}</p>
                  <p className="text-xs text-muted-foreground">{req.nguoidung.sinhvien?.chuyennganh?.TEN_CHUYENNGANH ?? req.nguoidung.MA_DINHDANH}</p>
                  {req.LOINHAN && <p className="text-xs italic text-muted-foreground mt-1">"{req.LOINHAN}"</p>}
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
          )
        })}
      </div>
      <AlertDialog open={alertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertInfo(prev => ({ ...prev, isOpen: false }))}>
        <AlertDialogContent aria-labelledby={alertTitleId} aria-describedby={alertDescriptionId}>
          <AlertDialogHeader>
            <AlertDialogTitle id={alertTitleId}>Xác nhận {alertInfo.action === 'accept' ? 'chấp nhận' : 'từ chối'}?</AlertDialogTitle>
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
};

// Component con: Chi tiết Đề tài
const TopicDetailsCard = ({ phancong }) => {
  const detai = phancong.detai;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{detai.TEN_DETAI}</CardTitle>
        <CardDescription>
          Mã đề tài: {detai.MA_DETAI || 'N/A'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold">Giảng viên hướng dẫn</h4>
          <p className="text-muted-foreground">{detai.nguoi_dexuat?.nguoidung?.HODEM_VA_TEN || 'Chưa rõ'}</p>
        </div>
        <div>
          <h4 className="font-semibold">Mô tả</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{detai.MOTA}</p>
        </div>
        <div>
          <h4 className="font-semibold">Yêu cầu</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{detai.YEUCAU || 'Không có'}</p>
        </div>
        <div>
          <h4 className="font-semibold">Kết quả mong đợi</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{detai.KETQUA_MONGDOI || 'Không có'}</p>
        </div>
      </CardContent>
    </Card>
  )
}


// Component chính
export function GroupManagementView({ groupData, planId }) {
  const { user } = useAuth();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isLeaveAlertOpen, setIsLeaveAlertOpen] = useState(false);

  const isLeader = user?.ID_NGUOIDUNG === groupData.ID_NHOMTRUONG;
  const phancong = groupData.phancong_detai_nhom;
  const hasTopic = phancong && phancong.detai;

  const leaveTitleId = useId();
  const leaveDescriptionId = useId();

  const queryClient = useQueryClient();

  // Mutation cho việc Rời nhóm
  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(planId),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['myGroupDetails', planId] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Rời nhóm thất bại.");
    },
    onSettled: () => {
      setIsLeaveAlertOpen(false);
    }
  });
  
  const handleLeaveGroup = () => {
    leaveMutation.mutate();
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="members"><Users className="mr-2 h-4 w-4" />Thành viên & Quản lý</TabsTrigger>
          <TabsTrigger value="submission" disabled={!hasTopic}><UploadCloud className="mr-2 h-4 w-4" />Nộp sản phẩm</TabsTrigger>
          <TabsTrigger value="topic" disabled={!hasTopic}><ClipboardList className="mr-2 h-4 w-4" />Thông tin Đề tài</TabsTrigger>
        </TabsList>

        {/* Tab 1: Thành viên & Quản lý */}
        <TabsContent value="members" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Khu vực chính (Bảng điều khiển) */}
            <div className="lg:col-span-2 space-y-6">
              {isLeader && !hasTopic && (
                <Card className="border-primary shadow-md">
                  <CardHeader>
                    <CardTitle>Bảng điều khiển</CardTitle>
                    <CardDescription>Quản lý lời mời và yêu cầu.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button onClick={() => setIsInviteOpen(true)} className="w-full">
                      <UserPlus className="mr-2 h-4 w-4" /> Mời thành viên
                    </Button>
                    <div className="space-y-4 pt-4 border-t">
                      <JoinRequests
                        requests={groupData.yeucaus}
                        groupId={groupData.ID_NHOM}
                        planId={planId}
                      />
                    </div>
                    <div className="space-y-4 pt-4 border-t">
                      <SentInvitationsList
                        invitations={groupData.loimois}
                        groupId={groupData.ID_NHOM}
                        planId={planId}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
              {!isLeader && (
                <Card>
                  <CardHeader>
                    <CardTitle>Bảng điều khiển</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Chỉ nhóm trưởng mới có thể mời thành viên và quản lý yêu cầu.</p>
                  </CardContent>
                </Card>
              )}
              {!hasTopic && (
                <Card>
                  <CardHeader>
                    <CardTitle>Hành động Nguy hiểm</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="destructive"
                      onClick={() => setIsLeaveAlertOpen(true)}
                      className="w-full"
                      hidden={isLeader}
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Rời nhóm
                    </Button>
                    {isLeader && (
                      <p className="text-sm text-muted-foreground text-center">
                        Bạn phải chuyển quyền trưởng nhóm (trong danh sách thành viên) trước khi rời nhóm.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar (Render component MemberSheet mới) */}
            <div className="lg:col-span-1 space-y-6">
              <MemberSheet
                groupData={groupData}
                planId={planId}
                isLeader={isLeader}
                hasTopic={hasTopic}
                onLeaveGroup={() => setIsLeaveAlertOpen(true)}
              />
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Nộp sản phẩm (Không đổi) */}
        <TabsContent value="submission" className="mt-6">
          <SubmissionArea
            phancong={phancong}
            planId={planId}
          />
        </TabsContent>

        {/* Tab 3: Thông tin Đề tài (Không đổi) */}
        <TabsContent value="topic" className="mt-6">
          {hasTopic ? (
            <TopicDetailsCard phancong={phancong} />
          ) : (
            <p className="text-muted-foreground text-center p-8">Nhóm của bạn chưa đăng ký đề tài.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* --- SỬA ĐỔI CHÍNH Ở ĐÂY --- */}
      <InviteMemberDialog
        isOpen={isInviteOpen}
        setIsOpen={setIsInviteOpen}
        groupId={groupData.ID_NHOM}
        planId={planId}
        groupData={groupData} // <-- TRUYỀN groupData VÀO ĐÂY
      />
      {/* --- KẾT THÚC SỬA ĐỔI --- */}


      {/* Dialog Rời nhóm (Không đổi) */}
      <AlertDialog open={isLeaveAlertOpen} onOpenChange={setIsLeaveAlertOpen}>
        <AlertDialogContent aria-labelledby={leaveTitleId} aria-describedby={leaveDescriptionId}>
          <AlertDialogHeader>
            <AlertDialogTitle id={leaveTitleId}>Xác nhận rời nhóm?</AlertDialogTitle>
            <AlertDialogDescription id={leaveDescriptionId}>
              {isLeader && groupData.SO_THANHVIEN_HIENTAI > 1
                ? "Bạn là nhóm trưởng và không thể rời đi khi nhóm còn thành viên. Vui lòng chuyển quyền trưởng nhóm trước."
                : "Bạn có chắc chắn muốn rời khỏi nhóm này không? Hành động này không thể hoàn tác."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              disabled={leaveMutation.isPending || (isLeader && groupData.SO_THANHVIEN_HIENTAI > 1)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {leaveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}