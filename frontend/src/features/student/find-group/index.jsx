import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { findGroups, requestToJoin, cancelJoinRequest, getMyActivePlans, getMyGroup } from '@/api/groupService'; // [MỚI] Thêm getMyGroup
import { getChuyenNganhs } from '@/api/userService';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';

// UI Components
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Search, Users, Filter, ArrowLeft, UserPlus, 
    Loader2, AlertCircle, Undo2, Info, GraduationCap, Crown, Lock 
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // [MỚI]

const getInitials = (name) => name ? name.charAt(0).toUpperCase() : '?';

// --- Component: Group List Item ---
const GroupListItem = ({ group, onRequestJoin, onCancelRequest, hasGroup }) => { // [MỚI] Nhận prop hasGroup
    const maxMembers = group.kehoach?.SO_THANHVIEN_TOIDA || 4;
    const currentMembers = group.SO_THANHVIEN_HIENTAI;
    const progress = (currentMembers / maxMembers) * 100;
    const isFull = currentMembers >= maxMembers;
    const progressColor = isFull ? "bg-red-500" : (progress >= 75 ? "bg-yellow-500" : "bg-green-500");

    // [MỚI] Kiểm tra xem người dùng có phải là thành viên của nhóm này không
    // (Logic này cần thiết nếu API findGroups trả về cả nhóm mình đang tham gia - tùy backend)
    // Tuy nhiên, quan trọng hơn là disable nút nếu hasGroup = true
    
    return (
        <div className="flex flex-col md:flex-row items-center justify-between py-2 px-4 border rounded-lg bg-card hover:shadow-sm hover:bg-accent/5 transition-all gap-3 group relative">
             
            {/* 1. CỘT TRÁI */}
            <div className="w-full md:w-[30%] flex flex-col justify-center shrink-0 min-w-0">
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <h3 className="text-sm font-bold truncate text-primary cursor-pointer hover:underline underline-offset-2 decoration-dashed max-w-[200px] md:max-w-full">
                                {group.TEN_NHOM}
                            </h3>
                        </PopoverTrigger>
                        
                        <PopoverContent className="w-96 p-0" align="start">
                            <div className="p-4 border-b bg-muted/30">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <Info className="w-4 h-4 text-primary" />
                                    Thông tin nhóm
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {group.chuyennganh?.TEN_CHUYENNGANH || 'Chưa phân chuyên ngành'}
                                </p>
                            </div>
                            <div className="p-4 space-y-4">
                                {group.MOTA && (
                                    <div className="text-sm bg-muted/50 p-2.5 rounded border italic text-muted-foreground">
                                        "{group.MOTA}"
                                    </div>
                                )}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase">Thành viên ({group.SO_THANHVIEN_HIENTAI}/{maxMembers})</span>
                                    </div>
                                    <ScrollArea className="h-[180px]">
                                        <div className="space-y-2 pr-3">
                                            {group.thanhviens?.map((tv) => (
                                                <div key={tv.ID_NGUOIDUNG} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                                                    <Avatar className="h-8 w-8 border bg-background">
                                                        <AvatarFallback className="text-xs">{getInitials(tv.nguoidung?.HODEM_VA_TEN)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-sm font-medium truncate text-foreground">
                                                                {tv.nguoidung?.HODEM_VA_TEN}
                                                            </p>
                                                            {tv.ID_NGUOIDUNG === group.ID_NHOMTRUONG && (
                                                                <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500 ml-1" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground font-mono">{tv.nguoidung?.MA_DINHDANH}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                                <div className="pt-2 border-t flex items-center gap-2 text-xs text-muted-foreground">
                                    <GraduationCap className="w-3 h-3" />
                                    <span className="truncate">{group.khoabomon?.TEN_KHOA_BOMON || 'Khoa chưa xác định'}</span>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {group.da_gui_yeu_cau && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[10px] h-4 px-1 border-blue-100">
                            Đã xin
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1 truncate" title={`Trưởng nhóm: ${group.nhomtruong?.HODEM_VA_TEN}`}>
                        <Users className="h-3 w-3" />
                        {group.nhomtruong?.HODEM_VA_TEN}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="truncate max-w-[150px]" title={group.chuyennganh?.TEN_CHUYENNGANH}>
                        {group.chuyennganh?.TEN_CHUYENNGANH || 'Chưa phân ngành'}
                    </span>
                </div>
            </div>

            {/* 2. CỘT GIỮA */}
            <div className="hidden md:flex flex-1 items-center justify-between px-4 border-l border-r border-dashed border-gray-200 dark:border-gray-800 h-full min-h-[40px]">
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 italic flex-1 mr-4">
                    {group.MOTA || "Chưa có mô tả..."}
                </p>
                
                <div className="flex items-center shrink-0">
                    <div className="flex -space-x-1.5 overflow-hidden mr-2">
                        {group.thanhviens?.slice(0, 4).map((tv) => (
                            <Avatar key={tv.ID_NGUOIDUNG} className="inline-block h-6 w-6 rounded-full ring-1 ring-background" title={tv.nguoidung?.HODEM_VA_TEN}>
                                <AvatarFallback className="bg-muted text-[9px] text-muted-foreground">
                                    {getInitials(tv.nguoidung?.HODEM_VA_TEN)}
                                </AvatarFallback>
                            </Avatar>
                        ))}
                        {group.thanhviens?.length > 4 && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full ring-1 ring-background bg-muted text-[9px] font-medium">
                                +{group.thanhviens.length - 4}
                            </div>
                        )}
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                        {group.SO_THANHVIEN_HIENTAI}/{maxMembers}
                    </span>
                </div>
            </div>

            {/* 3. CỘT PHẢI: HÀNH ĐỘNG */}
            <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3 shrink-0">
                <div className="flex md:hidden flex-1 flex-col items-start mr-2">
                     <Progress value={progress} className="h-1.5 w-full" indicatorClassName={progressColor} />
                </div>

                <div className="hidden md:block w-16 mr-2">
                    <Progress value={progress} className="h-1.5 w-full" indicatorClassName={progressColor} />
                </div>

                <div className="w-[100px] flex justify-end">
                    {group.da_gui_yeu_cau ? (
                        <Button 
                            variant="outline" size="sm"
                            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-8 text-xs px-2"
                            onClick={(e) => { e.stopPropagation(); onCancelRequest(group.id_yeu_cau_da_gui); }}
                        >
                            <Undo2 className="w-3 h-3 mr-1.5" /> Hủy
                        </Button>
                    ) : (
                        <Button 
                            size="sm"
                            className={`w-full h-8 text-xs px-2 ${hasGroup ? "bg-gray-100 text-gray-400 hover:bg-gray-100 border-gray-200" : ""}`}
                            // [MỚI] Disable nếu đã có nhóm (hasGroup) HOẶC nhóm đầy
                            disabled={isFull || hasGroup}
                            onClick={(e) => { e.stopPropagation(); onRequestJoin(group); }}
                            variant={isFull || hasGroup ? "secondary" : "default"}
                        >
                            {hasGroup ? (
                                // [MỚI] Trạng thái Đã có nhóm
                                <span className="flex items-center"><Lock className="w-3 h-3 mr-1.5" /> Khóa</span>
                            ) : isFull ? (
                                <span className="flex items-center text-muted-foreground"><AlertCircle className="w-3 h-3 mr-1.5" /> Đầy</span>
                            ) : (
                                <span className="flex items-center"><UserPlus className="w-3 h-3 mr-1.5" /> Xin vào</span>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---
export default function FindGroupPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const planId = searchParams.get('plan_id');
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebounce(search, 500);
    const [selectedMajor, setSelectedMajor] = useState('all');
    const [page, setPage] = useState(1);
    const [requestDialog, setRequestDialog] = useState({ open: false, group: null, message: '' });

    // 1. Fetch danh sách kế hoạch
    const { data: activePlans, isLoading: loadingPlans } = useQuery({
        queryKey: ['myActivePlans'],
        queryFn: getMyActivePlans,
        staleTime: 5 * 60 * 1000,
    });

    // 2. [MỚI] Kiểm tra xem sinh viên ĐÃ CÓ NHÓM trong kế hoạch này chưa
    const { data: myGroupData, isLoading: loadingMyGroup } = useQuery({
        queryKey: ['myGroupDetails', planId],
        queryFn: () => getMyGroup({ plan_id: planId }),
        enabled: !!planId,
    });

    const hasGroup = myGroupData?.has_group || false; // Biến quan trọng để disable nút

    // Tự động chọn kế hoạch
    useEffect(() => {
        if (!loadingPlans && activePlans?.length > 0 && !planId) {
            const defaultPlanId = String(activePlans[0].ID_KEHOACH);
            setSearchParams({ plan_id: defaultPlanId }, { replace: true });
        }
    }, [loadingPlans, activePlans, planId, setSearchParams]);

    // 3. Fetch Chuyên ngành
    const { data: majors } = useQuery({
        queryKey: ['chuyenNganhs'],
        queryFn: getChuyenNganhs,
        staleTime: Infinity
    });

    // 4. Fetch Danh sách nhóm
    const { data: groupsData, isLoading: loadingGroups } = useQuery({
        queryKey: ['findGroups', planId, debouncedSearch, selectedMajor, page],
        queryFn: () => findGroups({ 
            search: debouncedSearch, 
            ID_CHUYENNGANH: selectedMajor === 'all' ? null : selectedMajor,
            page 
        }, planId),
        enabled: !!planId,
        keepPreviousData: true,
    });

    const requestMutation = useMutation({
        mutationFn: ({ groupId, message }) => requestToJoin(groupId, { LOINHAN: message }),
        onSuccess: (res) => {
            toast.success(res.message);
            setRequestDialog({ open: false, group: null, message: '' });
            queryClient.invalidateQueries(['findGroups']);
        },
        onError: (err) => toast.error(err.response?.data?.message || "Gửi yêu cầu thất bại")
    });

    const cancelMutation = useMutation({
        mutationFn: (requestId) => cancelJoinRequest(requestId),
        onSuccess: (res) => {
            toast.success(res.message);
            queryClient.invalidateQueries(['findGroups']);
        },
        onError: (err) => toast.error(err.response?.data?.message || "Hủy yêu cầu thất bại")
    });

    const handleOpenRequestDialog = (group) => setRequestDialog({ open: true, group, message: '' });

    const handleSubmitRequest = () => {
        if (!requestDialog.group) return;
        requestMutation.mutate({ groupId: requestDialog.group.ID_NHOM, message: requestDialog.message });
    };

    const handlePlanChange = (newPlanId) => {
        setSearchParams({ plan_id: newPlanId });
        setPage(1);
    };

    // --- Loading & Empty States ---
    if (loadingPlans || (!planId && activePlans?.length > 0)) {
        return (
            <div className="p-4 md:p-8 space-y-6 container mx-auto max-w-7xl">
                <div className="flex justify-between items-center"><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-64" /></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><Skeleton className="h-12 md:col-span-3" /><Skeleton className="h-12 md:col-span-1" /></div>
                <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            </div>
        );
    }

    if (!loadingPlans && activePlans?.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-xl font-semibold">Không tìm thấy kế hoạch</h3>
                <p className="text-muted-foreground">Bạn chưa được thêm vào đợt khóa luận nào.</p>
                <Button onClick={() => navigate('/')}>Quay về trang chủ</Button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 container mx-auto h-full overflow-auto max-w-7xl animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Button variant="ghost" className="pl-0 hover:bg-transparent" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 mt-2">
                        <Users className="h-6 w-6 text-primary" /> Tìm kiếm Nhóm
                    </h1>
                </div>
                
                <div className="w-full md:w-auto">
                     <Select value={planId} onValueChange={handlePlanChange}>
                        <SelectTrigger className="w-full md:w-[280px] bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {activePlans?.map(plan => (
                                <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                    {plan.TEN_DOT}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* [MỚI] Alert thông báo nếu đã có nhóm */}
            {hasGroup && (
                <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle>Thông báo</AlertTitle>
                    <AlertDescription>
                        Bạn đã là thành viên của nhóm <strong>{myGroupData.group_data.TEN_NHOM}</strong> trong đợt này. 
                        Bạn không thể xin vào nhóm khác trừ khi thoát nhóm hiện tại.
                    </AlertDescription>
                </Alert>
            )}

            <div className="bg-card p-4 rounded-lg border shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Tìm tên nhóm, tên thành viên..." 
                        className="pl-9 h-11"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="md:col-span-1">
                    <Select value={selectedMajor} onValueChange={setSelectedMajor}>
                        <SelectTrigger className="h-11">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 opacity-50" />
                                <SelectValue placeholder="Lọc theo chuyên ngành" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả chuyên ngành</SelectItem>
                            {majors?.map(m => (
                                <SelectItem key={m.ID_CHUYENNGANH} value={String(m.ID_CHUYENNGANH)}>
                                    {m.TEN_CHUYENNGANH}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card className="border-none shadow-none bg-transparent">
                <CardContent className="p-0 space-y-3">
                    {loadingGroups ? (
                        [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
                    ) : groupsData?.data?.length > 0 ? (
                        <>
                            <div className="text-sm text-muted-foreground mb-2 px-1">
                                Tìm thấy {groupsData.total} nhóm
                            </div>
                            {groupsData.data.map(group => (
                                <GroupListItem 
                                    key={group.ID_NHOM} 
                                    group={group} 
                                    onRequestJoin={handleOpenRequestDialog}
                                    onCancelRequest={(reqId) => cancelMutation.mutate(reqId)}
                                    hasGroup={hasGroup} 
                                />
                            ))}
                        </>
                    ) : (
                        <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-medium">Không tìm thấy kết quả</h3>
                            <p className="text-muted-foreground">Thử tìm kiếm với từ khóa khác.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {groupsData?.last_page > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
                    <span className="flex items-center px-4 font-medium text-sm">Trang {page} / {groupsData.last_page}</span>
                    <Button variant="outline" disabled={page === groupsData.last_page} onClick={() => setPage(p => p + 1)}>Sau</Button>
                </div>
            )}

            <Dialog open={requestDialog.open} onOpenChange={(open) => setRequestDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gửi yêu cầu tham gia</DialogTitle>
                        <DialogDescription>
                            Gửi lời nhắn đến trưởng nhóm <strong>{requestDialog.group?.TEN_NHOM}</strong>.<br />
                            <span class="text-red-600 font-semibold mt-2">
                                Lưu ý là một khi vào nhóm thì không thể rời nhóm đâu nha.
                            </span>
                        </DialogDescription>

                    </DialogHeader>
                    <div className="py-2">
                        <Textarea 
                            placeholder="Chào bạn, mình muốn tham gia nhóm..."
                            value={requestDialog.message}
                            onChange={(e) => setRequestDialog(prev => ({ ...prev, message: e.target.value }))}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRequestDialog({ open: false, group: null, message: '' })}>Hủy</Button>
                        <Button onClick={handleSubmitRequest} disabled={requestMutation.isPending}>
                            {requestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Gửi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}