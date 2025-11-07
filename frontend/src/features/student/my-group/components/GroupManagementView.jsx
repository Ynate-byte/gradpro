// frontend/src/features/student/my-group/components/GroupManagementView.jsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InviteMemberDialog } from './InviteMemberDialog';
import { SentInvitationsList } from './SentInvitationsList';
import { leaveGroup } from '@/api/groupService';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SubmissionArea } from './SubmissionArea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JoinRequests } from './JoinRequests';

export function GroupManagementView({ groupData, planId }) {
  const { user } = useAuth();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isLeaveAlertOpen, setIsLeaveAlertOpen] = useState(false);
  const isLeader = user?.ID_NGUOIDUNG === groupData.ID_NHOMTRUONG;
  const phancong = groupData.phancong_detai_nhom;
  const hasTopic = phancong && phancong.detai;

  const queryClient = useQueryClient();
  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(planId),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['myGroupDetails', planId] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Rời nhóm thất bại."),
    onSettled: () => setIsLeaveAlertOpen(false),
  });

  const handleLeaveGroup = () => leaveMutation.mutate();

  return (
    <>
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="members">Thành viên & Quản lý</TabsTrigger>
          <TabsTrigger value="submission" disabled={!hasTopic}>Nộp sản phẩm</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6 space-y-6">
          {isLeader && !hasTopic && (
            <Card>
              <CardHeader>
                <CardTitle>Bảng điều khiển</CardTitle>
                <CardDescription>Quản lý lời mời và yêu cầu tham gia.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => setIsInviteOpen(true)} className="w-full">
                  <UserPlus className="mr-2 h-4 w-4" /> Mời thành viên
                </Button>
                <div className="space-y-4 pt-4 border-t">
                  <JoinRequests requests={groupData.yeucaus} groupId={groupData.ID_NHOM} planId={planId} />
                </div>
                <div className="space-y-4 pt-4 border-t">
                  <SentInvitationsList invitations={groupData.loimois} groupId={groupData.ID_NHOM} planId={planId} />
                </div>
              </CardContent>
            </Card>
          )}

          {!isLeader && !hasTopic && (
            <Card>
              <CardHeader><CardTitle>Bảng điều khiển</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Chỉ nhóm trưởng mới có thể quản lý thành viên.</p>
              </CardContent>
            </Card>
          )}

          {hasTopic && (
            <Card>
              <CardHeader><CardTitle>Quản lý nhóm</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Nhóm đã đăng ký đề tài. Mọi thay đổi phải do Admin thực hiện.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="submission" className="mt-6">
          <SubmissionArea phancong={phancong} planId={planId} />
        </TabsContent>
      </Tabs>

      {/* Dialog mời thành viên */}
      <InviteMemberDialog
        isOpen={isInviteOpen}
        setIsOpen={setIsInviteOpen}
        groupId={groupData.ID_NHOM}
        planId={planId}
        groupData={groupData}
      />

      {/* Dialog rời nhóm */}
      {!isLeader && !hasTopic && (
        <AlertDialog open={isLeaveAlertOpen} onOpenChange={setIsLeaveAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận rời nhóm?</AlertDialogTitle>
              <AlertDialogDescription>
                Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={handleLeaveGroup} disabled={leaveMutation.isPending} className="bg-destructive">
                {leaveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Xác nhận
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}