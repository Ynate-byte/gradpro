import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Save, LayoutGrid, Users, FileText } from 'lucide-react';
import { thesisTopicService } from '@/api/thesisTopicService';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

// Helper: Lấy chữ cái đầu tên GV
const getInitials = (name) => {
    if (!name) return "GV";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
        return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const ImportTopicDialog = ({ open, onOpenChange, planId, onSuccess }) => {
    const [step, setStep] = useState(1); // 1: Upload, 2: Preview
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState({ validRows: [], invalidRows: [] });
    const [errorMessage, setErrorMessage] = useState(null);
    
    // State quản lý các dòng được chọn (Lưu index của validRows)
    const [selectedIndices, setSelectedIndices] = useState({});

    // Reset selection khi data thay đổi
    useEffect(() => {
        if (previewData.validRows.length > 0) {
            // Mặc định chọn tất cả
            const allSelected = {};
            previewData.validRows.forEach((_, i) => { allSelected[i] = true; });
            setSelectedIndices(allSelected);
        } else {
            setSelectedIndices({});
        }
    }, [previewData.validRows]);

    // Cấu hình Dropzone
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

    // --- HANDLERS ---

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
            const serverMsg = error.response?.data?.message;
            if (serverMsg) {
                setErrorMessage(serverMsg);
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
        // Lọc ra các dòng được chọn
        const selectedRowsData = previewData.validRows.filter((_, index) => selectedIndices[index]);

        if (selectedRowsData.length === 0) {
            toast.warning("Vui lòng chọn ít nhất 1 đề tài để import.");
            return;
        }

        setLoading(true);
        try {
            await thesisTopicService.processImport(selectedRowsData);
            
            toast.success(`Đã import thành công ${selectedRowsData.length} đề tài!`);
            if (onSuccess) onSuccess();
            handleClose(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi lưu dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = (isOpen) => {
        if (!isOpen) {
            // Reset state khi đóng
            setTimeout(() => {
                setStep(1);
                setFile(null);
                setErrorMessage(null);
                setPreviewData({ validRows: [], invalidRows: [] });
                setSelectedIndices({});
            }, 300);
        }
        onOpenChange(isOpen);
    };

    // --- CHECKBOX LOGIC ---
    
    const toggleAll = (checked) => {
        if (checked) {
            const all = {};
            previewData.validRows.forEach((_, i) => { all[i] = true; });
            setSelectedIndices(all);
        } else {
            setSelectedIndices({});
        }
    };

    const toggleRow = (index, checked) => {
        setSelectedIndices(prev => {
            const next = { ...prev };
            if (checked) next[index] = true;
            else delete next[index];
            return next;
        });
    };

    const selectedCount = Object.keys(selectedIndices).length;
    const totalValid = previewData.validRows.length;
    const isAllSelected = totalValid > 0 && selectedCount === totalValid;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col overflow-hidden bg-background border-none shadow-2xl sm:rounded-xl">
                
                {/* 1. HEADER */}
                <DialogHeader className="px-6 py-5 border-b bg-background shrink-0 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                <FileSpreadsheet className="w-5 h-5" />
                            </div>
                            Import Đề tài
                        </DialogTitle>
                    </div>
                    {step === 2 && (
                        <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border">
                            <span className="text-xs font-medium text-muted-foreground">Đã chọn:</span>
                            <Badge variant="default" className="bg-primary text-primary-foreground hover:bg-primary">
                                {selectedCount} / {totalValid}
                            </Badge>
                        </div>
                    )}
                </DialogHeader>

                {/* 2. BODY */}
                <div className="flex-1 overflow-y-auto bg-muted/10">
                    {step === 1 ? (
                        /* --- BƯỚC 1: UPLOAD --- */
                        <div className="flex flex-col items-center justify-center h-full p-8 animate-in fade-in zoom-in-95 duration-300">
                            {errorMessage && (
                                <Alert variant="destructive" className="max-w-lg w-full mb-6 shadow-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="whitespace-pre-line font-medium">{errorMessage}</AlertDescription>
                                </Alert>
                            )}

                            <div 
                                {...getRootProps()} 
                                className={cn(
                                    "w-full max-w-xl border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group",
                                    isDragActive 
                                    ? 'border-primary bg-primary/5 ring-4 ring-primary/10' 
                                    : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-background shadow-sm hover:shadow-md'
                                )}
                            >
                                <input {...getInputProps()} />
                                <div className="p-5 bg-background rounded-full shadow-sm mb-5 group-hover:scale-110 transition-transform duration-300">
                                    <Upload className="w-10 h-10 text-primary" />
                                </div>
                                {file ? (
                                    <div className="text-center animate-in slide-in-from-bottom-2">
                                        <p className="font-bold text-primary text-lg truncate max-w-xs mx-auto">{file.name}</p>
                                        <p className="text-sm text-muted-foreground mt-1 font-mono">{(file.size / 1024).toFixed(2)} KB</p>
                                        <Badge variant="outline" className="mt-3 bg-green-50 text-green-700 border-green-200">Đã sẵn sàng</Badge>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-2">
                                        <p className="font-semibold text-lg text-foreground">Kéo thả file vào đây hoặc click để chọn</p>
                                        <p className="text-sm text-muted-foreground">Hỗ trợ định dạng .xlsx, .xls, .csv</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-8 text-xs text-muted-foreground text-center max-w-md bg-background p-4 rounded-lg border shadow-sm">
                                <p className="font-semibold mb-1 uppercase tracking-wide text-[10px]">Cấu trúc file yêu cầu:</p>
                                <p>Cần có các cột tiêu đề: <span className="font-mono text-primary bg-primary/10 px-1 rounded">Tên đề tài</span>, <span className="font-mono text-primary bg-primary/10 px-1 rounded">Giảng viên/Email</span>, <span className="font-mono text-primary bg-primary/10 px-1 rounded">Bộ môn</span>, <span className="font-mono text-primary bg-primary/10 px-1 rounded">Mô tả</span>.</p>
                            </div>
                        </div>
                    ) : (
                        /* --- BƯỚC 2: PREVIEW & SELECT --- */
                        <div className="h-full flex flex-col">
                            <Tabs defaultValue="valid" className="flex-1 flex flex-col overflow-hidden">
                                <div className="px-3 pb-0 bg-background border-b flex items-center justify-between shrink-0">
                                    <TabsList className="bg-muted/50 p-1 h-auto">
                                        <TabsTrigger value="valid" className="px-4 py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            Dữ liệu hợp lệ 
                                            <Badge variant="secondary" className="ml-1.5 bg-green-100 text-green-700 hover:bg-green-100">{previewData.validRows.length}</Badge>
                                        </TabsTrigger>
                                        <TabsTrigger value="invalid" className="px-4 py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                            <AlertCircle className="w-4 h-4 text-red-600" />
                                            Dữ liệu lỗi
                                            <Badge variant="secondary" className="ml-1.5 bg-red-100 text-red-700 hover:bg-red-100">{previewData.invalidRows.length}</Badge>
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                                
                                {/* TAB: DATA HỢP LỆ */}
                                <TabsContent value="valid" className="flex-1 overflow-auto p-0 m-0 bg-white dark:bg-card">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 shadow-sm">
                                            <TableRow>
                                                <TableHead className="w-[50px] text-center">
                                                    <Checkbox 
                                                        checked={isAllSelected}
                                                        onCheckedChange={toggleAll}
                                                        aria-label="Chọn tất cả"
                                                    />
                                                </TableHead>
                                                <TableHead className="w-[50px] text-center"></TableHead>
                                                <TableHead className="w-[30%]">Tên đề tài</TableHead>
                                                <TableHead className="w-[10%]">Giảng viên</TableHead>
                                                <TableHead className="w-[15%]">Bộ môn</TableHead>
                                                <TableHead className="w-[30%]">Mô tả</TableHead>
                                                <TableHead className="w-[10%] text-center">SL Nhóm</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewData.validRows.length > 0 ? (
                                                previewData.validRows.map((row, i) => (
                                                    <TableRow 
                                                        key={i} 
                                                        className={cn(
                                                            "hover:bg-blue-50/50 transition-colors group cursor-pointer",
                                                            selectedIndices[i] ? "bg-blue-50/30" : ""
                                                        )}
                                                        onClick={() => toggleRow(i, !selectedIndices[i])}
                                                    >
                                                        <TableCell className="text-center p-4">
                                                            <Checkbox 
                                                                checked={!!selectedIndices[i]}
                                                                onCheckedChange={(checked) => toggleRow(i, checked)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono text-xs text-muted-foreground p-4">
                                                            {i + 1}
                                                        </TableCell>
                                                        
                                                        {/* Tên đề tài */}
                                                        <TableCell className="align-top p-4 ps-2">
                                                            <div className="font-semibold text-sm text-foreground line-clamp-2 mb-1" title={row.TEN_DETAI}>
                                                                {row.TEN_DETAI}
                                                            </div>
                                                        </TableCell>

                                                        {/* Giảng viên */}
                                                        <TableCell className="align-top p-4 ps-2">
                                                            <div className="flex items-start gap-3">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-sm font-medium">{row.GV_TEN}</span>
                                                                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">{row.Email}</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        {/* Bộ môn */}
                                                        <TableCell className="align-top p-4 ps-1">
                                                            {row.TEN_KHOA_BOMON ? (
                                                                <Badge variant="secondary" className="font-normal text-[11px] bg-slate-100 text-slate-700 hover:bg-slate-200">
                                                                    {row.TEN_KHOA_BOMON}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground italic">Không xác định</span>
                                                            )}
                                                        </TableCell>

                                                        {/* Mô tả */}
                                                        <TableCell className="align-top p-4 ps-2">
                                                            <div className="space-y-2">
                                                                <div className="flex gap-2">
                                                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed" title={row.MOTA}>
                                                                        {row.MOTA}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        {/* Số lượng */}
                                                        <TableCell className="text-center align-top p-4">
                                                             <div className="flex items-center justify-center gap-1 bg-slate-100 rounded-md py-1 px-2 w-fit mx-auto">
                                                                <Users className="w-3 h-3 text-slate-500" />
                                                                <span className="text-xs font-bold text-slate-700">{row.SO_NHOM_TOIDA}</span>
                                                             </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-48 text-center">
                                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                            <FileSpreadsheet className="w-10 h-10 mb-3 opacity-10" />
                                                            <span className="text-sm">Không có dữ liệu hợp lệ để hiển thị.</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                                
                                {/* TAB: DATA LỖI */}
                                <TabsContent value="invalid" className="flex-1 overflow-auto p-0 m-0 bg-white dark:bg-card">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 shadow-sm">
                                            <TableRow>
                                                <TableHead className="w-[80px] text-center">Dòng</TableHead>
                                                <TableHead>Dữ liệu nguồn</TableHead>
                                                <TableHead className="text-red-600 w-[40%]">Nguyên nhân lỗi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewData.invalidRows.length > 0 ? (
                                                previewData.invalidRows.map((row, i) => (
                                                    <TableRow key={i} className="hover:bg-red-50/30">
                                                        <TableCell className="text-center font-bold font-mono align-top p-4 text-red-600 bg-red-50/20">{row.row}</TableCell>
                                                        <TableCell className="align-top p-4">
                                                            <div className="font-medium text-foreground">{row.data['Tên đề tài'] || '(Trống)'}</div>
                                                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                                <Users className="w-3 h-3" />
                                                                {row.data['Giảng viên'] || row.data['Email'] || '(Trống)'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="align-top p-4 bg-red-50/10">
                                                            <div className="flex items-start gap-2 text-red-600 text-xs">
                                                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                                <ul className="list-disc pl-4 space-y-1">
                                                                    {row.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                                                                </ul>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-48 text-center">
                                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                            <CheckCircle className="w-10 h-10 mb-3 opacity-20 text-green-500" />
                                                            <span className="text-sm font-medium text-green-600">Tuyệt vời! Không có dòng lỗi nào.</span>
                                                        </div>
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

                {/* 3. FOOTER */}
                <DialogFooter className="px-6 py-4 border-t bg-background shrink-0 flex items-center justify-between sm:justify-end gap-3">
                    {step === 1 ? (
                        <>
                            <Button variant="ghost" onClick={() => handleClose(false)}>Hủy</Button>
                            <Button onClick={handlePreview} disabled={!file || loading} className="min-w-[140px] gap-2">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutGrid className="w-4 h-4" />}
                                Xem trước
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => { setStep(1); setFile(null); setErrorMessage(null); }}>
                                Chọn file khác
                            </Button>
                            <Button 
                                onClick={handleProcess} 
                                disabled={loading || selectedCount === 0} 
                                className="min-w-[180px] bg-green-600 hover:bg-green-700 text-white gap-2 shadow-md hover:shadow-lg transition-all"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Thực hiện Import ({selectedCount})
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ImportTopicDialog;