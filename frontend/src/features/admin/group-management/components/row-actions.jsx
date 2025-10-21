import React, { useState, useId } from 'react';
import { MoreHorizontal, Pencil, UserPlus, Trash2, Star, ShieldAlert, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { markGroupAsSpecial, deleteGroup } from '@/api/adminGroupService';

export function GroupRowActions({ row, onEdit, onAddStudent, onSuccess }) {
    const [alertInfo, setAlertInfo] = useState({ isOpen: false, type: null });
    const group = row.original;
    const alertTitleId = useId();
    const alertDescriptionId = useId();

    const openConfirmation = (type) => setAlertInfo({ isOpen: true, type: type });

    const handleAction = async () => {
        const { type } = alertInfo;
        try {
            if (type === 'special') {
                const newStatus = !group.LA_NHOM_DACBIET;
                const res = await markGroupAsSpecial(group.ID_NHOM, newStatus);
                toast.success(res.message);
            } else if (type === 'delete' || type === 'disband') { // Combined logic
                await deleteGroup(group.ID_NHOM);
                toast.success(`Đã ${type === 'delete' ? 'xóa' : 'giải tán'} nhóm "${group.TEN_NHOM}".`);
            }
            onSuccess();
        } catch (error) { toast.error(error.response?.data?.message || "Thao tác thất bại."); }
        finally { setAlertInfo({ isOpen: false, type: null }); }
    };

    const getAlertContent = () => {
        switch (alertInfo.type) {
            case 'special': return { title: `Xác nhận ${group.LA_NHOM_DACBIET ? 'Gỡ' : 'Đánh dấu'} Đặc biệt?`, description: `Bạn có chắc muốn ${group.LA_NHOM_DACBIET ? 'gỡ đánh dấu' : 'đánh dấu'} nhóm "${group.TEN_NHOM}" là nhóm đặc biệt không?` };
            case 'disband': return { title: 'Xác nhận Giải tán Nhóm?', description: `Hành động này sẽ xóa nhóm "${group.TEN_NHOM}" và loại bỏ tất cả thành viên khỏi nhóm. Bạn chắc chắn muốn tiếp tục?` };
            case 'delete': return { title: 'Xác nhận Xóa Nhóm?', description: `Hành động này không thể hoàn tác. Xóa vĩnh viễn nhóm "${group.TEN_NHOM}"?` };
            default: return {};
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(group)}><Pencil className="mr-2 h-4 w-4" /> Sửa thông tin</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddStudent(group)}><UserPlus className="mr-2 h-4 w-4" /> Thêm thành viên</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openConfirmation('special')}>
                        {group.LA_NHOM_DACBIET ? <ShieldAlert className="mr-2 h-4 w-4" /> : <Star className="mr-2 h-4 w-4" />}
                        {group.LA_NHOM_DACBIET ? 'Gỡ đặc biệt' : 'Đánh dấu đặc biệt'}
                    </DropdownMenuItem>
                    {/* === START MODIFICATION: Change UsersX to UserX === */}
                    <DropdownMenuItem className="text-amber-600 focus:text-amber-700" onClick={() => openConfirmation('disband')}>
                        <UserX className="mr-2 h-4 w-4" /> Giải tán nhóm
                    </DropdownMenuItem>
                    {/* === END MODIFICATION === */}
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openConfirmation('delete')}><Trash2 className="mr-2 h-4 w-4" /> Xóa vĩnh viễn</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={alertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertInfo({ isOpen: false, type: null })}>
                <AlertDialogContent aria-labelledby={alertTitleId} aria-describedby={alertDescriptionId}>
                    <AlertDialogHeader>
                        <AlertDialogTitle id={alertTitleId}>{getAlertContent().title}</AlertDialogTitle>
                        <AlertDialogDescription id={alertDescriptionId}>{getAlertContent().description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAction} className={(alertInfo.type === 'delete' || alertInfo.type === 'disband') ? "bg-destructive hover:bg-destructive/90" : ""}>Xác nhận</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}