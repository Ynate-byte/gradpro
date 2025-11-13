import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2, LayoutDashboard } from 'lucide-react'; // Gỡ bỏ LayoutDashboard
import { useAuth } from '@/contexts/AuthContext';
import { InviteMemberDialog } from './InviteMemberDialog';
import { SentInvitationsList } from './SentInvitationsList';
// import { leaveGroup } from '@/api/groupService'; // (Gỡ bỏ nếu không dùng)
// import { toast } from 'sonner';
// import { AlertDialog, ... } from "@/components/ui/alert-dialog"; // (Gỡ bỏ nếu không dùng)
// import { useMutation, useQueryClient } from '@tanstack/react-query'; // (Gỡ bỏ nếu không dùng)
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JoinRequests } from './JoinRequests';
// import { KanbanBoard } from './KanbanBoard'; // <-- [GỠ BỎ]
// import './Kanban.css'; // <-- [GỠ BỎ]

export function GroupManagementView({ groupData, planId }) {
  const { user } = useAuth();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const isLeader = user?.ID_NGUOIDUNG === groupData.ID_NHOMTRUONG;
  const phancong = groupData.phancong_detai_nhom;
  const hasTopic = phancong && phancong.detai;

  return (
    <>
      {/* ===== [SỬA ĐỔI] Gỡ bỏ Tab "Công việc" ===== */}
      <Tabs defaultValue="members" className="w-full">
        {/* Chỉ hiển thị Tabs nếu chưa có đề tài */}
        { !hasTopic ? (
          <TabsList className="grid w-full grid-cols-1"> {/* Chỉ còn 1 Tab */}
            <TabsTrigger value="members">Thành viên & Quản lý</TabsTrigger>
          </TabsList>
        ) : (
            <CardHeader>
                <CardTitle>Quản lý nhóm</CardTitle>
                <CardDescription>Nhóm đã đăng ký đề tài. Mọi thay đổi thành viên phải do Admin/Giáo vụ thực hiện.</CardDescription>
            </CardHeader>
        )}


        <TabsContent value="members" className="mt-6 space-y-6">
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
          {!isLeader && !hasTopic && (
            <Card>
              <CardHeader><CardTitle>Bảng điều khiển</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Chỉ nhóm trưởng mới có thể quản lý thành viên.</p>
              </CardContent>
            </Card>
          )}
          {/* Gỡ bỏ Card "Đã có đề tài" vì nó đã được hiển thị ở trên */}
        </TabsContent>
      </Tabs>
      {/* ===== [KẾT THÚC SỬA ĐỔI] ===== */}


      {/* Dialog mời thành viên (Giữ nguyên) */}
      <InviteMemberDialog
        isOpen={isInviteOpen}
        setIsOpen={setIsInviteOpen}
        groupId={groupData.ID_NHOM}
        planId={planId}
        groupData={groupData}
      />
    </>
  );
}