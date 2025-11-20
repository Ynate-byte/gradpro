import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getInactiveStudents, removeInactiveStudentsFromPlan } from '@/api/adminGroupService';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, UserX, Search, AlertCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/useDebounce';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
// [THÊM] Import AlertDialog components
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    const [allStudents, setAllStudents] = useState([]); 
    const [selected, setSelected] = useState(new Set()); 
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); 
    const debouncedSearchTerm = useDebounce(searchTerm, 300); 
    const [apiError, setApiError] = useState(null);

    // [THÊM] State quản lý bước xác nhận (0: none, 1: warning 1, 2: warning 2)
    const [confirmStep, setConfirmStep] = useState(0);

    // Fetch initial data
    const fetchData = useCallback(() => {
        if (isOpen && planId) {
            setIsLoading(true);
            setSelected(new Set()); 
            setSearchTerm(''); 
            setApiError(null);
            setConfirmStep(0); // Reset confirm step
            getInactiveStudents(planId)
                .then(data => setAllStudents(data || [])) 
                .catch(() => toast.error("Lỗi khi tải danh sách sinh viên."))
                .finally(() => setIsLoading(false));
        } else if (!isOpen) {
            setAllStudents([]);
            setSelected(new Set());
            setSearchTerm('');
            setApiError(null);
            setConfirmStep(0);
        }
    }, [isOpen, planId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    useEffect(() => {
        if (debouncedSearchTerm) {
            setApiError(null);
        }
    }, [debouncedSearchTerm]);

    const handleSelect = (participantId) => { 
        setApiError(null);
        setSelected(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(participantId)) {
                newSelected.delete(participantId);
            } else {
                newSelected.add(participantId);
            }
            return newSelected;
        });
    };

    const handleSelectAllFiltered = () => {
        setApiError(null);
        const currentFilteredIds = new Set(filteredStudents.map(s => s.ID_THAMGIA));  
        const currentSelectedFiltered = Array.from(selected).filter(id => currentFilteredIds.has(id));

        if (currentSelectedFiltered.length === filteredStudents.length && filteredStudents.length > 0) {
            setSelected(prev => {
                const newSelected = new Set(prev);
                currentFilteredIds.forEach(id => newSelected.delete(id));
                return newSelected;
            });
        } else {
            setSelected(prev => {
                const newSelected = new Set(prev);
                currentFilteredIds.forEach(id => newSelected.add(id));
                return newSelected;
            });
        }
    };

    const areAllFilteredSelected = useMemo(() => {
        if (filteredStudents.length === 0) return false;
        return filteredStudents.every(student => selected.has(student.ID_THAMGIA));
    }, [filteredStudents, selected]);

    // [SỬA] Hàm bắt đầu quy trình xóa (Mở Alert 1)
    const initiateRemove = () => {
        if (selected.size === 0) {
            toast.warning("Vui lòng chọn ít nhất một sinh viên.");
            return;
        }
        setConfirmStep(1);
    };

    // [SỬA] Hàm thực hiện xóa thật sự (Sau khi qua 2 bước xác nhận)
    const handleRemoveExecute = async () => {
        setConfirmStep(0); // Đóng dialog xác nhận
        setIsProcessing(true);
        setApiError(null);
        try {
            const participantIds = Array.from(selected);
            const payload = {
                plan_id: planId,
                participant_ids: participantIds
            };
            const res = await removeInactiveStudentsFromPlan(payload); 
            toast.success(res.message || "Đã xóa sinh viên khỏi kế hoạch.");
            onSuccess(); 
            setIsOpen(false);
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Thao tác thất bại. Vui lòng thử lại.";
            setApiError(errorMsg);

            if (error.response?.status === 409) {
                 toast.error("Thao tác bị chặn", {
                      description: "Xem chi tiết lỗi trong dialog."
                 });
            } else {
                 toast.error("Lỗi:", { description: errorMsg });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <UserX className="h-6 w-6 text-orange-600" />
                            Sinh viên chưa từng đăng nhập ({isLoading ? '...' : allStudents.length})
                        </DialogTitle>
                        <DialogDescription>
                            Hành động này sẽ xóa sinh viên khỏi kế hoạch VÀ khỏi nhóm hiện tại của họ.
                            <br />
                            <span className="text-destructive-foreground/90 font-medium">Lưu ý:</span> Không thể xóa nếu sinh viên là trưởng nhóm của một 'Nhóm Đặc Biệt'.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 pt-4 pb-2 flex-shrink-0">
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

                    <div className="flex-grow min-h-0 px-6 pb-6">
                        <AnimatePresence>
                            {apiError && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginBottom: '16px' }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                >
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Không thể thực hiện</AlertTitle>
                                        <AlertDescription>
                                            {apiError}
                                        </AlertDescription>
                                    </Alert>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <ScrollArea className="h-full border rounded-md">
                            {isLoading ? (
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
                                                    data-state={selected.has(student.ID_THAMGIA) ? 'selected' : ''}
                                                >
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selected.has(student.ID_THAMGIA)}
                                                            onCheckedChange={() => handleSelect(student.ID_THAMGIA)}
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
                                                    <TableCell className="text-muted-foreground text-xs">
                                                        {student.sinhvien?.chuyennganh?.TEN_CHUYENNGANH ?? 'N/A'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                    {allStudents.length === 0 ? 'Tất cả sinh viên đều đã có nhóm.' : 'Không tìm thấy sinh viên phù hợp.'}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </ScrollArea>
                    </div>

                    <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 justify-between sm:justify-between">
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
                                onClick={initiateRemove} // [SỬA] Gọi hàm initiateRemove thay vì handleRemoveExecute
                                className="min-w-[150px]"
                            >
                                {isProcessing ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <UserX className="mr-2 h-4 w-4" />
                                )}
                                Xóa khỏi kế hoạch ({selected.size})
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- [THÊM] CẢNH BÁO LẦN 1 --- */}
            <AlertDialog open={confirmStep === 1} onOpenChange={() => setConfirmStep(0)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa sinh viên?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn đang chuẩn bị xóa <strong>{selected.size}</strong> sinh viên khỏi kế hoạch.
                            <br/><br/>
                            Họ sẽ bị xóa khỏi nhóm hiện tại (nếu có) và không thể truy cập vào kế hoạch này nữa.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={(e) => {
                                    e.preventDefault();
                                    setConfirmStep(2); 
                                }} 
                                className="bg-orange-600 hover:bg-orange-700">
                            Tiếp tục
                        </AlertDialogAction>
                        
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirmStep === 2} onOpenChange={() => setConfirmStep(0)}>
                <AlertDialogContent className="border-destructive/50">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            CẢNH BÁO CUỐI CÙNG
                        </AlertDialogTitle>
                        <AlertDialogDescription className="font-medium text-foreground">
                            Hành động này <span className="text-destructive font-bold">KHÔNG THỂ HOÀN TÁC</span>.
                        </AlertDialogDescription>
                        <AlertDialogDescription>
                            Việc xóa sinh viên có thể ảnh hưởng đến cấu trúc nhóm và dữ liệu liên quan.
                            Bạn có chắc chắn muốn thực hiện không?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Tôi đổi ý</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveExecute} className="bg-destructive hover:bg-destructive/90">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Xác nhận Xóa Vĩnh Viễn
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}