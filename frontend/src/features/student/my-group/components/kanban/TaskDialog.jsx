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
    Dialog, DialogContent, DialogFooter,
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, ChevronsUpDown, User, Trash2, Calendar, AlignLeft, CheckSquare } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';

import { TaskChecklist } from './TaskChecklist';
import { TaskComments } from './TaskComments';

// --- SCHEMA ---
const taskSchema = z.object({
    TEN_CONGVIEC: z.string().min(3, { message: "Tiêu đề phải có ít nhất 3 ký tự." }).max(255),
    MOTA: z.string().optional().nullable(),
    ID_COT: z.string().min(1, "Vui lòng chọn cột."),
    NGAY_HETHAN: z.string().optional().nullable(),
    DO_UUTIEN: z.enum(['Thấp', 'Trung bình', 'Cao']),
    TRANGTHAI: z.enum(['Hoạt động', 'Tạm dừng', 'Đã hủy', 'Hoàn thành']).optional(),
});

// --- HELPERS ---
const formatDateTimeLocal = (dateString) => {
    if (!dateString) return "";
    try {
        return format(parseISO(dateString), "yyyy-MM-dd'T'HH:mm");
    } catch { return ""; }
};

// [SỬA LỖI]: Hàm này trước đây dùng toISOString() gây lệch giờ
const formatFromInput = (dateString) => {
    if (!dateString) return null;
    // Sử dụng format để tạo chuỗi YYYY-MM-DD HH:mm:ss giữ nguyên giờ địa phương
    return format(new Date(dateString), "yyyy-MM-dd'T'HH:mm:ss");
};

