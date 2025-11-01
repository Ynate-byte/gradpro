import React, { useState, useEffect } from 'react';
import { getMyGroup, getPendingInvitations, getMyActivePlans } from '@/api/groupService';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // <-- Thêm CardDescription
import { BookCopy, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NoGroupView } from './components/NoGroupView';
import { GroupManagementView } from './components/GroupManagementView';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator'; // <-- THÊM MỚI

// Component hiển thị khung xương tải dữ liệu (Không đổi)
const LoadingSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-10 w-1/3" />
    <div className="p-6 border rounded-lg space-y-4">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-3/4" />
    </div>
  </div>
);

// Component chính quản lý trang Nhóm của tôi
export default function MyGroupPage() {
  const [selectedPlanIdForDisplay, setSelectedPlanIdForDisplay] = useState('');

  // Query 1: Tải danh sách kế hoạch đang hoạt động
  const {
    data: activePlans,
    isLoading: isLoadingPlans,
    isError: isErrorPlans,
  } = useQuery({
    queryKey: ['myActivePlans'],
    queryFn: getMyActivePlans,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    onError: () => {
      toast.error('Lỗi khi tải danh sách kế hoạch đang tham gia.');
    },
  });

  // Query 2: Tải dữ liệu nhóm/lời mời dựa trên kế hoạch được chọn
  const {
    data: groupDetails,
    isLoading: isLoadingGroup,
    isError: isErrorGroup,
  } = useQuery({
    queryKey: ['myGroupDetails', selectedPlanIdForDisplay],
    queryFn: async () => {
      const params = { plan_id: selectedPlanIdForDisplay };
      const plan = activePlans.find(p => String(p.ID_KEHOACH) === selectedPlanIdForDisplay);

      const groupRes = await getMyGroup(params);

      if (groupRes.has_group) {
        return {
          groupData: groupRes.group_data,
          invitations: [],
          plan: plan,
        };
      } else {
        const invitationsRes = await getPendingInvitations(params);
        return {
          groupData: null,
          invitations: invitationsRes,
          plan: plan,
        };
      }
    },
    enabled: !!selectedPlanIdForDisplay && !!activePlans, // Chỉ chạy khi planId và activePlans tồn tại
    onError: (error) => {
      toast.error(`Đã có lỗi xảy ra khi tải dữ liệu nhóm.`);
      console.error('Fetch data for plan failed:', error);
    },
  });

  // Hook useEffect để tự động chọn kế hoạch đầu tiên khi tải xong
  useEffect(() => {
    if (activePlans && activePlans.length > 0 && !selectedPlanIdForDisplay) {
      setSelectedPlanIdForDisplay(String(activePlans[0].ID_KEHOACH));
    }
  }, [activePlans, selectedPlanIdForDisplay]);


  // --- Logic Hiển thị (Đã cập nhật) ---

  // Hiển thị khung xương tải ban đầu (khi đang tải kế hoạch)
  if (isLoadingPlans) {
    return <LoadingSkeleton />;
  }

  // Hiển thị thông báo nếu không có kế hoạch hoạt động
  if (!isLoadingPlans && activePlans?.length === 0) {
    return (
      <div className="p-4 md:p-8">
        <Card>
          <CardHeader><CardTitle>Chưa tham gia đợt khóa luận</CardTitle></CardHeader>
          <CardContent>
            <p>Bạn hiện không tham gia vào bất kỳ đợt khóa luận nào đang diễn ra. Vui lòng liên hệ giáo vụ để biết thêm chi tiết.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Lấy trạng thái đủ điều kiện từ dữ liệu đã tải
  const isEligible = groupDetails?.plan?.sinhvien_thamgias?.[0]?.DU_DIEUKIEN ?? true;

  // Hiển thị giao diện chính
  return (
    <div className="p-4 md:p-8">
      {/* Đây là Card duy nhất chứa tất cả nội dung */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookCopy className="h-6 w-6 text-primary" />
            Quản lý Nhóm khóa luận
          </CardTitle>
          <CardDescription>
            Chọn kế hoạch để xem thông tin nhóm hoặc tạo/tìm nhóm mới.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Vùng chọn Kế hoạch (luôn hiển thị) */}
          {activePlans && activePlans.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Kế hoạch đang chọn</label>
              <Select
                value={selectedPlanIdForDisplay}
                onValueChange={setSelectedPlanIdForDisplay}
              >
                <SelectTrigger className="w-full md:w-[450px]">
                  <SelectValue placeholder="Chọn một kế hoạch..." />
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
          )}

          {/* Alert không đủ điều kiện */}
          {!isEligible && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Bạn không đủ điều kiện tham gia đợt khóa luận này. Vui lòng liên hệ giáo vụ.
              </AlertDescription>
            </Alert>
          )}

          {/* Đường phân cách */}
          <Separator />

          {/* Hiển thị nội dung dựa trên trạng thái */}
          {isLoadingGroup ? (
            <LoadingSkeleton />
          ) : groupDetails && isEligible ? (
            groupDetails.groupData ? (
              // Hiển thị chi tiết nhóm (đã nâng cấp)
              <GroupManagementView
                groupData={groupDetails.groupData}
                planId={selectedPlanIdForDisplay}
              />
            ) : (
              // Hiển thị tùy chọn Tạo/Tìm nhóm
              <NoGroupView
                invitations={groupDetails.invitations}
                plan={groupDetails.plan}
              />
            )
          ) : (
            !isEligible ? null // Nếu không đủ điều kiện thì không hiển thị gì thêm
              : <p className="text-muted-foreground text-center p-4">Vui lòng chọn một kế hoạch để xem thông tin nhóm.</p>
          )}

        </CardContent>
      </Card>
    </div>
  );
}