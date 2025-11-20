import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, PlusCircle, Search, Lock, AlertCircle } from 'lucide-react';
import { CreateGroupDialog } from './CreateGroupDialog';
import { PendingInvitationsList } from './PendingInvitationsList';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, parseISO } from 'date-fns';

export function NoGroupView({ invitations, plan }) { 
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();

  const planName = plan?.TEN_DOT || "đợt này";
  const planId = plan?.ID_KEHOACH;

  const isCreateGroupEnabled = useFeatureFlag(plan, 'SV_TAO_NHOM');

  return (
    <div className="space-y-6">
      
      {/* [GIAO DIỆN MỚI] Hiển thị thông báo nếu chức năng đóng */}
      {!isCreateGroupEnabled && plan && (
        <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertTitle className="ml-2 font-semibold">Chức năng tạo nhóm đang đóng</AlertTitle>
          <AlertDescription className="ml-2 text-sm">
            Hiện tại không phải là thời gian cho phép sinh viên tự tạo nhóm mới. 
            {plan.SETTINGS?.SV_TAO_NHOM?.start && (
               <span> Thời gian mở dự kiến: <strong>{format(parseISO(plan.SETTINGS.SV_TAO_NHOM.start), 'dd/MM/yyyy HH:mm')}</strong></span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Bạn chưa có nhóm cho đợt "{planName}"
          </CardTitle>
          <CardDescription>
            Hãy tạo một nhóm mới để bắt đầu hoặc tìm kiếm một nhóm có sẵn để tham gia trong đợt này.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          {/* [LOGIC MỚI] Disable nút nếu feature flag tắt */}
          <Button 
            onClick={() => setIsCreateDialogOpen(true)} 
            disabled={!planId || !isCreateGroupEnabled}
            className={!isCreateGroupEnabled ? "opacity-80 cursor-not-allowed bg-gray-400 hover:bg-gray-400" : ""}
          >
            {isCreateGroupEnabled ? (
                <>
                    <PlusCircle className="mr-2 h-4 w-4" /> Tạo nhóm mới
                </>
            ) : (
                <>
                    <Lock className="mr-2 h-4 w-4" /> Đã khóa tạo nhóm
                </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => planId && navigate(`/projects/find-group?plan_id=${planId}`)}
            disabled={!planId}
          >
            <Search className="mr-2 h-4 w-4" /> Tìm kiếm nhóm
          </Button>
        </CardContent>
      </Card>

      {invitations && invitations.length > 0 && (
        <PendingInvitationsList
          invitations={invitations}
          planId={planId}
        />
      )}

      {planId && (
          <CreateGroupDialog
            isOpen={isCreateDialogOpen}
            setIsOpen={setIsCreateDialogOpen}
            planId={planId}
          />
      )}
    </div>
  );
}