import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { addParticipantsToPlan, searchStudentsForPlan } from '@/api/thesisPlanService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, UserPlus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebounce } from '@/hooks/useDebounce';

export function AddParticipantDialog({ isOpen, setIsOpen, onSuccess, plan }) {
    const [isLoading, setIsLoading] = useState(false);
    const [allStudents, setAllStudents] = useState([]); // State mới để lưu toàn bộ danh sách
    const [isFetchingInitial, setIsFetchingInitial] = useState(false); // State loading ban đầu
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Fetch toàn bộ danh sách sinh viên phù hợp khi dialog mở lần đầu
    useEffect(() => {
        if (isOpen && plan?.ID_KEHOACH) {
            setIsFetchingInitial(true);
            setAllStudents([]); // Reset danh sách cũ
            searchStudentsForPlan(plan.ID_KEHOACH, null) // Gọi API với search = null
                .then(data => {
                    setAllStudents(data || []);
                })
                .catch(() => toast.error("Lỗi khi tải danh sách sinh viên."))
                .finally(() => setIsFetchingInitial(false));
        }
    }, [isOpen, plan?.ID_KEHOACH]); // Chỉ chạy khi dialog mở hoặc plan thay đổi

    // Reset state khi dialog đóng
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setAllStudents([]);
            setSelectedIds(new Set());
        }
    }, [isOpen]);

    // Lọc danh sách sinh viên phía client dựa trên searchTerm
    const filteredStudents = useMemo(() => {
        if (!debouncedSearchTerm) return allStudents;
        const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
        return allStudents.filter(student =>
            student.HODEM_VA_TEN.toLowerCase().includes(lowerSearchTerm) ||
            student.MA_DINHDANH.toLowerCase().includes(lowerSearchTerm) ||
            (student.EMAIL && student.EMAIL.toLowerCase().includes(lowerSearchTerm))
        );
    }, [debouncedSearchTerm, allStudents]);

    const handleSelect = (studentId) => {
        const newSelectedIds = new Set(selectedIds);
        if (newSelectedIds.has(studentId)) {
            newSelectedIds.delete(studentId);
        } else {
            newSelectedIds.add(studentId);
        }
        setSelectedIds(newSelectedIds);
    };

    // Sửa handleSelectAll để chọn/bỏ chọn trên danh sách *đã lọc*
    const handleSelectAllFiltered = () => {
         const currentFilteredIds = new Set(filteredStudents.map(s => s.ID_SINHVIEN));
         const currentSelectedFiltered = Array.from(selectedIds).filter(id => currentFilteredIds.has(id));

        if (currentSelectedFiltered.length === filteredStudents.length && filteredStudents.length > 0) {
            // Bỏ chọn tất cả các mục đang hiển thị
             const newSelectedIds = new Set(selectedIds);
             currentFilteredIds.forEach(id => newSelectedIds.delete(id));
             setSelectedIds(newSelectedIds);
        } else {
            // Chọn tất cả các mục đang hiển thị
            const newSelectedIds = new Set(selectedIds);
            currentFilteredIds.forEach(id => newSelectedIds.add(id));
            setSelectedIds(newSelectedIds);
        }
    };

    // Kiểm tra xem tất cả các hàng đang hiển thị có được chọn không
     const areAllFilteredSelected = useMemo(() => {
         if (filteredStudents.length === 0) return false;
         return filteredStudents.every(student => selectedIds.has(student.ID_SINHVIEN));
     }, [filteredStudents, selectedIds]);


    // Thêm sinh viên đã chọn vào kế hoạch
    const handleSubmit = async () => {
        if (selectedIds.size === 0) {
            toast.warning("Vui lòng chọn ít nhất một sinh viên để thêm.");
            return;
        }
        setIsLoading(true);
        try {
            const res = await addParticipantsToPlan(plan.ID_KEHOACH, Array.from(selectedIds));
            toast.success(res.message);
            onSuccess();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Thêm sinh viên thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!plan) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Thêm sinh viên vào "{plan.TEN_DOT}"</DialogTitle>
                    <DialogDescription>Tìm kiếm và chọn sinh viên chưa tham gia kế hoạch này.</DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Lọc theo tên, MSSV, email..." // Đổi placeholder
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex-grow min-h-0 border rounded-md">
                    <ScrollArea className="h-full">
                        {isFetchingInitial ? ( // Loading chỉ hiển thị khi tải lần đầu
                            <div className="flex items-center justify-center h-full p-4">
                                <Loader2 className="h-6 w-6 animate-spin mr-2"/> Đang tải danh sách...
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Checkbox
                                                checked={areAllFilteredSelected} // Sử dụng state mới
                                                onCheckedChange={handleSelectAllFiltered} // Sử dụng hàm mới
                                                aria-label="Select all filtered"
                                                disabled={filteredStudents.length === 0} // Disable nếu không có kết quả lọc
                                            />
                                        </TableHead>
                                        <TableHead>Họ và tên</TableHead>
                                        <TableHead>MSSV</TableHead>
                                        <TableHead>Chuyên ngành</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.length > 0 ? filteredStudents.map(student => (
                                        <TableRow key={student.ID_SINHVIEN}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.has(student.ID_SINHVIEN)}
                                                    onCheckedChange={() => handleSelect(student.ID_SINHVIEN)}
                                                    aria-label={`Select ${student.HODEM_VA_TEN}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{student.HODEM_VA_TEN}</TableCell>
                                            <TableCell>{student.MA_DINHDANH}</TableCell>
                                            <TableCell>{student.TEN_CHUYENNGANH || 'N/A'}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                {allStudents.length === 0 && !debouncedSearchTerm ? 'Không có sinh viên nào đủ điều kiện.' : 'Không tìm thấy sinh viên nào phù hợp.'}
                                            </TableCell>
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
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Thêm ({selectedIds.size}) sinh viên
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}