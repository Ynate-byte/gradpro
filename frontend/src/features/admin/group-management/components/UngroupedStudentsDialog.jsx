import React, { useState, useEffect } from 'react';
import { getUngroupedStudents } from '@/api/adminGroupService';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

export function UngroupedStudentsDialog({ isOpen, setIsOpen, planId }) {
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && planId) {
            setIsLoading(true);
            getUngroupedStudents(planId)
                .then(setStudents)
                .catch(() => toast.error("Lỗi khi tải danh sách sinh viên chưa có nhóm."))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, planId]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Sinh viên chưa có nhóm</DialogTitle>
                    <DialogDescription>
                        Đây là danh sách các sinh viên thuộc kế hoạch này nhưng chưa tham gia nhóm nào.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    <ScrollArea className="h-full border rounded-md">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Họ và tên</TableHead>
                                        <TableHead>MSSV</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Chuyên ngành</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.length > 0 ? (
                                        students.map(student => (
                                            <TableRow key={student.ID_NGUOIDUNG}>
                                                <TableCell className="font-medium">{student.HODEM_VA_TEN}</TableCell>
                                                <TableCell>{student.MA_DINHDANH}</TableCell>
                                                <TableCell>{student.EMAIL}</TableCell>
                                                <TableCell>{student.sinhvien?.chuyennganh?.TEN_CHUYENNGANH ?? 'N/A'}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                Tất cả sinh viên đều đã có nhóm.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Đóng</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}