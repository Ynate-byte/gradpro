import React, { useState } from 'react';
import { MoreHorizontal, CheckCircle, XCircle, Edit, Eye, Loader2, Trash2 } from "lucide-react";
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

export function DataTableRowActions({ row, onViewDetails, onApprove, onReject, onRequestEdit, onDelete }) {
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const topic = row.original;
    
    // Chỉ hiện các nút Duyệt/Từ chối/Sửa khi trạng thái là Chờ duyệt
    const isPending = topic.TRANGTHAI === "Chờ duyệt";

    const handleApproveClick = () => {
        setIsAlertOpen(true);
    };

    const confirmApprove = async () => {
        setIsLoading(true);
        try {
            await onApprove(topic.ID_DETAI);
        } catch (error) {
            // Error handling is usually done in parent, but we catch here to stop loading
            console.error(error);
        } finally {
            setIsLoading(false);
            setIsAlertOpen(false);
        }
    };

    const handleDeleteClick = () => {
        // Gọi callback từ cha để mở dialog xác nhận xóa
        if (onDelete) {
            onDelete(topic);
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
                <DropdownMenuContent align="end" className="w-[180px]">
                    <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                    
                    <DropdownMenuItem onClick={() => onViewDetails(topic.ID_DETAI)}>
                        <Eye className="mr-2 h-4 w-4" />
                        <span>Xem chi tiết</span>
                    </DropdownMenuItem>

                    {isPending && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleApproveClick} className="text-green-600 focus:text-green-700 focus:bg-green-50">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                <span>Duyệt đề tài</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onRequestEdit(topic)} className="text-orange-600 focus:text-orange-700 focus:bg-orange-50">
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Yêu cầu chỉnh sửa</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onReject(topic)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <XCircle className="mr-2 h-4 w-4" />
                                <span>Từ chối</span>
                            </DropdownMenuItem>
                        </>
                    )}

                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Xóa đề tài</span>
                    </DropdownMenuItem>

                </DropdownMenuContent>
            </DropdownMenu>

            {/* Dialog xác nhận duyệt (Local) */}
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            Xác nhận duyệt đề tài?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Đề tài "<strong>{topic.TEN_DETAI}</strong>" sẽ được duyệt và hiển thị cho sinh viên đăng ký.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault(); // Prevent closing immediately
                                confirmApprove();
                            }}
                            disabled={isLoading}
                            className={cn("bg-green-600 hover:bg-green-700", "flex items-center")}
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Xác nhận duyệt
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}