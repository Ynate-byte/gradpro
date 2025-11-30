import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMeetingsForGroup } from '@/api/meetingService'; 
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarDays, ArrowLeft, Plus, RefreshCw, List, ArrowRight } from 'lucide-react'; 
import { MeetingCalendar } from '../components/meetings/MeetingCalendar';
import { MeetingDialog } from '../components/meetings/MeetingDialog';
import { MeetingList } from '../components/meetings/MeetingList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addWeeks, isSameWeek } from 'date-fns'; // [THÊM]
import { vi } from 'date-fns/locale'; // [THÊM]
import '../components/meetings/Calendar.css'

export default function MeetingCalendarPage() {
    const { nhomId } = useParams();
    const navigate = useNavigate();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState(null);
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // 1. STATE & LOGIC ĐIỀU HƯỚNG TUẦN (NEW)
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const options = useMemo(() => ({ locale: vi, weekStartsOn: 1 }), []); // Tuần bắt đầu từ Thứ 2
    
    const weekRange = useMemo(() => {
        const start = startOfWeek(currentDate, options);
        const end = endOfWeek(currentDate, options);
        return {
            start: format(start, 'yyyy-MM-dd'),
            end: format(end, 'yyyy-MM-dd'),
            display: `${format(start, 'dd/MM', options)} - ${format(end, 'dd/MM/yyyy', options)}`,
        };
    }, [currentDate, options]);

    const isCurrentWeek = useMemo(() => isSameWeek(currentDate, new Date(), options), [currentDate, options]);

    const handleWeekChange = (direction) => {
        setCurrentDate(prev => addWeeks(prev, direction));
    };

    const handleGoToToday = () => {
        setCurrentDate(new Date());
    };
    // END OF NAVIGATION LOGIC
    
    // 2. Fetch data (Update queryKey and queryFn)
    const { data, isLoading, isRefetching, refetch } = useQuery({ 
        queryKey: ['meetings', Number(nhomId), weekRange.start], 
        queryFn: () => getMeetingsForGroup(
            Number(nhomId), 
            { start_date: weekRange.start, end_date: weekRange.end } 
        ),
        enabled: !!nhomId,
        onError: () => {
            toast.error("Không thể tải dữ liệu lịch họp.");
        },
    });

    const meetings = data?.meetings || [];
    const groupInfo = data?.groupInfo || {};
    const planId = groupInfo?.ID_KEHOACH;

    const { canManageMeetings } = useMemo(() => {
        const phancong = groupInfo?.phancong_detai_nhom;
        const isLeader = user?.ID_NGUOIDUNG === groupInfo?.ID_NHOMTRUONG;
        const isGvhd = user?.giangvien && phancong?.gvhd && (user.giangvien.ID_GIANGVIEN === phancong.gvhd.ID_GIANGVIEN);
        return { canManageMeetings: isLeader || isGvhd };
    }, [user, groupInfo]);

    const handleCreateClick = () => {
        setEditingMeeting(null);
        setIsDialogOpen(true);
    };

    const handleEditClick = (meeting) => {
        setEditingMeeting(meeting);
        setIsDialogOpen(true);
    };

    return (
        <div className="p-4 md:p-8 space-y-6 h-full overflow-auto">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại Nhóm của tôi
            </Button>

            <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="h-6 w-6" /> Lịch họp Nhóm
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
                    <Tabs defaultValue="calendar" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 max-w-sm">
                            <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4" /> Lịch tuần</TabsTrigger>
                            <TabsTrigger value="list"><List className="mr-2 h-4 w-4" /> Danh sách</TabsTrigger>
                        </TabsList>
                        
                        {/* 3. Week Navigation Bar UI (NEW) */}
                        <div className="flex justify-between items-center my-4 p-2 border rounded-lg bg-muted/50">
                            <Button variant="outline" size="sm" onClick={() => handleWeekChange(-1)}>
                                <ArrowLeft className="h-4 w-4 mr-1" /> Trở về
                            </Button>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{weekRange.display}</span>
                                <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    onClick={handleGoToToday}
                                    disabled={isCurrentWeek}
                                >
                                    Hiện tại
                                </Button>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleWeekChange(1)}>
                                Tiếp <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                        {/* END OF WEEK NAVIGATION UI */}

                        <TabsContent value="calendar" className="mt-4">
                            <MeetingCalendar
                                meetings={meetings}
                                groupInfo={groupInfo}
                                isLoading={isLoading}
                                onSelectEvent={handleEditClick}
                            />
                        </TabsContent>

                        <TabsContent value="list" className="mt-4">
                            <MeetingList 
                                meetings={meetings}
                                onEdit={handleEditClick}
                                planId={planId}
                                nhomId={Number(nhomId)}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

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