import React, { useState, useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { updateGroup, removeGroupMember } from '@/api/adminGroupService'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Trash2, Crown, Users } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Schema không đổi
const groupSchema = z.object({
  TEN_NHOM: z.string().min(3, "Tên nhóm phải có ít nhất 3 ký tự.").max(100),
  MOTA: z.string().max(255, "Mô tả không quá 255 ký tự.").nullable(),
  // ID_NHOMTRUONG vẫn được validate
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
  const [isLoading, setIsLoading] = useState(false) // Loading cho submit
  const [isRemoving, setIsRemoving] = useState(false) // Loading riêng cho xóa
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

  // Lấy giá trị nhóm trưởng đang được theo dõi
  const watchedLeaderId = form.watch('ID_NHOMTRUONG');

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
    if (String(member.ID_NGUOIDUNG) === watchedLeaderId) {
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

    setIsRemoving(true)
    try {
      await removeGroupMember(editingGroup.ID_NHOM, memberToRemove.ID_NGUOIDUNG)
      toast.success(`Đã xóa ${memberToRemove.nguoidung.HODEM_VA_TEN} khỏi nhóm.`)
      // Cập nhật state local
      const newMembers = members.filter(m => m.ID_NGUOIDUNG !== memberToRemove.ID_NGUOIDUNG);
      setMembers(newMembers);
      // Gọi onSuccess để tải lại data ở bảng chính
      onSuccess() 
    } catch (error) {
      toast.error(error.response?.data?.message || "Xóa thành viên thất bại.")
    } finally {
      setIsRemoving(false)
      setMemberToRemove(null)
    }
  }

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      if (isEditMode) {
        // Chỉ gửi 3 trường này, backend không đổi
        const payload = { 
          TEN_NHOM: data.TEN_NHOM,
          MOTA: data.MOTA,
          // Backend chỉ chấp nhận ID_NHOMTRUONG là số
          ID_NHOMTRUONG: Number(data.ID_NHOMTRUONG) 
        }
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
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {/* Nâng cấp: Tăng chiều rộng dialog, layout flex */}
        <DialogContent className={cn("sm:max-w-3xl max-h-[90vh] flex flex-col p-0")}>
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold text-foreground">
              Chỉnh sửa nhóm
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Cập nhật thông tin, chuyển quyền trưởng nhóm hoặc xóa thành viên.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow min-h-0 flex flex-col">
              {/* Nâng cấp: Chia 2 cột */}
              <ScrollArea className="flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                  {/* Cột 1: Thông tin nhóm */}
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="TEN_NHOM"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tên nhóm *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nhập tên nhóm..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="MOTA"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mô tả (tùy chọn)</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={5}
                              placeholder="Mô tả ngắn về nhóm..."
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Nâng cấp: Chuyển Select Nhóm trưởng xuống dưới */}
                    <FormField
                      control={form.control}
                      name="ID_NHOMTRUONG"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nhóm trưởng *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn trưởng nhóm..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {members.map(member => (
                                <SelectItem
                                  key={member.ID_NGUOIDUNG}
                                  value={String(member.ID_NGUOIDUNG)}
                                >
                                  {member.nguoidung.HODEM_VA_TEN}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Cột 2: Danh sách thành viên */}
                  <div className="space-y-3">
                    <FormLabel className="flex items-center gap-2">
                      <Users className="h-5 w-5"/> Thành viên ({members.length})
                    </FormLabel>
                    <Card className="flex-grow max-h-[450px]">
                      <ScrollArea className="h-full max-h-[450px]">
                        <CardContent className="p-3 space-y-2">
                          {members.length > 0 ? (
                            members.map(member => {
                              const isLeader = watchedLeaderId === String(member.ID_NGUOIDUNG);
                              return (
                                <div
                                  key={member.ID_NGUOIDUNG}
                                  className="flex items-center justify-between p-2.5 rounded-md border bg-background hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <Avatar className="h-9 w-9 shrink-0">
                                      <AvatarFallback>{getInitials(member.nguoidung.HODEM_VA_TEN)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow min-w-0">
                                      <p className="text-sm font-semibold truncate" title={member.nguoidung.HODEM_VA_TEN}>
                                        {member.nguoidung.HODEM_VA_TEN}
                                        {isLeader && (
                                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                            Trưởng nhóm
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate" title={member.nguoidung.MA_DINHDANH}>
                                        {member.nguoidung.MA_DINHDANH}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type="button"
                                          variant={isLeader ? "default" : "ghost"}
                                          size="icon"
                                          className={cn(
                                            "h-8 w-8 transition-colors",
                                            isLeader ? "text-primary-foreground bg-primary hover:bg-primary/90" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                                          )}
                                          onClick={() => form.setValue('ID_NHOMTRUONG', String(member.ID_NGUOIDUNG))}
                                          disabled={isLeader}
                                        >
                                          <Crown className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Đặt làm nhóm trưởng</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className={cn(
                                            "h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                                            isLeader && "opacity-50 cursor-not-allowed"
                                          )}
                                          disabled={isLoading || isRemoving || isLeader || members.length <= 1}
                                          onClick={() => handleRemoveClick(member)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{isLeader ? "Không thể xóa nhóm trưởng" : members.length <= 1 ? "Không thể xóa thành viên cuối cùng" : "Xóa thành viên"}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-10 text-center">
                              Nhóm này chưa có thành viên.
                            </div>
                          )}
                        </CardContent>
                      </ScrollArea>
                    </Card>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="p-6 border-t mt-auto shrink-0 flex-row justify-end space-x-2"> 
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || isRemoving} // Disable nếu đang submit hoặc đang xóa
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
        <AlertDialogContent aria-labelledby={removeAlertTitleId} aria-describedby={removeAlertDescriptionId}>
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
              disabled={isRemoving} // Sửa thành isRemoving
              className={cn(
                "transition-all duration-200",
                "hover:bg-muted"
              )}
            >
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveMember}
              disabled={isRemoving} // Sửa thành isRemoving
              className={cn(
                "bg-destructive hover:bg-destructive/90",
                "transition-all duration-200"
              )}
            >
              {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {/* Sửa thành isRemoving */}
              Xác nhận Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}