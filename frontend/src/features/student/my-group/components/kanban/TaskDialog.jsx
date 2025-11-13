import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 
import {
    createTask, updateTask, assignTask, deleteTask, 
    getTaskDetails, addChecklistItem, updateChecklistItem, deleteChecklistItem, addComment 
} from '@/api/kanbanService';
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, ChevronsUpDown, User, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';

import { TaskChecklist } from './TaskChecklist';
import { TaskComments } from './TaskComments';

// (Schema và helper giữ nguyên)
const taskSchema = z.object({
    TEN_CONGVIEC: z.string().min(3, { message: "Tiêu đề phải có ít nhất 3 ký tự." }).max(255),
    MOTA: z.string().optional().nullable(),
    ID_COT: z.string().min(1, "Vui lòng chọn cột."),
    NGAY_HETHAN: z.string().optional().nullable(),
    DO_UUTIEN: z.enum(['Thấp', 'Trung bình', 'Cao']),
    TRANGTHAI: z.enum(['Hoạt động', 'Tạm dừng', 'Đã hủy']),
});
const formatDateTimeLocal = (dateString) => {
    if (!dateString) return "";
    try {
        return format(parseISO(dateString), "yyyy-MM-dd'T'HH:mm");
    } catch { return ""; }
};
const formatFromInput = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toISOString();
};


