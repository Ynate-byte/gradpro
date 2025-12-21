import React, { useState, useId } from 'react';
import { 
    MoreHorizontal, Pencil, Trash2, Send, CheckCircle, XCircle, 
    FileDown, Users, Loader2, Users2, PlayCircle, Database,
    RefreshCw // Import thêm icon RefreshCw
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle 
} from "@/components/ui/alert-dialog";
// Import thêm Dialog và Select
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';

// API Services (Thêm forceChangeStatus)
import { 
    deleteThesisPlan, 
    submitForApproval, 
    approvePlan, 
    requestChanges, 
    exportPlanDocument, 
    activatePlan,
    forceChangeStatus // <--- Import mới
} from '@/api/thesisPlanService.js';

import { BackupPlanDialog } from './BackupPlanDialog';

// Danh sách trạng thái đầy đủ
const ALL_STATUSES = [
    'Bản nháp', 'Chờ phê duyệt', 'Chờ duyệt chỉnh sửa', 'Yêu cầu chỉnh sửa',
    'Đã phê duyệt', 'Đang thực hiện', 'Đang chấm điểm', 'Đã hoàn thành', 'Đã hủy'
];

export function PlanRowActions({ row, onSuccess }) {
    const [alertInfo, setAlertInfo] = useState({ isOpen: false, type: null, comment: '' });
    
    // [MỚI] State cho dialog đổi trạng thái
    const [isChangeStatusOpen, setIsChangeStatusOpen] = useState(false);
    const [newStatus, setNewStatus] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const plan = row.original;
    const navigate = useNavigate();
    
    const titleId = useId();
    const descriptionId = useId();

    // --- PHÂN QUYỀN ---
    const { user } = useAuth();
    const userRoleName = user?.vaitro?.TEN_VAITRO;
    const positionCodes = user?.giangvien?.chucvus?.map(cv => cv.MA_CHUCVU) || [];

    const isAdmin = userRoleName === 'Admin';
    const isTruongKhoa = userRoleName === 'Trưởng khoa' || positionCodes.includes('TRUONG_KHOA');
    const isGiaoVu = userRoleName === 'Giáo vụ' || positionCodes.includes('GIAO_VU');
    
    const isCreator = plan.ID_NGUOITAO === user.ID_NGUOIDUNG;
    const status = plan.TRANGTHAI;

    // ... (Các biến quyền hạn cũ giữ nguyên) ...
    const canAccessDetails = (isAdmin || isTruongKhoa || isGiaoVu) && !['Bản nháp', 'Chờ phê duyệt', 'Yêu cầu chỉnh sửa', 'Đã hủy'].includes(status);
    const canExport = isAdmin || isTruongKhoa || isGiaoVu;
    const canEdit = (isTruongKhoa && status !== 'Đã hoàn thành') || ((isAdmin || isGiaoVu) && (((isCreator || isAdmin) && (status === 'Bản nháp' || status === 'Yêu cầu chỉnh sửa')) || (status === 'Đang thực hiện')));
    const canSubmit = (status === 'Bản nháp') && (isCreator && (isGiaoVu || isAdmin)); 
    const canApproveActions = isTruongKhoa && ['Chờ phê duyệt', 'Chờ duyệt chỉnh sửa'].includes(status);
    const canActivate = (status === 'Đã phê duyệt') && (isTruongKhoa || isGiaoVu || isAdmin);
    const canDelete = (isAdmin || isTruongKhoa) || (isGiaoVu && isCreator && status === 'Bản nháp');
    const canArchive = isAdmin || isGiaoVu || isTruongKhoa;

    // [MỚI] Quyền Force Change Status (Chỉ Admin và Trưởng khoa)
    const canForceChangeStatus = isAdmin || isTruongKhoa;

    // --- HANDLERS ---
    const openConfirmation = (type) => {
        setAlertInfo({ isOpen: true, type: type, comment: '' });
    };

    // [MỚI] Xử lý đổi trạng thái
    const handleForceChangeStatus = async () => {
        if (!newStatus || newStatus === plan.TRANGTHAI) {
            setIsOpenChangeStatus(false);
            return;
        }

        setIsLoading(true);
        try {
            const res = await forceChangeStatus(plan.ID_KEHOACH, newStatus);
            toast.success(res.message);
            setIsChangeStatusOpen(false);
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Đổi trạng thái thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async () => {
        const { type, comment } = alertInfo;
        setIsLoading(true);
        try {
            let res;
            switch (type) {
                case 'delete':
                    await deleteThesisPlan(plan.ID_KEHOACH);
                    toast.success(`Đã xóa kế hoạch "${plan.TEN_DOT}".`);
                    break;
                case 'submit':
                    res = await submitForApproval(plan.ID_KEHOACH);
                    toast.success(res.message);
                    break;
                case 'approve':
                    res = await approvePlan(plan.ID_KEHOACH);
                    toast.success(res.message);
                    break;
                case 'activate':
                    res = await activatePlan(plan.ID_KEHOACH);
                    toast.success(res.message);
                    break;
                case 'request_changes':
                    if (!comment) {
                        toast.error("Vui lòng nhập lý do.");
                        setIsLoading(false);
                        return;
                    }
                    res = await requestChanges(plan.ID_KEHOACH, comment);
                    toast.success(res.message);
                    break;
                default:
                    setIsLoading(false);
                    return;
            }
            onSuccess(); 
        } catch (error) {
            toast.error(error.response?.data?.message || "Thao tác thất bại.");
        } finally {
            setIsLoading(false);
            setAlertInfo({ isOpen: false, type: null, comment: '' });
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        const toastId = toast.info("Đang tạo file PDF...");
        try {
            const blob = await exportPlanDocument(plan.ID_KEHOACH);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Thong-bao-KLTN-${plan.KHOAHOC || 'plan'}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.dismiss(toastId);
            toast.success("Tải file PDF thành công!");
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Xuất file PDF thất bại.");
        } finally {
            setIsExporting(false);
        }
    };

    // ... (getAlertContent và getActionVariant giữ nguyên)
    const getAlertContent = () => {
        // (Copy nội dung cũ của bạn vào đây)
        switch (alertInfo.type) {
            case 'delete': return { title: 'Xác nhận Xóa Vĩnh viễn?', description: '...' }; // Rút gọn để tiết kiệm chỗ
            case 'submit': return { title: 'Xác nhận Gửi duyệt?', description: `Kế hoạch "${plan.TEN_DOT}" sẽ được gửi đến Trưởng Khoa để phê duyệt.` };
            case 'approve': return { title: 'Xác nhận Phê duyệt?', description: `Bạn có chắc chắn muốn phê duyệt kế hoạch "${plan.TEN_DOT}" không?` };
            case 'request_changes': return { title: 'Yêu cầu Chỉnh sửa', description: `Vui lòng nhập lý do yêu cầu chỉnh sửa cho kế hoạch "${plan.TEN_DOT}".` };
            case 'activate': return { title: 'Xác nhận Kích hoạt Kế hoạch?', description: `Bạn có chắc muốn bắt đầu thực hiện kế hoạch "${plan.TEN_DOT}" không?` };
            default: return {};
        }
    };

    const getActionVariant = () => {
         switch (alertInfo.type) {
            case 'delete': return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
            case 'approve': case 'activate': return "bg-green-600 text-white hover:bg-green-700";
            case 'request_changes': return "bg-orange-500 text-white hover:bg-orange-600";
            default: return "";
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Mở menu</span>
                    </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="end" className="w-[240px]">
                    <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* ... (Các mục menu cũ giữ nguyên: Quản lý chi tiết, Export, Backup) ... */}
                    {canAccessDetails && (
                        <>
                            <DropdownMenuItem onClick={() => navigate(`/admin/thesis-plans/${plan.ID_KEHOACH}/participants`)} className="cursor-pointer">
                                <Users2 className="mr-2 h-4 w-4" /> Quản lý SV Tham gia
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/groups?plan_id=${plan.ID_KEHOACH}`)} className="cursor-pointer">
                                <Users className="mr-2 h-4 w-4" /> Quản lý nhóm
                            </DropdownMenuItem>
                        </>
                    )}
                    
                    {canExport && (
                         <DropdownMenuItem onClick={handleExport} disabled={isExporting} className="cursor-pointer">
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Xuất Thông báo
                        </DropdownMenuItem>
                    )}

                    {canArchive && (
                        <BackupPlanDialog plan={plan}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer text-amber-700 focus:text-amber-800 focus:bg-amber-50">
                                <Database className="mr-2 h-4 w-4" /> Sao lưu dữ liệu
                            </DropdownMenuItem>
                        </BackupPlanDialog>
                    )}
                    
                    <DropdownMenuSeparator />

                    {/* ... (Các mục menu cũ giữ nguyên: Sửa, Gửi duyệt, Kích hoạt, Duyệt) ... */}
                    {canEdit && (
                        <DropdownMenuItem onClick={() => navigate(`/admin/thesis-plans/${plan.ID_KEHOACH}/edit`)} className="cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4" /> Sửa kế hoạch
                        </DropdownMenuItem>
                    )}

                    {canSubmit && (
                        <DropdownMenuItem onClick={() => openConfirmation('submit')} className="cursor-pointer text-blue-600 focus:text-blue-700">
                            <Send className="mr-2 h-4 w-4" /> Gửi duyệt
                        </DropdownMenuItem>
                    )}

                    {canActivate && (
                        <DropdownMenuItem onClick={() => openConfirmation('activate')} className="cursor-pointer text-green-600 focus:text-green-700">
                            <PlayCircle className="mr-2 h-4 w-4" /> Kích hoạt
                        </DropdownMenuItem>
                    )}
                    
                    {canApproveActions && (
                        <>
                            <DropdownMenuItem onClick={() => openConfirmation('approve')} className="cursor-pointer text-green-600 focus:text-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" /> Phê duyệt
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openConfirmation('request_changes')} className="cursor-pointer text-orange-600 focus:text-orange-700">
                                <XCircle className="mr-2 h-4 w-4" /> Yêu cầu chỉnh sửa
                            </DropdownMenuItem>
                        </>
                    )}

                    {/* --- [MỚI] MỤC ĐỔI TRẠNG THÁI (ADMIN/TRƯỞNG KHOA) --- */}
                    {canForceChangeStatus && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={() => {
                                    setNewStatus(plan.TRANGTHAI);
                                    setIsChangeStatusOpen(true);
                                }} 
                                className="cursor-pointer text-purple-600 focus:text-purple-700 focus:bg-purple-50"
                            >
                                <RefreshCw className="mr-2 h-4 w-4" /> Đổi trạng thái
                            </DropdownMenuItem>
                        </>
                    )}
                    
                    {canDelete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive bg-destructive/5" onClick={() => openConfirmation('delete')}>
                                <Trash2 className="mr-2 h-4 w-4" /> Xóa kế hoạch
                            </DropdownMenuItem>
                        </>
                    )}

                </DropdownMenuContent>
            </DropdownMenu>

            {/* Dialog Confirm chung (Giữ nguyên) */}
            <AlertDialog open={alertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertInfo(prev => ({ ...prev, isOpen: false }))}>
                <AlertDialogContent aria-labelledby={titleId} aria-describedby={descriptionId}>
                    <AlertDialogHeader>
                        <AlertDialogTitle id={titleId}>{getAlertContent().title || "Xác nhận"}</AlertDialogTitle>
                        <AlertDialogDescription id={descriptionId}>
                             {/* Nếu là component thì render trực tiếp, nếu string thì bọc */}
                             {typeof getAlertContent().description === 'string' ? getAlertContent().description : getAlertContent().description}
                        </AlertDialogDescription>
                        {alertInfo.type === 'request_changes' && (
                            <div className="pt-4">
                                <Label htmlFor="comment" className="text-left">Lý do*</Label>
                                <Input id="comment" value={alertInfo.comment} onChange={(e) => setAlertInfo(prev => ({ ...prev, comment: e.target.value }))} className="mt-2" placeholder="Nhập nội dung cần chỉnh sửa..."/>
                            </div>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAction} disabled={isLoading} className={getActionVariant()}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                            Xác nhận
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* --- [MỚI] DIALOG ĐỔI TRẠNG THÁI --- */}
            <Dialog open={isChangeStatusOpen} onOpenChange={setIsChangeStatusOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Đổi trạng thái kế hoạch</DialogTitle>
                        <DialogDescription>
                            Thay đổi trực tiếp trạng thái của kế hoạch "{plan.TEN_DOT}". <br/>
                            <span className="text-red-500 font-semibold">Lưu ý: Chỉ dùng khi cần thiết để sửa lỗi quy trình.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">Trạng thái mới</Label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ALL_STATUSES.map(st => (
                                        <SelectItem key={st} value={st} disabled={st === plan.TRANGTHAI}>
                                            {st}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsChangeStatusOpen(false)} disabled={isLoading}>Hủy</Button>
                        <Button onClick={handleForceChangeStatus} disabled={isLoading || newStatus === plan.TRANGTHAI} className="bg-purple-600 hover:bg-purple-700">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Cập nhật
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}