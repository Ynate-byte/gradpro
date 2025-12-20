import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Users, Activity, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InviteMemberDialog } from './InviteMemberDialog';
import { SentInvitationsList } from './SentInvitationsList';
import { JoinRequests } from './JoinRequests';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { useQueryClient } from '@tanstack/react-query'; // Import queryClient

import GroupHistoryTab from '../GroupHistoryTab'; 

export function GroupManagementView({ groupData, planId, plan }) {
    const { user } = useAuth();
    const queryClient = useQueryClient(); // Hook để refresh data
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const nhomId = groupData.ID_NHOM;
    // Kiểm tra quyền nhóm trưởng chính xác
    const isLeader = groupData.ID_NHOMTRUONG === user?.ID_NGUOIDUNG;
    const phancong = groupData.phancong_detai_nhom;
    const hasTopic = phancong && phancong.detai;
    
    // Check nếu người dùng hiện tại là GVHD
    const isSupervisor = user?.giangvien?.ID_GIANGVIEN === phancong?.ID_GVHD; 
    const canManageInvites = isLeader || isSupervisor; 

    // Hàm làm mới dữ liệu thủ công
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await queryClient.invalidateQueries({ queryKey: ['myGroupDetails', planId] });
        setTimeout(() => setIsRefreshing(false), 500); // Delay UI một chút
    };

    const tabs = [
        { value: 'activity', label: 'Hoạt động', icon: Activity, condition: true },
        { value: 'management', label: 'Thành viên & Quản lý', icon: Users, condition: true },
    ].filter(tab => tab.condition);

    const gridStyle = { gridTemplateColumns: `repeat(${tabs.length}, 1fr)` };
    const defaultTab = tabs.length > 0 ? tabs[0].value : 'activity';

    return (
        <>
            <Tabs defaultValue={defaultTab} className="w-full">
                
                <TabsList className="grid w-full" style={gridStyle}>
                    {tabs.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            <tab.icon className="mr-2 h-4 w-4" /> {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="activity" className="mt-6 space-y-6">
                     <GroupHistoryTab groupId={nhomId} />
                </TabsContent>

                <TabsContent value="management" className="mt-6 space-y-6">
                    
                    {hasTopic && (
                        <Card>
                            <CardHeader><CardTitle>Thông tin nhóm đã khóa</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Nhóm đã đăng ký đề tài. Mọi thay đổi thành viên phải do Admin/Giáo vụ thực hiện.</p>
                            </CardContent>
                        </Card>
                    )}
                    
                    {!hasTopic && canManageInvites && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Bảng điều khiển Lời mời</CardTitle>
                                    <CardDescription>Quản lý lời mời và yêu cầu tham gia.</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Button onClick={() => setIsInviteOpen(true)} className="w-full" disabled={!isLeader}>
                                    <UserPlus className="mr-2 h-4 w-4" /> Mời thành viên (Chỉ Trưởng nhóm)
                                </Button>
                                <Separator />
                                {/* Truyền isLeader xuống component con */}
                                <JoinRequests 
                                    requests={groupData.yeucaus} 
                                    groupId={groupData.ID_NHOM} 
                                    planId={planId} 
                                    isLeader={isLeader} 
                                />
                                <SentInvitationsList 
                                    invitations={groupData.loimois} 
                                    groupId={groupData.ID_NHOM} 
                                    planId={planId} 
                                    isLeader={isLeader} 
                                />
                            </CardContent>
                        </Card>
                    )}
                    
                    {!canManageInvites && !hasTopic && (
                        <Card>
                            <CardHeader><CardTitle>Bảng điều khiển</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Chỉ Trưởng nhóm hoặc GVHD mới có thể quản lý lời mời/yêu cầu.</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

            </Tabs>

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