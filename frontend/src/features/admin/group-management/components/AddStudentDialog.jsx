import React, { useState, useEffect, useMemo } from 'react';
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
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isFetchingStudents, setIsFetchingStudents] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Reset state khi mở dialog
    useEffect(() => {
        if (isOpen) {
            setSearchResults([]);
            setSelectedStudents([]);
            setSearchTerm('');
            setIsFetchingStudents(false);
        }
    }, [isOpen]);

    // Effect tìm kiếm Server-side
    useEffect(() => {
        if (!isOpen || !planId) return;

        // Chỉ tìm kiếm nếu từ khóa >= 2 ký tự
        if (debouncedSearchTerm.length < 2) {
            setSearchResults([]);
            setIsFetchingStudents(false);
            return;
        }

        setIsFetchingStudents(true);
        searchUngroupedStudents(planId, debouncedSearchTerm)
            .then(data => {
                setSearchResults(data || []);
            })
            .catch((error) => {
                console.error("Lỗi tìm kiếm sinh viên:", error);
                toast.error("Không thể tìm kiếm sinh viên.");
            })
            .finally(() => setIsFetchingStudents(false));
            
    }, [debouncedSearchTerm, isOpen, planId]);

    // Lọc bỏ các sinh viên đã chọn khỏi danh sách kết quả tìm kiếm
    const availableStudents = useMemo(() => {
        const selectedIds = new Set(selectedStudents.map(s => s.ID_NGUOIDUNG));
        return searchResults.filter(student => !selectedIds.has(student.ID_NGUOIDUNG));
    }, [searchResults, selectedStudents]);

    const handleToggleStudent = (student, isChecked) => {
        if (isChecked) {
            setSelectedStudents(prev => [...prev, student]);
        } else {
            setSelectedStudents(prev => prev.filter(s => s.ID_NGUOIDUNG !== student.ID_NGUOIDUNG));
        }
    };

    const handleRemoveSelected = (studentId) => {
        setSelectedStudents(prev => prev.filter(s => s.ID_NGUOIDUNG !== studentId));
    };

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
            onSuccess();
            setIsOpen(false);
        } catch (error) {
            console.error("Lỗi khi thêm thành viên:", error);
            if (error.response?.status === 409) {
                toast.error(error.response.data.message);
            } else {
                toast.error("Thêm thành viên thất bại.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!group) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
                    <DialogTitle className="text-2xl">Thêm sinh viên vào nhóm "{group.TEN_NHOM}"</DialogTitle>
                    <DialogDescription>
                        Tìm kiếm và chọn sinh viên chưa có nhóm để thêm vào.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-grow min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-hidden">
                    
                    {/* Cột 1: Tìm kiếm và Danh sách kết quả */}
                    <div className="flex flex-col space-y-3">
                        <Label className="flex items-center gap-2 text-base flex-shrink-0">
                            <Users className="h-5 w-5"/> Tìm kiếm sinh viên
                        </Label>
                        <div className="relative flex-shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input  
                                placeholder="Nhập tên hoặc MSSV (min 2 ký tự)..."  
                                className="pl-10"  
                                value={searchTerm}  
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                autoFocus
                            />
                        </div>
                        
                        <div className="flex-grow min-h-0 border rounded-md relative">
                            <ScrollArea className="h-full">
                                {isFetchingStudents ? (
                                    <div className="p-4">
                                        <StudentListSkeleton count={5} />
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-card z-10">
                                            <TableRow>
                                                <TableHead className="w-[50px]"></TableHead>
                                                <TableHead>Họ và tên</TableHead>
                                                <TableHead>MSSV</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {availableStudents.length > 0 ? (
                                                availableStudents.map(student => (
                                                    <TableRow key={student.ID_NGUOIDUNG} className="cursor-pointer" onClick={() => handleToggleStudent(student, true)}>
                                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                                            <Checkbox
                                                                checked={false} // Luôn false ở cột trái vì khi check nó sẽ nhảy sang phải
                                                                onCheckedChange={(checked) => handleToggleStudent(student, checked)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-medium">{student.HODEM_VA_TEN}</TableCell>
                                                        <TableCell>{student.MA_DINHDANH}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                                                        {debouncedSearchTerm.length < 2 
                                                            ? 'Vui lòng nhập từ khóa để tìm kiếm.' 
                                                            : 'Không tìm thấy sinh viên nào chưa có nhóm.'}
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
                    <div className="flex flex-col space-y-3">
                        <Label className="flex items-center gap-2 text-base flex-shrink-0">
                            <UserCheck className="h-5 w-5"/> Đã chọn ({selectedStudents.length})
                        </Label>
                        <Card className="flex-grow min-h-0 bg-muted/10">
                            <ScrollArea className="h-full">
                                <CardContent className="p-3 space-y-2">
                                    {selectedStudents.length > 0 ? (
                                        selectedStudents.map(member => (
                                            <div key={member.ID_NGUOIDUNG} className="flex items-center justify-between p-2.5 rounded-md border bg-background hover:bg-muted/50 transition-colors shadow-sm">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <Avatar className="h-9 w-9 shrink-0 border">
                                                        <AvatarFallback>{getInitials(member.HODEM_VA_TEN)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-grow min-w-0">
                                                        <p className="text-sm font-semibold truncate">{member.HODEM_VA_TEN}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{member.MA_DINHDANH}</p>
                                                    </div>
                                                </div>
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0" 
                                                    onClick={() => handleRemoveSelected(member.ID_NGUOIDUNG)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground p-10 text-center opacity-60">
                                            <UserCheck className="h-10 w-10 mb-2" />
                                            <span>Sinh viên được chọn sẽ xuất hiện ở đây.</span>
                                        </div>
                                    )}
                                </CardContent>
                            </ScrollArea>
                        </Card>
                    </div>
                </div>
                
                <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || selectedStudents.length === 0}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}   
                        Xác nhận thêm ({selectedStudents.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}