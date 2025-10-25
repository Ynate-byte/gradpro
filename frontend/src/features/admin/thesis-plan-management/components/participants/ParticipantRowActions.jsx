import React, { useState, useId } from 'react';
import { MoreHorizontal, Trash2, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
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
import { updateParticipantEligibility, removeParticipantFromPlan } from '@/api/thesisPlanService';

export function ParticipantRowActions({ row, onSuccess }) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [actionType, setActionType] = useState(null); // 'toggle' or 'delete'
  const [isLoading, setIsLoading] = useState(false);
  const participant = row.original;
  const studentName = participant.sinhvien?.nguoidung?.HODEM_VA_TEN || 'Sinh viên này';
  const planId = participant.ID_KEHOACH;
  const participantId = participant.ID_THAMGIA;
  const isEligible = participant.DU_DIEUKIEN;

  const alertTitleId = useId();
  const alertDescriptionId = useId();

  const openConfirmation = (type) => {
    setActionType(type);
    setIsAlertOpen(true);
  };

  const handleAction = async () => {
    setIsLoading(true);
    try {
      if (actionType === 'toggle') {
        const newStatus = !isEligible;
        await updateParticipantEligibility(planId, participantId, newStatus);
        toast.success(`Đã cập nhật trạng thái đủ điều kiện cho ${studentName}.`);
      } else if (actionType === 'delete') {
        await removeParticipantFromPlan(planId, participantId);
        toast.success(`Đã xóa ${studentName} khỏi kế hoạch.`);
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || "Thao tác thất bại.");
    } finally {
      setIsLoading(false);
      setIsAlertOpen(false);
      setActionType(null);
    }
  };

  const getAlertContent = () => {
    if (actionType === 'toggle') {
      return {
        title: `Xác nhận thay đổi trạng thái?`,
        description: `Bạn có chắc muốn đánh dấu ${studentName} là ${isEligible ? '"Không đủ điều kiện"' : '"Đủ điều kiện"'} không?`,
        actionText: 'Xác nhận'
      };
    } else if (actionType === 'delete') {
      return {
        title: 'Xác nhận xóa Sinh viên?',
        description: `Hành động này sẽ xóa ${studentName} khỏi kế hoạch này. Bạn chắc chắn muốn tiếp tục?`,
        actionText: 'Xác nhận Xóa',
        actionVariant: 'destructive'
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
        <DropdownMenuContent align="end" className="w-[180px]">
          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => openConfirmation('toggle')}>
            {isEligible ? (
              <>
                <ShieldOff className="mr-2 h-4 w-4 text-orange-600" />
                <span className="text-orange-600">Đánh dấu Không đủ</span>
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                <span className="text-green-600">Đánh dấu Đủ</span>
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => openConfirmation('delete')}
            className="text-destructive focus:text-destructive"
            disabled={isLoading}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Xóa khỏi kế hoạch
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent aria-labelledby={alertTitleId} aria-describedby={alertDescriptionId}>
          <AlertDialogHeader>
            <AlertDialogTitle id={alertTitleId}>{alertContent.title}</AlertDialogTitle>
            <AlertDialogDescription id={alertDescriptionId}>{alertContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isLoading}
              className={alertContent.actionVariant === 'destructive' ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {alertContent.actionText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
