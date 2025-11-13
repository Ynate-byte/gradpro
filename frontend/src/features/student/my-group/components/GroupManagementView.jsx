import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2 } from 'lucide-react'; // <-- Gỡ bỏ LogOut, CalendarDays
import { useAuth } from '@/contexts/AuthContext';
import { InviteMemberDialog } from './InviteMemberDialog';
import { SentInvitationsList } from './SentInvitationsList';
// import { leaveGroup } from '@/api/groupService'; // <-- Gỡ bỏ nếu không dùng
import { toast } from 'sonner';
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
// import { SubmissionArea } from './SubmissionArea'; // <-- Gỡ bỏ
// import { useMutation, useQueryClient } from '@tanstack/react-query'; // <-- Gỡ bỏ
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // <-- [SẼ GỠ BỎ]
import { JoinRequests } from './JoinRequests';
// import { MeetingArea } from './MeetingArea'; // <-- Gỡ bỏ

export function GroupManagementView({ groupData, planId }) {
  const { user } = useAuth();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  // const [isLeaveAlertOpen, setIsLeaveAlertOpen] = useState(false); // Gỡ bỏ nếu không dùng
  const isLeader = user?.ID_NGUOIDUNG === groupData.ID_NHOMTRUONG;
  const phancong = groupData.phancong_detai_nhom;
  const hasTopic = phancong && phancong.detai;

  // const queryClient = useQueryClient(); // Gỡ bỏ nếu không dùng
  
  // (Gỡ bỏ leaveMutation nếu không dùng nút Rời nhóm ở đây)

  return (
    <>
      {/* ===== [SỬA ĐỔI] Gỡ bỏ Tabs ===== */}
      {/* Chỉ hiển thị Card quản lý khi là Nhóm trưởng VÀ chưa có đề tài */}
      {isLeader && !hasTopic && (
        <Card>
          <CardHeader>
            <CardTitle>Bảng điều khiển Nhóm trưởng</CardTitle>
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

      {/* Hiển thị cho thành viên (không phải trưởng nhóm) VÀ chưa có đề tài */}
      {!isLeader && !hasTopic && (
        <Card>
          <CardHeader><CardTitle>Bảng điều khiển</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Chỉ nhóm trưởng mới có thể quản lý thành viên.</p>
          </CardContent>
        </Card>
      )}

      {/* Hiển thị khi đã có đề tài */}
      {hasTopic && (
        <Card>
          <CardHeader><CardTitle>Quản lý nhóm</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Nhóm đã đăng ký đề tài. Mọi thay đổi thành viên phải do Admin/Giáo vụ thực hiện.</p>
          </CardContent>
        </Card>
      )}
      {/* ===== [KẾT THÚC SỬA ĐỔI] ===== */}


      {/* Dialog mời thành viên (Giữ nguyên) */}
      <InviteMemberDialog
        isOpen={isInviteOpen}
        setIsOpen={setIsInviteOpen}
        groupId={groupData.ID_NHOM}
        planId={planId}
        groupData={groupData}
      />

      {/* (Gỡ bỏ Dialog rời nhóm nếu không cần thiết ở đây) */}
    </>
  );
}