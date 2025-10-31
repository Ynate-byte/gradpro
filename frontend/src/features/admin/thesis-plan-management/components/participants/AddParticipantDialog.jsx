import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { addParticipantsToPlan, searchStudentsForPlan } from '@/api/thesisPlanService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, UserPlus, X, Users, UserCheck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Helper (Lấy 2 chữ cái đầu)
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

// Skeleton cho danh sách kết quả tìm kiếm
const StudentSearchSkeleton = ({ count = 3 }) => (
    <div className="space-y-2 p-2">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-2">
                <Skeleton className="h-5 w-5 rounded-sm" />
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </div>
        ))}
    </div>
);

export function AddParticipantDialog({ isOpen, setIsOpen, onSuccess, plan }) {
    const [isLoading, setIsLoading] = useState(false); // Loading submit
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]); // Mảng các object student
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // 1. API Call khi người dùng gõ tìm kiếm (đã tối ưu)
    useEffect(() => {
        if (!isOpen) return;

        if (debouncedSearchTerm.length < 2) {
            setSearchResults([]); // Xóa kết quả nếu term quá ngắn
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchStudentsForPlan(plan.ID_KEHOACH, debouncedSearchTerm)
            .then(data => {
                setSearchResults(data || []);
            })
            .catch((error) => {
                console.error("Lỗi khi tìm kiếm sinh viên:", error); // Log lỗi
                toast.error(error.response?.data?.message || "Lỗi khi tìm kiếm sinh viên.");
            })
            .finally(() => setIsSearching(false));

    }, [debouncedSearchTerm, plan.ID_KEHOACH, isOpen]);

    // 2. Reset state khi dialog đóng
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setSearchResults([]);
            setSelectedStudents([]);
            setIsSearching(false);
            setIsLoading(false);
        }
    }, [isOpen]);

    // 3. Lọc ra danh sách SV có thể chọn (từ kết quả search, trừ đi SV đã chọn)
    const availableStudents = useMemo(() => {
        const selectedIds = new Set(selectedStudents.map(s => s.ID_SINHVIEN));
        return searchResults.filter(student => !selectedIds.has(student.ID_SINHVIEN));
    }, [searchResults, selectedStudents]);

    // 4. Xử lý chọn/bỏ chọn
    const handleToggleStudent = (student, isChecked) => {
        if (isChecked) {
            // Thêm vào danh sách đã chọn
            setSelectedStudents(prev => [...prev, student]);
        } else {
            // Xóa khỏi danh sách đã chọn
            setSelectedStudents(prev => prev.filter(s => s.ID_SINHVIEN !== student.ID_SINHVIEN));
        }
    };
    
    // 5. Xử lý xóa khỏi cột "Đã chọn"
    const handleRemoveSelected = (studentId) => {
        setSelectedStudents(prev => prev.filter(s => s.ID_SINHVIEN !== studentId));
    };

    // 6. Xử lý Submit
    const handleSubmit = async () => {
        if (selectedStudents.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một sinh viên để thêm.");
            return;
        }
        setIsLoading(true);
        try {
            const res = await addParticipantsToPlan(plan.ID_KEHOACH, selectedStudents.map(s => s.ID_SINHVIEN));
            toast.success(res.message);
            onSuccess(); // Tải lại bảng chính
            setIsOpen(false); // Đóng dialog
        } catch (error) {
            console.error("Lỗi khi thêm sinh viên:", error); // Log lỗi
            toast.error(error.response?.data?.message || "Thêm sinh viên thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!plan) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {/* Giao diện 2 cột */}
            <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="text-2xl">Thêm sinh viên vào "{plan.TEN_DOT}"</DialogTitle>
                    <DialogDescription>
                        Tìm kiếm (ít nhất 2 ký tự) và chọn sinh viên chưa tham gia kế hoạch này.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-grow min-h-0 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start h-full">
                        
                        {/* Cột 1: Tìm kiếm & Kết quả */}
                        <div className="flex flex-col space-y-3 h-full">
                            <Label className="flex items-center gap-2 text-base">
                                <Search className="h-5 w-5"/> Tìm kiếm sinh viên
                            </Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm theo tên, MSSV, email (min 2 ký tự)..."
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex-grow min-h-0 border rounded-md">
                                <ScrollArea className="h-[calc(85vh-280px)]">
                                    {isSearching ? (
                                        <StudentSearchSkeleton />
                                    ) : availableStudents.length > 0 ? (
                                        <div className="p-2 space-y-1">
                                            {availableStudents.map(student => (
                                                <div key={student.ID_SINHVIEN} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                                                    <Checkbox
                                                        id={`cb-${student.ID_SINHVIEN}`}
                                                        onCheckedChange={(checked) => handleToggleStudent(student, checked)}
                                                        checked={false} // Luôn là false vì nó bị lọc ra khỏi danh sách
                                                    />
                                                    <Label htmlFor={`cb-${student.ID_SINHVIEN}`} className="flex items-center gap-3 cursor-pointer w-full">
                                                        <Avatar className="h-9 w-9 shrink-0">
                                                            <AvatarFallback>{getInitials(student.HODEM_VA_TEN)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-grow min-w-0">
                                                            <p className="text-sm font-semibold truncate" title={student.HODEM_VA_TEN}>{student.HODEM_VA_TEN}</p>
                                                            <p className="text-xs text-muted-foreground truncate" title={student.MA_DINHDANH}>{student.MA_DINHDANH}</p>
                                                        </div>
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-10 text-center">
                                            {debouncedSearchTerm.length < 2
                                                ? "Gõ ít nhất 2 ký tự để tìm kiếm..."
                                                : "Không tìm thấy sinh viên nào."}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        </div>
                        
                        {/* Cột 2: Đã chọn */}
                        <div className="flex flex-col space-y-3 h-full">
                            <Label className="flex items-center gap-2 text-base">
                                <UserCheck className="h-5 w-5"/> Đã chọn ({selectedStudents.length})
                            </Label>
                            <Card className="flex-grow min-h-0">
                                <ScrollArea className="h-[calc(85vh-280px)]">
                                    <CardContent className="p-3 space-y-2">
                                        {selectedStudents.length > 0 ? (
                                            selectedStudents.map(member => (
                                                <div key={member.ID_SINHVIEN} className="flex items-center justify-between p-2.5 rounded-md border bg-background hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <Avatar className="h-9 w-9 shrink-0">
                                                            <AvatarFallback>{getInitials(member.HODEM_VA_TEN)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-grow min-w-0">
                                                            <p className="text-sm font-semibold truncate" title={member.HODEM_VA_TEN}>{member.HODEM_VA_TEN}</p>
                                                            <p className="text-xs text-muted-foreground truncate" title={member.MA_DINHDANH}>{member.MA_DINHDANH}</p>
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0" 
                                                        onClick={() => handleRemoveSelected(member.ID_SINHVIEN)} 
                                                        title="Xóa khỏi danh sách"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-10 text-center">
                                                Chọn sinh viên từ kết quả tìm kiếm bên trái.
                                            </div>
                                        )}
                                    </CardContent>
                                </ScrollArea>
                            </Card>
                        </div>

                    </div>
                </div>

                <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || selectedStudents.length === 0}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Thêm ({selectedStudents.length}) sinh viên
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}