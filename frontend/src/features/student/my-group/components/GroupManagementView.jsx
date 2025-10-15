import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, UserPlus, LogOut, Info, UserCheck, UserX, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InviteMemberDialog } from './InviteMemberDialog';
import { handleJoinRequest, leaveGroup } from '@/api/groupService';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const JoinRequests = ({ requests, groupId, refreshData }) => {
    const [isProcessing, setIsProcessing] = useState(null);
    const [alertInfo, setAlertInfo] = useState({ isOpen: false, action: null, requestId: null, studentName: '' });

    const openConfirmation = (action, requestId, studentName) => {
        setAlertInfo({ isOpen: true, action, requestId, studentName });
    };

    const onHandle = async () => {
        const { action, requestId } = alertInfo;
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
                                <Avatar>
                                    <AvatarFallback>{getInitials(req.nguoidung.HODEM_VA_TEN)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{req.nguoidung.HODEM_VA_TEN}</p>
                                    <p className="text-sm text-muted-foreground">{req.nguoidung.sinhvien?.chuyennganh?.TEN_CHUYENNGANH}</p>
                                    {req.LOINHAN && <p className="text-xs italic text-muted-foreground mt-1">"{req.LOINHAN}"</p>}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="icon" disabled={isProcessing === req.ID_YEUCAU} onClick={() => openConfirmation('accept', req.ID_YEUCAU, req.nguoidung.HODEM_VA_TEN)}><UserCheck className="h-4 w-4" /></Button>
                                <Button size="icon" variant="destructive" disabled={isProcessing === req.ID_YEUCAU} onClick={() => openConfirmation('decline', req.ID_YEUCAU, req.nguoidung.HODEM_VA_TEN)}><UserX className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <AlertDialog open={alertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertInfo(prev => ({...prev, isOpen: false}))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận {alertInfo.action === 'accept' ? 'chấp nhận' : 'từ chối'}?</AlertDialogTitle>
                        <AlertDialogDescription>
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

export function GroupManagementView({ groupData, refreshData }) {
    const { user } = useAuth();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isLeaveAlertOpen, setIsLeaveAlertOpen] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const isLeader = user?.ID_NGUOIDUNG === groupData.ID_NHOMTRUONG;

    const handleLeaveGroup = async () => {
        setIsLeaving(true);
        try {
            const res = await leaveGroup();
            toast.success(res.message);
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Rời nhóm thất bại.");
        } finally {
            setIsLeaving(false);
            setIsLeaveAlertOpen(false);
        }
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">{groupData.TEN_NHOM}</CardTitle>
                    {groupData.MOTA ? (
                        <CardDescription className="flex items-start gap-2 pt-2"><Info className="h-4 w-4 mt-1 shrink-0"/> {groupData.MOTA}</CardDescription>
                    ) : (
                        <CardDescription>Quản lý thông tin và thành viên nhóm của bạn.</CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 mb-6">
                        {isLeader && (
                            <Button onClick={() => setIsInviteOpen(true)}>
                                <UserPlus className="mr-2 h-4 w-4" /> Mời thành viên
                            </Button>
                        )}
                        <Button variant="destructive" onClick={() => setIsLeaveAlertOpen(true)}>
                            <LogOut className="mr-2 h-4 w-4" /> Rời nhóm
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLeader && <JoinRequests requests={groupData.yeucaus} groupId={groupData.ID_NHOM} refreshData={refreshData} />}

            <Card>
                <CardHeader>
                    <CardTitle>Danh sách thành viên ({groupData.SO_THANHVIEN_HIENTAI}/4)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {groupData.thanhviens.map(member => (
                        <div key={member.ID_NGUOIDUNG} className="flex items-center justify-between p-3 border rounded-md">
                            <div className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarFallback>{getInitials(member.nguoidung.HODEM_VA_TEN)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-semibold flex items-center gap-2">
                                        {member.nguoidung.HODEM_VA_TEN}
                                        {member.ID_NGUOIDUNG === groupData.ID_NHOMTRUONG && (
                                            <Badge variant="destructive" className="gap-1"><Crown className="h-3 w-3" />Trưởng nhóm</Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{member.nguoidung.EMAIL}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <InviteMemberDialog 
                isOpen={isInviteOpen} 
                setIsOpen={setIsInviteOpen} 
                groupId={groupData.ID_NHOM} 
            />

            <AlertDialog open={isLeaveAlertOpen} onOpenChange={setIsLeaveAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận rời nhóm?</AlertDialogTitle>
                        <AlertDialogDescription>
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
                            {isLeaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Xác nhận
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}