export function TaskDialog({ state, setState, nhomId, members = [], columns = [] }) {
    const { isOpen, task: taskToEdit, colId: defaultColumnId } = state;
    const queryClient = useQueryClient();
    const isEditMode = !!taskToEdit;
    
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

    const form = useForm({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            TEN_CONGVIEC: '', MOTA: '', ID_COT: '',
            NGAY_HETHAN: '', DO_UUTIEN: 'Trung bình', TRANGTHAI: 'Hoạt động',
        }
    });

    const { data: fullTaskData, isLoading: isLoadingDetails } = useQuery({
        queryKey: ['taskDetails', taskToEdit?.ID_CONGVIEC],
        queryFn: () => getTaskDetails(taskToEdit.ID_CONGVIEC),
        enabled: isOpen && isEditMode,
    });

    const activeTask = fullTaskData || taskToEdit;

    // (useEffect load dữ liệu vào form giữ nguyên)
    useEffect(() => {
        if (isOpen) {
            if (isEditMode && activeTask) {
                form.reset({
                    TEN_CONGVIEC: activeTask.TEN_CONGVIEC,
                    MOTA: activeTask.MOTA || '',
                    ID_COT: String(activeTask.ID_COT),
                    NGAY_HETHAN: formatDateTimeLocal(activeTask.NGAY_HETHAN),
                    DO_UUTIEN: activeTask.DO_UUTIEN,
                    TRANGTHAI: activeTask.TRANGTHAI,
                });
                setSelectedUsers(activeTask.nguoi_duoc_phan_cong || []);
            } else {
                form.reset({
                    TEN_CONGVIEC: '', MOTA: '',
                    ID_COT: String(defaultColumnId || columns[0]?.ID_COT || ''),
                    NGAY_HETHAN: '', DO_UUTIEN: 'Trung bình', TRANGTHAI: 'Hoạt động',
                });
                setSelectedUsers([]);
            }
        }
    }, [isOpen, isEditMode, activeTask, defaultColumnId, columns, form]);

    // ===== [SỬA LỖI KÉO THẢ] =====
    // Hàm làm mới chung (khi đóng dialog)
    const invalidateBoardAndClose = () => {
        queryClient.invalidateQueries({ queryKey: ['kanbanBoard', nhomId] });
        queryClient.invalidateQueries({ queryKey: ['taskStats', nhomId] });
        handleClose();
    };

    // Hàm làm mới riêng (khi ở trong dialog)
    const invalidateDetails = () => {
        // Chỉ làm mới data bên trong dialog
        queryClient.invalidateQueries({ queryKey: ['taskDetails', taskToEdit.ID_CONGVIEC] });
        // Gỡ bỏ dòng làm mới kanbanBoard để tránh lỗi kéo thả
        // queryClient.invalidateQueries({ queryKey: ['kanbanBoard', nhomId] });
    };
    // ============================

    const assignMutation = useMutation({
        mutationFn: ({ taskId, userIds }) => assignTask(taskId, userIds),
        onSuccess: () => {
            toast.success(isEditMode ? "Cập nhật công việc thành công!" : "Tạo công việc thành công!");
            invalidateBoardAndClose();
        },
        onError: (error) => toast.error(error.response?.data?.message || "Lỗi khi gán người phụ trách."),
    });

    const taskMutation = useMutation({
        mutationFn: (data) => {
            const payload = {
                ...data,
                ID_COT: Number(data.ID_COT),
                NGAY_HETHAN: formatFromInput(data.NGAY_HETHAN),
            };
            if (isEditMode) {
                return updateTask(taskToEdit.ID_CONGVIEC, payload);
            }
            payload.assignee_ids = selectedUsers.map(u => u.ID_NGUOIDUNG);
            return createTask(nhomId, payload);
        },
        onSuccess: (data) => {
            const assigneeIds = selectedUsers.map(u => u.ID_NGUOIDUNG);
            
            // [SỬA LỖI 422] Luôn gọi assignMutation, kể cả khi mảng rỗng (để un-assign)
            if (isEditMode) {
                assignMutation.mutate({ taskId: data.ID_CONGVIEC, userIds: assigneeIds });
            } else {
                // Chế độ tạo (đã gửi assignees trong payload)
                toast.success("Tạo công việc thành công!");
                invalidateBoardAndClose();
            }
        },
        onError: (error) => toast.error(error.response?.data?.message || "Thao tác thất bại."),
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteTask(taskToEdit.ID_CONGVIEC),
        onSuccess: () => {
            toast.success("Đã xóa công việc!");
            setIsDeleteAlertOpen(false);
            invalidateBoardAndClose();
        },
        onError: (error) => toast.error(error.response?.data?.message || "Xóa thất bại."),
    });

    const handleDelete = () => {
        if (!taskToEdit) return;
        deleteMutation.mutate();
    };

    // (Các mutation cho Checklist và Comment - Đã sửa onSuccess)
    const addChecklistMutation = useMutation({
        mutationFn: (content) => addChecklistItem(taskToEdit.ID_CONGVIEC, content),
        onSuccess: () => invalidateDetails(),
        onError: (error) => toast.error(error.response?.data?.message || "Thêm thất bại."),
    });
    const deleteChecklistMutation = useMutation({
        mutationFn: (itemId) => deleteChecklistItem(itemId),
        onSuccess: () => invalidateDetails(),
        onError: (error) => toast.error(error.response?.data?.message || "Xóa thất bại."),
    });
    const toggleChecklistMutation = useMutation({
        mutationFn: ({ itemId, isCompleted }) => updateChecklistItem(itemId, isCompleted),
        onSuccess: () => invalidateDetails(),
        onError: (error) => toast.error(error.response?.data?.message || "Cập nhật thất bại."),
    });
    const addCommentMutation = useMutation({
        mutationFn: ({ content, parentId }) => addComment(taskToEdit.ID_CONGVIEC, { NOIDUNG_BINHLUAN: content, ID_BINHLUAN_CHA: parentId }),
        onSuccess: () => invalidateDetails(),
        onError: (error) => toast.error(error.response?.data?.message || "Gửi bình luận thất bại."),
    });
    
    const onSubmit = (data) => {
        taskMutation.mutate(data);
    };
    
    const isSubmitting = taskMutation.isPending || assignMutation.isPending || deleteMutation.isPending;
    const isWorking = isSubmitting || addChecklistMutation.isPending || deleteChecklistMutation.isPending || toggleChecklistMutation.isPending || addCommentMutation.isPending;

    const onInvalid = (errors) => { /* ... (Giữ nguyên) ... */ };
    const handleClose = () => setState({ isOpen: false, task: null, colId: null });

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Chi tiết Công việc' : 'Tạo Công việc mới'}</DialogTitle>
                    </DialogHeader>
                    
                    <Form {...form}>
                        {/* [SỬA LỖI] <form> bọc cả Footer */}
                        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="flex flex-col flex-1 min-h-0">
                            
                            {/* Vùng nội dung cuộn */}
                            <div className="space-y-4 flex-1 overflow-y-auto pr-2 p-1">
                                
                                <FormField control={form.control} name="TEN_CONGVIEC" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tiêu đề *</FormLabel>
                                        <FormControl><Input placeholder="Ví dụ: Thiết kế Database cho chức năng..." {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="MOTA" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mô tả</FormLabel>
                                        <FormControl><Textarea placeholder="Viết mô tả chi tiết cho công việc..." {...field} rows={4} value={field.value || ''} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormField control={form.control} name="ID_COT" render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Cột *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!isEditMode && !!defaultColumnId}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Chọn cột" /></SelectTrigger></FormControl>
                                                <SelectContent>{columns.map(col => (<SelectItem key={col.ID_COT} value={String(col.ID_COT)}>{col.TEN_COT}</SelectItem>))}</SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="TRANGTHAI" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Trạng thái *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Hoạt động">Hoạt động</SelectItem>
                                                    <SelectItem value="Tạm dừng">Tạm dừng</SelectItem>
                                                    <SelectItem value="Đã hủy">Đã hủy</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="DO_UUTIEN" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Độ ưu tiên *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Thấp">Thấp</SelectItem>
                                                    <SelectItem value="Trung bình">Trung bình</SelectItem>
                                                    <SelectItem value="Cao">Cao</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>

                                <FormField control={form.control} name="NGAY_HETHAN" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hạn chót (Tùy chọn)</FormLabel>
                                        <FormControl><Input type="datetime-local" {...field} value={field.value || ''} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                
                                <FormItem>
                                    <FormLabel>Gán cho (Tùy chọn)</FormLabel>
                                    <MultiSelectAssignee
                                        members={members}
                                        selected={selectedUsers}
                                        setSelected={setSelectedUsers}
                                    />
                                </FormItem>

                                {isEditMode && (
                                    <div className="space-y-6 pt-4 border-t">
                                        {isLoadingDetails ? (
                                            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                        ) : (
                                            <>
                                                <TaskChecklist
                                                    items={activeTask?.checklist_items || []}
                                                    isUpdating={isWorking}
                                                    onAdd={(content) => addChecklistMutation.mutate(content)}
                                                    onDelete={(itemId) => deleteChecklistMutation.mutate(itemId)}
                                                    onToggle={(itemId, checked) => toggleChecklistMutation.mutate({ itemId: itemId, isCompleted: checked })}
                                                />
                                                <Separator />
                                                <TaskComments 
                                                    comments={activeTask?.binh_luans || []}
                                                    isSubmitting={addCommentMutation.isPending}
                                                    onAddComment={(content, parentId) => addCommentMutation.mutate({ content, parentId })}
                                                />
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer (ĐÃ DI CHUYỂN VÀO TRONG FORM) */}
                            <DialogFooter className="pt-4 border-t sm:justify-between flex-shrink-0">
                                <div>
                                    {isEditMode && (
                                        <Button 
                                            type="button" 
                                            variant="destructive" 
                                            onClick={() => setIsDeleteAlertOpen(true)}
                                            disabled={isSubmitting}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Xóa
                                        </Button>
                                    )}
                                </div>
                                
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={handleClose}>Hủy</Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isEditMode ? 'Lưu thay đổi' : 'Tạo Công việc'}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* (AlertDialog xác nhận Xóa giữ nguyên) */}
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận Xóa Công việc?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa công việc "{taskToEdit?.TEN_CONGVIEC}"? Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
                        <AlertDialogAction 
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Xác nhận Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}


