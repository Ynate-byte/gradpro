import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
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
    ChevronLeft, ChevronRight, Clock 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { getSubmissionDetails, confirmSubmission } from '@/api/adminSubmissionService';
import { RejectSubmissionDialog } from './RejectDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Helper Components
const InfoItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 text-sm">
        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400 shrink-0">
            <Icon className="h-4 w-4" />
        </div>
        <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="font-medium text-foreground mt-0.5 break-words">{value || '---'}</p>
        </div>
    </div>
);

const FileItem = ({ file }) => {
    const isLink = file.LOAI_FILE.startsWith('Link');
    const Icon = isLink ? LinkIcon : FileText;

    return (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors group">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={cn("p-2 rounded-full bg-muted group-hover:bg-background transition-colors", isLink ? "text-blue-500" : "text-orange-500")}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate">{file.LOAI_FILE}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={isLink ? file.DUONG_DAN_HOAC_NOI_DUNG : file.TEN_FILE_GOC}>
                        {isLink ? file.DUONG_DAN_HOAC_NOI_DUNG : file.TEN_FILE_GOC}
                    </p>
                </div>
            </div>
            <Button asChild size="sm" variant="outline" className="ml-2 h-8 text-xs shrink-0">
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

    useEffect(() => {
        if (isOpen && submission?.ID_NOP_SANPHAM) {
            setIsLoading(true);
            setDetails(null); 
            getSubmissionDetails(submission.ID_NOP_SANPHAM)
                .then(setDetails)
                .catch(() => toast.error("Lỗi khi tải chi tiết phiếu nộp."))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, submission?.ID_NOP_SANPHAM]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!isOpen || isRejectDialogOpen) return;
            if (event.key === 'ArrowLeft' && hasPrevious) onPrevious();
            if (event.key === 'ArrowRight' && hasNext) onNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, hasNext, hasPrevious, onNext, onPrevious, isRejectDialogOpen]);

    const handleConfirm = async () => {
        setIsConfirming(true);
        try {
            const res = await confirmSubmission(submission.ID_NOP_SANPHAM);
            toast.success(res.message);
            onSuccess(); 
            if (hasNext) onNext();
            else setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Xác nhận thất bại.");
        } finally {
            setIsConfirming(false);
        }
    };

    const onRejectSuccess = () => {
        onSuccess(); 
        setIsRejectDialogOpen(false);
        if (hasNext) onNext();
        else setIsOpen(false);
    }

    if (!submission) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
                    
                    {/* HEADER */}
                    <DialogHeader className="px-6 py-4 border-b flex-row items-center justify-between space-y-0 bg-muted/10">
                        <div className="flex flex-col gap-1">
                            <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                Chi tiết Nộp sản phẩm
                                <Badge variant={submission.TRANGTHAI === 'Đã xác nhận' ? 'default' : submission.TRANGTHAI === 'Yêu cầu nộp lại' ? 'destructive' : 'secondary'} className="ml-2 text-[10px]">
                                    {submission.TRANGTHAI}
                                </Badge>
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" /> 
                                ID: <span className="font-mono">{submission.ID_NOP_SANPHAM}</span>
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-1 bg-background border rounded-md p-0.5 shadow-sm">
                            <Button 
                                variant="ghost" size="icon" className="h-7 w-7" 
                                onClick={onPrevious} disabled={!hasPrevious || isLoading}
                                title="Bài trước (←)"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Separator orientation="vertical" className="h-4" />
                            <Button 
                                variant="ghost" size="icon" className="h-7 w-7" 
                                onClick={onNext} disabled={!hasNext || isLoading}
                                title="Bài sau (→)"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogHeader>

                    {/* CONTENT */}
                    <ScrollArea className="flex-1">
                        <div className="p-6">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
                                    <p>Đang tải dữ liệu...</p>
                                </div>
                            ) : !details ? (
                                <div className="text-center py-10 text-destructive">Không tải được dữ liệu chi tiết.</div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                                    {/* Cột Trái: Thông tin */}
                                    <div className="lg:col-span-7 space-y-6">
                                        <Card>
                                            <CardHeader className="pb-3 border-b bg-muted/10">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-blue-500" /> Thông tin Nhóm
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4 pt-4">
                                                <InfoItem icon={Users} label="Tên nhóm" value={details.phancong?.nhom?.TEN_NHOM} />
                                                <InfoItem icon={BookCopy} label="Đề tài" value={details.phancong?.detai?.TEN_DETAI} />
                                                <InfoItem icon={User} label="GVHD" value={details.phancong?.gvhd?.nguoidung?.HODEM_VA_TEN} />
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader className="pb-3 border-b bg-muted/10">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-green-500" /> Thông tin Nộp
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4 pt-4">
                                                <InfoItem icon={User} label="Người nộp" value={details.nguoi_nop?.HODEM_VA_TEN} />
                                                <InfoItem icon={Calendar} label="Thời gian nộp" value={format(new Date(details.NGAY_NOP), 'dd/MM/yyyy HH:mm', { locale: vi })} />
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Cột Phải: Files */}
                                    <div className="lg:col-span-5 flex flex-col h-full">
                                        <Card className="h-full flex flex-col">
                                            <CardHeader className="pb-3 border-b bg-muted/10">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Download className="h-4 w-4 text-orange-500" /> 
                                                    Sản phẩm nộp ({details.files?.length || 0})
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 flex-1 overflow-y-auto max-h-[400px]">
                                                <div className="space-y-3">
                                                    {details.files?.length > 0 ? (
                                                        details.files.map(file => <FileItem key={file.ID_FILE} file={file} />)
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                                                            <FileText className="h-8 w-8 mb-2 opacity-50" />
                                                            Không có file nào.
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* FOOTER */}
                    <DialogFooter className="p-4 border-t bg-muted/10 flex-row justify-between items-center sm:justify-between gap-4">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Đóng</Button>
                        
                        {submission.TRANGTHAI === 'Chờ xác nhận' && (
                            <div className="flex gap-2 w-full sm:w-auto justify-end">
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
                onSuccess={onRejectSuccess}
            />
        </>
    );
}