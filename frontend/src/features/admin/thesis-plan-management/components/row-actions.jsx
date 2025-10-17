import React, { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2, Send, CheckCircle, XCircle, FileDown, Users } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deleteThesisPlan, submitForApproval, approvePlan, requestChanges, exportPlanDocument } from '@/api/thesisPlanService.js';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// THAY ĐỔI: Không cần truyền onEdit nữa
export function PlanRowActions({ row, onSuccess }) {
    const [alertInfo, setAlertInfo] = useState({ isOpen: false, type: null, comment: '' });
    const [isExporting, setIsExporting] = useState(false);
    const plan = row.original;
    const navigate = useNavigate();

    const openConfirmation = (type) => setAlertInfo({ isOpen: true, type: type, comment: '' });

    const handleAction = async () => {
        const { type, comment } = alertInfo;
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
                        toast.error("Vui lòng nhập lý do yêu cầu chỉnh sửa.");
                        return;
                    }
                    res = await requestChanges(plan.ID_KEHOACH, comment);
                    toast.success(res.message);
                    break;
                default:
                    return;
            }
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Thao tác thất bại.");
        } finally {
            setAlertInfo({ isOpen: false, type: null, comment: '' });
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        toast.info("Đang chuẩn bị file PDF, vui lòng đợi...");
        try {
            const blob = await exportPlanDocument(plan.ID_KEHOACH);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Thong-bao-KLTN-${plan.KHOAHOC}.pdf`;
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
                    description: `Kế hoạch "${plan.TEN_DOT}" sẽ được gửi đến Trưởng Khoa để phê duyệt. Bạn sẽ không thể chỉnh sửa cho đến khi có phản hồi.`
                };
            case 'approve':
                return {
                    title: 'Xác nhận Phê duyệt?',
                    description: `Bạn có chắc chắn muốn phê duyệt kế hoạch "${plan.TEN_DOT}" không? Kế hoạch sẽ được công khai sau khi phê duyệt.`
                };
            case 'request_changes':
                return {
                    title: 'Yêu cầu Chỉnh sửa',
                    description: `Vui lòng nhập lý do yêu cầu chỉnh sửa cho kế hoạch "${plan.TEN_DOT}". Giáo vụ sẽ nhận được thông báo này.`
                };
            default: return {};
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {/* Sửa lại route của Quản lý nhóm cho đúng */}
                    <DropdownMenuItem onClick={() => navigate(`/admin/groups?plan_id=${plan.ID_KEHOACH}`)}>
                        <Users className="mr-2 h-4 w-4" /> Quản lý nhóm
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExport} disabled={isExporting}>
                        <FileDown className="mr-2 h-4 w-4" />
                        {isExporting ? "Đang xử lý..." : "Xuất Thông báo"}
                    </DropdownMenuItem>
                    {/* Sửa lại hàm onClick của nút Sửa */}
                    {(plan.TRANGTHAI === 'Bản nháp' || plan.TRANGTHAI === 'Yêu cầu chỉnh sửa') && (
                        <DropdownMenuItem onClick={() => navigate(`/admin/thesis-plans/${plan.ID_KEHOACH}/edit`)}><Pencil className="mr-2 h-4 w-4" /> Sửa</DropdownMenuItem>
                    )}
                    {plan.TRANGTHAI === 'Bản nháp' && (
                        <DropdownMenuItem onClick={() => openConfirmation('submit')}><Send className="mr-2 h-4 w-4" /> Gửi duyệt</DropdownMenuItem>
                    )}
                    {plan.TRANGTHAI === 'Chờ phê duyệt' && (
                        <>
                            <DropdownMenuItem onClick={() => openConfirmation('approve')} className="text-green-600 focus:text-green-700"><CheckCircle className="mr-2 h-4 w-4" /> Phê duyệt</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openConfirmation('request_changes')} className="text-orange-600 focus:text-orange-700"><XCircle className="mr-2 h-4 w-4" /> Yêu cầu chỉnh sửa</DropdownMenuItem>
                        </>
                    )}
                    {plan.TRANGTHAI === 'Bản nháp' && (
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openConfirmation('delete')}>
                            <Trash2 className="mr-2 h-4 w-4" /> Xóa
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={alertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertInfo(prev => ({ ...prev, isOpen: false }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{getAlertContent().title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {getAlertContent().description}
                        </AlertDialogDescription>
                        {alertInfo.type === 'request_changes' && (
                            <div className="pt-4">
                                <Label htmlFor="comment">Lý do</Label>
                                <Input
                                    id="comment"
                                    placeholder="VD: Vui lòng điều chỉnh lại mốc thời gian nộp báo cáo..."
                                    value={alertInfo.comment}
                                    onChange={(e) => setAlertInfo(prev => ({...prev, comment: e.target.value}))}
                                />
                            </div>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAction}>Xác nhận</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}