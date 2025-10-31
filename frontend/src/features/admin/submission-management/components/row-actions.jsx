import React, { useState } from 'react';
import { MoreHorizontal, Eye, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { confirmSubmission } from '@/api/adminSubmissionService';
import { RejectSubmissionDialog } from './RejectDialog'; // Sẽ tạo dialog này

export function SubmissionRowActions({ row, onViewDetails, onSuccess }) {
    const [isConfirmAlertOpen, setIsConfirmAlertOpen] = useState(false);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const submission = row.original;

    // Xử lý xác nhận
    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            const res = await confirmSubmission(submission.ID_NOP_SANPHAM);
            toast.success(res.message);
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Xác nhận thất bại.");
        } finally {
            setIsLoading(false);
            setIsConfirmAlertOpen(false);
        }
    };

    // Xử lý từ chối (sau khi dialog Reject thành công)
    const onRejectSuccess = () => {
        onSuccess();
        setIsRejectDialogOpen(false);
    }

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
                    <DropdownMenuItem onClick={() => onViewDetails(submission)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Xem chi tiết & Files
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsConfirmAlertOpen(true)} className="text-green-600 focus:text-green-700">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Xác nhận (Đủ)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsRejectDialogOpen(true)} className="text-destructive focus:text-destructive">
                        <XCircle className="mr-2 h-4 w-4" />
                        Yêu cầu nộp lại
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Dialog xác nhận */}
            <AlertDialog open={isConfirmAlertOpen} onOpenChange={setIsConfirmAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận nộp sản phẩm?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xác nhận nhóm "{submission.phancong?.nhom?.TEN_NHOM}" đã nộp đủ sản phẩm?
                            Hành động này sẽ chuyển trạng thái của nhóm sang "Đã hoàn thành".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Xác nhận
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog từ chối */}
            <RejectSubmissionDialog
                isOpen={isRejectDialogOpen}
                setIsOpen={setIsRejectDialogOpen}
                submission={submission}
                onSuccess={onRejectSuccess}
            />
        </>
    );
}