import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from "@/components/ui/checkbox";
import { 
    Users, BookCopy, Calendar, User, Loader2, FileText, 
    Link as LinkIcon, Download, XCircle, CheckCircle, 
    ChevronLeft, ChevronRight, Clock, AlertTriangle, FileWarning, ShieldCheck,
    GraduationCap, Paperclip, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { getSubmissionDetails, confirmSubmission } from '@/api/adminSubmissionService';
import { RejectSubmissionDialog } from './RejectDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// --- Helper: File Item Card (Modern Tile Style) ---
const FileItem = ({ file, isSelectable, isSelected, onToggle }) => {
    const isLink = file.LOAI_FILE.startsWith('Link');
    // Logic icon giữ nguyên, chỉ thay đổi hiển thị
    const Icon = isLink ? LinkIcon : FileText;

    return (
        <div 
            onClick={() => isSelectable && onToggle(file.ID_FILE)}
            className={cn(
                "group relative flex flex-col gap-2 p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer overflow-hidden",
                // Normal State
                "bg-white dark:bg-card border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800",
                // Selected State (Error Marking)
                isSelected && "bg-red-50 border-red-500/50 ring-1 ring-red-500/20 shadow-red-100 dark:bg-red-900/10 dark:border-red-500"
            )}
        >
            <div className="flex items-start justify-between gap-3">
                {/* Icon Box */}
                <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                    isLink ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600",
                    isSelected && "bg-red-100 text-red-600"
                )}>
                    <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between">
                        <p className={cn(
                            "text-sm font-bold truncate pr-2",
                            isSelected ? "text-red-700" : "text-slate-700 dark:text-slate-200"
                        )}>
                            {file.LOAI_FILE}
                        </p>
                        {/* Checkbox for selection */}
                        {isSelectable && (
                            <Checkbox 
                                checked={isSelected}
                                onCheckedChange={() => onToggle(file.ID_FILE)}
                                className={cn(
                                    "data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 w-5 h-5 transition-transform",
                                    isSelected ? "scale-100" : "scale-90 opacity-0 group-hover:opacity-100"
                                )}
                            />
                        )}
                    </div>
                    
                    {/* File Name / Link */}
                    <div className="flex items-center gap-1.5 mt-1">
                        {isLink && <ExternalLink className="w-3 h-3 text-slate-400" />}
                        <p className="text-xs text-slate-500 font-medium truncate" title={isLink ? file.DUONG_DAN_HOAC_NOI_DUNG : file.TEN_FILE_GOC}>
                            {isLink ? file.DUONG_DAN_HOAC_NOI_DUNG : file.TEN_FILE_GOC}
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Footer inside Card */}
            <div className="flex items-center justify-end mt-1 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                <Button 
                    asChild size="sm" variant="ghost" 
                    className="h-7 text-xs px-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                    onClick={(e) => e.stopPropagation()} 
                >
                    <a href={file.url} target="_blank" rel="noopener noreferrer" download={!isLink ? file.TEN_FILE_GOC : undefined} className="flex items-center gap-1.5">
                        {isLink ? "Mở liên kết" : "Tải xuống"}
                        <Download className="h-3.5 w-3.5" />
                    </a>
                </Button>
            </div>
        </div>
    );
};

