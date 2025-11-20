import React, { useState } from 'react';
import { MoreHorizontal, Eye, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { confirmSubmission } from '@/api/adminSubmissionService';
import { RejectSubmissionDialog } from './RejectDialog';

export function SubmissionRowActions({ row, onViewDetails, onSuccess }) {
    const [isConfirmAlertOpen, setIsConfirmAlertOpen] = useState(false);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const submission = row.original;
    const isPending = submission.TRANGTHAI === 'Chờ xác nhận';

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

    const onRejectSuccess = () => {
        onSuccess();
        setIsRejectDialogOpen(false);
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                    <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onViewDetails(submission)}>
                        <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                        Xem chi tiết
                    </DropdownMenuItem>
                    
                    {isPending && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setIsConfirmAlertOpen(true)} className="text-green-600 focus:text-green-700 focus:bg-green-50">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Xác nhận
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsRejectDialogOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <XCircle className="mr-2 h-4 w-4" />
                                Yêu cầu nộp lại
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Dialog xác nhận */}
            <AlertDialog open={isConfirmAlertOpen} onOpenChange={setIsConfirmAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận nộp sản phẩm?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn xác nhận nhóm "<strong>{submission.phancong?.nhom?.TEN_NHOM}</strong>" đã nộp đủ sản phẩm?
                            <br/>Trạng thái nhóm sẽ chuyển sang "Đã hoàn thành".
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

            <RejectSubmissionDialog
                isOpen={isRejectDialogOpen}
                setIsOpen={setIsRejectDialogOpen}
                submission={submission}
                onSuccess={onRejectSuccess}
            />
        </>
    );
}