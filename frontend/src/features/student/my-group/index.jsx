import React, { useState, useEffect } from 'react';
import { getMyGroup, getPendingInvitations, getMyActivePlans, transferGroupLeadership } from '@/api/groupService';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookCopy, Users, CheckCircle, AlertTriangle, Crown, Phone, Mail,
  AlertCircle, RefreshCw, Loader2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NoGroupView } from './components/NoGroupView';
import { GroupManagementView } from './components/GroupManagementView';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
// <-- GỠ BỎ Tooltip imports
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleComponent
} from "@/components/ui/alert-dialog";
import { TopicDetailsDialog } from './components/TopicDetailsDialog';
import { useAuth } from '@/contexts/AuthContext';
// <-- Gỡ bỏ 'cn' nếu không dùng ở đâu khác (nhưng ta vẫn dùng)
import { cn } from '@/lib/utils';


const LoadingSkeleton = () => (
  // ... (Không đổi)
  <div className="space-y-6">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-32 w-full" />
  </div>
);

const getInitials = (name) => {
  // ... (Không đổi)
  if (!name) return '?';
  const parts = name.split(' ');
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

export default function MyGroupPage() {
  const { user } = useAuth();
  const [selectedPlanIdForDisplay, setSelectedPlanIdForDisplay] = useState('');
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const [transferAlertInfo, setTransferAlertInfo] = useState({ isOpen: false, member: null });

  // ... (Các Hooks useQuery, useMutation, useEffect không đổi) ...
  const {
    data: activePlans,
    isLoading: isLoadingPlans,
  } = useQuery({
    queryKey: ['myActivePlans'],
    queryFn: getMyActivePlans,
    staleTime: 5 * 60 * 1000,
    onError: () => toast.error('Lỗi khi tải danh sách kế hoạch.'),
  });

  const {
    data: groupDetails,
    isLoading: isLoadingGroup,
  } = useQuery({
    queryKey: ['myGroupDetails', selectedPlanIdForDisplay],
    queryFn: async () => {
      const params = { plan_id: selectedPlanIdForDisplay };
      const plan = activePlans.find(p => String(p.ID_KEHOACH) === selectedPlanIdForDisplay);
      const groupRes = await getMyGroup(params);
      if (groupRes.has_group) {
        return { groupData: groupRes.group_data, invitations: [], plan };
      } else {
        const invitationsRes = await getPendingInvitations(params);
        return { groupData: null, invitations: invitationsRes, plan };
      }
    },
    enabled: !!selectedPlanIdForDisplay && !!activePlans,
    onError: () => toast.error('Lỗi tải dữ liệu nhóm.'),
  });

  useEffect(() => {
    if (activePlans && activePlans.length > 0 && !selectedPlanIdForDisplay) {
      setSelectedPlanIdForDisplay(String(activePlans[0].ID_KEHOACH));
    }
  }, [activePlans, selectedPlanIdForDisplay]);

  const transferMutation = useMutation({
    mutationFn: (memberId) => transferGroupLeadership(groupDetails?.groupData?.ID_NHOM, memberId),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['myGroupDetails', selectedPlanIdForDisplay] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Chuyển quyền thất bại."),
    onSettled: () => setTransferAlertInfo({ isOpen: false, member: null }),
  });

  const handleTransfer = () => {
    if (!transferAlertInfo.member) return;
    transferMutation.mutate(transferAlertInfo.member.ID_NGUOIDUNG);
  };

  if (isLoadingPlans) return <div className="p-4 md:p-8"><LoadingSkeleton /></div>;

  if (!activePlans?.length) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-8 text-muted-foreground">Chưa tham gia đợt khóa luận nào.</div>
      </div>
    );
  }

  const isEligible = groupDetails?.plan?.sinhvien_thamgias?.[0]?.DU_DIEUKIEN ?? true;
  const hasGroup = !!groupDetails?.groupData;
  const groupData = groupDetails?.groupData;
  const phancong = groupData?.phancong_detai_nhom;
  const hasTopic = !!phancong?.detai;
  const isLeader = user?.ID_NGUOIDUNG === groupData?.ID_NHOMTRUONG;


  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* HEADER: THÔNG TIN NHÓM + KẾ HOẠCH + DANH SÁCH */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* BÊN TRÁI: THÔNG TIN NHÓM + KẾ HOẠCH */}
        <div className="flex-1 space-y-4">

          {/* GIAO DIỆN HIỂN THỊ ĐỀ TÀI */}
          {hasGroup && (
            hasTopic ? (
              <Alert className="bg-green-50 border-green-200 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-100">
                <CheckCircle className="h-4 w-4 !text-green-700 dark:!text-green-300" />
                <AlertTitle
                  onClick={() => setIsTopicDialogOpen(true)}
                  className="font-bold cursor-pointer hover:underline"
                >
                  {phancong.detai.TEN_DETAI}
                </AlertTitle>
                <AlertDescription className="text-green-800 dark:text-green-200">
                  GVHD: {phancong.detai.nguoi_dexuat?.nguoidung?.HODEM_VA_TEN || 'Chưa rõ'}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive" className="bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-100">
                <AlertTriangle className="h-4 w-4 !text-yellow-700 dark:!text-yellow-300" />
                <AlertTitle className="font-bold">Chưa đăng ký đề tài</AlertTitle>
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  Nhóm cần đăng ký đề tài để có thể nộp sản phẩm.
                </AlertDescription>
              </Alert>
            )
          )}

          {/* CHỌN KẾ HOẠCH */}
          <div>
            <label className="text-sm font-medium">Kế hoạch</label>
            <Select value={selectedPlanIdForDisplay} onValueChange={setSelectedPlanIdForDisplay}>
              <SelectTrigger className="w-full sm:w-80 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activePlans.map(plan => (
                  <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                    {plan.TEN_DOT} ({plan.NAMHOC} - HK {plan.HOCKY})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* --- NÂNG CẤP: DANH SÁCH THÀNH VIÊN GỌN HƠN --- */}
        {hasGroup && (
          <div className="lg:w-80 space-y-1">
            {groupData.thanhviens?.map(member => {
              const nguoidung = member.nguoidung;
              const isMemberLeader = member.ID_NGUOIDUNG === groupData.ID_NHOMTRUONG;
              const isSelf = member.ID_NGUOIDUNG === user.ID_NGUOIDUNG;

              return (
                <Popover key={member.ID_NGUOIDUNG}>
                  <PopoverTrigger asChild>
                    {/* GIẢM CHIỀU CAO (py-1.5) VÀ BỎ AVATAR */}
                    <button
                      className={cn(
                        "flex items-center justify-between px-3 py-1.5 hover:bg-muted/50 transition-colors w-full text-left text-sm border rounded-md overflow-hidden bg-card",
                        isMemberLeader && "border-red-500/50" // Highlight nhẹ trưởng nhóm
                      )}
                    >
                      <div className="flex items-center overflow-hidden">
                        {/* AVATAR ĐÃ BỊ GỠ BỎ */}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block text-sm">
                            {nguoidung.HODEM_VA_TEN}
                            {isMemberLeader && <Crown className="inline h-3 w-3 text-red-600 ml-1" />}
                          </span>
                          <span className="text-muted-foreground text-xs">{nguoidung.MA_DINHDANH}</span>
                        </div>
                      </div>
                    </button>
                  </PopoverTrigger>

                  {/* PopoverContent vẫn giữ chi tiết (bao gồm Avatar) */}
                  <PopoverContent className="w-64" align="end">
                    <div className="space-y-3">
                      {/* Thông tin chi tiết */}
                      <div className="flex items-center gap-2">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{getInitials(nguoidung.HODEM_VA_TEN)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{nguoidung.HODEM_VA_TEN}</p>
                          <p className="text-xs text-muted-foreground">{nguoidung.MA_DINHDANH}</p>
                        </div>
                      </div>
                      <Separator />
                      {/* Thông tin liên hệ */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{nguoidung.EMAIL}</span>
                        </div>
                        {nguoidung.SO_DIENTHOAI && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{nguoidung.SO_DIENTHOAI}</span>
                          </div>
                        )}
                      </div>

                      {/* Nút chuyển quyền */}
                      {isLeader && !isSelf && !hasTopic && (
                        <div className="pt-3 border-t mt-3">
                          <Button
                            variant="outline"
                            className="w-full h-8 text-xs"
                            onClick={() => setTransferAlertInfo({ isOpen: true, member: nguoidung })}
                            disabled={transferMutation.isPending}
                          >
                            <RefreshCw className="mr-2 h-3 w-3" /> Chuyển quyền Trưởng nhóm
                          </Button>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        )}
        {/* --- KẾT THÚC NÂNG CẤP --- */}
      </div>

      {/* ALERT */}
      {!isEligible && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Bạn không đủ điều kiện tham gia đợt này.</AlertDescription>
        </Alert>
      )}

      <Separator />

      {/* NỘI DUNG CHÍNH */}
      {isLoadingGroup ? (
        <LoadingSkeleton />
      ) : groupDetails && isEligible ? (
        hasGroup ? (
          <GroupManagementView groupData={groupData} planId={selectedPlanIdForDisplay} />
        ) : (
          <NoGroupView invitations={groupDetails.invitations} plan={groupDetails.plan} />
        )
      ) : (
        <p className="text-muted-foreground text-center py-8">Vui lòng chọn kế hoạch.</p>
      )}

      {/* DIALOG CHI TIẾT ĐỀ TÀI */}
      {hasTopic && (
        <TopicDetailsDialog
          phancong={phancong}
          isOpen={isTopicDialogOpen}
          setIsOpen={setIsTopicDialogOpen}
        />
      )}

      {/* Alert Dialog để xác nhận chuyển quyền */}
      <AlertDialog open={transferAlertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setTransferAlertInfo({ isOpen: false, member: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitleComponent>Xác nhận chuyển quyền Trưởng nhóm?</AlertDialogTitleComponent>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn chuyển quyền trưởng nhóm cho <strong>{transferAlertInfo.member?.HODEM_VA_TEN}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={transferMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransfer} disabled={transferMutation.isPending}>
              {transferMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}