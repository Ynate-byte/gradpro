import React, { useState, useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { updateGroup, removeGroupMember } from '@/api/adminGroupService'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Trash2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils'

// Schema không đổi
const groupSchema = z.object({
  TEN_NHOM: z.string().min(3, "Tên nhóm phải có ít nhất 3 ký tự.").max(100),
  MOTA: z.string().max(255, "Mô tả không quá 255 ký tự.").nullable(),
  ID_NHOMTRUONG: z.string().min(1, "Vui lòng chọn nhóm trưởng.")
})

// Hàm getInitials không đổi
function getInitials(name) {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

export function GroupFormDialog({ isOpen, setIsOpen, editingGroup, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false)
  const [members, setMembers] = useState([])
  const [memberToRemove, setMemberToRemove] = useState(null)
  const isEditMode = !!editingGroup
  const removeAlertTitleId = useId()
  const removeAlertDescriptionId = useId()

  const form = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      TEN_NHOM: '',
      MOTA: '',
      ID_NHOMTRUONG: ''
    }
  })

  // Logic useEffect và các hàm xử lý không đổi
  useEffect(() => {
    if (isOpen) {
      if (editingGroup) {
        form.reset({
          TEN_NHOM: editingGroup.TEN_NHOM || '',
          MOTA: editingGroup.MOTA || '',
          ID_NHOMTRUONG: String(editingGroup.ID_NHOMTRUONG || '')
        })
        setMembers(editingGroup.thanhviens || [])
      } else {
        form.reset({ TEN_NHOM: '', MOTA: '', ID_NHOMTRUONG: '' })
        setMembers([])
      }
    }
  }, [editingGroup, form, isOpen])

  const handleRemoveClick = (member) => {
    if (String(member.ID_NGUOIDUNG) === form.getValues('ID_NHOMTRUONG')) {
      toast.warning("Không thể xóa nhóm trưởng. Vui lòng chuyển quyền trưởng nhóm trước khi xóa.")
      return
    }
    if (members.length <= 1) {
      toast.warning("Không thể xóa thành viên cuối cùng.")
      return
    }
    setMemberToRemove(member)
  }

  const confirmRemoveMember = async () => {
    if (!memberToRemove || !editingGroup) return

    setIsLoading(true)
    try {
      await removeGroupMember(editingGroup.ID_NHOM, memberToRemove.ID_NGUOIDUNG)
      toast.success(`Đã xóa ${memberToRemove.nguoidung.HODEM_VA_TEN} khỏi nhóm.`)
      setMembers(prev => prev.filter(m => m.ID_NGUOIDUNG !== memberToRemove.ID_NGUOIDUNG))
      onSuccess()
      const currentLeaderId = form.getValues('ID_NHOMTRUONG')
      if (String(memberToRemove.ID_NGUOIDUNG) === currentLeaderId) {
        const remainingMembers = members.filter(m => m.ID_NGUOIDUNG !== memberToRemove.ID_NGUOIDUNG)
        if (remainingMembers.length > 0) {
          form.setValue('ID_NHOMTRUONG', String(remainingMembers[0].ID_NGUOIDUNG))
        } else {
          form.setValue('ID_NHOMTRUONG', '')
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Xóa thành viên thất bại.")
    } finally {
      setIsLoading(false)
      setMemberToRemove(null)
    }
  }

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      if (isEditMode) {
        const payload = { ...data, ID_NHOMTRUONG: Number(data.ID_NHOMTRUONG) }
        await updateGroup(editingGroup.ID_NHOM, payload)
        toast.success("Cập nhật nhóm thành công!")
        onSuccess()
        setIsOpen(false)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Cập nhật thất bại.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className={cn("sm:max-w-2xl max-h-[90vh] flex flex-col bg-background rounded-xl shadow-2xl")}>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-2xl font-semibold text-foreground">
              {isEditMode ? `Chỉnh sửa nhóm: ${editingGroup?.TEN_NHOM}` : 'Tạo Nhóm Mới'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isEditMode ? 'Cập nhật thông tin, chuyển quyền trưởng nhóm hoặc xóa thành viên.' : 'Tạo nhóm mới.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow min-h-0 flex flex-col">
              <ScrollArea className="flex-grow pr-6 -mr-6">
                <div className="space-y-6 px-6 py-4">
                  <FormField
                    control={form.control}
                    name="TEN_NHOM"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">Tên nhóm <span className="text-red-500">*</span></FormLabel>
                        <Input
                          {...field}
                          className={cn(
                            "transition-all duration-200",
                            "focus:ring-2 focus:ring-primary focus:border-primary",
                            "border border-input rounded-md shadow-sm"
                          )}
                          placeholder="Nhập tên nhóm..."
                        />
                        <FormMessage className="text-red-500 text-xs mt-1" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="MOTA"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">Mô tả</FormLabel>
                        <Textarea
                          {...field}
                          value={field.value ?? ''}
                          className={cn(
                            "transition-all duration-200",
                            "focus:ring-2 focus:ring-primary focus:border-primary",
                            "border border-input rounded-md shadow-sm resize-none"
                          )}
                          placeholder="Nhập mô tả nhóm..."
                          rows={4}
                        />
                        <FormMessage className="text-red-500 text-xs mt-1" />
                      </FormItem>
                    )}
                  />
                  {isEditMode && members.length > 0 && (
                    <FormField
                      control={form.control}
                      name="ID_NHOMTRUONG"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-foreground">Nhóm trưởng <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className={cn(
                              "transition-all duration-200",
                              "focus:ring-2 focus:ring-primary focus:border-primary",
                              "border border-input rounded-md shadow-sm"
                            )}>
                              <SelectValue placeholder="Chọn trưởng nhóm mới..." />
                            </SelectTrigger>
                            <SelectContent>
                              {members.map(member => (
                                <SelectItem
                                  key={member.ID_NGUOIDUNG}
                                  value={String(member.ID_NGUOIDUNG)}
                                  className="hover:bg-accent hover:text-accent-foreground"
                                >
                                  {member.nguoidung.HODEM_VA_TEN} ({member.nguoidung.MA_DINHDANH})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-red-500 text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                  )}
                  {isEditMode && members.length > 0 && (
                    <div className="space-y-4 pt-4">
                      <Separator className="bg-border" />
                      <h4 className="text-sm font-semibold text-foreground">Thành viên ({members.length})</h4>
                      <div className="grid gap-3">
                        {members.map(member => (
                          <div
                            key={member.ID_NGUOIDUNG}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border bg-card",
                              "hover:bg-muted/50 transition-colors duration-200"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <Avatar className="h-10 w-10 ring-1 ring-primary/10">
                                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                  {getInitials(member.nguoidung.HODEM_VA_TEN)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {member.nguoidung.HODEM_VA_TEN}
                                  {String(member.ID_NGUOIDUNG) === form.getValues('ID_NHOMTRUONG') && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                      Trưởng nhóm
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {member.nguoidung.MA_DINHDANH}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8 text-destructive hover:bg-destructive/10",
                                String(member.ID_NGUOIDUNG) === form.getValues('ID_NHOMTRUONG') && "opacity-50 cursor-not-allowed"
                              )}
                              disabled={isLoading || String(member.ID_NGUOIDUNG) === form.getValues('ID_NHOMTRUONG')}
                              onClick={() => handleRemoveClick(member)}
                              title={String(member.ID_NGUOIDUNG) === form.getValues('ID_NHOMTRUONG') ? "Không thể xóa nhóm trưởng" : "Xóa thành viên"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <DialogFooter className="pt-6 border-t mt-auto shrink-0 px-6 pb-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "transition-all duration-200",
                    "hover:bg-muted hover:text-foreground"
                  )}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !isEditMode}
                  className={cn(
                    "transition-all duration-200",
                    "bg-primary hover:bg-primary/90",
                    isLoading && "opacity-70"
                  )}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Lưu thay đổi
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent className="rounded-xl shadow-2xl" aria-labelledby={removeAlertTitleId} aria-describedby={removeAlertDescriptionId}>
          <AlertDialogHeader>
            <AlertDialogTitle id={removeAlertTitleId} className="text-lg font-semibold text-foreground">
              Xác nhận Xóa Thành viên?
            </AlertDialogTitle>
            <AlertDialogDescription id={removeAlertDescriptionId} className="text-muted-foreground">
              Bạn có chắc chắn muốn xóa <strong>{memberToRemove?.nguoidung?.HODEM_VA_TEN}</strong> khỏi nhóm <strong>{editingGroup?.TEN_NHOM}</strong> không? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isLoading}
              className={cn(
                "transition-all duration-200",
                "hover:bg-muted"
              )}
            >
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveMember}
              disabled={isLoading}
              className={cn(
                "bg-destructive hover:bg-destructive/90",
                "transition-all duration-200"
              )}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}