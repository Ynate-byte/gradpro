import React, { useState, useEffect, useCallback } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Users,
    Info,
    CalendarDays,
    Clock,
    BookOpen,
    Mail,
    Phone,
    CalendarPlus,
    Crown,
    Star,
    History,
    Loader2,
    FileText,
    Link as LinkIcon,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getSubmissions } from '@/api/groupService'; // Sửa: Dùng lại hàm này (đã fix backend)
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from '@/lib/utils';

/**
 * Hàm trợ giúp để lấy chữ cái đầu của họ và tên.
 */
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

/**
 * Component tái sử dụng để hiển thị một mục thông tin với icon, nhãn và giá trị.
 */
const InfoItem = ({ icon: Icon, label, value, className = "" }) => (
    <div className={`flex items-start ${className}`}>
        <Icon className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="ml-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</p>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                {value || <span className="text-xs italic text-gray-400 dark:text-gray-500">Chưa có</span>}
            </div>
        </div>
    </div>
);

// ----- (Component SubmissionFileItem không đổi) -----
const SubmissionFileItem = ({ file }) => {
  const isLink = file.LOAI_FILE === 'LinkDemo' || file.LOAI_FILE === 'LinkRepository';
  const Icon = isLink ? LinkIcon : FileText;
  const label = {
    BaoCaoPDF: 'Báo cáo PDF',
    SourceCodeZIP: 'Source Code (ZIP)',
    LinkDemo: 'Link Demo',
    LinkRepository: 'Link Repository',
  }[file.LOAI_FILE] || file.LOAI_FILE;

  return (
    <a
      href={file.url} // Accessor 'url' từ model
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-2 rounded-md border bg-muted/50 hover:bg-muted transition-colors"
    >
      <Icon className="h-4 w-4 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        <p className="text-xs text-muted-foreground truncate">
          {isLink ? file.DUONG_DAN_HOAC_NOI_DUNG : file.TEN_FILE_GOC}
        </p>
      </div>
    </a>
  );
};

