import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { addMembersToGroup, searchUngroupedStudents } from '@/api/adminGroupService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebounce } from '@/hooks/useDebounce';

export function AddStudentDialog({ isOpen, setIsOpen, group, onSuccess, planId }) {
    const [isLoading, setIsLoading] = useState(false);
    const [students, setStudents] = useState([]);
    const [isFetchingStudents, setIsFetchingStudents] = useState(true);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    useEffect(() => {
        if (isOpen && planId) {
            setIsFetchingStudents(true);
            searchUngroupedStudents(planId, debouncedSearchTerm)
                .then(setStudents)
                .catch(() => toast.error("Lỗi khi tải danh sách sinh viên."))
                .finally(() => setIsFetchingStudents(false));
        } else {
            // Reset state khi dialog đóng
            setStudents([]);
            setSelectedIds(new Set());
            setSearchTerm('');
        }
    }, [isOpen, planId, debouncedSearchTerm]);

    const handleSelect = (studentId) => {
        const newSelectedIds = new Set(selectedIds);
        if (newSelectedIds.has(studentId)) {
            newSelectedIds.delete(studentId);
        } else {
            newSelectedIds.add(studentId);
        }
        setSelectedIds(newSelectedIds);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === students.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(students.map(s => s.ID_NGUOIDUNG)));
        }
    };

    const handleSubmit = async () => {
        if (selectedIds.size === 0) {
            toast.warning("Vui lòng chọn ít nhất một sinh viên để thêm.");
            return;
        }
        setIsLoading(true);
        try {
            const payload = { ID_NHOM: group.ID_NHOM, student_ids: Array.from(selectedIds) };
            const res = await addMembersToGroup(payload);
            toast.success(res.message);
            onSuccess();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Thêm thành viên thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!group) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Thêm sinh viên vào nhóm "{group.TEN_NHOM}"</DialogTitle>
                    <DialogDescription>Chọn các sinh viên chưa có nhóm từ danh sách bên dưới.</DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Tìm theo tên, MSSV, email..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>

                <div className="flex-grow min-h-0 border rounded-md">
                    <ScrollArea className="h-full">
                        {isFetchingStudents ? (
                            <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin"/></div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Checkbox
                                                checked={selectedIds.size === students.length && students.length > 0}
                                                onCheckedChange={handleSelectAll}
                                                aria-label="Select all"
                                            />
                                        </TableHead>
                                        <TableHead>Họ và tên</TableHead>
                                        <TableHead>Mã định danh</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.length > 0 ? students.map(student => (
                                        <TableRow key={student.ID_NGUOIDUNG}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.has(student.ID_NGUOIDUNG)}
                                                    onCheckedChange={() => handleSelect(student.ID_NGUOIDUNG)}
                                                    aria-label={`Select ${student.HODEM_VA_TEN}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{student.HODEM_VA_TEN}</TableCell>
                                            <TableCell>{student.MA_DINHDANH}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center">Không tìm thấy sinh viên nào.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || selectedIds.size === 0}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Thêm ({selectedIds.size}) thành viên
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}