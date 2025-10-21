import React, { useState, useId } from 'react';
import { MoreHorizontal, Pencil, Trash2, Send, CheckCircle, XCircle, FileDown, Users, Loader2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deleteThesisPlan, submitForApproval, approvePlan, requestChanges, exportPlanDocument } from '@/api/thesisPlanService.js';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Component hiển thị menu hành động cho mỗi hàng trong bảng kế hoạch.
 */
export function PlanRowActions({ row, onSuccess }) {
    const [alertInfo, setAlertInfo] = useState({ isOpen: false, type: null, comment: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const plan = row.original;
    const navigate = useNavigate();
    const titleId = useId();
    const descriptionId = useId();

    /**
     * Mở dialog xác nhận hành động.
     */
    const openConfirmation = (type) => {
        setAlertInfo({ isOpen: true, type: type, comment: '' });
    };

    /**
     * Xử lý các hành động như xóa, gửi duyệt, phê duyệt...
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

    /**
     * Xử lý xuất file PDF thông báo.
     */
    const handleExport = async () => {
        setIsExporting(true);
        toast.info("Đang chuẩn bị file PDF...");
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
            toast.success("Tải file PDF thành công!");
        } catch (error) {
            toast.error("Xuất file PDF thất bại.");
        } finally {
            setIsExporting(false);
        }
    };

    /**
     * Lấy nội dung cho dialog xác nhận dựa trên loại hành động.
     */
    const getAlertContent = () => {
        switch (alertInfo.type) {
            case 'delete':
                return {
                    title: 'Xác nhận Xóa Kế hoạch?',
                    description: `Hành động này không thể hoàn tác. Bạn có chắc muốn xóa vĩnh viễn kế hoạch "${plan.TEN_DOT}" không?`
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
            default:
                return {};
        }
    };

    /**
     * Lấy màu cho nút xác nhận trong dialog.
     */
    const getActionVariant = () => {
        switch (alertInfo.type) {
            case 'delete':
                return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
            case 'approve':
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
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(`/admin/groups?plan_id=${plan.ID_KEHOACH}`)}>
                        <Users className="mr-2 h-4 w-4" />
                        Quản lý nhóm
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExport} disabled={isExporting}>
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        {isExporting ? "Đang xử lý..." : "Xuất Thông báo"}
                    </DropdownMenuItem>
                    {(plan.TRANGTHAI === 'Bản nháp' || plan.TRANGTHAI === 'Yêu cầu chỉnh sửa') && (
                        <DropdownMenuItem onClick={() => navigate(`/admin/thesis-plans/${plan.ID_KEHOACH}/edit`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Sửa
                        </DropdownMenuItem>
                    )}
                    {plan.TRANGTHAI === 'Bản nháp' && (
                        <DropdownMenuItem onClick={() => openConfirmation('submit')}>
                            <Send className="mr-2 h-4 w-4" />
                            Gửi duyệt
                        </DropdownMenuItem>
                    )}
                    {plan.TRANGTHAI === 'Chờ phê duyệt' && (
                        <>
                            <DropdownMenuItem onClick={() => openConfirmation('approve')} className="text-green-600 focus:text-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Phê duyệt
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openConfirmation('request_changes')} className="text-orange-600 focus:text-orange-700">
                                <XCircle className="mr-2 h-4 w-4" />
                                Yêu cầu chỉnh sửa
                            </DropdownMenuItem>
                        </>
                    )}
                    {plan.TRANGTHAI === 'Bản nháp' && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openConfirmation('delete')}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Xóa
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={alertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertInfo(prev => ({ ...prev, isOpen: false }))}>
                <AlertDialogContent aria-labelledby={titleId} aria-describedby={descriptionId}>
                    <AlertDialogHeader>
                        <AlertDialogTitle id={titleId}>{getAlertContent().title}</AlertDialogTitle>
                        <AlertDialogDescription id={descriptionId}>
                            {getAlertContent().description}
                        </AlertDialogDescription>
                        {alertInfo.type === 'request_changes' && (
                            <div className="pt-4">
                                <Label htmlFor="comment" className="text-left">Lý do*</Label>
                                <Input
                                    id="comment"
                                    placeholder="VD: Vui lòng điều chỉnh..."
                                    value={alertInfo.comment}
                                    onChange={(e) => setAlertInfo(prev => ({ ...prev, comment: e.target.value }))}
                                    className="mt-2"
                                />
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