export function SubmissionDetailDialog({ 
    submission, isOpen, setIsOpen, onSuccess,
    onNext, onPrevious, hasNext, hasPrevious        
}) {
    const [details, setDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [rejectedFileIds, setRejectedFileIds] = useState([]);

    useEffect(() => {
        if (isOpen && submission?.ID_NOP_SANPHAM) {
            setIsLoading(true);
            setDetails(null); 
            setRejectedFileIds([]);
            
            getSubmissionDetails(submission.ID_NOP_SANPHAM)
                .then(setDetails)
                .catch(() => toast.error("Lỗi khi tải chi tiết."))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, submission?.ID_NOP_SANPHAM]);

    // Keyboard nav
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen || isRejectDialogOpen) return;
            if (e.key === 'ArrowLeft' && hasPrevious) onPrevious();
            if (e.key === 'ArrowRight' && hasNext) onNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, hasNext, hasPrevious, isRejectDialogOpen, onNext, onPrevious]); // <-- ĐÃ SỬA: Thêm onNext, onPrevious vào đây

    const toggleRejectFile = (fileId) => {
        setRejectedFileIds(prev => 
            prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
        );
    };

    const handleConfirm = async () => {
        setIsConfirming(true);
        try {
            const res = await confirmSubmission(submission.ID_NOP_SANPHAM);
            toast.success(res.message);
            onSuccess(); 
            hasNext ? onNext() : setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi.");
        } finally {
            setIsConfirming(false);
        }
    };

    const onRejectSuccess = () => {
        onSuccess(); 
        setIsRejectDialogOpen(false);
        if (hasNext) {
            onNext();
        } else {
            setIsOpen(false);
        }
    }

    if (!submission) return null;
    const canEdit = submission.TRANGTHAI === 'Chờ xác nhận';

    // Helper Styles
    const labelStyle = "text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-0.5 flex items-center gap-1.5";
    const valueStyle = "text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight";

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-6xl w-[95vw] h-[90vh] !p-0 !gap-0 flex flex-col dark:bg-black overflow-hidden outline-none border-none sm:rounded-2xl shadow-2xl">
                    
                    {/* --- 1. MODERN HEADER --- */}
                    <DialogHeader className="h-16 px-6 border-b bg-white dark:bg-card flex flex-row items-center justify-between shrink-0 z-20">
                        <div className="flex items-center gap-5">
                            {/* Status Icon Wrapper */}
                            <div className={cn(
                                "h-9 w-9 rounded-full flex items-center justify-center border",
                                submission.TRANGTHAI === 'Đã xác nhận' ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                                submission.TRANGTHAI === 'Chờ xác nhận' ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-red-50 border-red-200 text-red-600"
                            )}>
                                {submission.TRANGTHAI === 'Đã xác nhận' ? <CheckCircle className="h-5 w-5" /> :
                                 submission.TRANGTHAI === 'Chờ xác nhận' ? <ShieldCheck className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                            </div>

                            <div>
                                <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-3">
                                    Duyệt sản phẩm
                                    <Badge variant="outline" className="font-mono text-[10px] text-slate-400 bg-slate-50">
                                        #{submission.ID_NOP_SANPHAM}
                                    </Badge>
                                </DialogTitle>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 font-medium">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> 
                                        {details?.NGAY_NOP ? format(new Date(details.NGAY_NOP), "HH:mm dd/MM/yyyy", { locale: vi }) : '...'}
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span className={cn(
                                        "px-1.5 py-0 rounded text-[10px] uppercase font-bold tracking-wide",
                                        submission.TRANGTHAI === 'Đã xác nhận' ? "bg-emerald-100 text-emerald-700" :
                                        submission.TRANGTHAI === 'Chờ xác nhận' ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                                    )}>
                                        {submission.TRANGTHAI}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            <Button variant="ghost" size="icon" onClick={onPrevious} disabled={!hasPrevious} className="h-7 w-7 rounded-md hover:bg-white hover:shadow-sm">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="h-4 w-[1px] bg-slate-300 mx-1"></div>
                            <Button variant="ghost" size="icon" onClick={onNext} disabled={!hasNext} className="h-7 w-7 rounded-md hover:bg-white hover:shadow-sm">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogHeader>

                    {/* --- 2. DASHBOARD CONTENT --- */}
                    <div className="flex-1 flex overflow-hidden">
                        
                        {/* LEFT: METADATA PANEL (Compact & Visual) */}
                        <div className="w-[340px] bg-white dark:bg-card border-r flex flex-col overflow-y-auto shrink-0 z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                            <div className="p-5 space-y-6">
                                
                                {/* Block: Đề tài (Quan trọng nhất - Highlight) */}
                                <div className="rounded-xl bg-indigo-50/60 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 p-4 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-100/50 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                                    <div className={labelStyle + " text-indigo-500 mb-2"}>
                                        <BookCopy className="w-3.5 h-3.5" /> Đề tài thực hiện
                                    </div>
                                    <p className="text-sm font-bold text-indigo-950 dark:text-indigo-100 leading-snug">
                                        {details?.phancong?.detai?.TEN_DETAI || 'Đang tải...'}
                                    </p>
                                </div>

                                {/* Block: Nhóm & GV */}
                                <div className="space-y-4">
                                    <div>
                                        <div className={labelStyle}><Users className="w-3.5 h-3.5" /> Nhóm sinh viên</div>
                                        <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                                            <div className="h-8 w-8 rounded bg-white border flex items-center justify-center font-bold text-slate-600 text-xs">
                                                {details?.phancong?.nhom?.TEN_NHOM?.substring(0, 2) || "N"}
                                            </div>
                                            <div className={valueStyle}>{details?.phancong?.nhom?.TEN_NHOM}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className={labelStyle}><GraduationCap className="w-3.5 h-3.5" /> Giảng viên hướng dẫn</div>
                                        <div className={valueStyle + " pl-1"}>{details?.phancong?.gvhd?.nguoidung?.HODEM_VA_TEN}</div>
                                    </div>
                                </div>

                                <Separator className="bg-slate-100" />

                                {/* Block: Người nộp */}
                                <div>
                                    <div className={labelStyle}><User className="w-3.5 h-3.5" /> Đại diện nộp bài</div>
                                    <div className="flex items-center gap-3 mt-2">
                                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                            <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">
                                                {details?.nguoi_nop?.HODEM_VA_TEN?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold text-slate-800 truncate">{details?.nguoi_nop?.HODEM_VA_TEN || '...'}</p>
                                            <p className="text-xs text-slate-500 truncate font-medium">{details?.nguoi_nop?.EMAIL}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* History Warning Alert */}
                                {details?.PHANHOI_ADMIN && (
                                    <div className="mt-4 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-800 text-sm shadow-sm relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400"></div>
                                        <p className="font-bold flex items-center gap-2 mb-1.5 text-[11px] uppercase tracking-wide">
                                            <AlertTriangle className="h-3.5 w-3.5" /> Lần trước bị từ chối
                                        </p>
                                        <p className="italic opacity-90 text-xs leading-relaxed bg-white/50 p-2 rounded border border-red-100/50">
                                            "{details.PHANHOI_ADMIN}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: FILES GRID (Clean & Spacious) */}
                        <div className="flex-1 bg-slate-50/30 dark:bg-background flex flex-col h-full overflow-hidden relative">
                            {isLoading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
                                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Đang tải dữ liệu...</p>
                                </div>
                            ) : !details?.files?.length ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                    <FileWarning className="h-12 w-12 opacity-20 mb-2" />
                                    <p className="font-medium">Chưa có sản phẩm nào được nộp.</p>
                                </div>
                            ) : (
                                <ScrollArea className="flex-1">
                                    <div className="p-8">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-gray-100 flex items-center gap-2">
                                                    <Paperclip className="w-4 h-4 text-slate-400" /> 
                                                    Tài liệu & Liên kết
                                                </h3>
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                                    {details.files.length}
                                                </span>
                                            </div>
                                            
                                            {canEdit && (
                                                <div className="text-xs font-medium text-orange-600 flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                                    </span>
                                                    Chọn file lỗi để yêu cầu nộp lại
                                                </div>
                                            )}
                                        </div>

                                        {/* GRID LAYOUT */}
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-10">
                                            {details.files.map(file => (
                                                <FileItem 
                                                    key={file.ID_FILE} 
                                                    file={file} 
                                                    isSelectable={canEdit}
                                                    isSelected={rejectedFileIds.includes(file.ID_FILE)}
                                                    onToggle={toggleRejectFile}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </div>

                    {/* --- 3. FOOTER (Clean Actions) --- */}
                    <DialogFooter className="h-[72px] px-6 border-t bg-white dark:bg-card flex items-center justify-between shrink-0 z-30">
                        <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-900">
                            Đóng cửa sổ
                        </Button>
                        
                        {canEdit && (
                            <div className="flex gap-3">
                                {rejectedFileIds.length > 0 ? (
                                    <Button 
                                        variant="destructive" 
                                        className="gap-2 shadow-lg shadow-red-100 px-5 transition-all animate-in slide-in-from-right-2"
                                        onClick={() => setIsRejectDialogOpen(true)} 
                                        disabled={isConfirming || isLoading}
                                    >
                                        <XCircle className="h-4 w-4" /> 
                                        Yêu cầu nộp lại ({rejectedFileIds.length})
                                    </Button>
                                ) : (
                                     <Button 
                                        variant="outline" 
                                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                        onClick={() => setIsRejectDialogOpen(true)} 
                                        disabled={isConfirming || isLoading}
                                    >
                                        <XCircle className="h-4 w-4" /> 
                                        Từ chối (Tất cả)
                                    </Button>
                                )}
                                
                                <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100 gap-2 min-w-[140px]"
                                    onClick={handleConfirm} 
                                    disabled={isConfirming || isLoading} 
                                >
                                    {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                    Xác nhận Đủ
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <RejectSubmissionDialog 
                isOpen={isRejectDialogOpen}
                setIsOpen={setIsRejectDialogOpen}
                submission={submission}
                rejectedFileIds={rejectedFileIds}
                onSuccess={onRejectSuccess}
            />
        </>
    );
}