// (Component MultiSelectAssignee giữ nguyên)
function MultiSelectAssignee({ members = [], selected = [], setSelected }) {
    const [open, setOpen] = useState(false);

    const handleSelect = (memberNguoiDung) => {
        const isSelected = selected.find(u => u.ID_NGUOIDUNG === memberNguoiDung.ID_NGUOIDUNG);
        if (isSelected) {
            setSelected(prev => prev.filter(u => u.ID_NGUOIDUNG !== memberNguoiDung.ID_NGUOIDUNG));
        } else {
            setSelected(prev => [...prev, memberNguoiDung]);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto"
                >
                    {selected.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                            {selected.map(user => (
                                <Badge key={user.ID_NGUOIDUNG} variant="secondary" className="gap-1">
                                    <User className="h-3 w-3" />
                                    {user.HODEM_VA_TEN}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <span className="text-muted-foreground font-normal">Chọn thành viên...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Tìm thành viên..." />
                    <CommandEmpty>Không tìm thấy.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-y-auto">
                        {members.map(member => {
                            const user = member.nguoidung;
                            const isSelected = selected.find(u => u.ID_NGUOIDUNG === user.ID_NGUOIDUNG);
                            return (
                                <CommandItem
                                    key={user.ID_NGUOIDUNG}
                                    value={user.HODEM_VA_TEN}
                                    onSelect={() => handleSelect(user)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            isSelected ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {user.HODEM_VA_TEN}
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}