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
    const [errorMessage, setErrorMessage] = useState(null); // State để hiện lỗi chi tiết

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
            console.error("CHI TIẾT LỖI IMPORT:", error); // [DEBUG] Xem console để thấy lỗi thật

            // Lấy message từ backend
            const serverMsg = error.response?.data?.message;
            const serverDetail = error.response?.data?.detail;

            if (serverMsg) {
                toast.error(serverMsg);
                if (serverDetail) toast.info(serverDetail);
            } else {
                // Fallback nếu không có message từ server
                toast.error(`Lỗi kết nối: ${error.message}`);
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
            onSuccess();
            onOpenChange(false);
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
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Import Đề tài từ Excel</DialogTitle>
                    <DialogDescription>
                        Hệ thống sẽ tự động tìm dòng tiêu đề (Tên đề tài, Email...) để đọc dữ liệu.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-1">
                    {step === 1 ? (
                        <div className="space-y-6 py-10">
                            {errorMessage && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{errorMessage}</AlertDescription>
                                </Alert>
                            )}

                            <div 
                                {...getRootProps()} 
                                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                                    isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
                                }`}
                            >
                                <input {...getInputProps()} />
                                <FileSpreadsheet className="w-16 h-16 text-muted-foreground mb-4" />
                                {file ? (
                                    <div className="text-center">
                                        <p className="font-semibold text-primary text-lg">{file.name}</p>
                                        <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-2">
                                        <p className="font-medium text-lg">Kéo thả file vào đây hoặc click để chọn</p>
                                        <p className="text-sm text-muted-foreground">Hỗ trợ .xlsx, .xls, .csv</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 h-full flex flex-col">
                             <div className="flex gap-4 shrink-0">
                                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-semibold">{previewData.validRows.length} Hợp lệ</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg border border-red-200">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="font-semibold">{previewData.invalidRows.length} Lỗi</span>
                                </div>
                            </div>

                            <Tabs defaultValue="valid" className="w-full flex-1 flex flex-col overflow-hidden">
                                <TabsList>
                                    <TabsTrigger value="valid">Dữ liệu hợp lệ</TabsTrigger>
                                    <TabsTrigger value="invalid" className="text-red-600">Dữ liệu lỗi</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="valid" className="flex-1 border rounded-md mt-2 overflow-auto relative">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background z-10">
                                            <TableRow>
                                                <TableHead>Tên đề tài</TableHead>
                                                <TableHead>Giảng viên</TableHead>
                                                <TableHead>Mô tả</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewData.validRows.map((row, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-medium">{row.TEN_DETAI}</TableCell>
                                                    <TableCell>{row.TEN_GIANG_VIEN}</TableCell>
                                                    <TableCell className="max-w-[300px] truncate" title={row.MOTA}>
                                                        {row.MOTA}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                                
                                <TabsContent value="invalid" className="flex-1 border rounded-md mt-2 overflow-auto relative">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background z-10">
                                            <TableRow>
                                                <TableHead className="w-[80px]">Dòng</TableHead>
                                                <TableHead>Dữ liệu</TableHead>
                                                <TableHead className="text-red-600">Lỗi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewData.invalidRows.map((row, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="text-center font-bold">{row.row}</TableCell>
                                                    <TableCell className="max-w-[300px]">
                                                        <div className="truncate font-medium">{row.data['Tên đề tài'] || 'N/A'}</div>
                                                        <div className="text-xs text-muted-foreground">{row.data['Email']}</div>
                                                    </TableCell>
                                                    <TableCell className="text-red-600 align-top">
                                                        <ul className="list-disc pl-4 text-sm">
                                                            {row.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                                                        </ul>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t p-4 shrink-0">
                    {step === 1 ? (
                        <>
                            <Button variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
                            <Button onClick={handlePreview} disabled={!file || loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Xem trước
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => { setStep(1); setFile(null); setErrorMessage(null); }}>
                                Chọn file khác
                            </Button>
                            <Button onClick={handleProcess} disabled={loading || previewData.validRows.length === 0}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Thực hiện Import ({previewData.validRows.length})
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ImportTopicDialog;