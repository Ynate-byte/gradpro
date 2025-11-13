import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, RefreshCw, CalendarDays, List } from 'lucide-react'; // Bỏ List
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getMeetingsForGroup } from '@/api/meetingService';
import { MeetingDialog } from './MeetingDialog';
import { MeetingList } from './MeetingList';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ===== [XÓA BỎ] =====
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { MeetingCalendar } from './MeetingCalendar';
import './Calendar.css'; 
// ====================

export function MeetingArea({ groupData, planId }) {
    const { user } = useAuth();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState(null);

    const nhomId = groupData.ID_NHOM;
    const phancong = groupData.phancong_detai_nhom;

    // Xác định quyền tạo/sửa
    const { canManageMeetings } = useMemo(() => {
        const isLeader = user?.ID_NGUOIDUNG === groupData?.ID_NHOMTRUONG;
        const isGvhd = user?.giangvien && phancong?.gvhd && (user.giangvien.ID_GIANGVIEN === phancong.gvhd.ID_GIANGVIEN);
        return { canManageMeetings: isLeader || isGvhd };
    }, [user, groupData, phancong]);

    // Lấy dữ liệu lịch họp
    const {
        data, // Sửa alias
        isLoading,
        isRefetching,
        refetch
    } = useQuery({
        queryKey: ['meetings', nhomId], 
        queryFn: () => getMeetingsForGroup(nhomId),
        enabled: !!nhomId,
        onError: () => {
            toast.error("Không thể tải lịch sử họp.");
        }
    });

    // Tách dữ liệu
    const meetings = data?.meetings || [];

    const handleCreateClick = () => {
        setEditingMeeting(null);
        setIsDialogOpen(true);
    };

    const handleEditClick = (meeting) => {
        setEditingMeeting(meeting);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            {/* [SỬA ĐỔI] Đổi Icon về List */}
                            <List className="h-6 w-6" /> Danh sách Lịch họp
                        </CardTitle>
                        <CardDescription>
                            Theo dõi các cuộc họp sắp tới và đã diễn ra của nhóm.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading || isRefetching}>
                            <RefreshCw className={cn("h-4 w-4", (isLoading || isRefetching) && "animate-spin")} />
                        </Button>
                        {canManageMeetings && (
                            <Button onClick={handleCreateClick}>
                                <Plus className="mr-2 h-4 w-4" /> Tạo lịch họp
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    
                    {/* ===== [SỬA ĐỔI] Gỡ bỏ Tabs ===== */}
                    {isLoading ? (
                        <div className="text-center p-10">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                            <p className="mt-2 text-muted-foreground">Đang tải lịch họp...</p>
                        </div>
                    ) : (
                        <MeetingList 
                            meetings={meetings}
                            onEdit={handleEditClick}
                            planId={planId}
                            nhomId={nhomId}
                        />
                    )}
                    {/* ===== [KẾT THÚC SỬA ĐỔI] ===== */}

                </CardContent>
            </Card>

            {/* Dialog Tạo/Sửa */}
            <MeetingDialog
                isOpen={isDialogOpen}
                setIsOpen={setIsDialogOpen}
                nhomId={nhomId}
                planId={planId}
                meeting={editingMeeting}
            />
        </div>
    );
}