// ----- (Component SubmissionAttempt không đổi) -----
const SubmissionAttempt = ({ attempt }) => {
  const getStatusProps = () => {
    switch (attempt.TRANGTHAI) {
      case 'Đã xác nhận':
        return { Icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200' };
      case 'Yêu cầu nộp lại':
        return { Icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
      case 'Chờ xác nhận':
      default:
        return { Icon: Loader2, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' };
    }
  };
  const { Icon, color, bg } = getStatusProps();
  const submittedAt = format(parseISO(attempt.NGAY_NOP), 'dd/MM/yyyy, HH:mm', { locale: vi });

  return (
    <Card className={cn("overflow-hidden", bg)}>
      <CardHeader className="p-4">
        <div className="flex justify-between items-center">
          <CardTitle className={cn("text-base font-semibold flex items-center gap-2", color)}>
            <Icon className={cn("h-5 w-5", attempt.TRANGTHAI === 'Chờ xác nhận' && 'animate-spin')} />
            {attempt.TRANGTHAI}
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            <p>Nộp lúc: {submittedAt}</p>
            <p>Người nộp: {attempt.nguoi_nop?.HODEM_VA_TEN || 'N/A'}</p>
          </div>
        </div>
        {attempt.TRANGTHAI === 'Yêu cầu nộp lại' && attempt.PHANHOI_ADMIN && (
          <Alert variant="destructive" className="mt-3 bg-red-100/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">Phản hồi từ Admin ({attempt.nguoi_xac_nhan?.HODEM_VA_TEN}):</p>
              <p className="italic">"{attempt.PHANHOI_ADMIN}"</p>
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {attempt.files.map(file => (
          <SubmissionFileItem key={file.ID_FILE} file={file} />
        ))}
      </CardContent>
    </Card>
  );
};


/**
 * Component chính hiển thị chi tiết thông tin nhóm trong một giao diện Sheet.
 */
export function GroupDetailSheet({ group, isOpen, setIsOpen }) {
    const [history, setHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const phancong = group?.phancong_detai_nhom;
    const phancongId = phancong?.ID_PHANCONG;

    // SỬA LỖI 403: Hàm fetchHistory giờ đã gọi API đã được fix
    const fetchHistory = useCallback(async () => {
        if (!phancongId) {
            setIsLoadingHistory(false);
            return;
        }
        setIsLoadingHistory(true);
        try {
            // Gọi hàm getSubmissions (NhomController@getSubmissions)
            // Backend đã được sửa để cho phép Admin/GV/TK xem
            const data = await getSubmissions(phancongId); 
            setHistory(data || []);
        } catch (error) {
            console.error("Lỗi khi tải lịch sử nộp bài (Admin):", error); // Log lỗi
            toast.error("Không thể tải lịch sử nộp bài.");
        } finally {
            setIsLoadingHistory(false);
        }
    }, [phancongId]);

    useEffect(() => {
        if (isOpen && phancongId) {
            fetchHistory();
        } else if (!phancongId) {
            setIsLoadingHistory(false);
            setHistory([]); // Reset lịch sử khi không có phân công
        }
    }, [isOpen, phancongId, fetchHistory]);
    // ----- KẾT THÚC SỬA LỖI -----

    if (!group) return null;

    const formatNullableDate = (dateString, formatString = 'dd/MM/yyyy HH:mm') => {
        if (!dateString) return null;
        try {
            const date = parseISO(dateString);
            if (isValid(date)) {
                return format(date, formatString, { locale: vi });
            }
        } catch (e) {
            console.error("Lỗi định dạng ngày:", dateString, e);
        }
        return dateString;
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent className="w-[90vw] sm:max-w-2xl p-0 flex flex-col bg-gray-50 dark:bg-gray-900 border-l-4 border-blue-500">
                {/* Phần Header (Giữ nguyên) */}
                <SheetHeader className="p-6 pb-4 bg-white dark:bg-gray-800 border-b border-blue-200 dark:border-blue-700 shadow-sm">
                    <SheetTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">{group.TEN_NHOM}</SheetTitle>
                    <SheetDescription className="text-gray-600 dark:text-gray-300">{group.MOTA || 'Không có mô tả.'}</SheetDescription>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                        {group.LA_NHOM_DACBIET && (
                            <Badge variant="default" className="bg-blue-500 text-white gap-1.5 hover:bg-blue-600">
                                <Star className="h-3 w-3" /> Đặc biệt
                            </Badge>
                        )}
                        {group.TRANGTHAI === 'Đã đủ thành viên' && (
                            <Badge variant="secondary" className="bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                Đã đủ TV ({group.SO_THANHVIEN_HIENTAI}/4)
                            </Badge>
                        )}
                        {group.TRANGTHAI === 'Đang mở' && (
                            <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-300">
                                Đang mở ({group.SO_THANHVIEN_HIENTAI}/4)
                            </Badge>
                        )}
                    </div>
                </SheetHeader>

                {/* Khu vực nội dung có thể cuộn */}
                <ScrollArea className="flex-grow overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* Card thông tin chung của nhóm (Giữ nguyên) */}
                        <Card className="border border-blue-200 dark:border-blue-700 shadow-md bg-white dark:bg-gray-800">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <Info className="h-5 w-5 text-blue-500" /> Thông tin chung
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4">
                                <InfoItem icon={BookOpen} label="Thuộc Kế hoạch ID" value={group.ID_KEHOACH} />
                                <InfoItem icon={CalendarDays} label="Ngày tạo" value={formatNullableDate(group.NGAYTAO)} />
                                <InfoItem icon={Clock} label="Cập nhật lần cuối" value={formatNullableDate(group.NGAYCAPNHAT)} />
                            </CardContent>
                        </Card>

                        {/* Card danh sách thành viên */}
                        <Card className="border border-blue-200 dark:border-blue-700 shadow-md bg-white dark:bg-gray-800">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-500" /> Thành viên ({group.thanhviens?.length ?? 0})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {group.thanhviens && group.thanhviens.length > 0 ? (
                                    group.thanhviens.map((member, index) => (
                                        <div key={member.ID_THANHVIEN} className="p-4 border border-blue-100 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 shadow-sm transition hover:shadow-md">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border-2 border-blue-300 dark:border-blue-600">
                                                        <AvatarFallback className="bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300">
                                                            {getInitials(member.nguoidung.HODEM_VA_TEN)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-grow">
                                                        {/* SỬA LỖI DOM: Thay <p> bằng <div> */}
                                                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                            {member.nguoidung.HODEM_VA_TEN}
                                                            {member.ID_NGUOIDUNG === group.ID_NHOMTRUONG && (
                                                                <Badge variant="outline" className="border-blue-400 text-blue-600 dark:border-blue-600 dark:text-blue-300 gap-1 text-xs px-1.5 py-0.5">
                                                                    <Crown className="h-3 w-3" />Trưởng nhóm
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{member.nguoidung.MA_DINHDANH}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <Separator className="my-3 bg-blue-200 dark:bg-blue-700" />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                                <InfoItem icon={Mail} label="Email" value={member.nguoidung.EMAIL} className="col-span-2 sm:col-span-1" />
                                                <InfoItem icon={Phone} label="Điện thoại" value={member.nguoidung.SO_DIENTHOAI || 'Chưa cập nhật'} className="col-span-2 sm:col-span-1" />
                                                <InfoItem icon={CalendarPlus} label="Ngày vào nhóm" value={formatNullableDate(member.NGAY_VAONHOM, 'dd/MM/yyyy')} className="col-span-2 sm:col-span-1" />
                                                <InfoItem icon={BookOpen} label="Chuyên ngành" value={member.nguoidung.sinhvien?.chuyennganh?.TEN_CHUYENNGANH ?? <span className="italic text-gray-400 dark:text-gray-500">N/A</span>} className="col-span-2 sm:col-span-1" />
                                                <InfoItem icon={Users} label="Lớp" value={member.nguoidung.sinhvien?.TEN_LOP ?? <span className="italic text-gray-400 dark:text-gray-500">N/A</span>} className="col-span-2 sm:col-span-1" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Nhóm chưa có thành viên nào.</p>
                                )}
                            </CardContent>
                        </Card>
                        
                        {/* Card Lịch sử Nộp bài (Không đổi) */}
                        {phancong && (
                            <Card className="border border-blue-200 dark:border-blue-700 shadow-md bg-white dark:bg-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <History className="h-5 w-5 text-blue-500" /> Lịch sử Nộp bài
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={fetchHistory} disabled={isLoadingHistory}>
                                            <RefreshCw className={cn("h-4 w-4", isLoadingHistory && "animate-spin")} />
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {isLoadingHistory ? (
                                        <div className="text-center p-8"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/></div>
                                    ) : history.length > 0 ? (
                                        history.map(attempt => (
                                            <SubmissionAttempt key={attempt.ID_NOP_SANPHAM} attempt={attempt} />
                                        ))
                                    ) : (
                                        <p className="text-center text-muted-foreground p-8">Chưa có lịch sử nộp bài.</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}