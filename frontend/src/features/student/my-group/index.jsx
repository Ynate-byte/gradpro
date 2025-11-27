import React, { useState, useEffect, useMemo, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyGroup, getPendingInvitations, getMyActivePlans, transferGroupLeadership } from '@/api/groupService';
import { getMeetingsForGroup } from '@/api/meetingService';
import { getTaskStats } from '@/api/kanbanService';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
    BookCopy, CheckCircle, AlertTriangle, Crown,
    AlertCircle, UploadCloud, CalendarCheck, LayoutDashboard,
    Mail, Phone
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
import { CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActivityCard } from './components/ActivityCard';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, isFuture } from 'date-fns';
import { SubmissionDialog } from './components/submission/SubmissionDialog';
import { RefreshCw, Loader2 } from 'lucide-react';

// Component Skeleton khi đang tải dữ liệu
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
            <div className="h-40 lg:col-span-1">
                 <Skeleton className="h-full w-full" />
            </div>
        </div>
        <Separator />
        <Skeleton className="h-64 w-full" />
    </div>
);

// Helper lấy chữ cái đầu tên
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
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

    // 1. Lấy danh sách kế hoạch hoạt động
    const {
        data: activePlans,
        isLoading: isLoadingPlans,
    } = useQuery({
        queryKey: ['myActivePlans'],
        queryFn: getMyActivePlans,
        staleTime: 5 * 60 * 1000,
        onError: () => toast.error('Lỗi khi tải danh sách kế hoạch.'),
    });

    // 2. Lấy chi tiết nhóm (Bao gồm merge dữ liệu từ nhiều nguồn API)
    const {
        data: groupDetails,
        isLoading: isLoadingGroup,
    } = useQuery({
        queryKey: ['myGroupDetails', selectedPlanIdForDisplay],
        queryFn: async () => {
            const params = { plan_id: selectedPlanIdForDisplay };
            const plan = activePlans.find(p => String(p.ID_KEHOACH) === selectedPlanIdForDisplay);
            
            // Gọi API chính lấy thông tin nhóm (chứa thành viên, yêu cầu, lời mời)
            const groupRes = await getMyGroup(params);
            
            let meetingsData = { meetings: [], groupInfo: null };
            let tasksCount = 0;
            
            // Nếu sinh viên đã có nhóm
            if (groupRes.has_group) {
                // Gọi song song các API phụ (Lịch họp, Kanban stats)
                try {
                    meetingsData = await getMeetingsForGroup(groupRes.group_data.ID_NHOM);
                } catch (e) {
                    console.error("Failed to fetch meetings", e);
                }
                
                try {
                    const stats = await getTaskStats(groupRes.group_data.ID_NHOM);
                    tasksCount = stats.tasks_ton_dong || 0;
                } catch(e) {
                    console.error("Failed to fetch task stats", e);
                }

                // Merge dữ liệu cẩn thận
                const baseGroupData = groupRes.group_data;
                
                const finalGroupData = {
                    ...baseGroupData,
                    ...(meetingsData.groupInfo || {}), 
                    yeucaus: baseGroupData.yeucaus || [],
                    loimois: baseGroupData.loimois || [],
                    thanhviens: baseGroupData.thanhviens || [],
                    phancong_detai_nhom: baseGroupData.phancongDetaiNhom || baseGroupData.phancong_detai_nhom
                };

                return { 
                    groupData: finalGroupData, 
                    invitations: [], 
                    plan, 
                    meetings: meetingsData.meetings || [],
                    tasksCount: tasksCount
                };
            } else {
                // Nếu chưa có nhóm, lấy danh sách lời mời cá nhân
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

    // Tự động chọn kế hoạch đầu tiên nếu chưa chọn
    useEffect(() => {
        if (activePlans && activePlans.length > 0 && !selectedPlanIdForDisplay) {
            setSelectedPlanIdForDisplay(String(activePlans[0].ID_KEHOACH));
        }
    }, [activePlans, selectedPlanIdForDisplay]);

    // Mutation chuyển quyền trưởng nhóm
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

    // Tính toán thống kê cho Dashboard
    const { upcomingMeetingsCount, upcomingTasksCount } = useMemo(() => {
        const meetings = groupDetails?.meetings || [];
        const tasksCount = groupDetails?.tasksCount || 0;

        const now = new Date();
        const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
        const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });

        const validMeetings = meetings.filter(meeting => {
            if (!meeting.THOIGIAN_BATDAU) return false;
            const status = meeting.TRANGTHAI ? meeting.TRANGTHAI.trim().normalize("NFC") : "";
            if (status !== 'Đã lên lịch') return false;

            try {
                const meetingDate = parseISO(meeting.THOIGIAN_BATDAU);
                const isFutureMeeting = isFuture(meetingDate);
                const isInCurrentWeek = isWithinInterval(meetingDate, { start: startOfThisWeek, end: endOfThisWeek });
                return isFutureMeeting && isInCurrentWeek;
            } catch (e) {
                return false;
            }
        });
        
        return { upcomingMeetingsCount: validMeetings.length, upcomingTasksCount: tasksCount }; 
    }, [groupDetails?.meetings, groupDetails?.tasksCount]);

    // [MỚI] Helper tính điểm cho từng sinh viên (ĐÃ SỬA LỖI KEY)
    const getStudentGrades = (studentId, groupData) => {
        if (!groupData) return null;

        const plan = groupData.kehoach || {};
        // Tỷ trọng mặc định
        const wHD = parseFloat(plan.TYTRONG_DIEM_QUATRINH ?? 0.4);
        const wPB = parseFloat(plan.TYTRONG_DIEM_PHANBIEN ?? 0.3);
        const wHDONG = parseFloat(plan.TYTRONG_DIEM_HOIDONG ?? 0.3);

        // Helper lấy điểm từ danh sách (xử lý cả JSON chi tiết)
        const getScore = (records) => {
            if (!records || records.length === 0) return null;
            
            let total = 0;
            let count = 0;

            records.forEach(record => {
                let score = parseFloat(record.DIEM || 0);
                // Nếu có điểm chi tiết, tìm điểm của sinh viên này
                if (record.DIEM_CHI_TIET) {
                    let details = record.DIEM_CHI_TIET;
                    if (typeof details === 'string') {
                        try { details = JSON.parse(details); } catch (e) {}
                    }
                    if (Array.isArray(details)) {
                        const studentScore = details.find(s => String(s.student_id) === String(studentId));
                        if (studentScore) {
                            score = parseFloat(studentScore.score);
                        }
                    }
                }
                total += score;
                count++;
            });

            return count === 0 ? null : (total / count);
        };

        // [SỬA LỖI CHÍNH]: Dùng key snake_case (hoặc thử cả 2 để an toàn)
        const listHD = groupData.diem_huong_dan || groupData.diemHuongDan;
        const listPB = groupData.diem_phan_bien || groupData.diemPhanBien;
        const listHDONG = groupData.diem_hoi_dong || groupData.diemHoiDong;

        const scoreHD = getScore(listHD);
        const scorePB = getScore(listPB);
        const scoreHDONG = getScore(listHDONG);

        // Nếu chưa có điểm nào
        if (scoreHD === null && scorePB === null && scoreHDONG === null) return null;

        // Tính tổng
        let final = 0;
        if (scoreHD !== null) final += scoreHD * wHD;
        if (scorePB !== null) final += scorePB * wPB;
        if (scoreHDONG !== null) final += scoreHDONG * wHDONG;

        return {
            final: final.toFixed(2),
            hd: scoreHD !== null ? scoreHD.toFixed(2) : '-',
            pb: scorePB !== null ? scorePB.toFixed(2) : '-',
            hdong: scoreHDONG !== null ? scoreHDONG.toFixed(2) : '-'
        };
    };

    if (isLoadingPlans) return <div className="p-4 md:p-8"><LoadingSkeleton /></div>;

    if (!activePlans?.length) {
        return (
            <div className="p-4 md:p-8">
                <div className="text-center py-8 text-muted-foreground">Chưa tham gia đợt khóa luận nào.</div>
            </div>
        );
    }

    const isLoadingData = isLoadingGroup;
    const isEligible = groupDetails?.plan?.sinhvien_thamgias?.[0]?.DU_DIEUKIEN ?? true;
    const hasGroup = !!groupDetails?.groupData;
    const groupData = groupDetails?.groupData;
    
    const phancong = groupData?.phancongDetaiNhom || groupData?.phancong_detai_nhom;
    const hasTopic = !!phancong?.detai;
    const isLeader = user?.ID_NGUOIDUNG === groupData?.ID_NHOMTRUONG;


    if (isLoadingData) {
        return <div className="p-4 md:p-8"><LoadingSkeleton /></div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            
            {/* HEADER */}
            {hasGroup ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {/* CỘT 1 */}
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
                                <AlertDescription className="text-green-800 dark:text-green-200 text-xs mt-1">
                                    GVHD: {phancong.detai.nguoi_dexuat?.nguoidung?.HODEM_VA_TEN || 'Chưa rõ'}
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert variant="destructive" className="bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-100">
                                <AlertTriangle className="h-4 w-4 !text-yellow-700 dark:!text-yellow-300" />
                                <AlertTitle className="font-bold">Chưa đăng ký đề tài</AlertTitle>
                                <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-xs">
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

                    {/* CỘT 2 */}
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

                    {/* CỘT 3: DANH SÁCH THÀNH VIÊN */}
                    <div className="lg:col-span-1 space-y-1">
                            <CardContent className="px-4 pb-4 pt-0 space-y-1">
                                {groupData.thanhviens?.map(member => {
                                    const nguoidung = member.nguoidung;
                                    const isMemberLeader = member.ID_NGUOIDUNG === groupData.ID_NHOMTRUONG;
                                    const isSelf = member.ID_NGUOIDUNG === user.ID_NGUOIDUNG;

                                    // Lấy điểm của sinh viên này
                                    const grades = getStudentGrades(member.ID_NGUOIDUNG, groupData);

                                    return (
                                        <Popover key={member.ID_NGUOIDUNG}>
                                            <PopoverTrigger asChild>
                                                <button
                                                    className={cn(
                                                        "flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors w-full text-left text-sm border rounded-md overflow-hidden bg-card",
                                                        isMemberLeader && "border-primary/50 bg-primary/5"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                        <Avatar className="h-8 w-8 text-xs">
                                                            <AvatarFallback>{getInitials(nguoidung.HODEM_VA_TEN)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="font-medium truncate block text-sm">
                                                                {nguoidung.HODEM_VA_TEN}
                                                                {isMemberLeader && <Crown className="inline h-3 w-3 text-yellow-500 ml-1 fill-yellow-500" />}
                                                            </span>
                                                            <span className="text-muted-foreground text-xs font-mono truncate block">{nguoidung.MA_DINHDANH}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Hiển thị điểm tổng kết */}
                                                    {grades && (
                                                        <div className="ml-2">
                                                            <Badge variant="secondary" className="text-xs font-bold bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                                                                {grades.final}
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-72" align="end">
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10">
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
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Phone className="h-3 w-3" />
                                                            <span>{nguoidung.SO_DIENTHOAI || 'Chưa cập nhật'}</span>
                                                        </div>
                                                    </div>

                                                    {/* Hiển thị chi tiết điểm trong Popover */}
                                                    {grades && (
                                                        <>
                                                            <Separator />
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-semibold uppercase text-muted-foreground">Chi tiết điểm</p>
                                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                                    <div className="flex justify-between bg-muted/30 p-1.5 rounded">
                                                                        <span>Hướng dẫn:</span>
                                                                        <span className="font-medium">{grades.hd}</span>
                                                                    </div>
                                                                    <div className="flex justify-between bg-muted/30 p-1.5 rounded">
                                                                        <span>Phản biện:</span>
                                                                        <span className="font-medium">{grades.pb}</span>
                                                                    </div>
                                                                    <div className="flex justify-between bg-muted/30 p-1.5 rounded col-span-2">
                                                                        <span>Hội đồng:</span>
                                                                        <span className="font-medium">{grades.hdong}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-between items-center bg-green-50 p-2 rounded border border-green-100 mt-1">
                                                                    <span className="text-xs font-bold text-green-800">TỔNG KẾT:</span>
                                                                    <span className="text-base font-bold text-green-700">{grades.final}</span>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                    
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
                            </CardContent>
                    </div>
                </div>
            ) : (
                // Selector khi chưa có nhóm
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

            {/* NỘI DUNG CHÍNH */}
            {groupDetails && isEligible ? (
                hasGroup ? (
                    <GroupManagementView 
                        groupData={groupDetails.groupData} 
                        planId={selectedPlanIdForDisplay}
                        plan={groupDetails.plan}
                    />
                ) : (
                    <NoGroupView invitations={groupDetails.invitations} plan={groupDetails.plan} />
                )
            ) : (
                !isEligible ? null : <p className="text-muted-foreground text-center py-8">Vui lòng chọn kế hoạch.</p>
            )}

            {/* DIALOGS */}
            {hasTopic && (
                <TopicDetailsDialog 
                    phancong={phancong}
                    isOpen={isTopicDialogOpen}
                    setIsOpen={setIsTopicDialogOpen}
                />
            )}
            
            {hasGroup && (
                <SubmissionDialog
                    isOpen={isSubmissionOpen}
                    setIsOpen={setIsSubmissionOpen}
                    phancong={phancong}
                    planId={selectedPlanIdForDisplay}
                    plan={groupDetails.plan}
                />
            )}

            {/* Alert Dialog Chuyển quyền */}
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