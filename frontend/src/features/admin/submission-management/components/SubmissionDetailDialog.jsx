import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
    Users, BookCopy, Calendar, User, Loader2, FileText, 
    Link as LinkIcon, Download, XCircle, CheckCircle, 
    ChevronLeft, ChevronRight 
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { getSubmissionDetails, confirmSubmission } from '@/api/adminSubmissionService';
import { RejectSubmissionDialog } from './RejectDialog';
import { ScrollArea } from '@/components/ui/scroll-area';

// Component hiển thị thông tin chi tiết (Helper)
const InfoItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-start">
        <Icon className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="ml-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</p>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                {value || <span className="text-xs italic text-gray-400 dark:text-gray-500">Chưa có</span>}
            </div>
        </div>
    </div>
);

// Component hiển thị File (Helper)
const FileItem = ({ file }) => {
    const isLink = file.LOAI_FILE.startsWith('Link');
    const Icon = isLink ? LinkIcon : (file.LOAI_FILE === 'BaoCaoPDF' ? FileText : Download);

    return (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
                <Icon className={`h-6 w-6 shrink-0 ${isLink ? 'text-blue-500' : 'text-red-500'}`} />
                <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate">{file.LOAI_FILE}</p>
                    <p className="text-xs text-muted-foreground truncate" title={isLink ? file.DUONG_DAN_HOAC_NOI_DUNG : file.TEN_FILE_GOC}>
                        {isLink ? file.DUONG_DAN_HOAC_NOI_DUNG : file.TEN_FILE_GOC}
                    </p>
                </div>
            </div>
            <Button asChild size="sm" variant="outline" className="ml-2 shrink-0">
                <a href={file.url} target="_blank" rel="noopener noreferrer" download={!isLink ? file.TEN_FILE_GOC : undefined}>
                    {isLink ? 'Mở Link' : 'Tải về'}
                </a>
            </Button>
        </div>
    );
};

