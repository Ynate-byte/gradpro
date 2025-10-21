import React, { useState, useId } from 'react';
import { MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react"; // Added Loader2
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deleteAdminThesisPlanTemplate } from '@/api/thesisPlanService'; // Use admin delete function

export function TemplateRowActions({ row, onEdit, onSuccess }) {
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false); // Loading state for delete
    const template = row.original;
    const deleteTitleId = useId();
    const deleteDescriptionId = useId();

    const handleDeleteTemplate = async () => {
        setIsDeleting(true); // Start loading
        try {
            await deleteAdminThesisPlanTemplate(template.ID_MAU);
            toast.success(`Đã xóa bản mẫu "${template.TEN_MAU}".`);
            onSuccess(); // Refresh the list
        } catch (error) {
            toast.error(error.response?.data?.message || "Xóa bản mẫu thất bại.");
        } finally {
            setIsDeleting(false); // Stop loading
            setIsDeleteAlertOpen(false);
        }
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
                <DropdownMenuContent align="end" className="w-[160px]">
                    <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(template)}>
                        <Pencil className="mr-2 h-4 w-4" /> Sửa
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setIsDeleteAlertOpen(true)}
                        className="text-destructive focus:text-destructive"
                        disabled={isDeleting} // Disable delete while processing
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Xóa
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent aria-labelledby={deleteTitleId} aria-describedby={deleteDescriptionId}>
                    <AlertDialogHeader>
                        <AlertDialogTitle id={deleteTitleId}>Xác nhận Xóa Bản mẫu?</AlertDialogTitle>
                        <AlertDialogDescription id={deleteDescriptionId}>
                            Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa vĩnh viễn bản mẫu <strong>"{template.TEN_MAU}"</strong> không?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel> {/* Disable cancel while deleting */}
                        <AlertDialogAction
                            onClick={handleDeleteTemplate}
                            disabled={isDeleting} // Disable action while deleting
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {/* Show loader */}
                            Xác nhận Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}