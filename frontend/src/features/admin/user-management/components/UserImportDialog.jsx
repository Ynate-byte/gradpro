import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from "sonner";
import { Download, UploadCloud, FileText, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils'; // Thêm import cn

import { downloadImportTemplate, previewImport, processImport } from '@/api/userService';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator'; // Thêm import Separator

// Component Dialog thực hiện chức năng import người dùng từ file Excel
export function UserImportDialog({ isOpen, setIsOpen, onSuccess }) {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Đặt lại trạng thái của dialog về mặc định
    const resetState = () => {
        setStep(1);
        setFile(null);
        setPreviewData(null);
        setIsLoading(false);
    };

    // Xử lý đóng dialog và gọi hàm reset trạng thái
    const handleClose = () => {
        setIsOpen(false);
        // Dùng timeout để đảm bảo animation đóng dialog kết thúc trước khi reset state
        setTimeout(resetState, 300);
    };

    // Xử lý tải về file mẫu Excel
    const handleDownloadTemplate = async () => {
        toast.info("Đang tải file mẫu...", { duration: 1500 });
        try {
            const blob = await downloadImportTemplate();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'import_users_template.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success("Tải file mẫu thành công!");
        } catch (error) {
            toast.error("Không thể tải file mẫu. Vui lòng thử lại.");
        }
    };

    // Xử lý khi người dùng kéo thả hoặc chọn file
    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    // Hook Dropzone để quản lý vùng kéo thả file
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
        multiple: false
    });

    // Xử lý xem trước nội dung file đã tải lên
    const handlePreview = async () => {
        if (!file) return;
        setIsLoading(true);
        try {
            const data = await previewImport(file);
            setPreviewData(data);
            setStep(3);
        } catch (error) {
            toast.error(error.response?.data?.message || "File không hợp lệ hoặc có lỗi xảy ra.");
        } finally {
            setIsLoading(false);
        }
    };

    // Xử lý import dữ liệu hợp lệ vào hệ thống
    const handleProcess = async () => {
        if (!previewData?.validRows || previewData.validRows.length === 0) {
            toast.warning("Không có dữ liệu hợp lệ để import.");
            return;
        }
        setIsLoading(true);
        try {
            const response = await processImport(previewData.validRows);
            toast.success(response.message);
            onSuccess();
            handleClose();
        } catch (error) {
            toast.error(error.response?.data?.message || "Import thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    // Component hiển thị Progress Bar (Step Indicator)
    const StepIndicator = ({ currentStep }) => {
        const steps = [
            { step: 1, title: "Tải mẫu", icon: Download },
            { step: 2, title: "Tải lên", icon: UploadCloud },
            { step: 3, title: "Xác nhận", icon: CheckCircle },
        ];
        return (
            <div className="flex justify-between items-center w-full mb-6 relative">
                {/* Đường kết nối */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 z-0" />
                {steps.map(({ step, title, icon: Icon }) => (
                    <div key={step} className="flex flex-col items-center flex-1 z-10 relative">
                        <div
                            className={cn(
                                "flex items-center justify-center h-8 w-8 rounded-full border-2 transition-all duration-300",
                                currentStep === step
                                    ? "bg-primary border-primary text-primary-foreground shadow-md"
                                    : currentStep > step
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "bg-background border-border text-muted-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                        </div>
                        <p
                            className={cn(
                                "text-xs font-medium mt-1.5 transition-colors duration-300",
                                currentStep >= step ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            {title}
                        </p>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            {/* Tăng sm:max-w-4xl để có nhiều không gian hơn cho bảng */}
            <DialogContent className="sm:max-w-[1000px] h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Import Người dùng từ Excel</DialogTitle>
                    <DialogDescription>Thực hiện theo các bước dưới đây để thêm hàng loạt người dùng.</DialogDescription>
                </DialogHeader>

                <div className="flex-grow min-h-0 flex flex-col pt-4">
                    <StepIndicator currentStep={step} />
                    <Separator className="mb-6" />

                    {step === 1 && (
                        <div className="text-center p-8 flex flex-col items-center justify-center flex-grow">
                            <div className="p-8 border-2 border-dashed border-primary/50 bg-primary/5 rounded-xl max-w-sm">
                                <FileText className="h-10 w-10 mx-auto mb-4 text-primary" />
                                <h3 className="text-lg font-semibold mb-3 text-foreground">File mẫu Import</h3>
                                <p className="text-muted-foreground text-sm mb-6">Tải về file Excel mẫu và điền chính xác thông tin người dùng.</p>
                                <Button onClick={handleDownloadTemplate} className="w-full">
                                    <Download className="mr-2 h-4 w-4" /> Tải về (.xlsx)
                                </Button>
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="text-center p-8 flex flex-col items-center justify-center flex-grow">
                            <div
                                {...getRootProps()}
                                className={cn(
                                    `mt-4 w-full h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors`,
                                    isDragActive ? 'border-primary bg-primary/10' : file ? 'border-green-500 bg-green-50/50' : 'border-border'
                                )}
                            >
                                <input {...getInputProps()} disabled={isLoading}/>
                                <UploadCloud className={cn("h-12 w-12", file ? 'text-green-600' : 'text-muted-foreground')} />
                                {file ? (
                                    <p className="mt-4 font-semibold text-primary">{file.name}</p>
                                ) : (
                                    <p className="mt-4 text-muted-foreground">Kéo thả file Excel vào đây, hoặc nhấn để chọn file (.xlsx, .xls)</p>
                                )}
                            </div>
                        </div>
                    )}
                    {step === 3 && previewData && (
                        <div className="flex-grow min-h-0 flex flex-col space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border p-4 rounded-lg bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800">
                                    <h4 className="font-semibold flex items-center text-green-700 dark:text-green-400">
                                        <CheckCircle className="mr-2 h-5 w-5" /> {previewData.validRows.length} dòng hợp lệ
                                    </h4>
                                </div>
                                <div className="border p-4 rounded-lg bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800">
                                    <h4 className="font-semibold flex items-center text-red-700 dark:text-red-400">
                                        <XCircle className="mr-2 h-5 w-5" /> {previewData.invalidRows.length} dòng có lỗi
                                    </h4>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Dữ liệu hợp lệ sẽ được import. Dữ liệu có lỗi sẽ bị bỏ qua.
                            </p>
                            <ScrollArea className="flex-grow border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>STT</TableHead>
                                            <TableHead>Họ tên</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Mã định danh</TableHead>
                                            <TableHead>Vai trò</TableHead>
                                            <TableHead>Lý do lỗi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Dữ liệu không hợp lệ */}
                                        {previewData.invalidRows.map((row, index) => (
                                            <TableRow key={`invalid-${index}`} className="bg-red-50/50 hover:bg-red-50/70">
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{row.ho_dem_va_ten}</TableCell>
                                                <TableCell>{row.email}</TableCell>
                                                <TableCell>{row.ma_dinh_danh}</TableCell>
                                                <TableCell>{row.vai_tro}</TableCell>
                                                <TableCell className="text-red-700 dark:text-red-300 text-xs font-medium">
                                                    {Object.entries(row.error_details).map(([key, messages]) => (
                                                        <div key={key}>- {messages.join(', ')}</div>
                                                    ))}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {/* Dữ liệu hợp lệ */}
                                        {previewData.validRows.map((row, index) => (
                                            <TableRow key={`valid-${index}`} className="hover:bg-green-50/50">
                                                <TableCell>{previewData.invalidRows.length + index + 1}</TableCell>
                                                <TableCell>{row.ho_dem_va_ten}</TableCell>
                                                <TableCell>{row.email}</TableCell>
                                                <TableCell>{row.ma_dinh_danh}</TableCell>
                                                <TableCell>{row.vai_tro}</TableCell>
                                                <TableCell><CheckCircle className="h-5 w-5 text-green-500" /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4 flex justify-between">
                    <div className="flex gap-2">
                        {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isLoading}>Quay lại</Button>}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleClose} disabled={isLoading}>Đóng</Button>
                        {step === 1 && (
                            <Button onClick={() => setStep(2)} disabled={isLoading}>
                                Tiếp tục <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                        {step === 2 && (
                            <Button onClick={handlePreview} disabled={!file || isLoading} className="min-w-[150px]">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</> : "Xem trước dữ liệu"}
                            </Button>
                        )}
                        {step === 3 && (
                            <Button onClick={handleProcess} disabled={isLoading || previewData.validRows.length === 0} className="min-w-[150px]">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang import...</> : `Tiến hành Import (${previewData.validRows.length} dòng)`}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}