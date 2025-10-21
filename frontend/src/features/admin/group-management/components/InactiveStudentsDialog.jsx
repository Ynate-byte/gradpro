import React, { useState, useEffect } from 'react'
import { getInactiveStudents, removeStudents } from '@/api/adminGroupService'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, UserX } from 'lucide-react'

// Hiển thị dialog danh sách sinh viên chưa đăng nhập
export function InactiveStudentsDialog({ isOpen, setIsOpen, onSuccess, planId }) {
  const [students, setStudents] = useState([])
  const [selected, setSelected] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Tải danh sách sinh viên khi dialog mở
  useEffect(() => {
    if (isOpen && planId) {
      setIsLoading(true)
      setSelected([])
      getInactiveStudents(planId)
        .then(setStudents)
        .catch(() => toast.error("Lỗi khi tải danh sách sinh viên."))
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, planId])

  // Chọn hoặc bỏ chọn một sinh viên
  const handleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id])
  }

  // Chọn hoặc bỏ chọn tất cả sinh viên
  const handleSelectAll = () => {
    if (selected.length === students.length) {
      setSelected([])
    } else {
      setSelected(students.map(s => s.ID_NGUOIDUNG))
    }
  }

  // Vô hiệu hóa các tài khoản sinh viên đã chọn
  const handleRemove = async () => {
    setIsProcessing(true)
    try {
      const res = await removeStudents(selected)
      toast.success(res.message)
      onSuccess()
      setIsOpen(false)
    } catch (error) {
      toast.error(error.response?.data?.message || "Thao tác thất bại.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sinh viên chưa từng đăng nhập</DialogTitle>
          <DialogDescription>
            Đây là danh sách các sinh viên thuộc kế hoạch này chưa đăng nhập lần nào. Bạn có thể vô hiệu hóa tài khoản của họ.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full">
            {isLoading ? (
              <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selected.length === students.length && students.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Họ và tên</TableHead>
                    <TableHead>MSSV</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Chuyên ngành</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(student => (
                    <TableRow key={student.ID_NGUOIDUNG}>
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(student.ID_NGUOIDUNG)}
                          onCheckedChange={() => handleSelect(student.ID_NGUOIDUNG)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{student.HODEM_VA_TEN}</TableCell>
                      <TableCell>{student.MA_DINHDANH}</TableCell>
                      <TableCell>{student.EMAIL}</TableCell>
                      <TableCell>{student.sinhvien?.chuyennganh?.TEN_CHUYENNGANH ?? 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Hủy
          </Button>
          <Button
            variant="destructive"
            disabled={selected.length === 0 || isProcessing}
            onClick={handleRemove}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserX className="mr-2 h-4 w-4" />
            )}
            Vô hiệu hóa ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}