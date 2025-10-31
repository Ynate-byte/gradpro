import React, { useState, useEffect, useMemo } from 'react'; // Thêm useMemo
import { getUngroupedStudents } from '@/api/adminGroupService';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, UserCircle, Users } from 'lucide-react'; // Thêm Search, UserCircle, Users
import { Input } from '@/components/ui/input'; // Thêm Input
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Thêm Avatar
import { useDebounce } from '@/hooks/useDebounce'; // Thêm useDebounce
import { Skeleton } from '@/components/ui/skeleton'; // Thêm Skeleton

// Hàm lấy chữ cái đầu
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

// --- Component Skeleton cho danh sách sinh viên ---
const StudentListSkeleton = ({ count = 8 }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-[60px]"></TableHead>
                <TableHead><Skeleton className="h-5 w-3/4" /></TableHead>
                <TableHead><Skeleton className="h-5 w-1/2" /></TableHead>
                <TableHead><Skeleton className="h-5 w-3/4" /></TableHead>
                <TableHead><Skeleton className="h-5 w-full" /></TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {Array.from({ length: count }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                    <TableCell><Skeleton className="h-9 w-9 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);

export function UngroupedStudentsDialog({ isOpen, setIsOpen, planId }) {
    const [allStudents, setAllStudents] = useState([]); // Lưu danh sách gốc
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // State cho tìm kiếm
    const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search term

    useEffect(() => {
        if (isOpen && planId) {
            setIsLoading(true);
            setAllStudents([]); // Reset khi mở
            setSearchTerm(''); // Reset search term
            getUngroupedStudents(planId)
                .then(data => setAllStudents(data || [])) // Lưu vào allStudents
                .catch(() => toast.error("Lỗi khi tải danh sách sinh viên chưa có nhóm."))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, planId]);

    // Lọc danh sách sinh viên dựa trên searchTerm
    const filteredStudents = useMemo(() => {
        if (!debouncedSearchTerm) return allStudents;
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        return allStudents.filter(student =>
            student.HODEM_VA_TEN.toLowerCase().includes(lowerSearch) ||
            student.MA_DINHDANH.toLowerCase().includes(lowerSearch) ||
            (student.EMAIL && student.EMAIL.toLowerCase().includes(lowerSearch))
        );
    }, [debouncedSearchTerm, allStudents]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {/* Tăng max-width và thay đổi layout */}
            <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Users className="h-6 w-6 text-primary" />
                        Sinh viên chưa có nhóm ({isLoading ? '...' : filteredStudents.length})
                    </DialogTitle>
                    <DialogDescription>
                        Danh sách sinh viên thuộc kế hoạch này chưa tham gia nhóm nào.
                    </DialogDescription>
                </DialogHeader>

                {/* Thêm thanh tìm kiếm */}
                <div className="px-6 pt-4 pb-2">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm theo tên, MSSV, email..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {/* Phần bảng dữ liệu */}
                <div className="flex-grow min-h-0 px-6 pb-6">
                    <ScrollArea className="h-full border rounded-md">
                        {isLoading ? (
                            // Sử dụng Skeleton
                            <StudentListSkeleton />
                        ) : (
                            <Table className="relative"> {/* Thêm relative */}
                                {/* Header dính */}
                                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-[60px]">Ảnh</TableHead>
                                        <TableHead className="min-w-[150px]">Họ và tên</TableHead>
                                        <TableHead>MSSV</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Chuyên ngành</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map(student => (
                                            <TableRow key={student.ID_NGUOIDUNG}>
                                                <TableCell>
                                                    <Avatar className="h-9 w-9 border">
                                                        <AvatarFallback>{getInitials(student.HODEM_VA_TEN)}</AvatarFallback>
                                                    </Avatar>
                                                </TableCell>
                                                <TableCell className="font-medium">{student.HODEM_VA_TEN}</TableCell>
                                                <TableCell>{student.MA_DINHDANH}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{student.EMAIL}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {student.sinhvien?.chuyennganh?.TEN_CHUYENNGANH ?? 'N/A'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                {allStudents.length === 0 ? 'Tất cả sinh viên đều đã có nhóm.' : 'Không tìm thấy sinh viên phù hợp.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </ScrollArea>
                </div>
                <DialogFooter className="p-6 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Đóng
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}