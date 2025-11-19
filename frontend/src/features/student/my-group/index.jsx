import React, { useState, useEffect, useMemo, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyGroup, getPendingInvitations, getMyActivePlans, transferGroupLeadership } from '@/api/groupService';
import { getMeetingsForGroup } from '@/api/meetingService';
import { getTaskStats } from '@/api/kanbanService';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
    BookCopy, Users, CheckCircle, AlertTriangle, Crown, Phone, Mail,
    AlertCircle, RefreshCw, Loader2, CalendarCheck, UploadCloud,
    LayoutDashboard
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NoGroupView } from './components/NoGroupView';
import { GroupManagementView } from './components/management/GroupManagementView';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle as AlertDialogTitleComponent
} from "@/components/ui/alert-dialog";
import { TopicDetailsDialog } from './components/topic/TopicDetailsDialog';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActivityCard } from './components/ActivityCard';
import { format, isFuture, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { SubmissionDialog } from './components/submission/SubmissionDialog';
// import { MeetingArea } from './components/MeetingArea'; // Đã gỡ bỏ

// (Component LoadingSkeleton giữ nguyên)
const LoadingSkeleton = () => (
    <div className="p-4 md:p-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="flex-1 space-y-4 lg:col-span-1">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:col-span-1">
                <Skeleton className="h-[105px]" />
                <Skeleton className="h-[105px]" />
            </div>
            <Skeleton className="h-40 lg:col-span-1" />
        </div>
        <Separator />
        <Skeleton className="h-64 w-full" />
    </div>
);

// (Component getInitials giữ nguyên)
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
};

