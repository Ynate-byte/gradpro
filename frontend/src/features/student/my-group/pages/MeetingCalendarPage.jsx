import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'; // Thêm useQueryClient, useMutation
import { getMeetingsForGroup, cancelMeeting } from '@/api/meetingService'; // Thêm cancelMeeting
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarDays, ArrowLeft, Plus, RefreshCw, List } from 'lucide-react'; // Thêm icon
import { MeetingCalendar } from '../components/MeetingCalendar';
import { MeetingDialog } from '../components/MeetingDialog';
import { MeetingList } from '../components/MeetingList'; // <-- [THÊM MỚI] Import MeetingList
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // <-- [THÊM MỚI] Import Tabs
import { useAuth } from '@/contexts/AuthContext'; // <-- [THÊM MỚI] Import useAuth
import { cn } from '@/lib/utils'; // <-- [THÊM MỚI] Import cn

// CSS cho lịch
import '../components/Calendar.css';

export default function MeetingCalendarPage() {
    const { nhomId } = useParams();
    const navigate = useNavigate();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState(null);
    const { user } = useAuth(); // <-- [THÊM MỚI]
    const queryClient = useQueryClient(); // <-- [THÊM MỚI]

    // 1. Lấy dữ liệu
    const { data, isLoading, isRefetching, refetch } = useQuery({ // Thêm isRefetching, refetch
        queryKey: ['meetings', Number(nhomId)],
        queryFn: () => getMeetingsForGroup(Number(nhomId)),
        enabled: !!nhomId,
        onError: () => {
            toast.error("Không thể tải dữ liệu lịch họp.");
        },
    });

    const meetings = data?.meetings || [];
    const groupInfo = data?.groupInfo || {};
    const planId = groupInfo?.ID_KEHOACH;

    // [THÊM MỚI] Logic kiểm tra quyền tạo lịch
    const { canManageMeetings } = useMemo(() => {
        const phancong = groupInfo?.phancong_detai_nhom;
        const isLeader = user?.ID_NGUOIDUNG === groupInfo?.ID_NHOMTRUONG;
        const isGvhd = user?.giangvien && phancong?.gvhd && (user.giangvien.ID_GIANGVIEN === phancong.gvhd.ID_GIANGVIEN);
        return { canManageMeetings: isLeader || isGvhd };
    }, [user, groupInfo]);
    // [KẾT THÚC THÊM MỚI]

    const handleCreateClick = () => {
        setEditingMeeting(null);
        setIsDialogOpen(true);
    };

    const handleEditClick = (meeting) => {
        setEditingMeeting(meeting);
        setIsDialogOpen(true);
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại Nhóm của tôi
            </Button>

            <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="h-6 w-6" />
                            Lịch họp - {groupInfo?.TEN_NHOM || 'Đang tải...'}
                        </CardTitle>
                        <CardDescription>
                            Quản lý lịch họp, xem lịch tuần hoặc dạng danh sách.
                        </CardDescription>
                    </div>
                    {/* [THÊM MỚI] Nút tạo và refresh */}
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
                    {/* ===== [THÊM MỚI] Tabs ===== */}
                    <Tabs defaultValue="calendar" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 max-w-sm">
                            <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4" /> Lịch tuần</TabsTrigger>
                            <TabsTrigger value="list"><List className="mr-2 h-4 w-4" /> Danh sách</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="calendar" className="mt-4">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-96">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <MeetingCalendar 
                                    meetings={meetings}
                                    groupInfo={groupInfo}
                                    isLoading={isLoading}
                                    onSelectEvent={handleEditClick}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="list" className="mt-4">
                            {isLoading ? (
                                <div className="text-center p-10">
                                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <MeetingList 
                                    meetings={meetings}
                                    onEdit={handleEditClick}
                                    planId={planId}
                                    nhomId={Number(nhomId)}
                                />
                            )}
                        </TabsContent>
                    </Tabs>
                    {/* ===== [KẾT THÚC THÊM MỚI] ===== */}
                </CardContent>
            </Card>

            {/* Dialog Tạo/Sửa (dùng lại) */}
            <MeetingDialog
                isOpen={isDialogOpen}
                setIsOpen={setIsDialogOpen}
                nhomId={Number(nhomId)}
                planId={planId}
                meeting={editingMeeting}
            />
        </div>
    );
}