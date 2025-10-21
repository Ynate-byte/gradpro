import React, { useState, useEffect, useCallback } from 'react';
// Import API functions
import { getMyGroup, getPendingInvitations, getMyActivePlans } from '@/api/groupService';
import { toast } from 'sonner';
// Import UI components
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCopy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select
// Import view components
import { NoGroupView } from './components/NoGroupView';
import { GroupManagementView } from './components/GroupManagementView';

// Loading Skeleton (no changes needed)
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

// PlanSelector component is removed

export default function MyGroupPage() {
    const [pageState, setPageState] = useState({
        isLoading: true,
        groupData: null,       // Group data for the *selected* plan
        invitations: [],       // Invitations for the *selected* plan
        activePlans: [],       // List of all active plans the student is in
        selectedPlan: null,    // The currently *selected* plan object
    });
    // State to hold the ID of the plan selected in the dropdown (as string)
    const [selectedPlanIdForDisplay, setSelectedPlanIdForDisplay] = useState('');

    // Fetches group and invitation data for a SPECIFIC plan
    const fetchDataForPlan = useCallback(async (plan) => {
        // Guard clause: Do nothing if no plan is provided
        if (!plan) {
            setPageState(prev => ({ ...prev, isLoading: false, selectedPlan: null, groupData: null, invitations: [] }));
            return;
        }

        // Set loading state and update selected plan object
        setPageState(prev => ({ ...prev, isLoading: true, selectedPlan: plan }));
        // Update the dropdown display value
        setSelectedPlanIdForDisplay(String(plan.ID_KEHOACH));

        try {
            // Assume API accepts plan_id (Needs backend update if not)
            const params = { plan_id: plan.ID_KEHOACH };
            const groupRes = await getMyGroup(params); // Pass params
            let invitationsRes = [];

            // Only fetch invitations if the student doesn't have a group in this plan
            if (!groupRes.has_group) {
                invitationsRes = await getPendingInvitations(params); // Pass params
            }

            // Update state with fetched data
            setPageState(prev => ({
                ...prev,
                isLoading: false,
                groupData: groupRes.has_group ? groupRes.group_data : null,
                invitations: invitationsRes,
            }));

        } catch (error) {
            toast.error(`Đã có lỗi xảy ra khi tải dữ liệu nhóm cho kế hoạch "${plan.TEN_DOT}".`);
            console.error("Fetch data for plan failed:", error);
            // Clear relevant states on error
            setPageState(prev => ({ ...prev, isLoading: false, groupData: null, invitations: [] }));
        }
    }, []); // Empty dependency array is correct here as it doesn't depend on external state changes directly

    // Fetches the initial list of active plans for the student
    const fetchInitialData = useCallback(async () => {
        setPageState(prev => ({ ...prev, isLoading: true }));
        try {
            const plans = await getMyActivePlans();
            if (plans.length === 0) {
                // No active plans, stop loading
                setPageState(prev => ({ ...prev, isLoading: false, activePlans: [] }));
            } else {
                // Found active plans, set the list and select the first one by default
                const initialPlan = plans[0];
                setPageState(prev => ({ ...prev, isLoading: false, activePlans: plans, selectedPlan: initialPlan }));
                setSelectedPlanIdForDisplay(String(initialPlan.ID_KEHOACH));
                // Optionally: Fetch data for the initial plan immediately
                // fetchDataForPlan(initialPlan); // Uncomment this line if you want data to load on initial render
            }
        } catch (error) {
            toast.error("Lỗi khi tải danh sách kế hoạch đang tham gia.");
            setPageState(prev => ({ ...prev, isLoading: false }));
        }
    }, []); // Removed fetchDataForPlan from dependencies

    // Effect for initial data load (fetching active plans)
    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // Effect to fetch group/invitation data when the selected plan ID changes
    useEffect(() => {
        // Only run if a plan ID is selected and the plan list is available
        if (selectedPlanIdForDisplay && pageState.activePlans.length > 0) {
            // Find the full plan object corresponding to the selected ID
            const selected = pageState.activePlans.find(p => String(p.ID_KEHOACH) === selectedPlanIdForDisplay);
            if (selected) {
                 fetchDataForPlan(selected); // Fetch data using the plan object
            }
        } else if (!selectedPlanIdForDisplay && pageState.activePlans.length === 0) {
            // Handle the case where there are no plans (already handled by initial fetch)
             setPageState(prev => ({...prev, isLoading: false, selectedPlan: null, groupData: null, invitations: []}))
        }
        // This effect depends on the selected ID and the list of available plans
    }, [selectedPlanIdForDisplay, pageState.activePlans, fetchDataForPlan]);


    // --- Render Logic ---

    // 1. Show loading skeleton initially or during plan data fetch
    if (pageState.isLoading && !pageState.selectedPlan) { // Show initial loading skeleton
         return <LoadingSkeleton />;
    }

    // 2. If not loading and no active plans found
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

    // 3. Render the main content (Plan Selector + Group Info/NoGroup View)
    return (
        <div className="space-y-6">
            {/* Always show Plan Selector if there are active plans */}
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
                             onValueChange={setSelectedPlanIdForDisplay} // Update the selected ID string directly
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

            {/* Conditionally render loading skeleton or group views based on the selected plan */}
            {pageState.isLoading && pageState.selectedPlan ? ( // Show loading when switching plans
                 <LoadingSkeleton />
            ) : pageState.selectedPlan ? ( // Only render if a plan is actually selected
                pageState.groupData ? (
                    // Show group details if data exists for the selected plan
                    <GroupManagementView
                         groupData={pageState.groupData}
                         refreshData={() => fetchDataForPlan(pageState.selectedPlan)} // Refresh with the current plan
                     />
                 ) : (
                    // Show options to create/find group if no group data for the selected plan
                    <NoGroupView
                        invitations={pageState.invitations}
                         refreshData={() => fetchDataForPlan(pageState.selectedPlan)} // Refresh with the current plan
                         plan={pageState.selectedPlan} // Pass the selected plan object
                     />
                 )
             ) : (
                 // Placeholder if no plan is selected yet (should normally not show if initial selection works)
                 <p className="text-muted-foreground text-center p-4">Vui lòng chọn một kế hoạch để xem thông tin nhóm.</p>
            )}
        </div>
    );
}