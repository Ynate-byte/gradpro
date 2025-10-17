import React, { useState, useEffect, useCallback } from 'react';
import { getMyGroup, getPendingInvitations, getMyActivePlans } from '@/api/groupService';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { NoGroupView } from './components/NoGroupView';
import { GroupManagementView } from './components/GroupManagementView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookCopy } from 'lucide-react';

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

const PlanSelector = ({ plans, onSelectPlan }) => (
    <Card>
        <CardHeader>
            <CardTitle>Chọn Kế hoạch Khóa luận</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <p className="text-muted-foreground">Bạn đang tham gia nhiều đợt khóa luận. Vui lòng chọn một kế hoạch để tiếp tục.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map(plan => (
                    <Button key={plan.ID_KEHOACH} variant="outline" className="h-auto p-4 justify-start text-left" onClick={() => onSelectPlan(plan)}>
                        <div className="flex items-start gap-4">
                            <BookCopy className="h-6 w-6 text-primary mt-1" />
                            <div>
                                <p className="font-semibold">{plan.TEN_DOT}</p>
                                <p className="text-sm text-muted-foreground">{plan.NAMHOC} - HK {plan.HOCKY}</p>
                            </div>
                        </div>
                    </Button>
                ))}
            </div>
        </CardContent>
    </Card>
);


export default function MyGroupPage() {
    const [pageState, setPageState] = useState({
        isLoading: true,
        groupData: null,
        invitations: [],
        activePlans: [],
        selectedPlan: null,
    });

    const fetchDataForPlan = useCallback(async (plan) => {
        setPageState(prev => ({ ...prev, isLoading: true, selectedPlan: plan }));
        
        try {
            const groupRes = await getMyGroup();
            let invitationsRes = [];

            // Chỉ lấy lời mời nếu chưa có nhóm
            if (!groupRes.has_group) {
                invitationsRes = await getPendingInvitations();
            }

            setPageState(prev => ({
                ...prev,
                isLoading: false,
                groupData: groupRes.has_group ? groupRes.group_data : null,
                invitations: invitationsRes,
            }));

        } catch (error) {
            toast.error("Đã có lỗi xảy ra khi tải dữ liệu nhóm.");
            console.error("Fetch data for plan failed:", error);
            setPageState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    const fetchInitialData = useCallback(async () => {
        setPageState(prev => ({ ...prev, isLoading: true }));
        try {
            const plans = await getMyActivePlans();
            if (plans.length === 0) {
                setPageState(prev => ({ ...prev, isLoading: false, activePlans: [] }));
            } else if (plans.length === 1) {
                fetchDataForPlan(plans[0]);
            } else {
                setPageState(prev => ({ ...prev, isLoading: false, activePlans: plans }));
            }
        } catch (error) {
            toast.error("Lỗi khi tải danh sách kế hoạch.");
            setPageState(prev => ({ ...prev, isLoading: false }));
        }
    }, [fetchDataForPlan]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    if (pageState.isLoading) {
        return <LoadingSkeleton />;
    }

    if (!pageState.selectedPlan) {
        if (pageState.activePlans.length > 1) {
            return <PlanSelector plans={pageState.activePlans} onSelectPlan={fetchDataForPlan} />;
        }
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Chưa tham gia đợt khóa luận</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Bạn hiện không tham gia vào bất kỳ đợt khóa luận nào đang diễn ra. Vui lòng liên hệ giáo vụ để biết thêm chi tiết.</p>
                </CardContent>
            </Card>
        );
    }
    
    if (pageState.groupData) {
        return <GroupManagementView groupData={pageState.groupData} refreshData={() => fetchDataForPlan(pageState.selectedPlan)} />;
    }
    
    return <NoGroupView 
        invitations={pageState.invitations} 
        refreshData={() => fetchDataForPlan(pageState.selectedPlan)}
        plan={pageState.selectedPlan}
    />;
}