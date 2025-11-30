import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { addParticipantsToPlan, searchStudentsForPlan } from '@/api/thesisPlanService';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, UserPlus, X, Users, Check, Trash2, ListFilter } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebounce } from '@/hooks/useDebounce';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

// Helper (Lấy 2 chữ cái đầu)
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

// Skeleton (Fix Dark Mode visibility)
const StudentSearchSkeleton = ({ count = 6 }) => (
    <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-md border border-border/60 bg-white dark:bg-slate-900 animate-pulse">
                <Skeleton className="h-4 w-4 rounded-sm bg-slate-200 dark:bg-slate-700" />
                <Skeleton className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                <Skeleton className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700" />
            </div>
        ))}
    </div>
);

export function AddParticipantDialog({ isOpen, setIsOpen, onSuccess, plan }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // 1. Logic tìm kiếm
    useEffect(() => {
        if (!isOpen) return;
        if (debouncedSearchTerm.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        searchStudentsForPlan(plan.ID_KEHOACH, debouncedSearchTerm)
            .then(data => setSearchResults(data || []))
            .catch((error) => toast.error(error.response?.data?.message || "Lỗi khi tìm kiếm."))
            .finally(() => setIsSearching(false));
    }, [debouncedSearchTerm, plan.ID_KEHOACH, isOpen]);

    // 2. Reset state
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setSearchResults([]);
            setSelectedStudents([]);
            setIsSearching(false);
            setIsLoading(false);
        }
    }, [isOpen]);

    // 3. Lọc danh sách hiển thị
    const availableStudents = useMemo(() => {
        const selectedIds = new Set(selectedStudents.map(s => s.ID_SINHVIEN));
        return searchResults.filter(student => !selectedIds.has(student.ID_SINHVIEN));
    }, [searchResults, selectedStudents]);

    // 4. Handlers
    const handleToggleStudent = (student) => {
        const isSelected = selectedStudents.some(s => s.ID_SINHVIEN === student.ID_SINHVIEN);
        if (isSelected) {
             handleRemoveSelected(student.ID_SINHVIEN);
        } else {
             setSelectedStudents(prev => [...prev, student]);
        }
    };
    
    const handleRemoveSelected = (studentId) => {
        setSelectedStudents(prev => prev.filter(s => s.ID_SINHVIEN !== studentId));
    };

    const handleSelectAll = () => {
        if (availableStudents.length === 0) return;
        setSelectedStudents(prev => [...prev, ...availableStudents]);
    };

    const handleClearAll = () => {
        setSelectedStudents([]);
    };

    const handleSubmit = async () => {
        if (selectedStudents.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một sinh viên.");
            return;
        }
        setIsLoading(true);
        try {
            const res = await addParticipantsToPlan(plan.ID_KEHOACH, selectedStudents.map(s => s.ID_SINHVIEN));
            toast.success(res.message);
            onSuccess();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Thêm thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    // Component hiển thị Item Sinh viên (Fix Dark Mode Colors)
    const StudentItemCompact = ({ student, isSelected, onToggle, showRemoveIcon = false }) => (
        <div 
            onClick={() => onToggle(student)}
            className={cn(
                "flex items-center gap-3 p-2 rounded-md border mb-2 cursor-pointer transition-all duration-200 text-sm group select-none",
                // Cột TRÁI (Chưa chọn):
                !isSelected && !showRemoveIcon && "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/30 dark:hover:bg-blue-900/20",
                // Cột PHẢI (Đã chọn):
                showRemoveIcon && "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50/30 dark:hover:bg-red-900/20"
            )}
        >
            <div className="shrink-0 flex items-center justify-center">
                 {showRemoveIcon ? (
                    <div className="h-6 w-6 flex items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400 group-hover:scale-110 transition-transform">
                        <X className="h-3.5 w-3.5" />
                    </div>
                 ) : (
                    <Checkbox 
                        checked={isSelected} 
                        className="pointer-events-none border-slate-300 dark:border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" 
                    />
                 )}
            </div>

            <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-700 shrink-0">
                <AvatarFallback className={cn(
                    "text-[10px] font-bold", 
                    showRemoveIcon 
                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300" 
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                )}>
                    {getInitials(student.HODEM_VA_TEN)}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 overflow-hidden">
                <span className="font-semibold truncate text-slate-800 dark:text-slate-200">
                    {student.HODEM_VA_TEN}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono shrink-0 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                    {student.MA_DINHDANH}
                </span>
            </div>
        </div>
    );

    if (!plan) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[1000px] h-[90vh] flex flex-col p-0 gap-0 bg-slate-50 dark:bg-slate-950 overflow-hidden border-slate-200 dark:border-slate-800">
                
                {/* HEADER: Màu tối hơn cho Dark mode */}
                <DialogHeader className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                    <DialogTitle className="text-xl flex items-center gap-3 text-slate-900 dark:text-slate-100">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span>Thêm sinh viên tham gia</span>
                            <div className="text-xs font-normal text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                Kế hoạch: <Badge variant="outline" className="bg-transparent font-normal text-foreground border-slate-300 dark:border-slate-700">{plan.TEN_DOT}</Badge>
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {/* MAIN CONTENT - 2 CỘT */}
                <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
                    
                    {/* CỘT TRÁI: TÌM KIẾM */}
                    <div className="md:col-span-7 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
                        <div className="p-4 space-y-4 shrink-0 border-b border-slate-100 dark:border-slate-800 border-dashed">
                            {/* Ô tìm kiếm (Fix background tối) */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <Input
                                    placeholder="Tìm tên, MSSV, email (min 2 ký tự)..."
                                    className="pl-9 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 text-slate-900 dark:text-slate-100 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {/* Thanh công cụ */}
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-2 rounded-md border border-slate-200 dark:border-slate-800">
                                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                    <ListFilter className="h-3.5 w-3.5" />
                                    Kết quả: <span className="font-bold text-slate-900 dark:text-slate-100">{availableStudents.length}</span>
                                </div>
                                {availableStudents.length > 0 && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-7 text-xs px-2 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm hover:text-blue-600 dark:hover:text-blue-400 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                                        onClick={handleSelectAll}
                                    >
                                        <Check className="mr-1.5 h-3.5 w-3.5" /> Chọn tất cả
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 bg-slate-50/30 dark:bg-slate-950">
                            <ScrollArea className="h-full">
                                <div className="p-4">
                                    {isSearching ? (
                                        <StudentSearchSkeleton />
                                    ) : availableStudents.length > 0 ? (
                                        availableStudents.map(student => (
                                            <StudentItemCompact 
                                                key={student.ID_SINHVIEN} 
                                                student={student} 
                                                isSelected={false} 
                                                onToggle={() => handleToggleStudent(student)} 
                                            />
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-60 text-center space-y-3 text-slate-500 dark:text-slate-400">
                                            {debouncedSearchTerm.length < 2 ? (
                                                <div className="p-6 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-100 dark:border-slate-800">
                                                    <Search className="h-8 w-8 opacity-20" />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-6 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-100 dark:border-slate-800">
                                                        <Users className="h-8 w-8 opacity-20" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">Không tìm thấy sinh viên</p>
                                                        <p className="text-xs mt-1">Thử tìm kiếm bằng từ khóa khác hoặc<br/>kiểm tra sinh viên đã tham gia chưa.</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    {/* CỘT PHẢI: ĐÃ CHỌN */}
                    <div className="md:col-span-5 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900/50 border-l border-slate-200 dark:border-slate-800 shadow-inner">
                        <div className="p-4 shrink-0 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 shadow-sm">
                                    Đã chọn: {selectedStudents.length}
                                </Badge>
                            </div>
                            {selectedStudents.length > 0 && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all"
                                    onClick={handleClearAll}
                                >
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Xóa hết
                                </Button>
                            )}
                        </div>

                        <div className="flex-1 min-h-0 p-4">
                            <div className={cn(
                                "h-full rounded-xl overflow-hidden transition-all",
                                selectedStudents.length === 0 
                                    ? "border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center bg-white/50 dark:bg-transparent"
                                    : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm"
                            )}>
                                {selectedStudents.length > 0 ? (
                                    <ScrollArea className="h-full">
                                        <div className="p-3">
                                            {selectedStudents.map(student => (
                                                <StudentItemCompact 
                                                    key={student.ID_SINHVIEN} 
                                                    student={student} 
                                                    isSelected={true} 
                                                    onToggle={() => handleRemoveSelected(student.ID_SINHVIEN)}
                                                    showRemoveIcon={true}
                                                />
                                            ))}
                                        </div>
                                    </ScrollArea>
                                ) : (
                                    <div className="flex flex-col items-center text-center space-y-2 p-4">
                                        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
                                            <UserPlus className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Chưa chọn sinh viên nào</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[180px]">
                                            Hãy tích chọn sinh viên từ danh sách bên trái để thêm vào đây.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <DialogFooter className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                    <div className="flex w-full justify-between items-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-blue-500"></div> 
                           Tip: Nhấn vào tên để chọn nhanh
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setIsOpen(false)} className="border-slate-300 dark:border-slate-700">Hủy</Button>
                            <Button onClick={handleSubmit} disabled={isLoading || selectedStudents.length === 0} className="bg-blue-600 hover:bg-blue-700 shadow-md px-6">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Xác nhận thêm ({selectedStudents.length})
                            </Button>
                        </div>
                    </div>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
}