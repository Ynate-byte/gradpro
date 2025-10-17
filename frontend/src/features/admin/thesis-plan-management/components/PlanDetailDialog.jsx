import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Download, Calendar, Users, Bookmark, Loader2, UserCircle, CheckCircle, Clock, MessageSquareWarning } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { getThesisPlanById, previewPlanDocument, exportPlanDocument } from '@/api/thesisPlanService';

const InfoItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-start">
        <Icon className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
        <div className="ml-3">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold break-words">{value || 'N/A'}</p>
        </div>
    </div>
);

const LoadingSkeleton = () => (
    <div className="space-y-6 p-6">
        <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
        <Card>
            <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
        <Card>
            <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
            <CardContent><Skeleton className="h-24 w-full" /></CardContent>
        </Card>
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
                a.href = url;
                a.download = `Thong-bao-KLTN-${plan.KHOAHOC}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error(`Thao tác ${actionType === 'preview' ? 'xem trước' : 'tải'} file thất bại.`);
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
                {isLoading ? (
                    <LoadingSkeleton />
                ) : plan && (
                    <>
                        <DialogHeader className="p-6 pb-4">
                            <DialogTitle className="text-2xl">{plan.TEN_DOT}</DialogTitle>
                            <DialogDescription>Chi tiết kế hoạch và các mốc thời gian liên quan.</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="flex-grow px-6">
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader><CardTitle className="text-base">Thông tin chung</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 text-sm">
                                        <InfoItem icon={Calendar} label="Năm học - Học kỳ" value={`${plan.NAMHOC} - HK ${plan.HOCKY}`} />
                                        <InfoItem icon={Users} label="Khóa áp dụng" value={plan.KHOAHOC} />
                                        <InfoItem icon={Bookmark} label="Hệ đào tạo" value={plan.HEDAOTAO} />
                                        <InfoItem icon={UserCircle} label="Người tạo" value={plan.nguoiTao?.HODEM_VA_TEN} />
                                        <InfoItem icon={CheckCircle} label="Trạng thái" value={plan.TRANGTHAI} />
                                        <InfoItem icon={Clock} label="Ngày tạo" value={format(new Date(plan.NGAYTAO), 'dd/MM/yyyy', { locale: vi })} />
                                        <InfoItem icon={Calendar} label="Ngày bắt đầu đợt" value={plan.NGAY_BATDAU ? format(new Date(plan.NGAY_BATDAU), 'dd/MM/yyyy', { locale: vi }) : 'N/A'} />
                                        <InfoItem icon={Calendar} label="Ngày kết thúc đợt" value={plan.NGAY_KETHUC ? format(new Date(plan.NGAY_KETHUC), 'dd/MM/yyyy', { locale: vi }) : 'N/A'} />
                                    </CardContent>
                                </Card>

                                {plan.TRANGTHAI === 'Yêu cầu chỉnh sửa' && plan.BINHLUAN_PHEDUYET && (
                                    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/50">
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-300">
                                                <MessageSquareWarning /> Yêu cầu chỉnh sửa
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm italic text-orange-800 dark:text-orange-200">"{plan.BINHLUAN_PHEDUYET}"</p>
                                        </CardContent>
                                    </Card>
                                )}
                                
                                <Card>
                                    <CardHeader><CardTitle className="text-base">Các mốc thời gian</CardTitle></CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[40%]">Sự kiện</TableHead>
                                                    <TableHead>Bắt đầu</TableHead>
                                                    <TableHead>Kết thúc</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(plan?.moc_thoigians || []).map(moc => (
                                                    <TableRow key={moc.ID}>
                                                        <TableCell className="font-medium">
                                                            <p>{moc.TEN_SUKIEN}</p>
                                                            {moc.MOTA && <p className="text-xs text-muted-foreground">{moc.MOTA}</p>}
                                                        </TableCell>
                                                        <TableCell>{format(new Date(moc.NGAY_BATDAU), 'dd/MM/yyyy', { locale: vi })}</TableCell>
                                                        <TableCell>{format(new Date(moc.NGAY_KETTHUC), 'dd/MM/yyyy', { locale: vi })}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </ScrollArea>
                        <DialogFooter className="p-6 border-t mt-auto shrink-0">
                            <Button variant="outline" onClick={() => handleAction('preview')} disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                                Xem trước PDF
                            </Button>
                            <Button onClick={() => handleAction('export')} disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                Tải file PDF
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}