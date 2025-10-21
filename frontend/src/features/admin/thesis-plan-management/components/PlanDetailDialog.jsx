import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, Calendar, Users, Bookmark, Loader2, UserCircle, CheckCircle, Clock, MessageSquareWarning } from 'lucide-react';
import { format, isValid, parseISO, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { getThesisPlanById, previewPlanDocument, exportPlanDocument } from '@/api/thesisPlanService';

const statusConfig = {
    'Bản nháp': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    'Chờ phê duyệt': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    'Yêu cầu chỉnh sửa': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    'Đã phê duyệt': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    'Đang thực hiện': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    'Đã hoàn thành': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    'Đã hủy': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const InfoItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-start">
        <Icon className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
        <div className="ml-3">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <div className="text-sm font-semibold break-words">{value || <span className="text-muted-foreground italic text-xs">Chưa có</span>}</div>
        </div>
    </div>
);

const LoadingSkeleton = () => (
    <div className="space-y-6 p-6">
        <div className="space-y-2"> <Skeleton className="h-8 w-3/4" /> <Skeleton className="h-4 w-1/2" /> </div>
        <Card> <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader> <CardContent className="space-y-4"> <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" /> </CardContent> </Card>
        <Card> <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader> <CardContent><Skeleton className="h-24 w-full" /></CardContent> </Card>
    </div>
);


export function PlanDetailDialog({ planId, isOpen, setIsOpen }) {
    const [plan, setPlan] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isActionLoading, setIsActionLoading] = React.useState(false);

    React.useEffect(() => {
        if (isOpen && planId) {
            setIsLoading(true);
            setPlan(null);
            getThesisPlanById(planId)
                .then(setPlan)
                .catch(() => toast.error("Lỗi khi tải chi tiết kế hoạch."))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, planId]);

    const handleAction = async (actionType) => {
        setIsActionLoading(true);
        const actionFunction = actionType === 'preview' ? previewPlanDocument : exportPlanDocument;
        try {
            const blob = await actionFunction(planId);
            const url = window.URL.createObjectURL(blob);
            if (actionType === 'preview') {
                window.open(url, '_blank');
            } else {
                const a = document.createElement('a');
                a.href = url; a.download = `Thong-bao-KLTN-${plan.KHOAHOC}.pdf`;
                document.body.appendChild(a); a.click(); a.remove();
            }
            window.URL.revokeObjectURL(url);
        } catch (error) { toast.error(`Thao tác ${actionType === 'preview' ? 'xem trước' : 'tải'} file thất bại.`); }
        finally { setIsActionLoading(false); }
    };

    const renderStatusBadge = (status) => {
        const config = statusConfig[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        return <Badge variant="outline" className={`border-0 ${config} text-xs`}>{status}</Badge>;
    };

    const formatNullableDate = (dateString, formatString = 'dd/MM/yyyy') => {
        if (!dateString) return null;
        try {
            const date = parseISO(dateString);
            if (isValid(date)) { return format(date, formatString, { locale: vi }); }
        } catch (e) { console.error("Error formatting date:", dateString, e); }
        return null;
    };

    const formatMilestoneTime = (startStr, endStr) => {
        const startDate = startStr && isValid(parseISO(startStr)) ? parseISO(startStr) : null;
        const endDate = endStr && isValid(parseISO(endStr)) ? parseISO(endStr) : null;

        if (!startDate) return 'N/A';

        const startFormatted = format(startDate, 'dd/MM/yyyy HH:mm', { locale: vi });
        if (!endDate || isSameDay(startDate, endDate)) {
            return startFormatted;
        }

        const endFormatted = format(endDate, 'dd/MM/yyyy HH:mm', { locale: vi });
        return `${startFormatted} - ${endFormatted}`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                {isLoading ? (
                    <LoadingSkeleton />
                ) : (
                    <>
                        {/* Di chuyển DialogHeader ra ngoài và xử lý khi plan chưa có */}
                        <DialogHeader className="p-6 pb-4 border-b shrink-0">
                            {plan ? (
                                <>
                                    <DialogTitle className="text-2xl">{plan.TEN_DOT}</DialogTitle>
                                    <DialogDescription>Chi tiết kế hoạch và các mốc thời gian liên quan.</DialogDescription>
                                    <div className="pt-2">{renderStatusBadge(plan.TRANGTHAI)}</div>
                                </>
                            ) : (
                                <>
                                    {/* Hiển thị skeleton hoặc text placeholder khi plan chưa load */}
                                    <DialogTitle><Skeleton className="h-8 w-3/4" /></DialogTitle>
                                    <DialogDescription><Skeleton className="h-4 w-1/2" /></DialogDescription>
                                    <div className="pt-2"><Skeleton className="h-5 w-20" /></div>
                                </>
                            )}
                        </DialogHeader>
                        {/* Chỉ render phần còn lại khi plan đã có */}
                        {plan && (
                            <>
                                <ScrollArea className="flex-grow overflow-y-auto">
                                    <div className="p-6 space-y-6">
                                        <Card>
                                            <CardHeader><CardTitle className="text-base">Thông tin chung</CardTitle></CardHeader>
                                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4 text-sm">
                                                <InfoItem icon={Calendar} label="Năm học - Học kỳ" value={`${plan.NAMHOC} - HK ${plan.HOCKY}`} />
                                                <InfoItem icon={Users} label="Khóa áp dụng" value={plan.KHOAHOC} />
                                                <InfoItem icon={Bookmark} label="Hệ đào tạo" value={plan.HEDAOTAO} />
                                                <InfoItem icon={Clock} label="Ngày tạo" value={formatNullableDate(plan.NGAYTAO)} />
                                                <InfoItem icon={Calendar} label="Ngày bắt đầu đợt" value={formatNullableDate(plan.NGAY_BATDAU)} />
                                                <InfoItem icon={Calendar} label="Ngày kết thúc đợt" value={formatNullableDate(plan.NGAY_KETHUC)} />
                                                <InfoItem icon={UserCircle} label="Người tạo" value={plan.nguoiTao?.HODEM_VA_TEN} />
                                            </CardContent>
                                        </Card>

                                        {plan.TRANGTHAI === 'Yêu cầu chỉnh sửa' && plan.BINHLUAN_PHEDUYET && (
                                            <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/50">
                                                <CardHeader><CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-300"><MessageSquareWarning /> Yêu cầu chỉnh sửa</CardTitle></CardHeader>
                                                <CardContent><p className="text-sm italic text-orange-800 dark:text-orange-200">"{plan.BINHLUAN_PHEDUYET}"</p></CardContent>
                                            </Card>
                                        )}

                                        <Card>
                                            <CardHeader><CardTitle className="text-base">Các mốc thời gian</CardTitle></CardHeader>
                                            <CardContent>
                                                <Table className="table-fixed">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-[55%]">Sự kiện</TableHead>
                                                            <TableHead className="w-[45%]">Thời gian</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {(plan?.moc_thoigians || []).map(moc => (
                                                            <TableRow key={moc.ID}>
                                                                <TableCell className="font-medium align-top break-words">
                                                                    <p>{moc.TEN_SUKIEN}</p>
                                                                    {moc.MOTA && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{moc.MOTA}</p>}
                                                                </TableCell>
                                                                <TableCell className="align-top text-sm">{formatMilestoneTime(moc.NGAY_BATDAU, moc.NGAY_KETTHUC)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {(!plan?.moc_thoigians || plan.moc_thoigians.length === 0) && (
                                                            <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground h-24">Không có mốc thời gian nào.</TableCell></TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </ScrollArea>
                                <DialogFooter className="p-6 border-t shrink-0">
                                    <Button variant="outline" onClick={() => handleAction('preview')} disabled={isActionLoading}>{isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />} Xem trước PDF</Button>
                                    <Button onClick={() => handleAction('export')} disabled={isActionLoading}>{isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Tải file PDF</Button>
                                </DialogFooter>
                            </>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}