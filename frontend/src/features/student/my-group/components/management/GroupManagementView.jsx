import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, FileText, Users, KanbanSquare, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InviteMemberDialog } from './InviteMemberDialog'; 
import { SentInvitationsList } from './SentInvitationsList';
import { JoinRequests } from './JoinRequests'; 
import KanbanPage from '@/features/student/my-group/pages/KanbanPage'; 
import MeetingCalendarPage from '@/features/student/my-group/pages/MeetingCalendarPage';
import { SubmissionArea } from '../SubmissionArea'
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';


/**
 * Component quản lý nhóm, được sử dụng cho cả Sinh viên và Giảng viên (Group Management View).
 * Chứa logic phân quyền hiển thị các Tab công việc, lịch họp, nộp bài.
 */
export function GroupManagementView({ groupData, planId }) {
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

    const tabs = [
        { value: 'management', label: 'Thành viên & Quản lý', icon: Users, condition: true }, 
        // Kanban và Lịch họp: Cần có đề tài VÀ người dùng có quyền quản lý (Leader/Supervisor)
        { value: 'tasks', label: 'Bảng Công việc', icon: KanbanSquare, condition: hasTopic && isManager }, 
        { value: 'schedule', label: 'Lịch Họp', icon: Calendar, condition: hasTopic && isManager }, 
        // Tab nộp bài: Chỉ hiển thị cho Sinh viên (isStudentViewer) khi có đề tài
        { value: 'submission', label: 'Nộp sản phẩm', icon: FileText, condition: hasTopic && isStudentViewer }, 
    ].filter(tab => tab.condition);

    const gridStyle = { gridTemplateColumns: `repeat(${tabs.length}, 1fr)` };
    const defaultTab = tabs.length > 0 ? tabs[0].value : 'management';

    return (
        <>
            <Tabs defaultValue={defaultTab} className="w-full">
                
                {/* TABS LIST: Sử dụng mảng tabs đã lọc */}
                <TabsList className="grid w-full" style={gridStyle}>
                    {tabs.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            <tab.icon className="mr-2 h-4 w-4" /> {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* TAB 1: QUẢN LÝ THÀNH VIÊN (Giữ nguyên) */}
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

                {/* TAB 2: BẢNG CÔNG VIỆC (TASKS) - Giờ đã có chuyển tuần */}
                {tabs.some(t => t.value === 'tasks') && ( 
                    <TabsContent value="tasks" className="mt-6">
                        {/* [FIXED] Nhúng toàn bộ trang KanbanPage và truyền prop embedded */}
                        <KanbanPage embedded nhomId={nhomId} /> 
                    </TabsContent>
                )}

                {/* TAB 3: LỊCH HỌP (SCHEDULE) - Giờ đã có chuyển tuần */}
                {tabs.some(t => t.value === 'schedule') && ( 
                    <TabsContent value="schedule" className="mt-6">
                        {/* [FIXED] Nhúng toàn bộ trang MeetingCalendarPage và truyền prop embedded */}
                        <MeetingCalendarPage embedded nhomId={nhomId} />
                    </TabsContent>
                )}
                
                {/* TAB 4: NỘP SẢN PHẨM (Submission) - Chỉ cho Sinh viên */}
                {tabs.some(t => t.value === 'submission') && (
                    <TabsContent value="submission" className="mt-6">
                        <SubmissionArea phancong={phancong} planId={planId} />
                    </TabsContent>
                )}
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