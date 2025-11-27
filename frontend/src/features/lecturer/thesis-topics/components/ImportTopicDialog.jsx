import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Save } from 'lucide-react';
import { thesisTopicService } from '@/api/thesisTopicService';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';

const ImportTopicDialog = ({ open, onOpenChange, planId, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState({ validRows: [], invalidRows: [] });
    const [errorMessage, setErrorMessage] = useState(null);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles) => {
            setFile(acceptedFiles[0]);
            setErrorMessage(null);
        },
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv']
        },
        maxFiles: 1
    });

    const handlePreview = async () => {
        if (!file) return;
        if (!planId) {
            toast.error("Vui lòng chọn Kế hoạch trước khi import.");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('ID_KEHOACH', planId);

        try {
            const res = await thesisTopicService.previewImport(formData);
            setPreviewData(res.data);
            setStep(2);
        } catch (error) {
            console.error("CHI TIẾT LỖI IMPORT:", error);

            // Lấy message từ backend
            const serverMsg = error.response?.data?.message;
            const serverDetail = error.response?.data?.detail;

            if (serverMsg) {
                setErrorMessage(serverMsg + (serverDetail ? `\n${serverDetail}` : ""));
                toast.error("Lỗi khi đọc file import.");
            } else {
                setErrorMessage(`Lỗi kết nối: ${error.message}`);
                toast.error("Đã xảy ra lỗi không xác định.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async () => {
        if (previewData.validRows.length === 0) {
            toast.warning("Không có dữ liệu hợp lệ để lưu.");
            return;
        }

        setLoading(true);
        try {
            await thesisTopicService.processImport(previewData.validRows);
            toast.success(`Đã import thành công ${previewData.validRows.length} đề tài!`);
            
            if (onSuccess) onSuccess();
            
            onOpenChange(false);
            // Reset state
            setStep(1);
            setFile(null);
            setPreviewData({ validRows: [], invalidRows: [] });
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi lưu dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b bg-background shrink-0">
                    <DialogTitle>Import Đề tài từ Excel</DialogTitle>
                    <DialogDescription>
                        Hệ thống sẽ tự động tìm dòng tiêu đề (Tên đề tài, Email, Bộ môn...) để đọc dữ liệu.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
                    {step === 1 ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-6">
                            {errorMessage && (
                                <Alert variant="destructive" className="max-w-2xl w-full">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="whitespace-pre-line">{errorMessage}</AlertDescription>
                                </Alert>
                            )}

                            <div 
                                {...getRootProps()} 
                                className={`w-full max-w-2xl border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                                    isDragActive 
                                        ? 'border-primary bg-primary/5 ring-4 ring-primary/10' 
                                        : 'border-muted-foreground/25 hover:border-primary hover:bg-background'
                                }`}
                            >
                                <input {...getInputProps()} />
                                <div className="p-4 bg-background rounded-full shadow-sm mb-4">
                                    <FileSpreadsheet className="w-12 h-12 text-primary" />
                                </div>
                                {file ? (
                                    <div className="text-center">
                                        <p className="font-semibold text-primary text-lg">{file.name}</p>
                                        <p className="text-sm text-muted-foreground mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-2">
                                        <p className="font-medium text-lg">Kéo thả file vào đây hoặc click để chọn</p>
                                        <p className="text-sm text-muted-foreground">Hỗ trợ định dạng .xlsx, .xls, .csv</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="text-xs text-muted-foreground text-center max-w-lg">
                                <p>File Excel cần có các cột: <strong>Tên đề tài</strong>, <strong>Email GV</strong> (hoặc Tên GV), <strong>Bộ môn</strong> (tùy chọn), <strong>Mô tả</strong>.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 h-full flex flex-col">
                             <div className="flex gap-4 shrink-0">
                                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200 shadow-sm">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-semibold">{previewData.validRows.length} Hợp lệ</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg border border-red-200 shadow-sm">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="font-semibold">{previewData.invalidRows.length} Lỗi</span>
                                </div>
                            </div>

                            <Tabs defaultValue="valid" className="w-full flex-1 flex flex-col overflow-hidden bg-background rounded-lg border shadow-sm">
                                <div className="px-4 pt-2 border-b bg-muted/30">
                                    <TabsList>
                                        <TabsTrigger value="valid">Dữ liệu hợp lệ</TabsTrigger>
                                        <TabsTrigger value="invalid" className="data-[state=active]:text-red-600">Dữ liệu lỗi</TabsTrigger>
                                    </TabsList>
                                </div>
                                
                                <TabsContent value="valid" className="flex-1 overflow-auto p-0 m-0">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                            <TableRow>
                                                <TableHead>Tên đề tài</TableHead>
                                                <TableHead>Giảng viên</TableHead>
                                                <TableHead>Bộ môn</TableHead>
                                                <TableHead className="w-[40%]">Mô tả / Yêu cầu</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewData.validRows.length > 0 ? (
                                                previewData.validRows.map((row, i) => (
                                                    <TableRow key={i} className="hover:bg-muted/50">
                                                        <TableCell className="font-medium align-top">{row.TEN_DETAI}</TableCell>
                                                        <TableCell className="align-top">
                                                            <div className="font-medium">{row.GV_TEN}</div>
                                                            <div className="text-xs text-muted-foreground">{row.Email}</div>
                                                        </TableCell>
                                                        <TableCell className="align-top text-xs">
                                                            {/* Hiển thị ID Bộ môn nếu backend trả về, hoặc lấy từ file Excel */}
                                                            ID: {row.ID_KHOA_BOMON || 'Auto'}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground align-top">
                                                            <div className="line-clamp-2" title={row.MOTA}>{row.MOTA}</div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                        Không có dữ liệu hợp lệ.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                                
                                <TabsContent value="invalid" className="flex-1 overflow-auto p-0 m-0">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                            <TableRow>
                                                <TableHead className="w-[80px]">Dòng</TableHead>
                                                <TableHead>Dữ liệu nguồn</TableHead>
                                                <TableHead className="text-red-600 w-[40%]">Nguyên nhân lỗi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewData.invalidRows.length > 0 ? (
                                                previewData.invalidRows.map((row, i) => (
                                                    <TableRow key={i} className="hover:bg-red-50/50">
                                                        <TableCell className="text-center font-bold align-top">{row.row}</TableCell>
                                                        <TableCell className="align-top">
                                                            <div className="font-medium text-foreground">{row.data['Tên đề tài'] || '(Trống)'}</div>
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                GV: {row.data['Giảng viên'] || row.data['Email'] || '(Trống)'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-red-600 align-top bg-red-50/30">
                                                            <ul className="list-disc pl-4 text-xs space-y-1">
                                                                {row.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                                                            </ul>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                        Không có dòng lỗi nào.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t bg-background shrink-0 gap-3">
                    {step === 1 ? (
                        <>
                            <Button variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
                            <Button onClick={handlePreview} disabled={!file || loading} className="min-w-[120px]">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Xem trước
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => { setStep(1); setFile(null); setErrorMessage(null); }}>
                                Chọn file khác
                            </Button>
                            <Button onClick={handleProcess} disabled={loading || previewData.validRows.length === 0} className="min-w-[150px]">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Thực hiện Import
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ImportTopicDialog;