export function SubmissionDetailDialog({ 
    submission, 
    isOpen, 
    setIsOpen, 
    onSuccess,
    onNext,         
    onPrevious,     
    hasNext,        
    hasPrevious     
}) {
    const [details, setDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

    // 1. Fetch chi tiết
    useEffect(() => {
        if (isOpen && submission?.ID_NOP_SANPHAM) {
            setIsLoading(true);
            setDetails(null); 
            getSubmissionDetails(submission.ID_NOP_SANPHAM)
                .then((data) => {
                    setDetails(data);
                })
                .catch(() => {
                    toast.error("Lỗi khi tải chi tiết phiếu nộp.");
                })
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, submission?.ID_NOP_SANPHAM]);

    // 2. Lắng nghe sự kiện bàn phím
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!isOpen) return;
            if (isRejectDialogOpen) return;

            if (event.key === 'ArrowLeft' && hasPrevious) {
                onPrevious();
            } else if (event.key === 'ArrowRight' && hasNext) {
                onNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, hasNext, hasPrevious, onNext, onPrevious, isRejectDialogOpen]);

    const handleConfirm = async () => {
        setIsConfirming(true);
        try {
            const res = await confirmSubmission(submission.ID_NOP_SANPHAM);
            toast.success(res.message);
            onSuccess(); 
            if (hasNext) {
                onNext();
            } else {
                setIsOpen(false);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Xác nhận thất bại.");
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

    // [FIX] Lấy thông tin an toàn (fallback giữa các kiểu đặt tên)
    const submitterName = details?.nguoi_nop?.HODEM_VA_TEN;
    // GVHD nằm sâu trong quan hệ
    const supervisorName = details?.phancong?.gvhd?.nguoidung?.HODEM_VA_TEN;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                    
                    {/* HEADER */}
                    <DialogHeader className="p-6 pb-4 border-b bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex justify-between items-start">
                            <div>
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    Chi tiết Nộp sản phẩm
                                    <Badge variant="outline" className={
                                        submission.TRANGTHAI === 'Đã xác nhận' ? 'bg-green-100 text-green-800 border-green-200' : 
                                        submission.TRANGTHAI === 'Yêu cầu nộp lại' ? 'bg-red-100 text-red-800 border-red-200' : 
                                        'bg-yellow-100 text-yellow-800 border-yellow-200'
                                    }>
                                        {submission.TRANGTHAI}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="mt-1">
                                    Nhấn mũi tên trái/phải trên bàn phím để chuyển bài.
                                </DialogDescription>
                            </div>
                            
                            <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-md">
                                <Button 
                                    variant="ghost" size="icon" className="h-8 w-8" 
                                    onClick={onPrevious} disabled={!hasPrevious || isLoading}
                                    title="Bài trước (Phím ←)"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="w-px h-4 bg-border mx-1"></div>
                                <Button 
                                    variant="ghost" size="icon" className="h-8 w-8" 
                                    onClick={onNext} disabled={!hasNext || isLoading}
                                    title="Bài tiếp theo (Phím →)"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* CONTENT */}
                    <ScrollArea className="flex-1 p-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
                                <p>Đang tải dữ liệu...</p>
                            </div>
                        ) : !details ? (
                            <div className="text-center py-10 text-red-500">Không tải được dữ liệu chi tiết.</div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Cột Trái */}
                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Users className="h-4 w-4 text-blue-500" /> Thông tin Nhóm & Đề tài
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <InfoItem icon={Users} label="Tên nhóm" value={details.phancong?.nhom?.TEN_NHOM} />
                                            <InfoItem icon={BookCopy} label="Đề tài" value={details.phancong?.detai?.TEN_DETAI} />
                                            
                                            {/* [ĐÃ SỬA] Sử dụng biến an toàn đã lấy ở trên */}
                                            <InfoItem icon={User} label="GVHD" value={supervisorName} />
                                            
                                            <Separator />
                                            
                                            {/* [ĐÃ SỬA] Sử dụng biến an toàn đã lấy ở trên */}
                                            <InfoItem icon={User} label="Người nộp" value={submitterName} />
                                            
                                            <InfoItem icon={Calendar} label="Thời gian nộp" value={format(new Date(details.NGAY_NOP), 'dd/MM/yyyy HH:mm', { locale: vi })} />
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Cột Phải */}
                                <div className="space-y-6">
                                    <Card className="h-full flex flex-col">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Download className="h-4 w-4 text-blue-500" /> 
                                                Sản phẩm nộp ({details.files?.length || 0})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3 flex-1">
                                            {details.files?.length > 0 ? (
                                                details.files.map(file => <FileItem key={file.ID_FILE} file={file} />)
                                            ) : (
                                                <p className="text-sm text-muted-foreground text-center py-4">Không có file nào được nộp.</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )}
                    </ScrollArea>

                    {/* FOOTER */}
                    <DialogFooter className="p-4 border-t bg-gray-50/50 dark:bg-gray-800/50 flex-row justify-between items-center sm:justify-between">
                        <div className="text-xs text-muted-foreground hidden sm:block">
                            ID: {submission.ID_NOP_SANPHAM}
                        </div>
                        
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                            {submission.TRANGTHAI === 'Chờ xác nhận' && (
                                <>
                                    <Button 
                                        variant="destructive" 
                                        onClick={() => setIsRejectDialogOpen(true)} 
                                        disabled={isConfirming || isLoading}
                                    >
                                        <XCircle className="mr-2 h-4 w-4" /> Yêu cầu nộp lại
                                    </Button>
                                    
                                    <Button 
                                        onClick={handleConfirm} 
                                        disabled={isConfirming || isLoading} 
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        Xác nhận nộp đủ
                                    </Button>
                                </>
                            )}
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Đóng</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <RejectSubmissionDialog
                isOpen={isRejectDialogOpen}
                setIsOpen={setIsRejectDialogOpen}
                submission={submission}
                onSuccess={onRejectSuccess}
            />
        </>
    );
}