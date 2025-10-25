import React, { useState, useEffect, useCallback } from 'react';
import { getMyGroup, getPendingInvitations, getMyActivePlans } from '@/api/groupService';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCopy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NoGroupView } from './components/NoGroupView';
import { GroupManagementView } from './components/GroupManagementView';

// Component hiển thị khung xương tải dữ liệu
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
    // State quản lý trạng thái chung của trang
    const [pageState, setPageState] = useState({
        isLoading: true,
        groupData: null,
        invitations: [],
        activePlans: [],
        selectedPlan: null,
    });
    // State quản lý ID của kế hoạch đang được chọn trong dropdown
    const [selectedPlanIdForDisplay, setSelectedPlanIdForDisplay] = useState('');

    // Hàm tải dữ liệu nhóm và lời mời cho một kế hoạch cụ thể
    const fetchDataForPlan = useCallback(async (plan) => {
        if (!plan) {
            setPageState(prev => ({ ...prev, isLoading: false, selectedPlan: null, groupData: null, invitations: [] }));
            return;
        }

        setPageState(prev => ({ ...prev, isLoading: true, selectedPlan: plan }));
        setSelectedPlanIdForDisplay(String(plan.ID_KEHOACH));

        try {
            const params = { plan_id: plan.ID_KEHOACH };
            const groupRes = await getMyGroup(params);
            let invitationsRes = [];

            if (!groupRes.has_group) {
                invitationsRes = await getPendingInvitations(params);
            }

            setPageState(prev => ({
                ...prev,
                isLoading: false,
                groupData: groupRes.has_group ? groupRes.group_data : null,
                invitations: invitationsRes,
            }));

        } catch (error) {
            toast.error(`Đã có lỗi xảy ra khi tải dữ liệu nhóm cho kế hoạch "${plan.TEN_DOT}".`);
            console.error("Fetch data for plan failed:", error);
            setPageState(prev => ({ ...prev, isLoading: false, groupData: null, invitations: [] }));
        }
    }, []);

    // Hàm tải danh sách các kế hoạch hoạt động mà sinh viên đang tham gia
    const fetchInitialData = useCallback(async () => {
        setPageState(prev => ({ ...prev, isLoading: true }));
        try {
            const plans = await getMyActivePlans();
            if (plans.length === 0) {
                setPageState(prev => ({ ...prev, isLoading: false, activePlans: [] }));
            } else {
                const initialPlan = plans[0];
                setPageState(prev => ({ ...prev, isLoading: false, activePlans: plans, selectedPlan: initialPlan }));
                setSelectedPlanIdForDisplay(String(initialPlan.ID_KEHOACH));
            }
        } catch (error) {
            toast.error("Lỗi khi tải danh sách kế hoạch đang tham gia.");
            setPageState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    // Hook useEffect để tải dữ liệu ban đầu (danh sách kế hoạch)
    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // Hook useEffect để tải dữ liệu nhóm/lời mời khi kế hoạch được chọn thay đổi
    useEffect(() => {
        if (selectedPlanIdForDisplay && pageState.activePlans.length > 0) {
            const selected = pageState.activePlans.find(p => String(p.ID_KEHOACH) === selectedPlanIdForDisplay);
            if (selected) {
                fetchDataForPlan(selected);
            }
        } else if (!selectedPlanIdForDisplay && pageState.activePlans.length === 0) {
            setPageState(prev => ({...prev, isLoading: false, selectedPlan: null, groupData: null, invitations: []}))
        }
    }, [selectedPlanIdForDisplay, pageState.activePlans, fetchDataForPlan]);


    // --- Logic Hiển thị ---

    // Hiển thị khung xương tải ban đầu
    if (pageState.isLoading && !pageState.selectedPlan) {
        return <LoadingSkeleton />;
    }

    // Hiển thị thông báo nếu không có kế hoạch hoạt động
    if (!pageState.isLoading && pageState.activePlans.length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle>Chưa tham gia đợt khóa luận</CardTitle></CardHeader>
                <CardContent>
                    <p>Bạn hiện không tham gia vào bất kỳ đợt khóa luận nào đang diễn ra. Vui lòng liên hệ giáo vụ để biết thêm chi tiết.</p>
                </CardContent>
            </Card>
        );
    }

    // Hiển thị giao diện chính
    return (
        <div className="space-y-6">
            {/* Vùng chọn Kế hoạch nếu có */}
            {pageState.activePlans.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookCopy className="h-6 w-6 text-primary" />
                            Chọn Kế hoạch Khóa luận
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select
                            value={selectedPlanIdForDisplay}
                            onValueChange={setSelectedPlanIdForDisplay}
                        >
                            <SelectTrigger className="w-full md:w-[450px]">
                                <SelectValue placeholder="Chọn một kế hoạch..." />
                            </SelectTrigger>
                            <SelectContent>
                                {pageState.activePlans.map(plan => (
                                    <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                        {plan.TEN_DOT} ({plan.NAMHOC} - HK {plan.HOCKY})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            )}

            {/* Hiển thị nội dung dựa trên trạng thái tải và dữ liệu nhóm */}
            {pageState.isLoading && pageState.selectedPlan ? (
                <LoadingSkeleton />
            ) : pageState.selectedPlan ? (
                pageState.groupData ? (
                    // Hiển thị chi tiết nhóm
                    <GroupManagementView
                        groupData={pageState.groupData}
                        refreshData={() => fetchDataForPlan(pageState.selectedPlan)}
                    />
                ) : (
                    // Hiển thị tùy chọn Tạo/Tìm nhóm
                    <NoGroupView
                        invitations={pageState.invitations}
                        refreshData={() => fetchDataForPlan(pageState.selectedPlan)}
                        plan={pageState.selectedPlan}
                    />
                )
            ) : (
                <p className="text-muted-foreground text-center p-4">Vui lòng chọn một kế hoạch để xem thông tin nhóm.</p>
            )}
        </div>
    );
}