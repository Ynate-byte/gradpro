import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { addMembersToGroup, searchUngroupedStudents } from '@/api/adminGroupService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, X, Users, UserCheck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Label } from "@/components/ui/label";

// Helper lấy chữ cái đầu
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

// Component Skeleton
const StudentListSkeleton = ({ count = 5 }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-[50px]"><Skeleton className="h-5 w-5" /></TableHead>
                <TableHead><Skeleton className="h-5 w-3/4" /></TableHead>
                <TableHead><Skeleton className="h-5 w-1/2" /></TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {Array.from({ length: count }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                    <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);


export function AddStudentDialog({ isOpen, setIsOpen, group, onSuccess, planId }) {
    const [isLoading, setIsLoading] = useState(false); // Loading submit
    const [allStudents, setAllStudents] = useState([]); // Danh sách đầy đủ
    const [isFetchingStudents, setIsFetchingStudents] = useState(true);
    const [selectedStudents, setSelectedStudents] = useState([]); // Mảng các object student
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // 1. Tải toàn bộ SV chưa có nhóm khi mở dialog
    useEffect(() => {
        if (isOpen && planId) {
            setIsFetchingStudents(true);
            setAllStudents([]);
            setSelectedStudents([]);
            setSearchTerm('');
            
            searchUngroupedStudents(planId, '') // Lấy tất cả
                .then(setAllStudents)
                .catch((error) => {
                    console.error("Lỗi khi tải danh sách sinh viên:", error); // Log lỗi
                    toast.error("Lỗi khi tải danh sách sinh viên.");
                })
                .finally(() => setIsFetchingStudents(false));
        }
    }, [isOpen, planId]);

    // 2. Lọc danh sách SV có sẵn (client-side)
    const availableStudents = useMemo(() => {
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        const selectedIds = new Set(selectedStudents.map(s => s.ID_NGUOIDUNG));

        return allStudents.filter(student => {
            // Lọc ra những người đã chọn
            if (selectedIds.has(student.ID_NGUOIDUNG)) {
                return false;
            }
            // Lọc theo search term
            if (!debouncedSearchTerm) {
                return true; // Trả về tất cả nếu không tìm kiếm
            }
            return (
                student.HODEM_VA_TEN.toLowerCase().includes(lowerSearch) ||
                student.MA_DINHDANH.toLowerCase().includes(lowerSearch)
            );
        });
    }, [debouncedSearchTerm, allStudents, selectedStudents]);

    // 3. Xử lý chọn/bỏ chọn
    const handleToggleStudent = (student, isChecked) => {
        if (isChecked) {
            setSelectedStudents(prev => [...prev, student]);
        } else {
            setSelectedStudents(prev => prev.filter(s => s.ID_NGUOIDUNG !== student.ID_NGUOIDUNG));
        }
    };

    // 4. Xử lý xóa khỏi danh sách đã chọn
    const handleRemoveSelected = (studentId) => {
        setSelectedStudents(prev => prev.filter(s => s.ID_NGUOIDUNG !== studentId));
    };

    // 5. Xử lý Submit
    const handleSubmit = async () => {
        if (selectedStudents.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một sinh viên để thêm.");
            return;
        }
        setIsLoading(true);
        try {
            const payload = { 
                ID_NHOM: group.ID_NHOM, 
                student_ids: selectedStudents.map(s => s.ID_NGUOIDUNG) 
            };
            const res = await addMembersToGroup(payload);
            toast.success(res.message);
            onSuccess(); // Tải lại bảng
            setIsOpen(false); // Đóng dialog
        } catch (error) {
            console.error("Lỗi khi thêm thành viên:", error); // Log lỗi
            toast.error(error.response?.data?.message || "Thêm thành viên thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!group) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="text-2xl">Thêm sinh viên vào nhóm "{group.TEN_NHOM}"</DialogTitle>
                    <DialogDescription>Chọn các sinh viên chưa có nhóm từ danh sách bên dưới.</DialogDescription>
                </DialogHeader>

                <div className="flex-grow min-h-0 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start h-full">
                        
                        {/* Cột 1: Danh sách sinh viên có thể thêm */}
                        <div className="flex flex-col space-y-3 h-full">
                            <Label className="flex items-center gap-2 text-base">
                                <Users className="h-5 w-5"/> Sinh viên chưa có nhóm ({availableStudents.length})
                            </Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Lọc theo tên, MSSV..." 
                                    className="pl-10" 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    disabled={isFetchingStudents}
                                />
                            </div>
                            <div className="flex-grow min-h-0 border rounded-md">
                                <ScrollArea className="h-[calc(85vh-280px)]">
                                    {isFetchingStudents ? (
                                        <StudentListSkeleton count={7} />
                                    ) : (
                                        <Table className="relative">
                                            <TableHeader className="sticky top-0 bg-card z-10">
                                                <TableRow>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                    <TableHead>Họ và tên</TableHead>
                                                    <TableHead>MSSV</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {availableStudents.length > 0 ? availableStudents.map(student => (
                                                    <TableRow key={student.ID_NGUOIDUNG}>
                                                        <TableCell>
                                                            <Checkbox
                                                                onCheckedChange={(checked) => handleToggleStudent(student, checked)}
                                                                aria-label={`Select ${student.HODEM_VA_TEN}`}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-medium">{student.HODEM_VA_TEN}</TableCell>
                                                        <TableCell>{student.MA_DINHDANH}</TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                            {allStudents.length === 0 ? 'Không có sinh viên nào chưa có nhóm.' : 'Không tìm thấy sinh viên phù hợp.'}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    )}
                                </ScrollArea>
                            </div>
                        </div>
                        
                        {/* Cột 2: Danh sách đã chọn */}
                        <div className="flex flex-col space-y-3 h-full">
                            <Label className="flex items-center gap-2 text-base">
                                <UserCheck className="h-5 w-5"/> Đã chọn ({selectedStudents.length})
                            </Label>
                            <Card className="flex-grow min-h-0">
                                <ScrollArea className="h-[calc(85vh-280px)]">
                                    <CardContent className="p-3 space-y-2">
                                        {selectedStudents.length > 0 ? (
                                            selectedStudents.map(member => (
                                                <div key={member.ID_NGUOIDUNG} className="flex items-center justify-between p-2.5 rounded-md border bg-background hover:bg-muted/50 transition-colors">
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
                                                        onClick={() => handleRemoveSelected(member.ID_NGUOIDUNG)} 
                                                        title="Xóa khỏi danh sách"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-10 text-center">
                                                Chọn sinh viên từ danh sách bên trái để thêm vào nhóm.
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
                        Thêm ({selectedStudents.length}) thành viên
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}