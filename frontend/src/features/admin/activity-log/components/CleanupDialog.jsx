import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cleanupLogs } from '@/api/historyService';
import { toast } from 'sonner';
import { 
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Eraser, AlertTriangle, Loader2, Archive, Clock, KeyRound } from 'lucide-react';

export function CleanupDialog({ isOpen, onOpenChange }) {
    const queryClient = useQueryClient();
    const [mode, setMode] = useState('auth');
    const [timeValue, setTimeValue] = useState('3'); // Mặc định 3 tháng

    const mutation = useMutation({
        mutationFn: cleanupLogs,
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries(['admin-logs']); // Refresh danh sách log
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Dọn dẹp thất bại.");
        }
    });

    const handleCleanup = () => {
        const payload = { mode, value: timeValue };
        // Với mode 'plan', value không quan trọng (backend tự tìm plan đã đóng), 
        // nhưng cứ gửi để validate pass.
        mutation.mutate(payload);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Eraser className="h-5 w-5" /> Dọn dẹp Nhật ký hệ thống
                    </DialogTitle>
                    <DialogDescription>
                        Hành động này sẽ xóa vĩnh viễn các bản ghi nhật ký cũ để giải phóng bộ nhớ. 
                        Dữ liệu đã xóa <strong>không thể khôi phục</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    <RadioGroup value={mode} onValueChange={setMode} className="gap-4">
                        
                        {/* Option 1: Dọn log truy cập (An toàn nhất) */}
                        <div className={`flex items-start space-x-3 p-3 rounded-lg border ${mode === 'auth' ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted'}`}>
                            <RadioGroupItem value="auth" id="auth" className="mt-1" />
                            <div className="grid gap-1.5 flex-1 cursor-pointer" onClick={() => setMode('auth')}>
                                <Label htmlFor="auth" className="font-semibold flex items-center gap-2 cursor-pointer">
                                    <KeyRound className="h-4 w-4 text-blue-500" />
                                    Dọn log Truy cập (Login/Logout)
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Xóa lịch sử đăng nhập cũ. Giữ lại các log thao tác quan trọng.
                                </p>
                                {mode === 'auth' && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-sm">Cũ hơn:</span>
                                        <Select value={timeValue} onValueChange={setTimeValue}>
                                            <SelectTrigger className="h-8 w-[120px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">1 tháng</SelectItem>
                                                <SelectItem value="3">3 tháng</SelectItem>
                                                <SelectItem value="6">6 tháng</SelectItem>
                                                <SelectItem value="12">1 năm</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Option 2: Dọn log Kế hoạch cũ (Rất hữu ích) */}
                        <div className={`flex items-start space-x-3 p-3 rounded-lg border ${mode === 'plan' ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted'}`}>
                            <RadioGroupItem value="plan" id="plan" className="mt-1" />
                            <div className="grid gap-1.5 flex-1 cursor-pointer" onClick={() => setMode('plan')}>
                                <Label htmlFor="plan" className="font-semibold flex items-center gap-2 cursor-pointer">
                                    <Archive className="h-4 w-4 text-orange-500" />
                                    Dọn log Kế hoạch đã kết thúc
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Xóa toàn bộ hoạt động (bình luận, cập nhật task...) của các nhóm thuộc các kế hoạch có trạng thái "Đã hoàn thành".
                                </p>
                            </div>
                        </div>

                        {/* Option 3: Dọn tất cả theo thời gian (Cẩn thận) */}
                        <div className={`flex items-start space-x-3 p-3 rounded-lg border ${mode === 'time' ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted'}`}>
                            <RadioGroupItem value="time" id="time" className="mt-1" />
                            <div className="grid gap-1.5 flex-1 cursor-pointer" onClick={() => setMode('time')}>
                                <Label htmlFor="time" className="font-semibold flex items-center gap-2 cursor-pointer">
                                    <Clock className="h-4 w-4 text-gray-500" />
                                    Dọn tất cả log cũ
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Xóa mọi loại log cũ hơn khoảng thời gian chọn.
                                </p>
                                {mode === 'time' && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-sm">Cũ hơn:</span>
                                        <Select value={timeValue} onValueChange={setTimeValue}>
                                            <SelectTrigger className="h-8 w-[120px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="3">3 tháng</SelectItem>
                                                <SelectItem value="6">6 tháng</SelectItem>
                                                <SelectItem value="12">1 năm</SelectItem>
                                                <SelectItem value="24">2 năm</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </RadioGroup>

                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Cảnh báo</AlertTitle>
                        <AlertDescription>
                            Hành động này sẽ xóa dữ liệu vĩnh viễn. Hãy chắc chắn rằng bạn không cần tra cứu lại các log này.
                        </AlertDescription>
                    </Alert>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Hủy</Button>
                    <Button variant="destructive" onClick={handleCleanup} disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Tiến hành Dọn dẹp
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}