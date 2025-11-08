import React from 'react';
import { MoreHorizontal, CheckCircle, XCircle, Edit, Eye, Loader2 } from "lucide-react";
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

export function DataTableRowActions({ row, onViewDetails, onApprove, onReject, onRequestEdit }) {
    const [isAlertOpen, setIsAlertOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const topic = row.original;
    const isPending = topic.TRANGTHAI === "Chờ duyệt";

    const handleApproveClick = async () => {
        setIsAlertOpen(true);
    };

    const confirmApprove = async () => {
        setIsLoading(true);
        await onApprove(topic.ID_DETAI);
        setIsLoading(false);
        setIsAlertOpen(false);
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
                            <DropdownMenuItem onClick={handleApproveClick} className="text-green-600 focus:text-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                <span>Duyệt đề tài</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onRequestEdit(topic)} className="text-orange-600 focus:text-orange-700">
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Yêu cầu chỉnh sửa</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onReject(topic)} className="text-destructive focus:text-destructive">
                                <XCircle className="mr-2 h-4 w-4" />
                                <span>Từ chối</span>
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận duyệt đề tài?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Đề tài "{topic.TEN_DETAI}" sẽ được duyệt và hiển thị cho sinh viên đăng ký.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmApprove}
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
