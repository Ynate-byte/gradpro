import React, { useState } from 'react';
import { 
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
// [ĐÃ SỬA] Thêm Download vào import bên dưới
import { Archive, Loader2, Database, FileArchive, CheckCircle2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { archivePlan } from '@/api/thesisPlanService';
import { cn } from '@/lib/utils';

export function BackupPlanDialog({ plan, children, onOpenChange }) {
    const [open, setOpen] = useState(false);
    const [includeFiles, setIncludeFiles] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Xử lý đóng/mở dialog để tránh xung đột với DropdownMenu
    const handleOpenChange = (newOpen) => {
        setOpen(newOpen);
        if (onOpenChange) onOpenChange(newOpen);
        if (!newOpen) {
            // Reset state khi đóng
            setTimeout(() => setIncludeFiles(false), 300);
        }
    };

    const handleBackup = async () => {
        setIsLoading(true);
        const toastId = toast.loading("Đang nén và tạo file sao lưu...");

        try {
            // Gọi API với tùy chọn includeFiles
            const response = await archivePlan(plan.ID_KEHOACH, includeFiles);
            
            // Tạo link tải xuống từ Blob response
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            const type = includeFiles ? 'FULL' : 'DB_ONLY';
            const fileName = `Backup_${plan.KHOAHOC}_${plan.TEN_DOT}_${type}.zip`
                             .replace(/\s+/g, '_') // Thay khoảng trắng bằng _
                             .replace(/[^\w\d_.-]/g, ''); // Loại bỏ ký tự đặc biệt
            
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.dismiss(toastId);
            toast.success("Sao lưu thành công! File đã bắt đầu tải xuống.");
            handleOpenChange(false);
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Lỗi sao lưu: " + (error.response?.data?.message || "Lỗi kết nối server"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
                <div className="p-6 pb-4 bg-muted/10 border-b">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl text-amber-700">
                            <Archive className="w-6 h-6" />
                            Sao lưu Kế hoạch
                        </DialogTitle>
                        <DialogDescription className="text-sm pt-1">
                            Tạo gói dữ liệu dự phòng cho kế hoạch <strong>{plan.TEN_DOT}</strong>.
                            <br/>Bạn có thể dùng file này để khôi phục lại sau khi xóa.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-4">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Chọn phương thức sao lưu
                    </Label>

                    {/* Option 1: Database Only (Default) */}
                    <div 
                        className={cn(
                            "relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                            !includeFiles 
                                ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm" 
                                : "border-muted hover:border-amber-200 hover:bg-muted/50"
                        )}
                        onClick={() => setIncludeFiles(false)}
                    >
                        <div className={cn(
                            "p-2 rounded-full shrink-0",
                            !includeFiles ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"
                        )}>
                            <Database className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold text-sm">Chỉ Cơ sở dữ liệu</p>
                                {!includeFiles && <CheckCircle2 className="w-5 h-5 text-amber-600" />}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Sao lưu thông tin cấu hình, danh sách sinh viên, nhóm, đề tài, điểm số và lịch sử hoạt động. 
                                <br/><span className="text-green-600 font-medium">• File siêu nhẹ, tải nhanh.</span>
                            </p>
                        </div>
                    </div>

                    {/* Option 2: Full Backup */}
                    <div 
                        className={cn(
                            "relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                            includeFiles 
                                ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm" 
                                : "border-muted hover:border-amber-200 hover:bg-muted/50"
                        )}
                        onClick={() => setIncludeFiles(true)}
                    >
                        <div className={cn(
                            "p-2 rounded-full shrink-0",
                            includeFiles ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"
                        )}>
                            <FileArchive className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold text-sm">Sao lưu Toàn bộ (Full)</p>
                                {includeFiles && <CheckCircle2 className="w-5 h-5 text-amber-600" />}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Bao gồm Database <strong>CỘNG VỚI</strong> tất cả các file báo cáo PDF và Source Code sinh viên đã nộp.
                                <br/><span className="text-orange-600 font-medium">• File nặng, tốn thời gian xử lý.</span>
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-muted/10">
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
                        Hủy bỏ
                    </Button>
                    <Button 
                        onClick={handleBackup} 
                        disabled={isLoading}
                        className="bg-amber-600 hover:bg-amber-700 text-white min-w-[140px]"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                        {isLoading ? 'Đang nén...' : 'Tải về ngay'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}