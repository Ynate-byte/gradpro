import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Users, BookCopy, Calendar, User, Loader2, FileText, Link as LinkIcon, Download, XCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { getSubmissionDetails, confirmSubmission } from '@/api/adminSubmissionService';
import { RejectSubmissionDialog } from './RejectDialog';
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

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

const FileItem = ({ file }) => {
    const isLink = file.LOAI_FILE.startsWith('Link');
    const Icon = isLink ? LinkIcon : (file.LOAI_FILE === 'BaoCaoPDF' ? FileText : Download);

    return (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3 overflow-hidden">
                <Icon className={`h-6 w-6 shrink-0 ${isLink ? 'text-blue-500' : 'text-red-500'}`} />
                <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate">{file.LOAI_FILE}</p>
                    <p className="text-xs text-muted-foreground truncate" title={isLink ? file.DUONG_DAN_HOAC_NOI_DUNG : file.TEN_FILE_GOC}>
                        {isLink ? file.DUONG_DAN_HOAC_NOI_DUNG : file.TEN_FILE_GOC}
                    </p>
                </div>
            </div>
            <Button asChild size="sm" variant="outline">
                <a href={file.url} target="_blank" rel="noopener noreferrer" download={!isLink ? file.TEN_FILE_GOC : undefined}>
                    {isLink ? 'Mở Link' : 'Tải về'}
                </a>
            </Button>
        </div>
    );
};

export function SubmissionDetailSheet({ submission, isOpen, setIsOpen, onSuccess }) {
    const [details, setDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

    useEffect(() => {
        if (isOpen && submission?.ID_NOP_SANPHAM) {
            setIsLoading(true);
            getSubmissionDetails(submission.ID_NOP_SANPHAM)
                .then(setDetails)
                .catch(() => {
                    toast.error("Lỗi khi tải chi tiết phiếu nộp.");
                    setIsOpen(false);
                })
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, submission?.ID_NOP_SANPHAM, setIsOpen]);

    const handleConfirm = async () => {
        setIsConfirming(true);
        try {
            const res = await confirmSubmission(submission.ID_NOP_SANPHAM);
            toast.success(res.message);
            onSuccess();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Xác nhận thất bại.");
        } finally {
            setIsConfirming(false);
        }
    };

    const onRejectSuccess = () => {
        onSuccess();
        setIsRejectDialogOpen(false);
        setIsOpen(false);
    }

    return (
        <>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent className="w-[90vw] sm:max-w-2xl p-0 flex flex-col bg-gray-50 dark:bg-gray-900 border-l-4 border-blue-500">
                    <SheetHeader className="p-6 pb-4 bg-white dark:bg-gray-800 border-b border-blue-200 dark:border-blue-700 shadow-sm">
                        <SheetTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            Chi tiết Phiếu nộp
                        </SheetTitle>
                        <SheetDescription className="text-gray-600 dark:text-gray-300">
                            Xác nhận sản phẩm nộp của nhóm: {submission.phancong?.nhom?.TEN_NHOM || '...'}
                        </SheetDescription>
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                             <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700">
                                {submission.TRANGTHAI}
                            </Badge>
                        </div>
                    </SheetHeader>

                    {isLoading || !details ? (
                        <div className="flex-grow flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <ScrollArea className="flex-grow overflow-y-auto">
                                <div className="p-6 space-y-6">
                                    <Card className="border border-blue-200 dark:border-blue-700 shadow-md bg-white dark:bg-gray-800">
                                        <CardHeader>
                                            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                                <Users className="h-5 w-5 text-blue-500" /> Thông tin Nhóm
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4">
                                            <InfoItem icon={Users} label="Tên nhóm" value={details.phancong?.nhom?.TEN_NHOM} />
                                            <InfoItem icon={BookCopy} label="Đề tài" value={details.phancong?.detai?.TEN_DETAI} />
                                            <InfoItem icon={User} label="Người nộp" value={details.nguoiNop?.HODEM_VA_TEN} />
                                            <InfoItem icon={Calendar} label="Thời điểm nộp" value={format(new Date(details.NGAY_NOP), 'dd/MM/yyyy HH:mm', { locale: vi })} />
                                        </CardContent>
                                    </Card>

                                    <Card className="border border-blue-200 dark:border-blue-700 shadow-md bg-white dark:bg-gray-800">
                                        <CardHeader>
                                            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                                <Download className="h-5 w-5 text-blue-500" /> Sản phẩm đã nộp ({details.files?.length || 0})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {details.files?.length > 0 ? (
                                                details.files.map(file => <FileItem key={file.ID_FILE} file={file} />)
                                            ) : (
                                                <p className="text-sm text-muted-foreground text-center py-4">Nhóm không nộp file nào.</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </ScrollArea>

                            <SheetFooter className="p-4 border-t bg-white dark:bg-gray-800 flex-row justify-end gap-3">
                                <Button variant="destructive" onClick={() => setIsRejectDialogOpen(true)} disabled={isConfirming}>
                                    <XCircle className="mr-2 h-4 w-4" /> Yêu cầu nộp lại
                                </Button>
                                <Button onClick={handleConfirm} disabled={isConfirming} className="bg-green-600 hover:bg-green-700">
                                    {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                    Xác nhận nộp đủ
                                </Button>
                            </SheetFooter>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Dialog từ chối dùng chung */}
            <RejectSubmissionDialog
                isOpen={isRejectDialogOpen}
                setIsOpen={setIsRejectDialogOpen}
                submission={submission}
                onSuccess={onRejectSuccess}
            />
        </>
    );
}