import React, { useState, useId } from 'react';
import { MoreHorizontal, Pencil, KeyRound, ToggleLeft, ToggleRight, Trash2, Loader2, ShieldAlert } from "lucide-react"; // Thêm ShieldAlert
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
import axiosClient from '@/api/axiosConfig'; // <-- THÊM IMPORT

// Component hiển thị menu hành động cho mỗi hàng trong bảng
export function DataTableRowActions({ row, onEdit, onSuccess }) {
    const [alertInfo, setAlertInfo] = useState({ isOpen: false, type: null }); // type: 'reset', 'toggle', 'delete'
    
    // ----- THÊM STATE MỚI CHO CẢNH BÁO NGHIÊM TRỌNG -----
    const [criticalAlertInfo, setCriticalAlertInfo] = useState({
        isOpen: false,
        data: null // Sẽ lưu { group_name, plan_name }
    });
    // --------------------------------------------------

    const [isLoading, setIsLoading] = useState(false);
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
            onSuccess(); // Gọi callback để làm mới dữ liệu
        } catch (error) {
            toast.error(error.response?.data?.message || "Thao tác thất bại.");
        } finally {
            setIsLoading(false);
            setAlertInfo({ isOpen: false, type: null }); // Đóng dialog
        }
    };

    // ----- SỬA ĐỔI: Xử lý xóa (lần 1) -----
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
                // Các lỗi khác (ví dụ: không thể tự xóa)
                toast.error(error.response?.data?.message || "Xóa thất bại.");
            }
        } finally {
            setIsLoading(false);
            setAlertInfo({ isOpen: false, type: null }); // Đóng dialog xác nhận ban đầu
        }
    };

     // ----- HÀM MỚI: Xử lý xóa (lần 2 - force) -----
    const handleForceDeleteUser = async () => {
        setIsLoading(true);
        try {
            // Gửi request xóa lần 2 (với force=true)
            // Phải dùng axiosClient trực tiếp để thêm params
            await axiosClient.delete(`/users/${user.ID_NGUOIDUNG}`, {
                params: { force: true }
            });
            toast.success(`Đã xóa bắt buộc người dùng ${user.HODEM_VA_TEN}.`);
            onSuccess();
        } catch (error) {
             toast.error(error.response?.data?.message || "Xóa thất bại.");
        } finally {
            setIsLoading(false);
            setCriticalAlertInfo({ isOpen: false, data: null }); // Đóng dialog cảnh báo nghiêm trọng
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
                    // SỬA ĐỔI: Mô tả chung hơn
                    description: `Bạn có chắc chắn muốn xóa ${user.HODEM_VA_TEN}? Hành động này không thể hoàn tác.`,
                    onConfirm: handleDeleteUser, // <-- Gọi hàm xóa lần 1
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
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Sửa thông tin</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openConfirmation('reset')}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        <span>Reset mật khẩu</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openConfirmation('toggle')}>
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
                    </DropdownMenuItem>
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
                            className={alertContent.actionClass}
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Xác nhận
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

             {/* ----- DIALOG MỚI: Cảnh báo xóa trưởng nhóm ----- */}
             <AlertDialog open={criticalAlertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setCriticalAlertInfo({ isOpen: false, data: null })}>
                <AlertDialogContent aria-labelledby={criticalTitleId} aria-describedby={criticalDescriptionId}>
                    <AlertDialogHeader>
                         <AlertDialogTitle id={criticalTitleId} className="flex items-center gap-2 text-destructive">
                             <ShieldAlert className="h-6 w-6" /> Cảnh báo nghiêm trọng!
                         </AlertDialogTitle>
                        <AlertDialogDescription id={criticalDescriptionId} className="text-base text-foreground">
                            Người dùng <strong>{user.HODEM_VA_TEN}</strong> hiện đang là Trưởng nhóm của:
                            <br />
                            <strong className="my-2 block text-center text-lg">
                                 Nhóm: "{criticalAlertInfo.data?.group_name}"
                                 <br/>
                                 Kế hoạch: "{criticalAlertInfo.data?.plan_name}"
                            </strong>
                            Kế hoạch này <strong className="text-destructive">ĐANG THỰC HIỆN</strong>.
                            <br/><br/>
                             Xóa người dùng này sẽ buộc chuyển quyền trưởng nhóm hoặc giải tán nhóm. Bạn có chắc chắn muốn <strong className="text-destructive">XÓA BẮT BUỘC</strong> không?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleForceDeleteUser} // <-- Gọi hàm force delete
                            disabled={isLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Tôi hiểu, Xóa bắt buộc
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};