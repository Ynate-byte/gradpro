import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Added useMemo, useCallback
import { getInactiveStudents, removeStudents } from '@/api/adminGroupService';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, UserX, Search, UserCircle, Users } from 'lucide-react'; // Added Search, UserCircle, Users
import { Input } from '@/components/ui/input'; // Added Input
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Added Avatar
import { useDebounce } from '@/hooks/useDebounce'; // Added useDebounce
import { Skeleton } from '@/components/ui/skeleton'; // Added Skeleton
import { cn } from '@/lib/utils'; // Added cn

// Helper to get initials
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

// --- Component Skeleton for the student list ---
const InactiveStudentListSkeleton = ({ count = 8 }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-[50px]"><Skeleton className="h-5 w-5" /></TableHead>
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
                    <TableCell><Skeleton className="h-5 w-5" /></TableCell>
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

export function InactiveStudentsDialog({ isOpen, setIsOpen, onSuccess, planId }) {
    const [allStudents, setAllStudents] = useState([]); // Store the full list
    const [selected, setSelected] = useState(new Set()); // Use Set for easier management
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // State for search term
    const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search

    // Fetch initial data
    const fetchData = useCallback(() => {
        if (isOpen && planId) {
            setIsLoading(true);
            setSelected(new Set()); // Reset selection
            setSearchTerm(''); // Reset search
            getInactiveStudents(planId)
                .then(data => setAllStudents(data || [])) // Store in allStudents
                .catch(() => toast.error("Lỗi khi tải danh sách sinh viên."))
                .finally(() => setIsLoading(false));
        } else if (!isOpen) {
             // Reset state when closing
             setAllStudents([]);
             setSelected(new Set());
             setSearchTerm('');
        }
    }, [isOpen, planId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]); // Use the memoized fetchData

    // Filter students based on search term
    const filteredStudents = useMemo(() => {
        if (!debouncedSearchTerm) return allStudents;
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        return allStudents.filter(student =>
            student.HODEM_VA_TEN.toLowerCase().includes(lowerSearch) ||
            student.MA_DINHDANH.toLowerCase().includes(lowerSearch) ||
            (student.EMAIL && student.EMAIL.toLowerCase().includes(lowerSearch))
        );
    }, [debouncedSearchTerm, allStudents]);

    // Handle single student selection
    const handleSelect = (id) => {
        setSelected(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(id)) {
                newSelected.delete(id);
            } else {
                newSelected.add(id);
            }
            return newSelected;
        });
    };

    // Handle select/deselect all *filtered* students
    const handleSelectAllFiltered = () => {
        const currentFilteredIds = new Set(filteredStudents.map(s => s.ID_NGUOIDUNG));
        const currentSelectedFiltered = Array.from(selected).filter(id => currentFilteredIds.has(id));

        if (currentSelectedFiltered.length === filteredStudents.length && filteredStudents.length > 0) {
            // Deselect all visible
            setSelected(prev => {
                const newSelected = new Set(prev);
                currentFilteredIds.forEach(id => newSelected.delete(id));
                return newSelected;
            });
        } else {
            // Select all visible
            setSelected(prev => {
                const newSelected = new Set(prev);
                currentFilteredIds.forEach(id => newSelected.add(id));
                return newSelected;
            });
        }
    };

    // Check if all filtered rows are selected
    const areAllFilteredSelected = useMemo(() => {
        if (filteredStudents.length === 0) return false;
        return filteredStudents.every(student => selected.has(student.ID_NGUOIDUNG));
    }, [filteredStudents, selected]);


    // Handle remove action
    const handleRemove = async () => {
        if (selected.size === 0) {
             toast.warning("Vui lòng chọn ít nhất một sinh viên.");
             return;
        }
        setIsProcessing(true);
        try {
            const res = await removeStudents(Array.from(selected)); // Convert Set to Array
            toast.success(res.message);
            onSuccess(); // Refresh parent component
            setIsOpen(false); // Close dialog
        } catch (error) {
            toast.error(error.response?.data?.message || "Thao tác thất bại.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <UserX className="h-6 w-6 text-orange-600" />
                        Sinh viên chưa từng đăng nhập ({isLoading ? '...' : filteredStudents.length})
                    </DialogTitle>
                    <DialogDescription>
                        Danh sách sinh viên thuộc kế hoạch này chưa đăng nhập. Bạn có thể vô hiệu hóa tài khoản của họ.
                    </DialogDescription>
                </DialogHeader>

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

                {/* Table Area */}
                <div className="flex-grow min-h-0 px-6 pb-6">
                    <ScrollArea className="h-full border rounded-md">
                        {isLoading ? (
                            // Use Skeleton
                            <InactiveStudentListSkeleton />
                        ) : (
                            <Table className="relative">
                                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Checkbox
                                                checked={areAllFilteredSelected}
                                                onCheckedChange={handleSelectAllFiltered}
                                                aria-label="Select all filtered"
                                                disabled={filteredStudents.length === 0}
                                            />
                                        </TableHead>
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
                                            <TableRow
                                                key={student.ID_NGUOIDUNG}
                                                // Highlight selected row
                                                data-state={selected.has(student.ID_NGUOIDUNG) ? 'selected' : ''}
                                            >
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selected.has(student.ID_NGUOIDUNG)}
                                                        onCheckedChange={() => handleSelect(student.ID_NGUOIDUNG)}
                                                        aria-label={`Select ${student.HODEM_VA_TEN}`}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                     <Avatar className="h-9 w-9 border">
                                                         <AvatarFallback>{getInitials(student.HODEM_VA_TEN)}</AvatarFallback>
                                                     </Avatar>
                                                </TableCell>
                                                <TableCell className="font-medium">{student.HODEM_VA_TEN}</TableCell>
                                                <TableCell>{student.MA_DINHDANH}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{student.EMAIL}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{student.sinhvien?.chuyennganh?.TEN_CHUYENNGANH ?? 'N/A'}</TableCell>
                                            </TableRow>
                                        ))
                                     ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                {allStudents.length === 0 ? 'Không có sinh viên nào chưa đăng nhập.' : 'Không tìm thấy sinh viên phù hợp.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter className="p-6 pt-4 border-t flex justify-between sm:justify-between">
                    {/* Show selected count */}
                    <div className="text-sm text-muted-foreground pt-2">
                         Đã chọn: {selected.size}
                    </div>
                     <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>
                            Đóng
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={selected.size === 0 || isProcessing}
                            onClick={handleRemove}
                            className="min-w-[150px]" // Set min width for button consistency
                        >
                            {isProcessing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <UserX className="mr-2 h-4 w-4" />
                            )}
                            Vô hiệu hóa ({selected.size})
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}