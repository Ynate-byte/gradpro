import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, PlusCircle, Search } from 'lucide-react';
import { CreateGroupDialog } from './CreateGroupDialog';
import { PendingInvitationsList } from './PendingInvitationsList';

// Component hiển thị giao diện khi sinh viên chưa có nhóm
export function NoGroupView({ invitations, plan }) { // <-- Chỉ cần invitations và plan
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users />
            Bạn chưa có nhóm cho đợt "{plan.TEN_DOT}"
          </CardTitle>
          <CardDescription>
            Hãy tạo một nhóm mới để bắt đầu hoặc tìm kiếm một nhóm có sẵn để tham gia trong đợt này.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Tạo nhóm mới
          </Button>
          <Button variant="outline" onClick={() => navigate(`/projects/find-group?plan_id=${plan.ID_KEHOACH}`)}> {/* Nâng cấp: Tự điền plan_id */}
            <Search className="mr-2 h-4 w-4" /> Tìm kiếm nhóm
          </Button>
        </CardContent>
      </Card>

      {/* Hiển thị danh sách lời mời đang chờ nếu có */}
      {invitations && invitations.length > 0 && (
        <PendingInvitationsList
          invitations={invitations}
          planId={plan.ID_KEHOACH} // <-- Truyền planId
        />
      )}

      {/* Dialog tạo nhóm mới */}
      <CreateGroupDialog
        isOpen={isCreateDialogOpen}
        setIsOpen={setIsCreateDialogOpen}
        planId={plan.ID_KEHOACH} // <-- Chỉ cần planId
      />
    </div>
  );
}