import React, { useState, useId } from 'react';
import { 
    MoreHorizontal, Pencil, Trash2, Send, CheckCircle, XCircle, 
    FileDown, Users, Loader2, Users2, PlayCircle, Database 
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';

// API Services
import { 
    deleteThesisPlan, 
    submitForApproval, 
    approvePlan, 
    requestChanges, 
    exportPlanDocument, 
    activatePlan 
} from '@/api/thesisPlanService.js';

// Component Dialog Backup
import { BackupPlanDialog } from './BackupPlanDialog';

/**
 * Component hiển thị menu hành động cho mỗi hàng trong bảng kế hoạch.
 */
export function PlanRowActions({ row, onSuccess }) {
    // State quản lý Alert Dialog (Xóa, Duyệt...)
    const [alertInfo, setAlertInfo] = useState({ isOpen: false, type: null, comment: '' });
    const [isLoading, setIsLoading] = useState(false);
    
    // State quản lý export PDF
    const [isExporting, setIsExporting] = useState(false);

    const plan = row.original;
    const navigate = useNavigate();
    
    // IDs cho Accessibility
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

    // 1. Quyền xem/quản lý chi tiết (SV, Nhóm)
    // Chỉ hiện khi kế hoạch đã đi vào hoạt động hoặc đã được duyệt
    const canAccessDetails = 
        (isAdmin || isTruongKhoa || isGiaoVu) && 
        !['Bản nháp', 'Chờ phê duyệt', 'Yêu cầu chỉnh sửa', 'Đã hủy'].includes(status);

    // 2. Quyền xuất file (luôn có thể với cấp quản lý)
    const canExport = isAdmin || isTruongKhoa || isGiaoVu;

    // 3. Quyền Sửa
    const canEdit = 
        (isTruongKhoa && status !== 'Đã hoàn thành') || // Trưởng khoa sửa mọi lúc (trừ khi đã đóng)
        ( 
            (isAdmin || isGiaoVu) && 
            (
                ((isCreator || isAdmin) && (status === 'Bản nháp' || status === 'Yêu cầu chỉnh sửa')) || // Người tạo sửa khi nháp
                (status === 'Đang thực hiện') // Hoặc sửa nóng khi đang chạy (cần thận trọng)
            )
        );
    
    // 4. Quyền Gửi duyệt (Chỉ người tạo ở trạng thái nháp)
    const canSubmit = (status === 'Bản nháp') && (isCreator && (isGiaoVu || isAdmin)); 
    
    // 5. Quyền Phê duyệt/Yêu cầu sửa (Chỉ Trưởng Khoa)
    const canApproveActions = 
        isTruongKhoa && 
        ['Chờ phê duyệt', 'Chờ duyệt chỉnh sửa'].includes(status);
    
    // 6. Quyền Kích hoạt (Chuyển từ Đã duyệt -> Đang thực hiện)
    const canActivate = 
        (status === 'Đã phê duyệt') && 
        (isTruongKhoa || isGiaoVu || isAdmin);
    
    // 7. Quyền Xóa (Admin/TK xóa mọi lúc, GV chỉ xóa bản nháp)
    const canDelete = 
        (isAdmin || isTruongKhoa) || 
        (isGiaoVu && isCreator && status === 'Bản nháp');

    // 8. Quyền Sao lưu (Backup)
    const canArchive = isAdmin || isGiaoVu || isTruongKhoa;

    // --- HANDLERS ---

    /**
     * Mở dialog xác nhận hành động (Xóa, Duyệt,...)
     */
    const openConfirmation = (type) => {
        setAlertInfo({ isOpen: true, type: type, comment: '' });
    };

    /**
     * Thực thi hành động gọi API
     */
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
            onSuccess(); // Refresh table data
        } catch (error) {
            toast.error(error.response?.data?.message || "Thao tác thất bại.");
        } finally {
            setIsLoading(false);
            setAlertInfo({ isOpen: false, type: null, comment: '' });
        }
    };

    /**
     * Xử lý xuất file PDF thông báo.
     */
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

    // Helper: Nội dung Dialog xác nhận
    const getAlertContent = () => {
        switch (alertInfo.type) {
            case 'delete':
                return {
                    title: 'Xác nhận Xóa Vĩnh viễn?',
                    description: (
                        <div className="space-y-2">
                            <p>Bạn đang thực hiện xóa kế hoạch <strong>{plan.TEN_DOT}</strong> ({plan.TRANGTHAI}).</p>
                            <ul className="list-disc pl-5 text-sm text-muted-foreground">
                                <li>Tất cả <strong>Nhóm, Sinh viên, Điểm số, Hội đồng</strong> sẽ bị xóa vĩnh viễn.</li>
                                <li className="text-green-600 font-medium">Các <strong>Đề tài</strong> sẽ được giữ lại (tách khỏi kế hoạch) để tái sử dụng.</li>
                            </ul>
                            <p className="font-bold text-red-600 mt-2">Hành động này không thể hoàn tác!</p>
                        </div>
                    )
                };
            case 'submit':
                return {
                    title: 'Xác nhận Gửi duyệt?',
                    description: `Kế hoạch "${plan.TEN_DOT}" sẽ được gửi đến Trưởng Khoa để phê duyệt.`
                };
            case 'approve':
                return {
                    title: 'Xác nhận Phê duyệt?',
                    description: `Bạn có chắc chắn muốn phê duyệt kế hoạch "${plan.TEN_DOT}" không?`
                };
            case 'request_changes':
                return {
                    title: 'Yêu cầu Chỉnh sửa',
                    description: `Vui lòng nhập lý do yêu cầu chỉnh sửa cho kế hoạch "${plan.TEN_DOT}".`
                };
            case 'activate':
                return {
                    title: 'Xác nhận Kích hoạt Kế hoạch?',
                    description: `Bạn có chắc muốn bắt đầu thực hiện kế hoạch "${plan.TEN_DOT}" không? Sau khi kích hoạt, kế hoạch sẽ chuyển sang trạng thái "Đang thực hiện".`
                };
            default:
                return {};
        }
    };

    // Helper: Màu nút xác nhận
    const getActionVariant = () => {
        switch (alertInfo.type) {
            case 'delete':
                return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
            case 'approve':
            case 'activate':
                return "bg-green-600 text-white hover:bg-green-700";
            case 'request_changes':
                return "bg-orange-500 text-white hover:bg-orange-600";
            default:
                return "";
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
                
                <DropdownMenuContent align="end" className="w-[230px]">
                    <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* --- NHÓM QUẢN LÝ CHI TIẾT --- */}
                    <DropdownMenuItem 
                        onClick={() => navigate(`/admin/thesis-plans/${plan.ID_KEHOACH}/participants`)} 
                        disabled={!canAccessDetails}
                        className="cursor-pointer"
                    >
                        <Users2 className="mr-2 h-4 w-4" />
                        Quản lý SV Tham gia
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onClick={() => navigate(`/admin/groups?plan_id=${plan.ID_KEHOACH}`)} 
                        disabled={!canAccessDetails}
                        className="cursor-pointer"
                    >
                        <Users className="mr-2 h-4 w-4" />
                        Quản lý nhóm
                    </DropdownMenuItem>
                    
                    {/* --- NHÓM FILE & BACKUP --- */}
                    {canExport && (
                         <DropdownMenuItem onClick={handleExport} disabled={isExporting} className="cursor-pointer">
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Xuất Thông báo
                        </DropdownMenuItem>
                    )}

                    {canArchive && (
                        <BackupPlanDialog plan={plan}>
                            <DropdownMenuItem 
                                onSelect={(e) => e.preventDefault()} 
                                className="cursor-pointer text-amber-700 focus:text-amber-800 focus:bg-amber-50"
                            >
                                <Database className="mr-2 h-4 w-4" /> Sao lưu dữ liệu
                            </DropdownMenuItem>
                        </BackupPlanDialog>
                    )}
                    
                    {/* --- NHÓM THAO TÁC TRẠNG THÁI --- */}
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
                    
                    {/* --- NHÓM PHÊ DUYỆT (TRƯỞNG KHOA) --- */}
                    {canApproveActions && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openConfirmation('approve')} className="cursor-pointer text-green-600 focus:text-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" /> Phê duyệt
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openConfirmation('request_changes')} className="cursor-pointer text-orange-600 focus:text-orange-700">
                                <XCircle className="mr-2 h-4 w-4" /> Yêu cầu chỉnh sửa
                            </DropdownMenuItem>
                        </>
                    )}
                    
                    {/* --- NHÓM XÓA --- */}
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

            {/* Dialog Confirm chung cho các hành động đơn giản */}
            <AlertDialog open={alertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertInfo(prev => ({ ...prev, isOpen: false }))}>
                <AlertDialogContent aria-labelledby={titleId} aria-describedby={descriptionId}>
                    <AlertDialogHeader>
                        <AlertDialogTitle id={titleId}>{getAlertContent().title || "Xác nhận"}</AlertDialogTitle>
                        <AlertDialogDescription id={descriptionId}>{getAlertContent().description}</AlertDialogDescription>
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
        </>
    )
}