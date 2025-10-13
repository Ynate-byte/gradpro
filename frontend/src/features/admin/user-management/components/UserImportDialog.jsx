import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from "sonner";
import { Download, UploadCloud, FileText, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

import { downloadImportTemplate, previewImport, processImport } from '@/api/userService';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';

export function UserImportDialog({ isOpen, setIsOpen, onSuccess }) {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const resetState = () => {
        setStep(1);
        setFile(null);
        setPreviewData(null);
        setIsLoading(false);
    };

    const handleClose = () => {
        setIsOpen(false);
        setTimeout(resetState, 300); // Reset state sau khi animation đóng dialog kết thúc
    };

    const handleDownloadTemplate = async () => {
        try {
            const blob = await downloadImportTemplate();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'import_users_template.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            toast.error("Không thể tải file mẫu. Vui lòng thử lại.");
        }
    };

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
        multiple: false
    });

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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Import Người dùng từ Excel</DialogTitle>
                    <DialogDescription>Thực hiện theo các bước dưới đây để thêm hàng loạt người dùng.</DialogDescription>
                </DialogHeader>

                <div className="flex-grow min-h-0 flex flex-col">
                    {step === 1 && (
                        <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                            <h3 className="text-lg font-semibold mb-2">Bước 1: Tải về và điền file mẫu</h3>
                            <p className="text-muted-foreground mb-6">Sử dụng file mẫu để đảm bảo đúng định dạng dữ liệu.</p>
                            <Button onClick={handleDownloadTemplate}>
                                <Download className="mr-2 h-4 w-4" /> Tải về file mẫu (.xlsx)
                            </Button>
                            <Button variant="outline" onClick={() => setStep(2)} className="mt-8">
                                Đã có file? Tải lên ngay <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                            <h3 className="text-lg font-semibold mb-2">Bước 2: Tải lên file dữ liệu</h3>
                            <div {...getRootProps()} className={`mt-4 w-full h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}`}>
                                <input {...getInputProps()} />
                                <UploadCloud className="h-12 w-12 text-muted-foreground" />
                                {file ? (
                                    <p className="mt-4 font-semibold text-primary">{file.name}</p>
                                ) : (
                                    <p className="mt-4 text-muted-foreground">Kéo thả file vào đây, hoặc nhấn để chọn file</p>
                                )}
                            </div>
                        </div>
                    )}
                    {step === 3 && previewData && (
                        <div className="flex-grow min-h-0 flex flex-col space-y-4">
                            <h3 className="text-lg font-semibold">Bước 3: Xem trước và Xác nhận</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border p-4 rounded-lg bg-green-50 border-green-200">
                                    <h4 className="font-semibold flex items-center text-green-700">
                                        <CheckCircle className="mr-2 h-5 w-5" /> {previewData.validRows.length} dòng hợp lệ
                                    </h4>
                                </div>
                                <div className="border p-4 rounded-lg bg-red-50 border-red-200">
                                     <h4 className="font-semibold flex items-center text-red-700">
                                        <XCircle className="mr-2 h-5 w-5" /> {previewData.invalidRows.length} dòng có lỗi
                                    </h4>
                                </div>
                            </div>
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
                                        {previewData.invalidRows.map((row, index) => (
                                            <TableRow key={`invalid-${index}`} className="bg-red-50/50">
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{row.ho_dem_va_ten}</TableCell>
                                                <TableCell>{row.email}</TableCell>
                                                <TableCell>{row.ma_dinh_danh}</TableCell>
                                                <TableCell>{row.vai_tro}</TableCell>
                                                <TableCell className="text-red-600 text-xs">
                                                    {Object.entries(row.error_details).map(([key, messages]) => (
                                                        <div key={key}>- {messages.join(', ')}</div>
                                                    ))}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                         {previewData.validRows.map((row, index) => (
                                            <TableRow key={`valid-${index}`}>
                                                <TableCell>{previewData.invalidRows.length + index + 1}</TableCell>
                                                <TableCell>{row.ho_dem_va_ten}</TableCell>
                                                <TableCell>{row.email}</TableCell>
                                                <TableCell>{row.ma_dinh_danh}</TableCell>
                                                <TableCell>{row.vai_tro}</TableCell>
                                                <TableCell><CheckCircle className="h-5 w-5 text-green-500"/></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4">
                    {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Quay lại</Button>}
                    {step === 2 && <Button onClick={handlePreview} disabled={!file || isLoading}> {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</> : "Xem trước dữ liệu"} </Button>}
                    {step === 3 && <Button onClick={handleProcess} disabled={isLoading || previewData.validRows.length === 0}> {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang import...</> : `Tiến hành Import (${previewData.validRows.length} dòng)`} </Button>}
                    <Button variant="secondary" onClick={handleClose}>Đóng</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}