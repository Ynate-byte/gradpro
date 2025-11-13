import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getGroupDetailsById } from '@/api/groupService'; 
import { getTaskStats } from '@/api/kanbanService';
import { getMeetingsForGroup } from '@/api/meetingService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Users, AlertCircle, CalendarCheck, BookCopy, LayoutDashboard, Crown, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GroupManagementView } from "@/features/student/my-group/components/management/GroupManagementView";
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityCard } from '@/features/student/my-group/components/ActivityCard';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Helper (Lấy 2 chữ cái đầu)
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
};

export default function LecturerGroupDetailPage() {
    const { nhomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // --- 1. FETCH DỮ LIỆU CHÍNH (Chi tiết nhóm) ---
    const { data: groupDetails, isLoading } = useQuery({
        queryKey: ['lecturerGroupDetails', nhomId],
        queryFn: async () => {
            const res = await getGroupDetailsById(Number(nhomId));
            if (!res || !res.ID_NHOM) {
                throw new Error("Dữ liệu nhóm không hợp lệ từ API.");
            }
            return res;
        },
        enabled: !!nhomId,
        onError: (err) => {
            toast.error("Lỗi: Không thể tải chi tiết nhóm.", {
                description: err.message || err.response?.data?.message || "Lỗi mạng hoặc API endpoint chưa được cấu hình.",
            });
        }
    });

    // --- 2. FETCH DỮ LIỆU PHỤ (Stats cho Activity Cards) ---
    const { data: meetingData } = useQuery({
        queryKey: ['lecturerMeetingStats', nhomId], 
        queryFn: () => getMeetingsForGroup(Number(nhomId)), 
        enabled: !!groupDetails?.ID_NHOM,
    });

    const { data: taskStats } = useQuery({
        queryKey: ['lecturerTaskStats', nhomId],
        queryFn: () => getTaskStats(Number(nhomId)),
        enabled: !!groupDetails?.ID_NHOM,
    });
    
    // 3. Xử lý thống kê Activity Cards
    const { upcomingMeetingsCount } = useMemo(() => {
        const meetings = meetingData?.meetings || [];
        const now = new Date();
        const startOfThisWeek = startOfWeek(now, { locale: vi, weekStartsOn: 1 });
        const endOfThisWeek = endOfWeek(now, { locale: vi, weekStartsOn: 1 });

        const meetingsInWeek = meetings.filter(meet => {
            if (!meet.THOIGIAN_BATDAU) return false;
            try {
                const meetingDate = parseISO(meet.THOIGIAN_BATDAU);
                // Kiểm tra nếu sự kiện chưa diễn ra VÀ nằm trong tuần này
                return meetingDate > now && isWithinInterval(meetingDate, { start: startOfThisWeek, end: endOfThisWeek });
            } catch { return false; }
        }).length;
        
        return { upcomingMeetingsCount: meetingsInWeek };
    }, [meetingData]);

    // [MODIFIED HELPER - LOẠI BỎ GIẢ ĐỊNH] Tính toán mã vai trò ngắn gọn (DH, NL, HS, TN)
    const getShortRole = useCallback((memberUser, isLeader) => {
        // 1. Ưu tiên Trưởng nhóm
        if (isLeader) return 'ĐH'; 

        // 2. Tính toán initials từ Họ và Tên (ví dụ: Đặng Minh Hiếu -> ĐH)
        const fullName = memberUser?.HODEM_VA_TEN;
        if (fullName) {
            const parts = fullName.split(/\s+/).filter(Boolean);
            if (parts.length >= 2) {
                const first = parts[0][0]; // Ký tự đầu tiên của từ đầu tiên
                const last = parts[parts.length - 1][0]; // Ký tự đầu tiên của từ cuối cùng
                return (first + last).toUpperCase();
            }
        }
        return 'TV'; // Mặc định là Thành viên
    }, []);

    if (isLoading) {
        return (
            <div className="p-4 md:p-8 space-y-6 flex justify-center h-screen pt-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!groupDetails) {
        return (
            <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-4">
                <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Quay lại</Button>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Không tìm thấy nhóm hoặc bạn không có quyền truy cập.</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    const planId = groupDetails.ID_KEHOACH;
    const phancong = groupDetails.phancong_detai_nhom;
    const hasTopic = phancong && phancong.detai;
    const currentPlan = groupDetails.kehoach; 

    return (
        <div className="max-w-6xl mx-auto md:pt-8 space-y-6">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại Quản lý Nhóm
            </Button>

            {/* Cấu trúc Header Giống Student Page */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* CỘT 1: Thông tin Đề tài & Kế hoạch */}
                <div className="flex-1 space-y-4 lg:col-span-1">
                    <Card className={`border-l-4 ${hasTopic ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
                        <CardContent className="p-4 space-y-1">
                            <h3 className="font-semibold text-gray-800 flex items-start">
                                <BookCopy className='h-4 w-4 mr-2 mt-1 text-green-700 shrink-0' />
                                {phancong?.detai?.TEN_DETAI || 'Chưa đăng ký đề tài'}
                            </h3>
                            {hasTopic && (
                                <>
                                    <div className='flex items-center gap-2 mt-2'>
                                        <Badge className="bg-green-600 text-white hover:bg-green-600/90 text-sm">
                                            {phancong.detai?.TRANGTHAI}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">GVHD: {phancong?.gvhd?.nguoidung?.HODEM_VA_TEN || 'N/A'}</p>
                                </>
                            )}
                            <div className="pt-2 text-sm text-gray-600">
                                Kế hoạch: 
                                <Badge variant="outline" className='text-xs ml-1'>
                                    {/* [FIXED N/A PLAN] Hiển thị TEN_DOT hoặc NAMHOC */}
                                    {currentPlan?.TEN_DOT || currentPlan?.NAMHOC || 'N/A'} 
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* CỘT 2: Activity Cards (Lịch họp & Công việc tồn đọng) */}
                <div className="grid grid-cols-2 gap-4 lg:col-span-1">
                    <ActivityCard 
                        title="Lịch họp trong tuần" 
                        count={isLoading ? 'loading' : upcomingMeetingsCount} 
                        icon={CalendarCheck} 
                        colorClass="blue"
                        onClick={() => navigate(`/projects/my-group/schedule/${nhomId}`)}
                    />
                    <ActivityCard 
                        title="Công việc tồn đọng" 
                        count={isLoading ? 'loading' : taskStats?.tasks_ton_dong ?? 0} 
                        icon={LayoutDashboard} 
                        colorClass="orange"
                        onClick={() => navigate(`/projects/my-group/kanban/${nhomId}`)} 
                    />
                </div>

                <div className="lg:col-span-1">
                        {groupDetails.thanhviens?.map(member => {
                            const memberUser = member.nguoidung;
                            const isLeader = member.ID_NGUOIDUNG === groupDetails.ID_NHOMTRUONG;
                            // [MODIFIED CALL SITE]: Truyền memberUser object
                            const shortRole = getShortRole(memberUser, isLeader); 

                            return (
                                <Popover key={member.ID_NGUOIDUNG}>
                                    <PopoverTrigger asChild>
                                        <div 
                                            // Giao diện list item giống hệt ảnh mẫu (có border)
                                            className={cn(
                                                "flex items-center justify-between p-2 m-1 hover:bg-muted/50 rounded-md cursor-pointer border",
                                                isLeader ? "border-primary/50" : "border-gray-200" 
                                            )}
                                        >
                                            <div className='flex items-center gap-2'>
                                                <span className='w-5 text-center font-bold text-sm text-primary'>{shortRole}</span>
                                                <span className="font-medium">
                                                    {memberUser?.HODEM_VA_TEN}
                                                    {isLeader && <Crown className="inline h-3 w-3 text-yellow-500 fill-yellow-500 ml-1" />}
                                                </span>
                                            </div>
                                            <span className="text-muted-foreground text-xs font-mono">{memberUser?.MA_DINHDANH}</span>
                                        </div>
                                    </PopoverTrigger>
                                    
                                    {/* Popover Content (Chi tiết liên hệ) */}
                                    <PopoverContent className="w-64" align="end">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-sm font-semibold">
                                                {memberUser?.HODEM_VA_TEN}
                                            </div>
                                            <Separator />
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Mail className="h-3 w-3" />
                                                    <span className="truncate">{memberUser?.EMAIL}</span>
                                                </div>
                                                {memberUser?.SO_DIENTHOAI && (
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Phone className="h-3 w-3" />
                                                        <span>{memberUser?.SO_DIENTHOAI}</span>
                                                    </div>
                                                )}
                                                {isLeader && (
                                                    <Badge variant="default" className="mt-2 text-xs flex items-center gap-1 w-fit">
                                                        <Crown className="h-3 w-3 fill-white" /> Trưởng nhóm
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            );
                        })}
                </div>
            </div>
            
            <Separator />
            
            {/* Bảng Tabs chính (Quản lý chi tiết) */}
            <Card className="shadow-lg border-blue-200 dark:border-blue-700/50">
                <CardHeader>
                    <CardTitle>Quản lý Chi tiết</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Component này đã được sửa để có Tab và chuyển tuần */}
                    <GroupManagementView groupData={groupDetails} planId={String(planId)} />
                </CardContent>
            </Card>
        </div>
    );
}