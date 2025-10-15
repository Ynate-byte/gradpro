import React, { useState, useEffect, useCallback } from 'react';
import { getMyGroup, getPendingInvitations } from '@/api/groupService';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { NoGroupView } from './components/NoGroupView';
import { GroupManagementView } from './components/GroupManagementView';

const LoadingSkeleton = () => (
    <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="p-6 border rounded-lg space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
        </div>
        <div className="p-6 border rounded-lg space-y-4">
            <Skeleton className="h-8 w-1/4" />
            <div className="flex items-center space-x-4">
                 <Skeleton className="h-12 w-12 rounded-full" />
                 <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                 </div>
            </div>
        </div>
    </div>
);

export default function MyGroupPage() {
    const [pageState, setPageState] = useState({
        isLoading: true,
        groupData: null,
        invitations: [],
    });

    const fetchData = useCallback(async () => {
        setPageState(prev => ({ ...prev, isLoading: true }));
        
        let groupResult = null;
        let invitationsResult = [];

        try {
            const res = await getMyGroup();
            groupResult = res.has_group ? res.group_data : null;
        } catch (error) {
            toast.error("Lỗi khi kiểm tra thông tin nhóm.");
            console.error("getMyGroup failed:", error);
        }

        // Chỉ fetch lời mời nếu người dùng chưa có nhóm
        if (!groupResult) {
            try {
                invitationsResult = await getPendingInvitations();
            } catch (error) {
                toast.error("Lỗi khi tải danh sách lời mời.");
                console.error("getPendingInvitations failed:", error);
            }
        }
        
        setPageState({
            isLoading: false,
            groupData: groupResult,
            invitations: invitationsResult,
        });
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (pageState.isLoading) {
        return <LoadingSkeleton />;
    }

    if (pageState.groupData) {
        return <GroupManagementView groupData={pageState.groupData} refreshData={fetchData} />;
    }
    
    return <NoGroupView invitations={pageState.invitations} refreshData={fetchData} />;
}