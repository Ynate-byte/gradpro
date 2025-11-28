import React, { useState } from 'react';
import { MoreHorizontal, Send, Trash2, Loader2, Eye, Users, AlertCircle, Edit } from "lucide-react";
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
import { cn } from "@/lib/utils";

export function DataTableRowActions({
    row,
    currentUserId,
    onEdit,
    onDelete,
    onSubmit,
    onViewDetails,
    onAddSuggestion,
    onViewRegisteredGroups,
    canSubmitApproval = true // Mặc định cho phép nếu không truyền props (Feature flag)
}) {
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [actionType, setActionType] = useState(null);

    const topic = row.original;
    const isOwner = String(topic.ID_NGUOI_DEXUAT) === String(currentUserId);
    
    // Logic phân quyền hiển thị
    const canEdit = isOwner && ['Nháp', 'Yêu cầu chỉnh sửa', 'Đang chỉnh sửa'].includes(topic.TRANGTHAI);
    
    // Nút gửi duyệt chỉ hiện khi là Nháp hoặc Yêu cầu chỉnh sửa
    const canSubmit = isOwner && 
                      ['Nháp', 'Yêu cầu chỉnh sửa'].includes(topic.TRANGTHAI) && 
                      canSubmitApproval;

    // [CẬP NHẬT] Cho phép xóa khi: Nháp, Yêu cầu sửa HOẶC TỪ CHỐI (và chưa có nhóm đăng ký)
    const canDelete = isOwner && 
                      ['Nháp', 'Yêu cầu chỉnh sửa', 'Từ chối'].includes(topic.TRANGTHAI) && 
                      topic.SO_NHOM_HIENTAI === 0;

    const canSuggest = !isOwner && ['Nháp', 'Chờ duyệt', 'Đang chỉnh sửa'].includes(topic.TRANGTHAI);
    const canViewGroups = isOwner && topic.SO_NHOM_HIENTAI > 0;

    const openConfirmation = (type) => {
        setActionType(type);
        setIsAlertOpen(true);
    };

    const handleConfirmAction = async () => {
        setIsLoading(true);
        if (actionType === 'delete') {
            await onDelete(topic.ID_DETAI);
        } else if (actionType === 'submit') {
            await onSubmit(topic.ID_DETAI);
        }
        setIsLoading(false);
        setIsAlertOpen(false);
    };

    const getAlertContent = () => {
        if (actionType === 'delete') {
            return {
                title: 'Xác nhận Xóa Đề tài?',
                description: `Bạn có chắc chắn muốn xóa đề tài "${topic.TEN_DETAI}"? Hành động này không thể hoàn tác.`,
                actionClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            };
        }
        if (actionType === 'submit') {
            return {
                title: 'Xác nhận Gửi duyệt Đề tài?',
                description: `Đề tài "${topic.TEN_DETAI}" sẽ được gửi đến Admin/Trưởng khoa để duyệt. Bạn có chắc chắn?`,
                actionClass: "bg-blue-600 hover:bg-blue-700"
            };
        }
        return {};
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
                <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                    
                    <DropdownMenuItem onClick={() => onViewDetails(topic.ID_DETAI)}>
                        <Eye className="mr-2 h-4 w-4" />
                        <span>Xem chi tiết</span>
                    </DropdownMenuItem>

                    {canViewGroups && (
                        <DropdownMenuItem onClick={() => onViewRegisteredGroups(topic)}>
                            <Users className="mr-2 h-4 w-4" />
                            <span>Xem nhóm ĐK ({topic.SO_NHOM_HIENTAI})</span>
                        </DropdownMenuItem>
                    )}

                    {canSuggest && (
                        <DropdownMenuItem onClick={() => onAddSuggestion(topic.ID_DETAI)}>
                            <Send className="mr-2 h-4 w-4" />
                            <span>Gửi góp ý</span>
                        </DropdownMenuItem>
                    )}

                    {isOwner && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Quản lý đề tài</DropdownMenuLabel>
                            
                            {canEdit && (
                                <DropdownMenuItem onClick={() => onEdit(topic)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Chỉnh sửa</span>
                                </DropdownMenuItem>
                            )}

                            {canSubmit && (
                                <DropdownMenuItem onClick={() => openConfirmation('submit')} className="text-blue-600 focus:text-blue-700">
                                    <Send className="mr-2 h-4 w-4" />
                                    <span>Gửi duyệt</span>
                                </DropdownMenuItem>
                            )}

                            {(topic.TRANGTHAI === 'Yêu cầu chỉnh sửa' || topic.TRANGTHAI === 'Từ chối') && (
                                <DropdownMenuItem onClick={() => onViewDetails(topic.ID_DETAI)} className="text-orange-600 focus:text-orange-700">
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    <span>Xem lý do {topic.TRANGTHAI === 'Từ chối' ? 'từ chối' : 'yêu cầu sửa'}</span>
                                </DropdownMenuItem>
                            )}

                            {canDelete && (
                                <DropdownMenuItem onClick={() => openConfirmation('delete')} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Xóa đề tài</span>
                                </DropdownMenuItem>
                            )}
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{alertContent.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {alertContent.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmAction}
                            disabled={isLoading}
                            className={cn(alertContent.actionClass, "flex items-center")}
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Xác nhận
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}