import React, { useState, useId } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, UserPlus, LogOut, Info, UserCheck, UserX, Loader2, RefreshCw, CheckCircle, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InviteMemberDialog } from './InviteMemberDialog';
import { SentInvitationsList } from './SentInvitationsList'; 
import { handleJoinRequest, leaveGroup, transferGroupLeadership } from '@/api/groupService';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SubmissionArea } from './SubmissionArea'; 

// Hàm lấy chữ cái đầu của tên
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

// Component xử lý danh sách yêu cầu xin gia nhập (chỉ nhóm trưởng thấy)
const JoinRequests = ({ requests, groupId, refreshData }) => {
    // ... (Không đổi)
    const [isProcessing, setIsProcessing] = useState(null);
    const [alertInfo, setAlertInfo] = useState({ isOpen: false, action: null, requestId: null, studentName: '' });
    const alertTitleId = useId();
    const alertDescriptionId = useId();

    const openConfirmation = (action, requestId, studentName) => {
        setAlertInfo({ isOpen: true, action, requestId, studentName });
    };

    const onHandle = async () => {
        const { action, requestId } = alertInfo;
        if (!action || !requestId) return;

        setIsProcessing(requestId);
        try {
            const res = await handleJoinRequest(groupId, requestId, action);
            toast.success(res.message);
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Thao tác thất bại.');
        } finally {
            setIsProcessing(null);
            setAlertInfo({ isOpen: false, action: null, requestId: null, studentName: '' });
        }
    };

    if (!requests || requests.length === 0) return null;

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Yêu cầu xin gia nhập ({requests.length})</CardTitle>
                    <CardDescription>Các sinh viên đang chờ bạn duyệt để vào nhóm.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {requests.map(req => (
                        <div key={req.ID_YEUCAU} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                            <div className='flex items-center gap-3'>
                                <Avatar><AvatarFallback>{getInitials(req.nguoidung.HODEM_VA_TEN)}</AvatarFallback></Avatar>
                                <div>
                                    <p className="font-semibold">{req.nguoidung.HODEM_VA_TEN}</p>
                                    <p className="text-sm text-muted-foreground">{req.nguoidung.sinhvien?.chuyennganh?.TEN_CHUYENNGANH ?? req.nguoidung.MA_DINHDANH}</p>
                                    {req.LOINHAN && <p className="text-xs italic text-muted-foreground mt-1">"{req.LOINHAN}"</p>}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    size="icon" 
                                    disabled={isProcessing === req.ID_YEUCAU} 
                                    onClick={() => openConfirmation('accept', req.ID_YEUCAU, req.nguoidung.HODEM_VA_TEN)}
                                >
                                    {isProcessing === req.ID_YEUCAU ? <Loader2 className="h-4 w-4 animate-spin"/> : <UserCheck className="h-4 w-4" />}
                                </Button>
                                <Button 
                                    size="icon" 
                                    variant="destructive" 
                                    disabled={isProcessing === req.ID_YEUCAU} 
                                    onClick={() => openConfirmation('decline', req.ID_YEUCAU, req.nguoidung.HODEM_VA_TEN)}
                                >
                                    {isProcessing === req.ID_YEUCAU ? <Loader2 className="h-4 w-4 animate-spin"/> : <UserX className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <AlertDialog open={alertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertInfo(prev => ({ ...prev, isOpen: false }))}>
                <AlertDialogContent aria-labelledby={alertTitleId} aria-describedby={alertDescriptionId}>
                    <AlertDialogHeader>
                        <AlertDialogTitle id={alertTitleId}>Xác nhận {alertInfo.action === 'accept' ? 'chấp nhận' : 'từ chối'}?</AlertDialogTitle>
                        <AlertDialogDescription id={alertDescriptionId}>
                            Bạn có chắc chắn muốn {alertInfo.action === 'accept' ? 'chấp nhận' : 'từ chối'} yêu cầu tham gia của <strong>{alertInfo.studentName}</strong> không?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={onHandle}>Xác nhận</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

// Component chính hiển thị chi tiết và quản lý nhóm
export function GroupManagementView({ groupData, refreshData, planId }) {
    const { user } = useAuth();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isLeaveAlertOpen, setIsLeaveAlertOpen] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [transferTarget, setTransferTarget] = useState(null);
    const [isTransferring, setIsTransferring] = useState(false);

    const isLeader = user?.ID_NGUOIDUNG === groupData.ID_NHOMTRUONG;

    const phancong = groupData.phancong_detai_nhom;
    const hasTopic = phancong && phancong.detai;
    const isSubmitted = hasTopic && phancong.TRANGTHAI === 'Đã hoàn thành';
    const isImplementing = hasTopic && phancong.TRANGTHAI === 'Đang thực hiện';

    const leaveTitleId = useId();
    const leaveDescriptionId = useId();
    const transferTitleId = useId();
    const transferDescriptionId = useId();

    // Xử lý logic rời nhóm
    const handleLeaveGroup = async () => {
        setIsLeaving(true);
        try {
             // ***** SỬA ĐỔI: Truyền planId vào service *****
            const res = await leaveGroup(planId);
            toast.success(res.message);
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Rời nhóm thất bại.");
        } finally {
            setIsLeaving(false);
            setIsLeaveAlertOpen(false);
        }
    };

    // Xử lý logic chuyển quyền trưởng nhóm
    const handleTransferLeadership = async () => {
        if (!transferTarget) return;
        setIsTransferring(true);
        try {
            const res = await transferGroupLeadership(groupData.ID_NHOM, transferTarget.userId);
            toast.success(res.message);
            // ***** SỬA ĐỔI: Cập nhật dữ liệu nhóm sau khi chuyển quyền *****
            refreshData(); 
        } catch (error) {
            toast.error(error.response?.data?.message || "Chuyển quyền thất bại.");
        } finally {
            setIsTransferring(false);
            setTransferTarget(null);
        }
    };

     // ***** HÀM MỚI: Xử lý khi mời thành viên thành công (để cập nhật list) *****
    const onInviteSuccess = () => {
        refreshData();
    };

    return (
        <TooltipProvider delayDuration={100}>
            <div className="space-y-8">
                {/* Thẻ Tiêu đề và Mô tả nhóm */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">{groupData.TEN_NHOM}</CardTitle>
                        {groupData.MOTA ? (
                            <CardDescription className="flex items-start gap-2 pt-2">
                                <Info className="h-4 w-4 mt-1 shrink-0"/> {groupData.MOTA}
                            </CardDescription>
                        ) : (
                            <CardDescription>Quản lý thông tin và thành viên nhóm của bạn.</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        {/* Các nút hành động */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {isLeader && !hasTopic && ( // Chỉ cho mời khi chưa có đề tài
                                <Button onClick={() => setIsInviteOpen(true)}>
                                    <UserPlus className="mr-2 h-4 w-4" /> Mời thành viên
                                </Button>
                            )}
                            {!hasTopic && ( // Chỉ cho rời nhóm khi chưa có đề tài
                                <Button variant="destructive" onClick={() => setIsLeaveAlertOpen(true)}>
                                    <LogOut className="mr-2 h-4 w-4" /> Rời nhóm
                                </Button>
                            )}
                            {hasTopic && (
                                <Badge variant="secondary" className="text-base p-3 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                    <CheckCircle className="mr-2 h-5 w-5"/> Nhóm đã đăng ký đề tài
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>

{/* ----- THÊM MỚI: Khu vực Đề tài và Nộp sản phẩm ----- */}
                {hasTopic && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Đề tài của nhóm</CardTitle>
                            <CardDescription>
                                {phancong.detai.TEN_DETAI}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SubmissionArea 
                                phancong={phancong} 
                                refreshData={refreshData}
                                isLeader={isLeader}
                            />
                        </CardContent>
                    </Card>
                )}
                {/* ----- KẾT THÚC THÊM MỚI ----- */}


                {/* Danh sách yêu cầu gia nhập (chỉ hiển thị cho nhóm trưởng và khi chưa có đề tài) */}
                {isLeader && !hasTopic && <JoinRequests requests={groupData.yeucaus} groupId={groupData.ID_NHOM} refreshData={refreshData} />}

                {/* ***** MỚI: Danh sách lời mời đã gửi (chỉ nhóm trưởng) ***** */}
                {isLeader && !hasTopic && <SentInvitationsList invitations={groupData.loimois} groupId={groupData.ID_NHOM} refreshData={refreshData} />}

                {/* Danh sách thành viên */}
                <Card>
                    {/* ... (Phần CardHeader và logic map thành viên không đổi) ... */}
                    <CardHeader><CardTitle>Danh sách thành viên ({groupData.SO_THANHVIEN_HIENTAI}/4)</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {groupData.thanhviens.map(member => (
                            <div key={member.ID_NGUOIDUNG} className="flex items-center justify-between p-3 border rounded-md">
                                <div className="flex items-center gap-4">
                                    <Avatar><AvatarFallback>{getInitials(member.nguoidung.HODEM_VA_TEN)}</AvatarFallback></Avatar>
                                    <div>
                                        <div className="font-semibold flex items-center gap-2">
                                            {member.nguoidung.HODEM_VA_TEN}
                                            {member.ID_NGUOIDUNG === groupData.ID_NHOMTRUONG && (
                                                <Badge variant="destructive" className="gap-1 text-xs px-1.5 py-0.5">
                                                    <Crown className="h-3 w-3" />Trưởng nhóm
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{member.nguoidung.EMAIL}</p>
                                    </div>
                                </div>
                                {isLeader && member.ID_NGUOIDUNG !== groupData.ID_NHOMTRUONG && !hasTopic && ( // Chỉ cho chuyển quyền khi chưa có đề tài
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                                                onClick={() => setTransferTarget({ userId: member.ID_NGUOIDUNG, userName: member.nguoidung.HODEM_VA_TEN })}
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left">
                                            <p>Chuyển quyền trưởng nhóm</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>


                {/* Dialog Mời thành viên */}
                <InviteMemberDialog 
                    isOpen={isInviteOpen} 
                    setIsOpen={setIsInviteOpen} 
                    groupId={groupData.ID_NHOM} 
                    onSuccess={onInviteSuccess} // ***** SỬA ĐỔI: Dùng hàm mới *****
                />

                {/* Dialog Xác nhận Rời nhóm */}
                <AlertDialog open={isLeaveAlertOpen} onOpenChange={setIsLeaveAlertOpen}>
                    <AlertDialogContent aria-labelledby={leaveTitleId} aria-describedby={leaveDescriptionId}>
                        <AlertDialogHeader>
                            <AlertDialogTitle id={leaveTitleId}>Xác nhận rời nhóm?</AlertDialogTitle>
                            <AlertDialogDescription id={leaveDescriptionId}>
                                {isLeader && groupData.SO_THANHVIEN_HIENTAI > 1
                                    ? "Bạn là nhóm trưởng và không thể rời đi khi nhóm còn thành viên. Vui lòng chuyển quyền trưởng nhóm trước."
                                    : "Bạn có chắc chắn muốn rời khỏi nhóm này không? Hành động này không thể hoàn tác."
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleLeaveGroup}
                                disabled={isLeaving || (isLeader && groupData.SO_THANHVIEN_HIENTAI > 1)}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                {isLeaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xác nhận
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Dialog Xác nhận Chuyển quyền Trưởng nhóm */}
                <AlertDialog open={!!transferTarget} onOpenChange={(open) => !open && setTransferTarget(null)}>
                    <AlertDialogContent aria-labelledby={transferTitleId} aria-describedby={transferDescriptionId}>
                        <AlertDialogHeader>
                            <AlertDialogTitle id={transferTitleId}>Xác nhận chuyển quyền Trưởng nhóm?</AlertDialogTitle>
                            <AlertDialogDescription id={transferDescriptionId}>
                                Bạn có chắc chắn muốn chuyển quyền trưởng nhóm cho <strong>{transferTarget?.userName}</strong>? Bạn sẽ trở thành thành viên bình thường.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isTransferring}>Hủy</AlertDialogCancel>
                            <AlertDialogAction onClick={handleTransferLeadership} disabled={isTransferring}>
                                {isTransferring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xác nhận Chuyển quyền
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </TooltipProvider>
    );
}