import React, { useState, useId } from 'react';
import { MoreHorizontal, Pencil, KeyRound, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
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

// Hiển thị menu hành động cho mỗi hàng trong bảng
export function DataTableRowActions({ row, onEdit, onSuccess }) {
  const [isResetAlertOpen, setIsResetAlertOpen] = useState(false);
  const [isToggleStatusAlertOpen, setIsToggleStatusAlertOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const user = row.original;
  const resetTitleId = useId();
  const resetDescriptionId = useId();
  const toggleTitleId = useId();
  const toggleDescriptionId = useId();
  const deleteTitleId = useId();
  const deleteDescriptionId = useId();

  // Reset mật khẩu người dùng về mặc định
  const handleResetPassword = async () => {
    try {
      await resetPassword(user.ID_NGUOIDUNG);
      toast.success(`Đã reset mật khẩu cho ${user.HODEM_VA_TEN}.`);
      onSuccess();
    } catch (error) {
      toast.error("Reset mật khẩu thất bại.");
    }
    setIsResetAlertOpen(false);
  };

  // Thay đổi trạng thái kích hoạt/vô hiệu hóa tài khoản
  const handleToggleStatus = async () => {
    const newStatus = !user.TRANGTHAI_KICHHOAT;
    const actionText = newStatus ? "Kích hoạt" : "Vô hiệu hóa";
    try {
      await updateUser(user.ID_NGUOIDUNG, { TRANGTHAI_KICHHOAT: newStatus });
      toast.success(`${actionText} tài khoản ${user.HODEM_VA_TEN} thành công!`);
      onSuccess();
    } catch (error) {
      toast.error("Thay đổi trạng thái thất bại.");
    }
    setIsToggleStatusAlertOpen(false);
  };

  // Xóa vĩnh viễn người dùng
  const handleDeleteUser = async () => {
    try {
      await deleteUser(user.ID_NGUOIDUNG);
      toast.success(`Đã xóa vĩnh viễn người dùng ${user.HODEM_VA_TEN}.`);
      onSuccess();
    } catch (error) {
      toast.error("Xóa người dùng thất bại.");
    }
    setIsDeleteAlertOpen(false);
  };

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
          <DropdownMenuItem onClick={() => setIsResetAlertOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            <span>Reset mật khẩu</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsToggleStatusAlertOpen(true)}>
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
          <DropdownMenuItem onClick={() => setIsDeleteAlertOpen(true)} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Xóa vĩnh viễn</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={isResetAlertOpen} onOpenChange={setIsResetAlertOpen}>
        <AlertDialogContent aria-labelledby={resetTitleId} aria-describedby={resetDescriptionId}>
          <AlertDialogHeader>
            <AlertDialogTitle id={resetTitleId}>Xác nhận Reset Mật khẩu?</AlertDialogTitle>
            <AlertDialogDescription id={resetDescriptionId}>
              Đặt lại mật khẩu cho <strong>{user.HODEM_VA_TEN}</strong> về mặc định?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>Xác nhận</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isToggleStatusAlertOpen} onOpenChange={setIsToggleStatusAlertOpen}>
        <AlertDialogContent aria-labelledby={toggleTitleId} aria-describedby={toggleDescriptionId}>
          <AlertDialogHeader>
            <AlertDialogTitle id={toggleTitleId}>Xác nhận thay đổi trạng thái?</AlertDialogTitle>
            <AlertDialogDescription id={toggleDescriptionId}>
              Bạn có chắc muốn <strong>{user.TRANGTHAI_KICHHOAT ? "vô hiệu hóa" : "kích hoạt"}</strong> tài khoản của <strong>{user.HODEM_VA_TEN}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              className={user.TRANGTHAI_KICHHOAT ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent aria-labelledby={deleteTitleId} aria-describedby={deleteDescriptionId}>
          <AlertDialogHeader>
            <AlertDialogTitle id={deleteTitleId}>Xác nhận Xóa Vĩnh Viễn?</AlertDialogTitle>
            <AlertDialogDescription id={deleteDescriptionId}>
              Hành động này <strong>không thể hoàn tác</strong>. Xóa vĩnh viễn người dùng <strong>{user.HODEM_VA_TEN}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xác nhận Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};