// (Component TopicInfoCard giữ nguyên)
const TopicInfoCard = ({ phancong, onDetailsClick }) => {
    const project = phancong?.detai;
    const gvhd = phancong?.gvhd;
    return (
        <Card className="lg:col-span-1 h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <BookCopy className="h-5 w-5 text-green-600" /> Đề tài
                </CardTitle>
                {project && (
                    <Badge variant={project.TRANGTHAI === 'Đã duyệt' ? 'default' : 'secondary'}>
                        {project.TRANGTHAI}
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
                {project ? (
                    <div className="space-y-2">
                        <p 
                            className="text-lg font-medium text-primary cursor-pointer hover:underline"
                            onClick={onDetailsClick}
                        >
                            {project.TEN_DETAI}
                        </p>
                        <p className="text-sm text-muted-foreground">Mã ĐT: {project.MA_DETAI || 'N/A'}</p>
                        <p className="text-sm">GVHD: {gvhd?.nguoidung?.HODEM_VA_TEN || 'Chưa rõ'}</p>
                    </div>
                ) : (
                    <p className="text-muted-foreground mt-2">Nhóm chưa đăng ký đề tài.</p>
                )}
                {project && (
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-2" onClick={onDetailsClick}>
                        Xem chi tiết đề tài...
                    </Button>
                )}
            </CardContent>
        </Card>
    );
};

export default function MyGroupPage() {
    const { user } = useAuth();
    const [selectedPlanIdForDisplay, setSelectedPlanIdForDisplay] = useState('');
    const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
    const queryClient = useQueryClient();
    const [transferAlertInfo, setTransferAlertInfo] = useState({ isOpen: false, member: null });
    const alertTransferTitleId = useId();
    const alertTransferDescId = useId();
    const navigate = useNavigate();
    const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);

    // (useQuery 'activePlans' giữ nguyên)
    const {
        data: activePlans,
        isLoading: isLoadingPlans,
    } = useQuery({
        queryKey: ['myActivePlans'],
        queryFn: getMyActivePlans,
        staleTime: 5 * 60 * 1000,
        onError: () => toast.error('Lỗi khi tải danh sách kế hoạch.'),
    });

    // (useQuery 'groupDetails' giữ nguyên)
    const {
        data: groupDetails,
        isLoading: isLoadingGroup,
    } = useQuery({
        queryKey: ['myGroupDetails', selectedPlanIdForDisplay],
        queryFn: async () => {
            const params = { plan_id: selectedPlanIdForDisplay };
            const plan = activePlans.find(p => String(p.ID_KEHOACH) === selectedPlanIdForDisplay);
            const groupRes = await getMyGroup(params);
            
            let meetingsData = { meetings: [], groupInfo: null };
            let tasksCount = 0; // Tách riêng
            
            if (groupRes.has_group) {
                try {
                    meetingsData = await getMeetingsForGroup(groupRes.group_data.ID_NHOM);
                } catch (e) {
                    console.error("Failed to fetch meetings in parallel", e);
                }
                try {
                    const stats = await getTaskStats(groupRes.group_data.ID_NHOM);
                    tasksCount = stats.tasks_ton_dong || 0;
                } catch(e) {
                    console.error("Failed to fetch task stats", e);
                }

                return { 
                    groupData: meetingsData.groupInfo || groupRes.group_data, 
                    invitations: [], 
                    plan, 
                    meetings: meetingsData.meetings || [],
                    tasksCount: tasksCount
                };
            } else {
                const invitationsRes = await getPendingInvitations(params);
                return { 
                    groupData: null, 
                    invitations: invitationsRes, 
                    plan, 
                    meetings: [],
                    tasksCount: 0
                };
            }
        },
        enabled: !!selectedPlanIdForDisplay && !!activePlans,
        onError: () => toast.error('Lỗi tải dữ liệu nhóm.'),
    });

    // (useEffect và useMutation giữ nguyên)
    useEffect(() => {
        if (activePlans && activePlans.length > 0 && !selectedPlanIdForDisplay) {
            setSelectedPlanIdForDisplay(String(activePlans[0].ID_KEHOACH));
        }
    }, [activePlans, selectedPlanIdForDisplay]);

    const transferMutation = useMutation({
        mutationFn: (memberId) => transferGroupLeadership(groupDetails?.groupData?.ID_NHOM, memberId),
        onSuccess: (res) => {
            toast.success(res.message);
            queryClient.invalidateQueries({ queryKey: ['myGroupDetails', selectedPlanIdForDisplay] });
        },
        onError: (error) => toast.error(error.response?.data?.message || "Chuyển quyền thất bại."),
        onSettled: () => setTransferAlertInfo({ isOpen: false, member: null }),
    });

    const handleTransfer = () => {
        if (!transferAlertInfo.member) return;
        transferMutation.mutate(transferAlertInfo.member.ID_NGUOIDUNG);
    };

    // [ĐÃ SỬA LẠI LOGIC LỌC]
    const { upcomingMeetingsCount, upcomingTasksCount } = useMemo(() => {
        const meetings = groupDetails?.meetings || [];
        const tasksCount = groupDetails?.tasksCount || 0;

        const now = new Date();
        // startOfWeek với weekStartsOn: 1 (Thứ 2) để khớp với logic lịch Việt Nam
        const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
        const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });

        // Lọc danh sách lịch họp hợp lệ
        const validMeetings = meetings.filter(meeting => {
            // 1. Kiểm tra thời gian tồn tại
            if (!meeting.THOIGIAN_BATDAU) return false;

            // 2. Kiểm tra trạng thái: BẮT BUỘC phải là "Đã lên lịch"
            // Sử dụng trim() và normalize() để tránh lỗi font chữ hoặc khoảng trắng thừa
            const status = meeting.TRANGTHAI ? meeting.TRANGTHAI.trim().normalize("NFC") : "";
            if (status !== 'Đã lên lịch') return false;

            try {
                const meetingDate = parseISO(meeting.THOIGIAN_BATDAU);
                
                // 3. Kiểm tra thời gian: Phải trong tương lai VÀ nằm trong tuần này
                const isFutureMeeting = isFuture(meetingDate);
                const isInCurrentWeek = isWithinInterval(meetingDate, { start: startOfThisWeek, end: endOfThisWeek });
                
                return isFutureMeeting && isInCurrentWeek;
            } catch (e) {
                console.error("Lỗi parse ngày tháng:", meeting.THOIGIAN_BATDAU);
                return false;
            }
        });
        
        return { upcomingMeetingsCount: validMeetings.length, upcomingTasksCount: tasksCount }; 
    }, [groupDetails?.meetings, groupDetails?.tasksCount]);


    if (isLoadingPlans) return <div className="p-4 md:p-8"><LoadingSkeleton /></div>;

    if (!activePlans?.length) {
        return (
            <div className="p-4 md:p-8">
                <div className="text-center py-8 text-muted-foreground">Chưa tham gia đợt khóa luận nào.</div>
            </div>
        );
    }

    // (Định nghĩa biến giữ nguyên)
    const isLoadingData = isLoadingGroup;
    const isEligible = groupDetails?.plan?.sinhvien_thamgias?.[0]?.DU_DIEUKIEN ?? true;
    const hasGroup = !!groupDetails?.groupData;
    const groupData = groupDetails?.groupData;
    const phancong = groupData?.phancong_detai_nhom;
    const hasTopic = !!phancong?.detai;
    const isLeader = user?.ID_NGUOIDUNG === groupData?.ID_NHOMTRUONG;


    if (isLoadingData) {
        return <div className="p-4 md:p-8"><LoadingSkeleton /></div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            
            {hasGroup ? (
                // --- Bố cục 3 cột khi ĐÃ CÓ NHÓM ---
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    <div className="flex-1 space-y-4 lg:col-span-1">
                        <div>
                            <Select value={selectedPlanIdForDisplay} onValueChange={setSelectedPlanIdForDisplay}>
                                <SelectTrigger className="w-full sm:w-full mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {activePlans.map(plan => (
                                        <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                            {plan.TEN_DOT} ({plan.NAMHOC} - HK {plan.HOCKY})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {hasTopic ? (
                            <Alert className="bg-green-50 border-green-200 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-100">
                                <CheckCircle className="h-4 w-4 !text-green-700 dark:!text-green-300" />
                                <AlertTitle
                                    onClick={() => setIsTopicDialogOpen(true)}
                                    className="font-bold cursor-pointer hover:underline"
                                >
                                    {phancong.detai.TEN_DETAI}
                                </AlertTitle>
                                <AlertDescription className="text-green-800 dark:text-green-200">
                                    GVHD: {phancong.detai.nguoi_dexuat?.nguoidung?.HODEM_VA_TEN || 'Chưa rõ'}
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert variant="destructive" className="bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-100">
                                <AlertTriangle className="h-4 w-4 !text-yellow-700 dark:!text-yellow-300" />
                                <AlertTitle className="font-bold">Chưa đăng ký đề tài</AlertTitle>
                                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                                    Nhóm cần đăng ký đề tài để có thể nộp sản phẩm.
                                </AlertDescription>
                            </Alert>
                        )}
                        
                        {hasTopic && (
                            <Button 
                                className="w-full sm:w-full"
                                onClick={() => setIsSubmissionOpen(true)}
                            >
                                <UploadCloud className="mr-2 h-4 w-4" /> Nộp sản phẩm
                            </Button>
                        )}
                    </div>

                    {/* CỘT 2: Card Thống kê */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:col-span-1">
                        <ActivityCard 
                            title="Lịch họp trong tuần" 
                            count={upcomingMeetingsCount} 
                            icon={CalendarCheck} 
                            colorClass="blue"
                            onClick={() => navigate(`/projects/my-group/schedule/${groupData.ID_NHOM}`)}
                        />
                        <ActivityCard 
                            title="Công việc tồn đọng" 
                            count={upcomingTasksCount} 
                            icon={LayoutDashboard} 
                            colorClass="orange"
                            onClick={() => navigate(`/projects/my-group/kanban/${groupData.ID_NHOM}`)}
                        />
                    </div>

                    {/* CỘT 3: Danh sách Thành viên */}
                    <div className="lg:col-span-1 space-y-1">
                        {groupData.thanhviens?.map(member => {
                            const nguoidung = member.nguoidung;
                            const isMemberLeader = member.ID_NGUOIDUNG === groupData.ID_NHOMTRUONG;
                            const isSelf = member.ID_NGUOIDUNG === user.ID_NGUOIDUNG;

                            return (
                                <Popover key={member.ID_NGUOIDUNG}>
                                    <PopoverTrigger asChild>
                                        <button
                                            className={cn(
                                                "flex items-center justify-between px-3 py-1.5 hover:bg-muted/50 transition-colors w-full text-left text-sm border rounded-md overflow-hidden bg-card",
                                                isMemberLeader && "border-primary/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Avatar className="h-6 w-6 text-xs">
                                                    <AvatarFallback>{getInitials(nguoidung.HODEM_VA_TEN)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-medium truncate block text-sm">
                                                        {nguoidung.HODEM_VA_TEN}
                                                        {isMemberLeader && <Crown className="inline h-3 w-3 text-primary ml-1" />}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-muted-foreground text-xs font-mono">{nguoidung.MA_DINHDANH}</span>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64" align="end">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarFallback>{getInitials(nguoidung.HODEM_VA_TEN)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-semibold">{nguoidung.HODEM_VA_TEN}</p>
                                                    <p className="text-xs text-muted-foreground">{nguoidung.MA_DINHDANH}</p>
                                                </div>
                                            </div>
                                            <Separator />
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Mail className="h-3 w-3" />
                                                    <span className="truncate">{nguoidung.EMAIL}</span>
                                                </div>
                                                {nguoidung.SO_DIENTHOAI && (
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Phone className="h-3 w-3" />
                                                        <span>{nguoidung.SO_DIENTHOAI}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {isLeader && !isSelf && !hasTopic && (
                                                <div className="pt-3 border-t mt-3">
                                                    <Button
                                                        variant="outline"
                                                        className="w-full h-8 text-xs"
                                                        onClick={() => setTransferAlertInfo({ isOpen: true, member: nguoidung })}
                                                        disabled={transferMutation.isPending}
                                                    >
                                                        <RefreshCw className="mr-2 h-3 w-3" /> Chuyển quyền Trưởng nhóm
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            );
                        })}
                    </div>
                </div>
            ) : (
                // Nếu không có nhóm
                <div>
                    <label className="text-sm font-medium">Kế hoạch</label>
                    <Select value={selectedPlanIdForDisplay} onValueChange={setSelectedPlanIdForDisplay}>
                        <SelectTrigger className="w-full sm:w-80 mt-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {activePlans.map(plan => (
                                <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                    {plan.TEN_DOT} ({plan.NAMHOC} - HK {plan.HOCKY})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            
            {/* ALERT KHÔNG ĐỦ ĐIỀU KIỆN */}
            {!isEligible && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Bạn không đủ điều kiện tham gia đợt này.</AlertDescription>
                </Alert>
            )}

            <Separator />

            {/* NỘI DUNG CHÍNH (Tabs) */}
            {groupDetails && isEligible ? (
                hasGroup ? (
                    <GroupManagementView
                        groupData={groupData}
                        planId={selectedPlanIdForDisplay}
                        plan={groupDetails.plan}
                    />
                ) : (
                    <NoGroupView invitations={groupDetails.invitations} plan={groupDetails.plan} />
                )
            ) : (
                !isEligible ? null : <p className="text-muted-foreground text-center py-8">Vui lòng chọn kế hoạch.</p>
            )}

            {/* DIALOG CHI TIẾT ĐỀ TÀI */}
            {hasTopic && (
                <TopicDetailsDialog
                    phancong={phancong}
                    isOpen={isTopicDialogOpen}
                    setIsOpen={setIsTopicDialogOpen}
                />
            )}
            
            {/* Dialog Nộp sản phẩm */}
            {hasGroup && (
                <SubmissionDialog
                    isOpen={isSubmissionOpen}
                    setIsOpen={setIsSubmissionOpen}
                    phancong={phancong}
                    planId={selectedPlanIdForDisplay}
                    plan={groupDetails.plan}
                />
            )}

            {/* Alert Dialog để xác nhận chuyển quyền */}
            <AlertDialog open={transferAlertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setTransferAlertInfo({ isOpen: false, member: null })}>
                <AlertDialogContent aria-labelledby={alertTransferTitleId} aria-describedby={alertTransferDescId}>
                    <AlertDialogHeader>
                        <AlertDialogTitleComponent id={alertTransferTitleId}>Xác nhận chuyển quyền Trưởng nhóm?</AlertDialogTitleComponent>
                        <AlertDialogDescription id={alertTransferDescId}>
                            Bạn có chắc chắn muốn chuyển quyền trưởng nhóm cho <strong>{transferAlertInfo.member?.HODEM_VA_TEN}</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={transferMutation.isPending}>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleTransfer} disabled={transferMutation.isPending}>
                            {transferMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Xác nhận
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}