// --- COMPONENT ---
export function TaskDialog({ state, setState, nhomId, members = [], columns = [], onSuccess }) {
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

    // Lấy chi tiết (comments, checklist)
    const { data: fullTaskData, isLoading: isLoadingDetails } = useQuery({
        queryKey: ['taskDetails', taskToEdit?.ID_CONGVIEC],
        queryFn: () => getTaskDetails(taskToEdit.ID_CONGVIEC),
        enabled: isOpen && isEditMode,
        staleTime: 0, 
    });

    const activeTask = fullTaskData || taskToEdit;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && activeTask) {
                form.reset({
                    TEN_CONGVIEC: activeTask.TEN_CONGVIEC,
                    MOTA: activeTask.MOTA || '',
                    ID_COT: String(activeTask.ID_COT),
                    NGAY_HETHAN: formatDateTimeLocal(activeTask.NGAY_HETHAN),
                    DO_UUTIEN: activeTask.DO_UUTIEN,
                    TRANGTHAI: activeTask.TRANGTHAI || 'Hoạt động',
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

    // --- REFRESH LOGIC ---
    const invalidateBoardAndClose = () => {
        if (onSuccess) {
            onSuccess();
        } else {
            // Fallback (dự phòng)
            queryClient.invalidateQueries({ queryKey: ['kanbanBoard', nhomId], exact: false });
            queryClient.invalidateQueries({ queryKey: ['taskStats', nhomId] });
        }
        handleClose();
    };

    const invalidateDetailsOnly = () => {
        if (isEditMode) {
            queryClient.invalidateQueries({ queryKey: ['taskDetails', taskToEdit.ID_CONGVIEC] });
        }
    };

    // --- MUTATIONS ---
    
    // 1. Gán người (tách riêng để gọi sau update nếu cần)
    const assignMutation = useMutation({
        mutationFn: ({ taskId, userIds }) => assignTask(taskId, userIds),
        onError: () => toast.error("Lỗi khi gán người phụ trách."),
    });

    // 2. Tạo/Sửa Task chính
    const taskMutation = useMutation({
        mutationFn: async (data) => {
            const payload = {
                ...data,
                ID_COT: Number(data.ID_COT),
                // Sử dụng hàm formatFromInput đã sửa
                NGAY_HETHAN: formatFromInput(data.NGAY_HETHAN),
                assignee_ids: selectedUsers.map(u => u.ID_NGUOIDUNG) 
            };
            
            if (isEditMode) {
                // Update task
                const res = await updateTask(taskToEdit.ID_CONGVIEC, payload);
                await assignTask(taskToEdit.ID_CONGVIEC, payload.assignee_ids);
                return res;
            } else {
                // Create task
                return createTask(nhomId, payload);
            }
        },
        onSuccess: () => {
            toast.success(isEditMode ? "Cập nhật thành công!" : "Tạo công việc thành công!");
            invalidateBoardAndClose();
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
        onError: () => toast.error("Xóa thất bại."),
    });

    // Mutations chi tiết (Checklist/Comment)
    const addChecklistMutation = useMutation({ mutationFn: (c) => addChecklistItem(taskToEdit.ID_CONGVIEC, c), onSuccess: invalidateDetailsOnly });
    const deleteChecklistMutation = useMutation({ mutationFn: (id) => deleteChecklistItem(id), onSuccess: invalidateDetailsOnly });
    const toggleChecklistMutation = useMutation({ mutationFn: (d) => updateChecklistItem(d.itemId, d.isCompleted), onSuccess: invalidateDetailsOnly });
    const addCommentMutation = useMutation({ mutationFn: (d) => addComment(taskToEdit.ID_CONGVIEC, { NOIDUNG_BINHLUAN: d.content, ID_BINHLUAN_CHA: d.parentId }), onSuccess: invalidateDetailsOnly });

    const onSubmit = (data) => taskMutation.mutate(data);
    const handleDelete = () => deleteMutation.mutate();
    const handleClose = () => setState({ isOpen: false, task: null, colId: null });

    const isSubmitting = taskMutation.isPending || deleteMutation.isPending || assignMutation.isPending;
    const isDetailsUpdating = addChecklistMutation.isPending || toggleChecklistMutation.isPending || addCommentMutation.isPending;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="sm:max-w-4xl h-[90vh] p-0 gap-0 overflow-hidden flex flex-col bg-background">
                    <DialogHeader className="px-6 py-4 border-b shrink-0">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            {isEditMode ? (
                                <>
                                    <span className="text-muted-foreground font-normal text-base">#{activeTask?.ID_CONGVIEC}</span>
                                    {activeTask?.TEN_CONGVIEC}
                                </>
                            ) : 'Tạo công việc mới'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto">
                        <Form {...form}>
                            <form id="task-form" onSubmit={form.handleSubmit(onSubmit)} className="p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* CỘT TRÁI: NỘI DUNG CHÍNH */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <FormField control={form.control} name="TEN_CONGVIEC" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold">Tiêu đề</FormLabel>
                                                <FormControl>
                                                    <Input className="text-lg font-medium" placeholder="Nhập tên công việc..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="MOTA" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2 font-semibold"><AlignLeft className="h-4 w-4" /> Mô tả</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Thêm mô tả chi tiết..." className="min-h-[120px] resize-none" {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        {isEditMode && (
                                            <>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 font-semibold"><CheckSquare className="h-4 w-4" /> Checklist</div>
                                                    <div className="bg-muted/30 p-4 rounded-lg border">
                                                        {isLoadingDetails ? <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
                                                            <TaskChecklist
                                                                items={activeTask?.checklist_items || []}
                                                                isUpdating={isDetailsUpdating}
                                                                onAdd={(content) => addChecklistMutation.mutate(content)}
                                                                onDelete={(itemId) => deleteChecklistMutation.mutate(itemId)}
                                                                onToggle={(itemId, checked) => toggleChecklistMutation.mutate({ itemId, isCompleted: checked })}
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="font-semibold">Hoạt động</div>
                                                    <div className="bg-muted/30 p-4 rounded-lg border">
                                                        <TaskComments 
                                                            comments={activeTask?.binh_luans || []}
                                                            isSubmitting={addCommentMutation.isPending}
                                                            onAddComment={(content, parentId) => addCommentMutation.mutate({ content, parentId })}
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* CỘT PHẢI: META DATA */}
                                    <div className="space-y-6">
                                        <FormField control={form.control} name="TRANGTHAI" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Trạng thái</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Hoạt động">Hoạt động</SelectItem>
                                                        <SelectItem value="Tạm dừng">Tạm dừng</SelectItem>
                                                        <SelectItem value="Hoàn thành">Hoàn thành</SelectItem>
                                                        <SelectItem value="Đã hủy">Đã hủy</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="ID_COT" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cột</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} disabled={!isEditMode && !!defaultColumnId}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Chọn cột" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {columns.map(col => <SelectItem key={col.ID_COT} value={String(col.ID_COT)}>{col.TEN_COT}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="DO_UUTIEN" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Độ ưu tiên</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Thấp">Thấp</SelectItem>
                                                        <SelectItem value="Trung bình">Trung bình</SelectItem>
                                                        <SelectItem value="Cao">Cao</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="NGAY_HETHAN" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Hạn chót</FormLabel>
                                                <FormControl><Input type="datetime-local" {...field} value={field.value || ''} /></FormControl>
                                            </FormItem>
                                        )} />

                                        <div className="space-y-2">
                                            <FormLabel className="flex items-center gap-2"><User className="h-4 w-4" /> Người thực hiện</FormLabel>
                                            <MultiSelectAssignee members={members} selected={selectedUsers} setSelected={setSelectedUsers} />
                                        </div>

                                        {isEditMode && activeTask?.nguoi_tao && (
                                            <div className="text-xs text-muted-foreground pt-4 border-t">
                                                <p>Người tạo: {activeTask.nguoi_tao.HODEM_VA_TEN}</p>
                                                <p>Ngày tạo: {format(parseISO(activeTask.NGAYTAO), "dd/MM/yyyy HH:mm")}</p>
                                            </div>
                                        )}

                                        {isEditMode && (
                                            <Button type="button" variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setIsDeleteAlertOpen(true)} disabled={isSubmitting}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Xóa công việc
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </Form>
                    </div>

                    <DialogFooter className="p-4 border-t bg-muted/20 sm:justify-between shrink-0">
                        <Button type="button" variant="outline" onClick={handleClose}>Đóng</Button>
                        <Button type="submit" form="task-form" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? 'Lưu thay đổi' : 'Tạo công việc'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle>
                        <AlertDialogDescription>Hành động này không thể hoàn tác. Công việc "{taskToEdit?.TEN_CONGVIEC}" sẽ bị xóa vĩnh viễn.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

function MultiSelectAssignee({ members = [], selected = [], setSelected }) {
    const [open, setOpen] = useState(false);
    const handleSelect = (memberNguoiDung) => {
        const isSelected = selected.some(u => u.ID_NGUOIDUNG === memberNguoiDung.ID_NGUOIDUNG);
        setSelected(prev => isSelected ? prev.filter(u => u.ID_NGUOIDUNG !== memberNguoiDung.ID_NGUOIDUNG) : [...prev, memberNguoiDung]);
    };
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-[40px] px-3 py-2">
                    {selected.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                            {selected.map(user => (
                                <Badge key={user.ID_NGUOIDUNG} variant="secondary" className="gap-1 pr-1">
                                    <User className="h-3 w-3" /> {user.HODEM_VA_TEN}
                                    <span className="ml-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5" onClick={(e) => { e.stopPropagation(); handleSelect(user); }}>×</span>
                                </Badge>
                            ))}
                        </div>
                    ) : <span className="text-muted-foreground font-normal">Chọn thành viên...</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput placeholder="Tìm thành viên..." />
                    <CommandList>
                        <CommandEmpty>Không tìm thấy.</CommandEmpty>
                        <CommandGroup>
                            {members.map(member => {
                                const user = member.nguoidung;
                                const isSelected = selected.some(u => u.ID_NGUOIDUNG === user.ID_NGUOIDUNG);
                                return (
                                    <CommandItem key={user.ID_NGUOIDUNG} value={user.HODEM_VA_TEN} onSelect={() => handleSelect(user)}>
                                        <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                        {user.HODEM_VA_TEN}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}