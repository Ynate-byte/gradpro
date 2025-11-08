import React, { useState, useId } from 'react';
import { MoreHorizontal, Pencil, KeyRound, ToggleLeft, ToggleRight, Trash2, Loader2, ShieldAlert } from "lucide-react";
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
import { toast } from "sonner";
import { deleteUser, resetPassword, updateUser } from "@/api/userService";
import { cn } from "@/lib/utils";
import axiosClient from '@/api/axiosConfig';

// Component hiển thị menu hành động cho mỗi hàng trong bảng
export function DataTableRowActions({ row, onEdit, onSuccess }) {
    const [alertInfo, setAlertInfo] = useState({ isOpen: false, type: null }); // type: 'reset', 'toggle', 'delete'
    const [criticalAlertInfo, setCriticalAlertInfo] = useState({
        isOpen: false,
        data: null // Sẽ lưu { group_name, plan_name }
    });
    const [isLoading, setIsLoading] = useState(false); // State quản lý loading chung cho các action
    const user = row.original;
    const titleId = useId();
    const descriptionId = useId();
    const criticalTitleId = useId();
    const criticalDescriptionId = useId();

    // Mở dialog xác nhận hành động
    const openConfirmation = (type) => {
        setAlertInfo({ isOpen: true, type: type });
    };

    // Xử lý các hành động Reset và Toggle
    const handleSimpleAction = async () => {
        const { type } = alertInfo;
        setIsLoading(true);
        try {
            if (type === 'reset') {
                await resetPassword(user.ID_NGUOIDUNG);
                toast.success(`Đã reset mật khẩu cho ${user.HODEM_VA_TEN}.`);
            } else if (type === 'toggle') {
                const newStatus = !user.TRANGTHAI_KICHHOAT;
                const actionText = newStatus ? "Kích hoạt" : "Vô hiệu hóa";
                await updateUser(user.ID_NGUOIDUNG, { TRANGTHAI_KICHHOAT: newStatus });
                toast.success(`${actionText} tài khoản ${user.HODEM_VA_TEN} thành công!`);
            }
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Thao tác thất bại.");
        } finally {
            setIsLoading(false);
            setAlertInfo({ isOpen: false, type: null });
        }
    };

    // Xử lý xóa (lần 1)
    const handleDeleteUser = async () => {
        setIsLoading(true);
        try {
            // Gửi request xóa lần đầu (không có force)
            await deleteUser(user.ID_NGUOIDUNG);
            toast.success(`Đã xóa người dùng ${user.HODEM_VA_TEN}.`);
            onSuccess();
        } catch (error) {
            if (error.response?.status === 409 && error.response?.data?.data?.conflict_type === 'active_leader') {
                // Nếu là lỗi 409 do trưởng nhóm đang hoạt động, mở dialog cảnh báo nghiêm trọng
                setCriticalAlertInfo({
                    isOpen: true,
                    data: error.response.data.data // Lưu thông tin lỗi
                });
            } else {
                // Các lỗi khác
                toast.error(error.response?.data?.message || "Xóa thất bại.");
            }
        } finally {
            setIsLoading(false);
            setAlertInfo({ isOpen: false, type: null });
        }
    };

     // Xử lý xóa (lần 2 - force)
    const handleForceDeleteUser = async () => {
        setIsLoading(true);
        try {
            // Gửi request xóa lần 2 (với force=true)
            await axiosClient.delete(`/users/${user.ID_NGUOIDUNG}`, {
                params: { force: true }
            });
            toast.success(`Đã xóa bắt buộc người dùng ${user.HODEM_VA_TEN}.`);
            onSuccess();
        } catch (error) {
             toast.error(error.response?.data?.message || "Xóa thất bại.");
        } finally {
            setIsLoading(false);
            setCriticalAlertInfo({ isOpen: false, data: null });
        }
    }

    // Lấy nội dung cho dialog xác nhận
    const getAlertContent = () => {
        switch (alertInfo.type) {
            case 'reset':
                return {
                    title: 'Xác nhận Reset Mật khẩu?',
                    description: `Đặt lại mật khẩu cho ${user.HODEM_VA_TEN} về mặc định ("123456")?`,
                    onConfirm: handleSimpleAction,
                    actionClass: ""
                };
            case 'toggle':
                const actionText = user.TRANGTHAI_KICHHOAT ? "vô hiệu hóa" : "kích hoạt";
                return {
                    title: `Xác nhận ${actionText} tài khoản?`,
                    description: `Bạn có chắc muốn ${actionText} tài khoản của ${user.HODEM_VA_TEN}?`,
                    onConfirm: handleSimpleAction,
                    actionClass: user.TRANGTHAI_KICHHOAT ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""
                };
            case 'delete':
                return {
                    title: 'Xác nhận Xóa Vĩnh Viễn?',
                    description: `Bạn có chắc chắn muốn xóa ${user.HODEM_VA_TEN}? Hành động này không thể hoàn tác.`,
                    onConfirm: handleDeleteUser,
                    actionClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                };
            default:
                return {};
        }
    };

    const alertContent = getAlertContent();

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Mở menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                    <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                    {/* Sửa thông tin */}
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Sửa thông tin</span>
                    </DropdownMenuItem>
                    {/* Reset mật khẩu */}
                    <DropdownMenuItem onClick={() => openConfirmation('reset')}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        <span>Reset mật khẩu</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {/* Kích hoạt/Vô hiệu hóa */}
                    <DropdownMenuItem onClick={() => openConfirmation('toggle')}>
                        {/* --- SỬA LỖI SLOT --- */}
                        <span className="flex items-center w-full">
                            {user.TRANGTHAI_KICHHOAT ? (
                                <>
                                    <ToggleLeft className="mr-2 h-4 w-4 text-amber-600" />
                                    <span className="text-amber-600">Vô hiệu hóa</span>
                                </>
                            ) : (
                                <>
                                    <ToggleRight className="mr-2 h-4 w-4 text-green-600" />
                                    <span className="text-green-600">Kích hoạt</span>
                                </>
                            )}
                        </span>
                        {/* --- KẾT THÚC SỬA LỖI --- */}
                    </DropdownMenuItem>
                    {/* Xóa */}
                    <DropdownMenuItem onClick={() => openConfirmation('delete')} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Xóa vĩnh viễn</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Dialog xác nhận chuẩn (Reset, Toggle, Delete lần 1) */}
            <AlertDialog open={alertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertInfo({ isOpen: false, type: null })}>
                <AlertDialogContent aria-labelledby={titleId} aria-describedby={descriptionId}>
                    <AlertDialogHeader>
                        <AlertDialogTitle id={titleId}>{alertContent.title}</AlertDialogTitle>
                        <AlertDialogDescription id={descriptionId}>
                            {alertContent.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={alertContent.onConfirm}
                            disabled={isLoading}
                            className={cn(alertContent.actionClass, "flex items-center")}
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Xác nhận
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

             {/* Dialog cảnh báo xóa trưởng nhóm (Delete lần 2 - Force) */}
             <AlertDialog open={criticalAlertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setCriticalAlertInfo({ isOpen: false, data: null })}>
                <AlertDialogContent aria-labelledby={criticalTitleId} aria-describedby={criticalDescriptionId}>
                    <AlertDialogHeader>
                         <AlertDialogTitle id={criticalTitleId} className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="h-6 w-6" /> Cảnh báo nghiêm trọng!
                         </AlertDialogTitle>
                         <AlertDialogDescription id={criticalDescriptionId} className="text-base text-foreground space-y-3">
                             <p>
                                 Người dùng <strong>{user.HODEM_VA_TEN}</strong> hiện đang là Trưởng nhóm của một nhóm thuộc kế hoạch <strong className="text-destructive">ĐANG THỰC HIỆN</strong>.
                             </p>
                             <div className="border bg-muted/50 p-3 rounded-md text-sm space-y-1">
                                 <div><span className="font-medium text-muted-foreground">Nhóm:</span> "{criticalAlertInfo.data?.group_name}"</div>
                                 <div><span className="font-medium text-muted-foreground">Kế hoạch:</span> "{criticalAlertInfo.data?.plan_name}"</div>
                             </div>
                             <p>
                                 Việc xóa người dùng này sẽ tự động <strong className="text-destructive">chuyển quyền trưởng nhóm hoặc giải tán nhóm</strong> nói trên.
                             </p>
                             <p>
                                 Bạn có chắc chắn muốn <strong className="text-destructive">XÓA BẮT BUỘC</strong> người dùng này không?
                             </p>
                         </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleForceDeleteUser} // Gọi hàm force delete
                            disabled={isLoading} // Disable khi đang loading
                            className={cn("bg-destructive hover:bg-destructive/90", "flex items-center")} // Luôn màu đỏ
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Tôi hiểu, Xóa bắt buộc
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}