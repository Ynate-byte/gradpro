import React, { useState, useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { updateGroup, removeGroupMember } from '@/api/adminGroupService'; // Add removeGroupMember
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2 } from 'lucide-react'; // Add Trash2
import { ScrollArea } from '@/components/ui/scroll-area'; // Add ScrollArea
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Add Avatar components
import { Separator } from '@/components/ui/separator'; // Add Separator
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"; // For confirmation

const groupSchema = z.object({
    TEN_NHOM: z.string().min(3, "Tên nhóm phải có ít nhất 3 ký tự.").max(100),
    MOTA: z.string().max(255, "Mô tả không quá 255 ký tự.").nullable(),
    ID_NHOMTRUONG: z.string().min(1, "Vui lòng chọn nhóm trưởng."),
});

// Helper function for initials
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

export function GroupFormDialog({ isOpen, setIsOpen, editingGroup, onSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const [members, setMembers] = useState([]); // State to hold members for display
    const [memberToRemove, setMemberToRemove] = useState(null); // State for confirmation dialog
    const isEditMode = !!editingGroup;
    const removeAlertTitleId = useId();
    const removeAlertDescriptionId = useId();

    const form = useForm({
        resolver: zodResolver(groupSchema),
        defaultValues: { // Set initial defaults
            TEN_NHOM: '',
            MOTA: '',
            ID_NHOMTRUONG: '',
        }
    });

    // Effect to reset form and set members when dialog opens or editingGroup changes
    useEffect(() => {
        if (isOpen) {
            if (editingGroup) {
                form.reset({
                    TEN_NHOM: editingGroup.TEN_NHOM || '',
                    MOTA: editingGroup.MOTA || '',
                    ID_NHOMTRUONG: String(editingGroup.ID_NHOMTRUONG || ''),
                });
                setMembers(editingGroup.thanhviens || []);
            } else {
                // Reset for create mode (although admin create isn't implemented here yet)
                form.reset({ TEN_NHOM: '', MOTA: '', ID_NHOMTRUONG: '' });
                setMembers([]);
            }
        } else {
            // Optional: Clear state when dialog closes to prevent stale data briefly showing on reopen
            // form.reset();
            // setMembers([]);
        }
    }, [editingGroup, form, isOpen]);

    // Handler to open the remove confirmation dialog
    const handleRemoveClick = (member) => {
        // Prevent removing the currently selected leader in the form
        if (String(member.ID_NGUOIDUNG) === form.getValues('ID_NHOMTRUONG')) {
            toast.warning("Không thể xóa nhóm trưởng. Vui lòng chuyển quyền trưởng nhóm trước khi xóa.");
            return;
        }
        if (members.length <= 1) {
            toast.warning("Không thể xóa thành viên cuối cùng.");
            return;
        }
        setMemberToRemove(member); // Set the member to be removed, triggering the dialog
    };

    // Handler to confirm and execute member removal
    const confirmRemoveMember = async () => {
        if (!memberToRemove || !editingGroup) return;
        setIsLoading(true); // Indicate loading state
        try {
            await removeGroupMember(editingGroup.ID_NHOM, memberToRemove.ID_NGUOIDUNG);
            toast.success(`Đã xóa ${memberToRemove.nguoidung.HODEM_VA_TEN} khỏi nhóm.`);
            // Update local member list immediately for better UX
            setMembers(prev => prev.filter(m => m.ID_NGUOIDUNG !== memberToRemove.ID_NGUOIDUNG));
            // Call onSuccess passed from parent to trigger data refresh there
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Xóa thành viên thất bại.");
        } finally {
            setIsLoading(false); // End loading state
            setMemberToRemove(null); // Close confirmation dialog
        }
    };

    // Handler for submitting the main form (update group info)
    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            if (isEditMode) {
                // Convert leader ID back to number for the API
                const payload = { ...data, ID_NHOMTRUONG: Number(data.ID_NHOMTRUONG) };
                await updateGroup(editingGroup.ID_NHOM, payload);
                toast.success("Cập nhật nhóm thành công!");
                onSuccess(); // Notify parent
                setIsOpen(false); // Close dialog
            } else {
                // Placeholder for potential admin create group functionality
                toast.info("Chức năng tạo nhóm mới cho admin chưa được triển khai.");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || (isEditMode ? "Cập nhật thất bại." : "Tạo nhóm thất bại."));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col"> {/* Increased width */}
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? `Chỉnh sửa nhóm: ${editingGroup?.TEN_NHOM}` : 'Tạo Nhóm Mới'}</DialogTitle>
                        <DialogDescription>{isEditMode ? 'Cập nhật thông tin, chuyển quyền trưởng nhóm hoặc xóa thành viên.' : 'Tạo nhóm mới (Chức năng chưa triển khai).'}</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow min-h-0 flex flex-col">
                           <ScrollArea className="flex-grow pr-6 -mr-6"> {/* Make content scrollable */}
                             <div className="space-y-6 py-4">
                                {/* Form Fields */}
                                <FormField control={form.control} name="TEN_NHOM" render={({ field }) => ( <FormItem><FormLabel>Tên nhóm*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="MOTA" render={({ field }) => ( <FormItem><FormLabel>Mô tả</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>

                                {/* Leader Selection - Only in edit mode */}
                                {isEditMode && members.length > 0 && (
                                    <FormField
                                        control={form.control}
                                        name="ID_NHOMTRUONG"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nhóm trưởng*</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Chọn trưởng nhóm mới..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {members.map(member => (
                                                            <SelectItem key={member.ID_NGUOIDUNG} value={String(member.ID_NGUOIDUNG)}>
                                                                {member.nguoidung.HODEM_VA_TEN} ({member.nguoidung.MA_DINHDANH})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Member List for Removal - Only in edit mode */}
                                {isEditMode && members.length > 0 && (
                                    <div className="space-y-3 pt-4">
                                         <Separator />
                                         <h4 className="text-sm font-medium pt-2">Thành viên ({members.length})</h4>
                                        {members.map(member => (
                                            <div key={member.ID_NGUOIDUNG} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8"><AvatarFallback>{getInitials(member.nguoidung.HODEM_VA_TEN)}</AvatarFallback></Avatar>
                                                    <div>
                                                        <p className="text-sm font-medium">{member.nguoidung.HODEM_VA_TEN}</p>
                                                        <p className="text-xs text-muted-foreground">{member.nguoidung.MA_DINHDANH}</p>
                                                    </div>
                                                </div>
                                                {/* Remove Button - Disabled for the current selected leader */}
                                                <Button
                                                    type="button" // Important: Prevent form submission
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                    // Disable if member is the one currently selected in the dropdown OR if loading
                                                    disabled={isLoading || String(member.ID_NGUOIDUNG) === form.getValues('ID_NHOMTRUONG')}
                                                    onClick={() => handleRemoveClick(member)}
                                                    title={String(member.ID_NGUOIDUNG) === form.getValues('ID_NHOMTRUONG') ? "Không thể xóa nhóm trưởng" : "Xóa thành viên"}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                              </div>
                            </ScrollArea>
                            {/* Footer outside scroll area */}
                            <DialogFooter className="pt-6 border-t mt-auto shrink-0">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                                <Button type="submit" disabled={isLoading || !isEditMode}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Lưu thay đổi
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog for Removing Member */}
            <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
                 <AlertDialogContent aria-labelledby={removeAlertTitleId} aria-describedby={removeAlertDescriptionId}>
                     <AlertDialogHeader>
                         <AlertDialogTitle id={removeAlertTitleId}>Xác nhận Xóa Thành viên?</AlertDialogTitle>
                         <AlertDialogDescription id={removeAlertDescriptionId}>
                             Bạn có chắc chắn muốn xóa <strong>{memberToRemove?.nguoidung?.HODEM_VA_TEN}</strong> khỏi nhóm <strong>{editingGroup?.TEN_NHOM}</strong> không? Hành động này không thể hoàn tác.
                         </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                         <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
                         <AlertDialogAction onClick={confirmRemoveMember} disabled={isLoading} className="bg-destructive hover:bg-destructive/90">
                             {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Xác nhận Xóa
                         </AlertDialogAction>
                     </AlertDialogFooter>
                 </AlertDialogContent>
             </AlertDialog>
        </>
    );
}