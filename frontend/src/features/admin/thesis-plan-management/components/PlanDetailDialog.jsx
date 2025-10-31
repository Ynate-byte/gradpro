import React from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // <-- Thêm import
import { cn } from '@/lib/utils'; // <-- Thêm import cn
// ... other imports ...
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Import Dialog components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Import Table components
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
import { Button } from "@/components/ui/button"; // Import Button
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { Badge } from "@/components/ui/badge"; // Import Badge
import { Eye, Download, Calendar, Users, Bookmark, Loader2, UserCircle, CheckCircle, Clock, MessageSquareWarning } from 'lucide-react'; // Import icons
import { format, isValid, parseISO, isSameDay } from 'date-fns'; // Import date-fns functions
import { vi } from 'date-fns/locale'; // Import Vietnamese locale
import { toast } from 'sonner'; // Import toast
import { getThesisPlanById, previewPlanDocument, exportPlanDocument } from '@/api/thesisPlanService'; // Import API functions

// Định nghĩa màu sắc cho từng trạng thái (không đổi)
const statusConfig = {
	 'Bản nháp': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700', // Thêm border
	 'Chờ phê duyệt': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
	 'Chờ duyệt chỉnh sửa': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
	 'Yêu cầu chỉnh sửa': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700',
	 'Đã phê duyệt': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-700',
	 'Đang thực hiện': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700',
	 'Đang chấm điểm': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-700',
	 'Đã hoàn thành': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700',
	 'Đã hủy': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700'
};

// Hiển thị thông tin chi tiết của một mục - Icon lớn hơn, màu primary
const InfoItem = ({ icon: Icon, label, value }) => (
	 <div className="flex items-start">
		 <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" /> {/* Icon lớn hơn, màu xanh */}
		 <div className="ml-3">
			 <p className="text-xs font-semibold text-muted-foreground">{label}</p> {/* Label đậm hơn */}
			 <div className="text-sm font-medium break-words"> {/* Value đậm hơn */}
				 {value || <span className="text-muted-foreground italic text-xs">Chưa có</span>}
			 </div>
		 </div>
	 </div>
);

// Hiển thị skeleton khi đang tải (không đổi)
const LoadingSkeleton = () => (
	 <div className="space-y-6 p-6">
		 <div className="space-y-2">
			 <Skeleton className="h-8 w-3/4" />
			 <Skeleton className="h-4 w-1/2" />
		 </div>
		 <Card>
			 <CardHeader>
				 <Skeleton className="h-6 w-1/4" />
			 </CardHeader>
			 <CardContent className="space-y-4">
				 <Skeleton className="h-10 w-full" />
				 <Skeleton className="h-10 w-full" />
			 </CardContent>
		 </Card>
		 <Card>
			 <CardHeader>
				 <Skeleton className="h-6 w-1/3" />
			 </CardHeader>
			 <CardContent>
				 <Skeleton className="h-24 w-full" />
			 </CardContent>
		 </Card>
	 </div>
);

