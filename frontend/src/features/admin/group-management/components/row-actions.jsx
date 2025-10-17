import React, { useState } from 'react';
import { MoreHorizontal, Pencil, UserPlus, Trash2, Star, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { markGroupAsSpecial, deleteGroup } from '@/api/adminGroupService';

export function GroupRowActions({ row, onEdit, onAddStudent, onSuccess }) {
    const [alertInfo, setAlertInfo] = useState({ isOpen: false, type: null });
    const group = row.original;

    const openConfirmation = (type) => setAlertInfo({ isOpen: true, type });

    const handleAction = async () => {
        const { type } = alertInfo;
        try {
            if (type === 'special') {
                const newStatus = !group.LA_NHOM_DACBIET;
                const res = await markGroupAsSpecial(group.ID_NHOM, newStatus);
                toast.success(res.message);
            } else if (type === 'delete') {
                await deleteGroup(group.ID_NHOM);
                toast.success(`Đã xóa nhóm "${group.TEN_NHOM}" thành công.`);
            }
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Thao tác thất bại.");
        } finally {
            setAlertInfo({ isOpen: false, type: null });
        }
    };
    
    const getAlertContent = () => {
        switch (alertInfo.type) {
            case 'special':
                return {
                    title: `Xác nhận ${group.LA_NHOM_DACBIET ? 'Gỡ' : 'Đánh dấu'} Đặc biệt?`,
                    description: `Bạn có chắc muốn ${group.LA_NHOM_DACBIET ? 'gỡ đánh dấu' : 'đánh dấu'} nhóm "${group.TEN_NHOM}" là nhóm đặc biệt không? Nhóm này sẽ bị bỏ qua khi ghép nhóm tự động.`
                };
            case 'delete':
                return {
                    title: 'Xác nhận Xóa Nhóm?',
                    description: `Hành động này không thể hoàn tác. Bạn có chắc muốn xóa vĩnh viễn nhóm "${group.TEN_NHOM}" không?`
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
                    <DropdownMenuItem onClick={() => onEdit(group)}><Pencil className="mr-2 h-4 w-4" /> Sửa thông tin</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddStudent(group)}><UserPlus className="mr-2 h-4 w-4" /> Thêm thành viên</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openConfirmation('special')}>
                        {group.LA_NHOM_DACBIET ? <ShieldAlert className="mr-2 h-4 w-4" /> : <Star className="mr-2 h-4 w-4" />}
                        {group.LA_NHOM_DACBIET ? 'Gỡ đánh dấu đặc biệt' : 'Đánh dấu đặc biệt'}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => openConfirmation('delete')}>
                        <Trash2 className="mr-2 h-4 w-4" /> Xóa nhóm
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={alertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertInfo({ isOpen: false, type: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{getAlertContent().title}</AlertDialogTitle>
                        <AlertDialogDescription>{getAlertContent().description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAction} className={alertInfo.type === 'delete' ? "bg-destructive hover:bg-destructive/90" : ""}>
                            Xác nhận
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}