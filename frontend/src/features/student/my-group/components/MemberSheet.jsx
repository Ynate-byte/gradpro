import React, { useState, useId } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Crown, LogOut, Info, Loader2, RefreshCw, CheckCircle, MoreHorizontal, Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { transferGroupLeadership } from '@/api/groupService';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Hàm getInitials (Không đổi)
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

export function MemberSheet({ groupData, planId, isLeader, hasTopic, onLeaveGroup }) {
  const { user } = useAuth();
  const [transferTarget, setTransferTarget] = useState(null);
  const transferTitleId = useId();
  const transferDescriptionId = useId();
  const queryClient = useQueryClient();

  // Mutation cho việc Chuyển quyền
  const transferMutation = useMutation({
    mutationFn: (newLeaderId) => transferGroupLeadership(groupData.ID_NHOM, newLeaderId),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['myGroupDetails', planId] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Chuyển quyền thất bại.");
    },
    onSettled: () => {
      setTransferTarget(null);
    }
  });

  const handleTransferLeadership = () => {
    if (!transferTarget) return;
    transferMutation.mutate(transferTarget.userId);
  };

  return (
    <Sheet>
      {/* Card Thông tin nhóm (Trigger) */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin nhóm</CardTitle>
          {hasTopic && (
            <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              <CheckCircle className="mr-2 h-4 w-4" /> Đã đăng ký đề tài
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <Users className="mr-2 h-4 w-4" />
              Xem Thành viên ({groupData.SO_THANHVIEN_HIENTAI}/4)
            </Button>
          </SheetTrigger>
          
          <div className="pt-4 border-t">
            <h4 className="font-semibold text-lg">{groupData.TEN_NHOM}</h4>
            <p className="text-sm text-muted-foreground flex items-start gap-2 pt-1">
              <Info className="h-4 w-4 mt-1 shrink-0" /> {groupData.MOTA || "Nhóm chưa có mô tả."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Nội dung Sheet (Danh sách thành viên) */}
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Danh sách thành viên</SheetTitle>
          <SheetDescription>
            {groupData.TEN_NHOM} ({groupData.SO_THANHVIEN_HIENTAI}/4)
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-2">
          {groupData.thanhviens.map(member => (
            <div key={member.ID_NGUOIDUNG} className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-4">
                <Avatar><AvatarFallback>{getInitials(member.nguoidung.HODEM_VA_TEN)}</AvatarFallback></Avatar>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {member.nguoidung.HODEM_VA_TEN}
                    {member.ID_NGUOIDUNG === groupData.ID_NHOMTRUONG && (
                      <Badge variant="destructive" className="gap-1 text-xs px-1.5 py-0.5">
                        <Crown className="h-3 w-3" />Trưởng nhóm
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{member.nguoidung.EMAIL}</p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isLeader && member.ID_NGUOIDUNG !== user.ID_NGUOIDUNG && !hasTopic && (
                    <DropdownMenuItem onClick={() => setTransferTarget({ userId: member.ID_NGUOIDUNG, userName: member.nguoidung.HODEM_VA_TEN })}>
                      <RefreshCw className="mr-2 h-4 w-4 text-amber-600" />
                      Chuyển quyền trưởng nhóm
                    </DropdownMenuItem>
                  )}
                  
                  {member.ID_NGUOIDUNG === user.ID_NGUOIDUNG && !hasTopic && (
                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={onLeaveGroup}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Rời nhóm
                    </DropdownMenuItem>
                  )}
                  {hasTopic && (
                    <DropdownMenuItem disabled>Đã chốt nhóm (có đề tài)</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </SheetContent>

      {/* Dialog Chuyển quyền (Nằm bên trong Sheet) */}
      <AlertDialog open={!!transferTarget} onOpenChange={(open) => !open && setTransferTarget(null)}>
        <AlertDialogContent aria-labelledby={transferTitleId} aria-describedby={transferDescriptionId}>
          <AlertDialogHeader>
            <AlertDialogTitle id={transferTitleId}>Xác nhận chuyển quyền Trưởng nhóm?</AlertDialogTitle>
            <AlertDialogDescription id={transferDescriptionId}>
              Bạn có chắc chắn muốn chuyển quyền trưởng nhóm cho <strong>{transferTarget?.userName}</strong>? Bạn sẽ trở thành thành viên bình thường.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={transferMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransferLeadership} disabled={transferMutation.isPending}>
              {transferMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xác nhận Chuyển quyền
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}