// Hiển thị dialog chi tiết kế hoạch
export function PlanDetailDialog({ planId, isOpen, setIsOpen }) {
	 const [plan, setPlan] = React.useState(null);
	 const [isLoading, setIsLoading] = React.useState(false);
	 const [isPreviewLoading, setIsPreviewLoading] = React.useState(false); // State riêng cho Preview
	 const [isExportLoading, setIsExportLoading] = React.useState(false);   // State riêng cho Export

	 // Tải chi tiết kế hoạch khi dialog mở (không đổi logic)
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

	 // Xử lý hành động xem trước hoặc tải file PDF
	 const handleAction = async (actionType) => {
		 if (actionType === 'preview') setIsPreviewLoading(true);
		 if (actionType === 'export') setIsExportLoading(true);

		 const actionFunction = actionType === 'preview' ? previewPlanDocument : exportPlanDocument;
		 try {
			 const blob = await actionFunction(planId);
			 const url = window.URL.createObjectURL(blob);
			 if (actionType === 'preview') {
				 const newWindow = window.open(url, '_blank');
				 if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
					 toast.warning("Trình duyệt có thể đã chặn cửa sổ xem trước. Vui lòng cho phép pop-up và thử lại.");
				 }
				 // Consider not revoking for preview or using a longer timeout
				 // setTimeout(() => window.URL.revokeObjectURL(url), 500);
			 } else {
				 const a = document.createElement('a');
				 a.href = url;
				 a.download = `Thong-bao-KLTN-${plan.KHOAHOC || 'plan'}.pdf`;
				 document.body.appendChild(a);
				 a.click();
				 a.remove();
				 window.URL.revokeObjectURL(url); // Revoke immediately for download
			 }
		 } catch (error) {
			 toast.error(`Thao tác ${actionType === 'preview' ? 'xem trước' : 'tải'} file thất bại.`);
		 } finally {
			 if (actionType === 'preview') setIsPreviewLoading(false);
			 if (actionType === 'export') setIsExportLoading(false);
		 }
	 };

	 // Hiển thị badge trạng thái - Thêm border
	 const renderStatusBadge = (status) => {
		 const configClasses = statusConfig[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
		 return (
			 <Badge variant="outline" className={cn('text-xs py-0.5 border', configClasses)}> {/* Sử dụng cn */}
				 {status}
			 </Badge>
		 );
	 };

	 // Định dạng ngày có thể null (không đổi)
	 const formatNullableDate = (dateString, formatString = 'dd/MM/yyyy') => {
		 if (!dateString) return null;
		 try {
			 const date = parseISO(dateString);
			 if (isValid(date)) {
				 return format(date, formatString, { locale: vi });
			 }
		 } catch (e) {
			 console.error("Error formatting date:", dateString, e);
		 }
		 return null;
	 };

	 // Định dạng thời gian cho mốc thời gian (không đổi)
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

	 // Animation Variants
	 const contentVariants = {
		 hidden: { opacity: 0, y: 10 },
		 visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
	 };

	 return (
		 <Dialog open={isOpen} onOpenChange={setIsOpen}>
			 {/* Thêm màu nền, border */}
			 <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-l-4 border-primary shadow-2xl">
				 {isLoading ? (
					 <LoadingSkeleton />
				 ) : (
					 <>
						 {/* Thêm border bottom */}
						 <DialogHeader className="p-6 pb-4 border-b shrink-0 bg-card">
							 {plan ? (
								 <>
									 <DialogTitle className="text-2xl font-bold text-foreground">{plan.TEN_DOT}</DialogTitle>
									 <DialogDescription className="text-muted-foreground">Chi tiết kế hoạch và các mốc thời gian liên quan.</DialogDescription>
									 <div className="pt-2">{renderStatusBadge(plan.TRANGTHAI)}</div>
								 </>
							 ) : (
								 <>
									 <DialogTitle><Skeleton className="h-8 w-3/4" /></DialogTitle>
									 <DialogDescription><Skeleton className="h-4 w-1/2" /></DialogDescription>
									 <div className="pt-2"><Skeleton className="h-5 w-20" /></div>
								 </>
							 )}
						 </DialogHeader>
						 {plan && (
							 <>
								 <ScrollArea className="flex-grow overflow-y-auto bg-muted/20"> {/* Nền hơi xám */}
									 {/* Thêm motion.div */}
									 <motion.div
										 className="p-6 space-y-6"
										 variants={contentVariants}
										 initial="hidden"
										 animate="visible"
									 >
										 <Card className="shadow-md border-blue-100 dark:border-blue-900"> {/* Border nhẹ */}
											 <CardHeader className="pb-4"> {/* Giảm padding bottom */}
												 <CardTitle className="text-lg font-semibold flex items-center gap-2"> {/* Icon Primary */}
													 <Calendar className="h-5 w-5 text-primary"/> Thông tin chung
												 </CardTitle>
											 </CardHeader>
											 <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4 text-sm pt-2"> {/* Tăng gap, giảm padding top */}
												 <InfoItem
													 icon={Calendar}
													 label="Năm học - Học kỳ"
													 value={`${plan.NAMHOC} - HK ${plan.HOCKY}`}
												 />
												 <InfoItem icon={Users} label="Khóa áp dụng" value={plan.KHOAHOC} />
												 <InfoItem icon={Bookmark} label="Hệ đào tạo" value={plan.HEDAOTAO} />
												 <InfoItem icon={Clock} label="Ngày tạo" value={formatNullableDate(plan.NGAYTAO)} />
												 <InfoItem
													 icon={Calendar}
													 label="Ngày bắt đầu đợt"
													 value={formatNullableDate(plan.NGAY_BATDAU)}
												 />
												 <InfoItem
													 icon={Calendar}
													 label="Ngày kết thúc đợt"
													 value={formatNullableDate(plan.NGAY_KETHUC)}
												 />
												 {/* ----- SỬA LỖI 1: Sửa 'plan.nguoiTao' thành 'plan.nguoi_tao' ----- */}
												 <InfoItem
													 icon={UserCircle}
													 label="Người tạo"
													 value={plan.nguoi_tao?.HODEM_VA_TEN}
												 />
												 {/* ----- THÊM MỚI: Thêm 'Người phê duyệt' ----- */}
												 <InfoItem
													 icon={CheckCircle}
													 label="Người phê duyệt"
													 value={plan.nguoi_phe_duyet?.HODEM_VA_TEN}
												 />
											 </CardContent>
										 </Card>
										 {plan.TRANGTHAI === 'Yêu cầu chỉnh sửa' && plan.BINHLUAN_PHEDUYET && (
											 <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/50 shadow-md">
												 <CardHeader className="pb-2"> {/* Giảm padding bottom */}
													 <CardTitle className="text-lg font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-300">
														 <MessageSquareWarning className="h-5 w-5"/> Yêu cầu chỉnh sửa
													 </CardTitle>
												 </CardHeader>
												 <CardContent className="pt-2"> {/* Giảm padding top */}
													 <p className="text-sm italic text-orange-800 dark:text-orange-200">
														 "{plan.BINHLUAN_PHEDUYET}"
													 </p>
												 </CardContent>
											 </Card>
										 )}
										 <Card className="shadow-md border-blue-100 dark:border-blue-900"> {/* Border nhẹ */}
											 <CardHeader className="pb-4"> {/* Giảm padding bottom */}
												 <CardTitle className="text-lg font-semibold flex items-center gap-2">
													 <Clock className="h-5 w-5 text-primary" /> Các mốc thời gian
												 </CardTitle>
											 </CardHeader>
											 <CardContent className="pt-2"> {/* Giảm padding top */}
												 <Table className="table-fixed">
													 <TableHeader>
														 <TableRow>
															 <TableHead className="w-[55%]">Sự kiện</TableHead>
															 <TableHead className="w-[45%]">Thời gian</TableHead>
														 </TableRow>
													 </TableHeader>
													 <TableBody>
														 {/* ----- SỬA LỖI 3: Sửa 'plan?.mocThoigians' thành 'plan?.moc_thoigians' ----- */}
														 {(plan?.moc_thoigians || []).map(moc => (
															 <TableRow key={moc.ID} className="hover:bg-muted/50">{/* Hiệu ứng hover & Sửa lỗi hydration */}
																 <TableCell className="font-medium align-top break-words py-3"> {/* Tăng padding y */}
																	 <p className="text-foreground">{moc.TEN_SUKIEN}</p> {/* Màu chữ chính */}
																	 {moc.MOTA && (
																		 <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
																			 {moc.MOTA}
																		 </p>
																	 )}
																 </TableCell>
																 <TableCell className="align-top text-sm text-muted-foreground py-3"> {/* Tăng padding y */}
																	 {formatMilestoneTime(moc.NGAY_BATDAU, moc.NGAY_KETTHUC)}
																 </TableCell>
															 </TableRow>
														 ))}
														 {(!plan?.moc_thoigians || plan.moc_thoigians.length === 0) && (
															 <TableRow>
																 <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
																	 Không có mốc thời gian nào.
																 </TableCell>
															 </TableRow>
														 )}
													 </TableBody>
												 </Table>
											 </CardContent>
										 </Card>
									 </motion.div>
								 </ScrollArea>
								 <DialogFooter className="p-6 border-t shrink-0 bg-card"> {/* Thêm màu nền */}
									 {/* Nút Xem trước PDF */}
									 <Button
										 variant="outline"
										 onClick={() => handleAction('preview')}
										 disabled={isPreviewLoading || isExportLoading} // <-- Disable nếu bất kỳ hành động nào đang chạy
									 >
										 {isPreviewLoading ? ( // <-- Chỉ hiển thị loader khi đang preview
											 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
										 ) : (
											 <Eye className="mr-2 h-4 w-4" />
										 )}
										 Xem trước PDF
									 </Button>
									 {/* Nút Tải file PDF */}
									 <Button
										 onClick={() => handleAction('export')}
										 disabled={isPreviewLoading || isExportLoading} // <-- Disable nếu bất kỳ hành động nào đang chạy
									 >
										 {isExportLoading ? ( // <-- Chỉ hiển thị loader khi đang export
											 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
										 ) : (
											 <Download className="mr-2 h-4 w-4" />
										 )}
										 Tải file PDF
									 </Button>
								 </DialogFooter>
							 </>
						 )}
					 </>
				 )}
			 </DialogContent>
		 </Dialog>
	 );
}