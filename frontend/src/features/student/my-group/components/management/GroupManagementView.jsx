import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Users } from 'lucide-react'; // Bỏ import KanbanSquare, Calendar, FileText
import { useAuth } from '@/contexts/AuthContext';
import { InviteMemberDialog } from './InviteMemberDialog';
import { SentInvitationsList } from './SentInvitationsList';
import { JoinRequests } from './JoinRequests';
// Bỏ import KanbanPage, MeetingCalendarPage, SubmissionArea
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';

/**
 * Component quản lý nhóm, được sử dụng cho cả Sinh viên và Giảng viên (Group Management View).
 */
export function GroupManagementView({ groupData, planId, plan }) {
    const { user } = useAuth();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    
    // Xác định các biến trạng thái
    const nhomId = groupData.ID_NHOM;
    const isLeader = groupData.ID_NHOMTRUONG === user?.ID_NGUOIDUNG;
    const phancong = groupData.phancong_detai_nhom;
    const hasTopic = phancong && phancong.detai;
    
    // Check nếu người dùng hiện tại là GVHD của nhóm này
    const isSupervisor = user?.giangvien?.ID_GIANGVIEN === phancong?.ID_GVHD; 
    const canManageInvites = isLeader || isSupervisor; 

    // LOGIC PHÂN QUYỀN HIỂN THỊ TAB
    const isManager = isLeader || isSupervisor;
    // Sinh viên xem nhóm (không phải GVHD) -> có quyền nộp bài
    const isStudentViewer = !isSupervisor; 

    // [SỬA ĐỔI] Chỉ giữ lại tab Management, bỏ 3 tab kia
    const tabs = [
        { value: 'management', label: 'Thành viên & Quản lý', icon: Users, condition: true },
    ].filter(tab => tab.condition);

    const gridStyle = { gridTemplateColumns: `repeat(${tabs.length}, 1fr)` };
    const defaultTab = tabs.length > 0 ? tabs[0].value : 'management';

    return (
        <>
            <Tabs defaultValue={defaultTab} className="w-full">
                
                {/* TABS LIST */}
                <TabsList className="grid w-full" style={gridStyle}>
                    {tabs.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            <tab.icon className="mr-2 h-4 w-4" /> {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* TAB 1: QUẢN LÝ THÀNH VIÊN */}
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
                            <CardHeader>
                                <CardTitle>Bảng điều khiển Lời mời</CardTitle>
                                <CardDescription>Quản lý lời mời và yêu cầu tham gia.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Button onClick={() => setIsInviteOpen(true)} className="w-full" disabled={!isLeader}>
                                    <UserPlus className="mr-2 h-4 w-4" /> Mời thành viên (Chỉ Trưởng nhóm)
                                </Button>
                                <Separator />
                                <JoinRequests requests={groupData.yeucaus} groupId={groupData.ID_NHOM} planId={planId} />
                                <SentInvitationsList invitations={groupData.loimois} groupId={groupData.ID_NHOM} planId={planId} />
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

                {/* [SỬA ĐỔI] Đã xóa TabsContent cho 'tasks', 'schedule', 'submission' */}

            </Tabs>

            {/* Dialog mời thành viên (Giữ nguyên) */}
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