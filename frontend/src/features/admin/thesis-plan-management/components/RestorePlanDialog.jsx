import React, { useState, useRef } from 'react';
import { 
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RotateCcw, Loader2, UploadCloud, FileArchive } from 'lucide-react';
import { toast } from 'sonner';
import { restorePlan } from '@/api/thesisPlanService';
import { cn } from '@/lib/utils';

export function RestorePlanDialog({ children, onSuccess }) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState(null);
    const [skipFiles, setSkipFiles] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.name.endsWith('.zip')) {
                setFile(droppedFile);
            } else {
                toast.error("Vui lòng chỉ chọn file .zip");
            }
        }
    };

    const handleRestore = async () => {
        if (!file) return;

        setIsLoading(true);
        const toastId = toast.loading("Đang phục hồi dữ liệu...");

        try {
            await restorePlan(file, skipFiles);
            
            toast.dismiss(toastId);
            toast.success("Phục hồi kế hoạch thành công!");
            
            setOpen(false);
            setFile(null); // Reset file
            if (onSuccess) onSuccess(); // Callback refresh list
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Lỗi phục hồi: " + (error.response?.data?.message || "File không hợp lệ"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-700">
                        <RotateCcw className="w-5 h-5" />
                        Khôi phục Kế hoạch
                    </DialogTitle>
                    <DialogDescription>
                        Tải lên file sao lưu (.zip) để khôi phục kế hoạch.
                        <br/>Dữ liệu sẽ được tạo mới thành một kế hoạch riêng biệt.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Khu vực Upload File */}
                    <div 
                        className={cn(
                            "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
                            file ? "border-green-500 bg-green-50 dark:bg-green-900/10" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={handleDrop}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".zip" 
                            onChange={handleFileChange}
                        />
                        
                        {file ? (
                            <>
                                <FileArchive className="w-10 h-10 text-green-600 mb-2" />
                                <p className="text-sm font-medium text-green-700 break-all px-4">{file.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="mt-2 h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                >
                                    Chọn file khác
                                </Button>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
                                <p className="text-sm font-medium">Nhấn để chọn file hoặc kéo thả vào đây</p>
                                <p className="text-xs text-muted-foreground mt-1">Chỉ chấp nhận file .zip</p>
                            </>
                        )}
                    </div>

                    {/* Tùy chọn khôi phục */}
                    <div className="space-y-3">
                        <div 
                            className={cn(
                                "flex items-start space-x-3 p-3 rounded-md border cursor-pointer transition-all",
                                !skipFiles ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-muted"
                            )}
                            onClick={() => setSkipFiles(false)}
                        >
                            <div className="mt-0.5"><RotateCcw className="w-4 h-4 text-blue-600" /></div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">Khôi phục đầy đủ (Full)</p>
                                <p className="text-xs text-muted-foreground">
                                    Bao gồm cả Cơ sở dữ liệu và các File đính kèm (PDF, Source code...).
                                </p>
                            </div>
                        </div>

                        <div 
                            className={cn(
                                "flex items-start space-x-3 p-3 rounded-md border cursor-pointer transition-all",
                                skipFiles ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-muted"
                            )}
                            onClick={() => setSkipFiles(true)}
                        >
                             <div className="flex items-center justify-center mt-0.5">
                                <Checkbox 
                                    id="skip_files" 
                                    checked={skipFiles}
                                    onCheckedChange={setSkipFiles}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="skip_files" className="text-sm font-medium leading-none cursor-pointer">
                                    Chỉ khôi phục Cơ sở dữ liệu
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Chỉ lấy lại thông tin (Sinh viên, Điểm, Đề tài...). Bỏ qua các file nặng.
                                    <br/><span className="italic text-amber-600">Lưu ý: Các liên kết tải file sẽ không hoạt động.</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>Đóng</Button>
                    <Button 
                        onClick={handleRestore} 
                        disabled={!file || isLoading}
                        className="bg-amber-600 hover:bg-amber-700 min-w-[120px]"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                        {isLoading ? 'Đang xử lý...' : 'Tiến hành Khôi phục'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}