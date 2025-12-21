import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from "sonner";
import {
    Download, UploadCloud, FileText, CheckCircle, XCircle,
    Loader2, ArrowRight, ArrowLeft, Plus, Trash2, Combine,
    Wand2, Info, AlertTriangle, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyzePlanImport, previewPlanImport, processPlanImport } from '@/api/thesisPlanService';
import { getChuyenNganhs, getRoles } from '@/api/userService';

// UI Components
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

// --- CONSTANTS & HELPERS ---

const motionVariants = {
    hidden: { x: 20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { x: -20, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
};

const guessColumn = (headers, keywords) => {
    const lowerHeaders = headers.map(h => h.toLowerCase());
    for (const keyword of keywords) {
        const index = lowerHeaders.findIndex(h => h.includes(keyword.toLowerCase()));
        if (index !== -1) return headers[index];
    }
    return '';
};

// --- SUB-COMPONENTS ---

const StepIndicator = ({ currentStep }) => {
    const steps = [
        { step: 1, title: "Tải file", icon: UploadCloud },
        { step: 2, title: "Ánh xạ", icon: FileText },
        { step: 3, title: "Kiểm tra", icon: CheckCircle },
        { step: 4, title: "Xong", icon: CheckCircle },
    ];
    return (
        <div className="flex justify-between items-center w-full mb-6 relative px-8">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0" />
            {steps.slice(0, 3).map(({ step, title, icon: Icon }) => (
                <div key={step} className="flex flex-col items-center z-10 relative bg-background px-2">
                    <div
                        className={cn(
                            "flex items-center justify-center h-8 w-8 rounded-full border-2 transition-all duration-300",
                            currentStep === step
                                ? "bg-primary border-primary text-primary-foreground shadow-md scale-110"
                                : currentStep > step
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "bg-muted border-muted-foreground/30 text-muted-foreground"
                        )}
                    >
                        {currentStep > step ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <p
                        className={cn(
                            "text-xs font-medium mt-2 absolute top-8 w-24 text-center",
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

// --- STEP 1: UPLOAD ---
const Step1Upload = ({ onFileAccepted }) => {
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) setFiles(acceptedFiles);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
        },
        multiple: true
    });

    const handleNext = async () => {
        if (files.length === 0) {
            toast.error("Vui lòng chọn file.");
            return;
        }
        setIsLoading(true);
        await onFileAccepted(files[0]);
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col h-full justify-center items-center p-6 space-y-6">
            <div
                {...getRootProps()}
                className={cn(
                    "w-full max-w-lg h-56 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:bg-muted/50",
                    isDragActive ? 'border-primary bg-primary/5 scale-105' : files.length > 0 ? 'border-green-500 bg-green-50/30' : 'border-muted-foreground/25'
                )}
            >
                <input {...getInputProps()} disabled={isLoading} />
                <div className={cn("p-4 rounded-full mb-3 transition-colors", files.length > 0 ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary")}>
                    {files.length > 0 ? <FileText className="h-8 w-8" /> : <UploadCloud className="h-8 w-8" />}
                </div>
                {files.length > 0 ? (
                    <div className="text-center w-full px-8">
                        <p className="font-semibold text-foreground text-sm truncate">{files[0].name}</p>
                        <p className="text-xs text-muted-foreground">{(files[0].size / 1024).toFixed(1)} KB</p>
                        {files.length > 1 && <Badge variant="secondary" className="mt-2">+{files.length - 1} file khác</Badge>}
                        <Button variant="ghost" size="sm" className="mt-2 h-6 text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setFiles([]); }}>
                            Xóa file
                        </Button>
                    </div>
                ) : (
                    <div className="text-center space-y-1">
                        <p className="text-base font-medium">Kéo thả file Excel vào đây</p>
                        <p className="text-xs text-muted-foreground">hoặc nhấn để chọn file (.xlsx, .xls)</p>
                    </div>
                )}
            </div>

            <Alert className="max-w-lg bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-300 text-sm font-semibold">Lưu ý định dạng file</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400 text-xs mt-1">
                    Hệ thống sẽ tự động bỏ qua 9 dòng đầu tiên và bắt đầu đọc dữ liệu từ <strong>dòng thứ 10</strong>.
                </AlertDescription>
            </Alert>

            <div className="w-full max-w-lg flex justify-end">
                <Button onClick={handleNext} disabled={files.length === 0 || isLoading} className="w-full sm:w-auto shadow-md">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Tiếp tục"}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
};

// --- COMPONENT MAPPING ROWS ---

const MappingRow = ({ label, headers, value, onChange, placeholder, required = false }) => (
    <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
            {label}
            {required && <span className="text-red-500 text-[10px] bg-red-50 px-1 rounded">Bắt buộc</span>}
        </Label>
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-9 text-sm bg-background border-input shadow-sm">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="__IGNORE__" className="text-muted-foreground italic">-- Bỏ qua --</SelectItem>
                {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
        </Select>
    </div>
);

const MappingRowMulti = ({ label, headers, values, onAdd, onUpdate, onRemove }) => (
    <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground">{label} <span className="text-red-500">*</span></Label>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onAdd}
                className="h-5 text-[10px] text-blue-600 hover:text-blue-700 px-2 bg-blue-50 hover:bg-blue-100"
            >
                <Plus className="h-3 w-3 mr-1" /> Thêm cột
            </Button>
        </div>

        <div className="space-y-2">
            {values.map((value, index) => (
                <div key={index} className="flex items-center gap-2">
                    <div className="h-8 w-6 flex items-center justify-center bg-muted rounded text-[10px] font-mono text-muted-foreground shrink-0">
                        {index + 1}
                    </div>
                    <Select
                        value={value || "__IGNORE__"}
                        onValueChange={(v) => onUpdate(index, v === "__IGNORE__" ? null : v)}
                    >
                        <SelectTrigger className="h-8 text-xs bg-white focus:ring-1 focus:ring-primary">
                            <SelectValue placeholder="Chọn cột..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__IGNORE__">-- Bỏ qua --</SelectItem>
                            {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {values.length > 1 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemove(index)}
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ))}
        </div>
        <div className="text-[10px] text-muted-foreground italic mt-1">
            * Hệ thống sẽ tự động ghép các cột này thành "Họ và Tên".
        </div>
    </div>
);

// --- STEP 2: MAPPING ---
const Step2Mapping = ({ onBack, onComplete, analyzeResult, auxData }) => {
    const headers = analyzeResult.detectedHeaders;

    const [mssvCol, setMssvCol] = useState('');
    const [hoTenCols, setHoTenCols] = useState([]);
    const [ngaySinhCol, setNgaySinhCol] = useState('');
    const [tenLopCol, setTenLopCol] = useState('');
    const [nienKhoaSource, setNienKhoaSource] = useState('ten_lop');
    const [nienKhoaValue, setNienKhoaValue] = useState('');
    const [nienKhoaPrefix, setNienKhoaPrefix] = useState('K');
    const [nienKhoaLength, setNienKhoaLength] = useState(2);
    const [defaultChuyenNganh, setDefaultChuyenNganh] = useState('');
    const [defaultHeDaoTao, setDefaultHeDaoTao] = useState('Cử nhân');
    const [isLoading, setIsLoading] = useState(false);

    // Auto-mapping
    useEffect(() => {
        // [CẬP NHẬT] Logic ưu tiên gán cứng cột nếu file có đủ số lượng cột
        if (headers.length >= 6) {
            setMssvCol(headers[1]);             // Cột 1: MSSV (Bỏ qua cột 0 là STT)
            setHoTenCols([headers[2], headers[3]]); // Cột 2 & 3: Họ, Tên
            setNgaySinhCol(headers[4]);         // Cột 4: Ngày sinh
            setTenLopCol(headers[5]);           // Cột 5: Lớp
        } 
        else {
            // Fallback nếu file lạ
            setMssvCol(guessColumn(headers, ['mã sv', 'mssv', 'ma_sv', 'code']));

            const ho = guessColumn(headers, ['họ', 'họ đệm']);
            const ten = guessColumn(headers, ['tên']);
            const hoVaTen = guessColumn(headers, ['họ và tên', 'họ tên', 'fullname']);

            if (ho && ten) { setHoTenCols([ho, ten]); }
            else if (hoVaTen) { setHoTenCols([hoVaTen]); }
            else {
                const col2 = headers.length > 1 ? headers[1] : '';
                const col3 = headers.length > 2 ? headers[2] : '';
                if (col2 && col3) setHoTenCols([col2, col3]);
                else if (col2) setHoTenCols([col2]);
                else setHoTenCols(['']);
            }

            setNgaySinhCol(guessColumn(headers, ['ngày sinh', 'ngaysinh', 'dob']));
            setTenLopCol(guessColumn(headers, ['lớp', 'tên lớp', 'class']));
        }

        if (auxData.chuyenNganhs.length > 0 && !defaultChuyenNganh) {
            setDefaultChuyenNganh(String(auxData.chuyenNganhs[0].ID_CHUYENNGANH));
        }
    }, [headers, auxData.chuyenNganhs, defaultChuyenNganh]);

    const updateHoTenCol = (idx, val) => {
        const newCols = [...hoTenCols];
        newCols[idx] = val;
        setHoTenCols(newCols);
    };

    const handleSubmit = async () => {
        if (!mssvCol) { toast.error("Chưa chọn cột Mã SV"); return; }
        if (hoTenCols.length === 0 || hoTenCols.some(c => !c)) { toast.error("Chưa chọn cột Họ Tên"); return; }
        if (!defaultChuyenNganh) { toast.error("Chưa chọn chuyên ngành mặc định"); return; }

        const svRoleId = auxData.roles.find(r => r.TEN_VAITRO === 'Sinh viên')?.ID_VAITRO;
        if (!svRoleId) { toast.error("Lỗi hệ thống: Role Sinh viên không tồn tại"); return; }

        let finalNienKhoaValue = nienKhoaValue;
        if (nienKhoaSource === 'ten_lop') {
            if (!tenLopCol) { toast.error("Vui lòng chọn cột Tên Lớp để lấy niên khóa"); return; }
            finalNienKhoaValue = tenLopCol;
        } else if (!nienKhoaValue) {
            toast.error("Vui lòng nhập niên khóa mặc định"); return;
        }

        const mapping = {
            ma_dinh_danh: mssvCol,
            ho_ten: hoTenCols,
            ngay_sinh: ngaySinhCol,
            ten_lop: tenLopCol,
            nien_khoa: { source: nienKhoaSource, value: finalNienKhoaValue, prefix: nienKhoaPrefix, length: nienKhoaLength }
        };
        const defaults = {
            ID_CHUYENNGANH: defaultChuyenNganh,
            HEDAOTAO: defaultHeDaoTao,
            ID_VAITRO: svRoleId,
        };

        setIsLoading(true);
        await onComplete(mapping, defaults, setIsLoading);
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex flex-col lg:flex-row h-full overflow-hidden">

                {/* CỘT TRÁI: CẤU HÌNH */}
                <div className="w-full lg:w-[400px] flex-shrink-0 border-b lg:border-b-0 lg:border-r flex flex-col bg-muted/10">
                    <ScrollArea className="flex-1">
                        <div className="p-5 space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wide">
                                    <Wand2 className="h-4 w-4" /> 1. Ánh xạ dữ liệu
                                </div>
                                <div className="bg-card border rounded-lg p-4 space-y-4 shadow-sm">
                                    <MappingRow
                                        label="Mã Sinh Viên (MSSV) [Cột 1]"
                                        headers={headers} value={mssvCol} onChange={setMssvCol}
                                        placeholder="Chọn cột MSSV..." required
                                    />
                                    <Separator />
                                    <MappingRowMulti
                                        label="Họ và Tên [Cột 2 & 3]"
                                        headers={headers} values={hoTenCols}
                                        onAdd={() => setHoTenCols([...hoTenCols, ''])}
                                        onUpdate={updateHoTenCol}
                                        onRemove={(i) => setHoTenCols(hoTenCols.filter((_, idx) => idx !== i))}
                                    />
                                    <Separator />
                                    <div className="grid grid-cols-2 gap-3">
                                        <MappingRow label="Ngày sinh [Cột 4]" headers={headers} value={ngaySinhCol} onChange={setNgaySinhCol} placeholder="Chọn cột..." />
                                        <MappingRow label="Tên lớp [Cột 5]" headers={headers} value={tenLopCol} onChange={setTenLopCol} placeholder="Chọn cột..." />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wide">
                                    <Settings className="h-4 w-4" /> 2. Thiết lập chung
                                </div>
                                <div className="bg-card border rounded-lg p-4 space-y-4 shadow-sm">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-muted-foreground">Chuyên ngành mặc định <span className="text-red-500">*</span></Label>
                                        <Select value={defaultChuyenNganh} onValueChange={setDefaultChuyenNganh}>
                                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Chọn..." /></SelectTrigger>
                                            <SelectContent>
                                                {auxData.chuyenNganhs.map(cn => (
                                                    <SelectItem key={cn.ID_CHUYENNGANH} value={String(cn.ID_CHUYENNGANH)}>{cn.TEN_CHUYENNGANH}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-muted-foreground">Hệ đào tạo <span className="text-red-500">*</span></Label>
                                        <Select value={defaultHeDaoTao} onValueChange={setDefaultHeDaoTao}>
                                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {['Cử nhân', 'Kỹ sư', 'Thạc sỹ'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="bg-muted/40 p-3 rounded-md border space-y-3">
                                        <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                                            <Info className="h-3 w-3" /> Trích xuất Niên khóa
                                        </Label>
                                        <Select value={nienKhoaSource} onValueChange={setNienKhoaSource}>
                                            <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ten_lop">Tự động từ cột "Tên Lớp"</SelectItem>
                                                <SelectItem value="default">Nhập thủ công (Cố định)</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {nienKhoaSource === 'ten_lop' ? (
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="whitespace-nowrap">Lấy</span>
                                                <Input type="number" className="w-12 h-7 px-1 text-center bg-background text-xs" value={nienKhoaLength} onChange={e => setNienKhoaLength(Number(e.target.value))} />
                                                <span className="whitespace-nowrap">kí tự đầu, thêm</span>
                                                <Input className="w-12 h-7 px-1 text-center bg-background text-xs" value={nienKhoaPrefix} onChange={e => setNienKhoaPrefix(e.target.value)} placeholder="K" />
                                            </div>
                                        ) : (
                                            <Input className="h-8 text-xs bg-background" value={nienKhoaValue} onChange={e => setNienKhoaValue(e.target.value)} placeholder="VD: K13" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                {/* CỘT PHẢI: PREVIEW */}
                <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
                    <div className="p-4 border-b bg-muted/10 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                            <FileText className="h-4 w-4 text-blue-500" /> Dữ liệu file gốc (5 dòng đầu)
                        </div>
                        <Badge variant="outline" className="text-xs font-normal">
                            {headers.length} cột tìm thấy
                        </Badge>
                    </div>

                    <div className="flex-1 w-full overflow-hidden relative">
                        <ScrollArea className="h-full w-full">
                            <div className="min-w-max pb-4">
                                <Table>
                                    <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                                        <TableRow className="hover:bg-transparent border-b">
                                            {headers.map((h, i) => (
                                                <TableHead key={i} className="whitespace-nowrap text-xs font-bold h-9 px-4 border-r last:border-r-0 bg-muted/30 text-foreground">
                                                    {h}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analyzeResult.previewData.map((row, i) => (
                                            <TableRow key={i} className="hover:bg-muted/5 even:bg-muted/[0.02]">
                                                {row.map((cell, j) => (
                                                    <TableCell key={j} className="text-xs py-2 px-4 whitespace-nowrap border-r last:border-r-0 max-w-[200px] truncate text-muted-foreground" title={cell}>
                                                        {cell}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                </div>
            </div>

            <div className="flex justify-between px-6 py-4 border-t bg-background mt-auto shrink-0 z-20">
                <Button variant="outline" onClick={onBack} disabled={isLoading} className="h-9 text-sm">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
                </Button>
                
                {/* [ĐÃ SỬA LỖI Ở ĐÂY] Xóa tham chiếu countSelected, chỉ dùng isLoading */}
                <Button onClick={handleSubmit} disabled={isLoading} className="min-w-[140px] h-9 text-sm font-semibold">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Tiếp tục"}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
};

// --- STEP 3: PREVIEW ---
const Step3Preview = ({ onBack, onComplete, previewResult, defaults }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('valid');
    const [uncheckedIndices, setUncheckedIndices] = useState(new Set());

    const toggleRow = (index) => {
        setUncheckedIndices(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index); else next.add(index);
            return next;
        });
    };

    const toggleAll = () => {
        if (uncheckedIndices.size === 0) {
            const all = new Set(previewResult.validRows.map((_, i) => i));
            setUncheckedIndices(all);
        } else {
            setUncheckedIndices(new Set());
        }
    };

    const totalValid = previewResult.validRows.length;
    const countSelected = totalValid - uncheckedIndices.size;
    const totalInvalid = previewResult.invalidRows.length;
    const totalIgnored = previewResult.ignoredRows.length;

    const handleSubmit = async () => {
        const finalRows = previewResult.validRows.filter((_, i) => !uncheckedIndices.has(i));
        if (finalRows.length === 0) { toast.error("Vui lòng chọn ít nhất 1 dòng."); return; }

        setIsLoading(true);
        await onComplete(finalRows, defaults, setIsLoading);
        setIsLoading(false);
    };

    const renderRow = (row, index, isError = false) => (
        <TableRow key={index} className={cn(
            "border-b last:border-b-0",
            isError ? "bg-red-50/30 hover:bg-red-50/50" :
                uncheckedIndices.has(index) ? "opacity-50 bg-muted/20" : "hover:bg-green-50/30"
        )}>
            {!isError && activeTab === 'valid' && (
                <TableCell className="w-[40px] py-2 px-3">
                    <Checkbox checked={!uncheckedIndices.has(index)} onCheckedChange={() => toggleRow(index)} />
                </TableCell>
            )}
            <TableCell className="text-xs w-[40px] py-2 text-center text-muted-foreground px-2">{row.data.row_index}</TableCell>
            <TableCell className="text-xs font-mono py-2 px-3">{row.data.MA_DINHDANH || '-'}</TableCell>
            <TableCell className="text-xs py-2 font-medium px-3">{row.data.HODEM_VA_TEN || '-'}</TableCell>
            <TableCell className="text-xs py-2 px-3">
                {isError ? (
                    <span className="text-red-600 flex items-center gap-1 font-medium text-[11px]">
                        <XCircle className="h-3 w-3" /> {Object.values(row.error_details || {}).flat().join(', ') || row.error}
                    </span>
                ) : (
                    row.action === 'create_and_link' ?
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px] px-1.5 py-0 shadow-none">Tạo mới</Badge> :
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shadow-none">Liên kết</Badge>
                )}
            </TableCell>
        </TableRow>
    );

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Thống kê nhanh */}
            <div className="grid grid-cols-3 gap-4 px-6 pt-6 mb-4 shrink-0">
                <Card
                    className={cn("border cursor-pointer transition-all shadow-sm hover:shadow-md active:scale-[0.98]", activeTab === 'valid' ? "border-green-500 ring-1 ring-green-500/20 bg-green-50/30" : "hover:border-green-300")}
                    onClick={() => setActiveTab('valid')}
                >
                    <CardContent className="p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Hợp lệ</p>
                            <div className="flex items-baseline gap-1">
                                <p className="text-xl font-bold text-green-600">{countSelected}</p>
                                <span className="text-xs text-muted-foreground">/ {totalValid}</span>
                            </div>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><CheckCircle className="h-4 w-4" /></div>
                    </CardContent>
                </Card>

                <Card
                    className={cn("border cursor-pointer transition-all shadow-sm hover:shadow-md active:scale-[0.98]", activeTab === 'invalid' ? "border-red-500 ring-1 ring-red-500/20 bg-red-50/30" : "hover:border-red-300")}
                    onClick={() => setActiveTab('invalid')}
                >
                    <CardContent className="p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Lỗi</p>
                            <p className="text-xl font-bold text-red-600">{totalInvalid}</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><XCircle className="h-4 w-4" /></div>
                    </CardContent>
                </Card>

                <Card
                    className={cn("border cursor-pointer transition-all shadow-sm hover:shadow-md active:scale-[0.98]", activeTab === 'ignored' ? "border-yellow-500 ring-1 ring-yellow-500/20 bg-yellow-50/30" : "hover:border-yellow-300")}
                    onClick={() => setActiveTab('ignored')}
                >
                    <CardContent className="p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Bỏ qua</p>
                            <p className="text-xl font-bold text-yellow-600">{totalIgnored}</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center"><AlertTriangle className="h-4 w-4" /></div>
                    </CardContent>
                </Card>
            </div>

            {/* Bảng Chi tiết */}
            <div className="flex-1 flex flex-col px-6 pb-4 min-h-0 overflow-hidden">
                <div className="border rounded-lg flex flex-col bg-background h-full shadow-sm overflow-hidden">
                    <div className="p-2 bg-muted/30 border-b flex justify-between items-center shrink-0">
                        <span className="text-xs font-semibold ml-2 text-muted-foreground flex items-center gap-2">
                            {activeTab === 'valid' && <><CheckCircle className="h-3.5 w-3.5" /> Danh sách sẽ được Import</>}
                            {activeTab === 'invalid' && <><XCircle className="h-3.5 w-3.5" /> Dữ liệu lỗi cấu trúc/thiếu thông tin</>}
                            {activeTab === 'ignored' && <><Info className="h-3.5 w-3.5" /> Sinh viên đã có trong kế hoạch này</>}
                        </span>
                    </div>
                    <ScrollArea className="flex-1 w-full">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                                <TableRow className="hover:bg-transparent border-b">
                                    {activeTab === 'valid' && (
                                        <TableHead className="w-[40px] px-3">
                                            <Checkbox checked={uncheckedIndices.size === 0 && totalValid > 0} onCheckedChange={toggleAll} />
                                        </TableHead>
                                    )}
                                    <TableHead className="w-[40px] text-center text-xs font-bold h-9">#</TableHead>
                                    <TableHead className="text-xs font-bold h-9">Mã SV</TableHead>
                                    <TableHead className="text-xs font-bold h-9">Họ và Tên</TableHead>
                                    <TableHead className="text-xs font-bold h-9">{activeTab === 'valid' ? 'Hành động' : 'Ghi chú'}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeTab === 'valid' && previewResult.validRows.map((row, i) => renderRow(row, i))}
                                {activeTab === 'invalid' && previewResult.invalidRows.map((row, i) => renderRow(row, i, true))}
                                {activeTab === 'ignored' && previewResult.ignoredRows.map((row, i) => (
                                    <TableRow key={i} className="border-b last:border-b-0">
                                        <TableCell className="text-xs text-center py-2 px-2 text-muted-foreground">{row.data.row_index}</TableCell>
                                        <TableCell className="text-xs font-mono py-2 px-3">{row.data.MA_DINHDANH}</TableCell>
                                        <TableCell className="text-xs py-2 px-3">{row.data.HODEM_VA_TEN}</TableCell>
                                        <TableCell className="text-[11px] text-yellow-600 py-2 px-3">{row.reason}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </div>

            <div className="flex justify-between px-6 py-4 border-t bg-background mt-auto shrink-0 z-20">
                <Button variant="outline" onClick={onBack} disabled={isLoading} className="h-9 text-sm">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading || countSelected === 0} className="min-w-[140px] h-9 text-sm font-semibold">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Thực hiện Import
                </Button>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export function ImportWizardDialog({ isOpen, setIsOpen, onSuccess, plan }) {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [analyzeResult, setAnalyzeResult] = useState(null);
    const [mapping, setMapping] = useState(null);
    const [defaults, setDefaults] = useState(null);
    const [previewResult, setPreviewResult] = useState(null);
    const [auxData, setAuxData] = useState({ roles: [], chuyenNganhs: [] });
    const [isLoadingAux, setIsLoadingAux] = useState(false);

    const handleClose = () => {
        setIsOpen(false);
        setTimeout(() => {
            setStep(1); setFile(null); setAnalyzeResult(null);
            setMapping(null); setDefaults(null); setPreviewResult(null);
        }, 300);
    };

    useEffect(() => {
        if (isOpen && step === 1) {
            setIsLoadingAux(true);
            Promise.all([
                getChuyenNganhs().catch(() => []),
                getRoles().catch(() => [])
            ]).then(([chuyenNganhs, roles]) => {
                setAuxData({ chuyenNganhs, roles });
            }).finally(() => setIsLoadingAux(false));
        }
    }, [isOpen, step]);

    const handleFileAccepted = async (file) => {
        try {
            const data = await analyzePlanImport(plan.ID_KEHOACH, file);
            setFile(file);
            setAnalyzeResult(data);
            setStep(2);
        } catch (error) {
            toast.error(error.response?.data?.message || "Không thể phân tích file.");
        }
    };

    const handlePreview = async (mappingConfig, defaultsConfig, setIsLoadingCallback) => {
        if (typeof setIsLoadingCallback === 'function') setIsLoadingCallback(true);
        try {
            const data = await previewPlanImport(
                plan.ID_KEHOACH, file, mappingConfig, defaultsConfig,
                analyzeResult.headerRowIndex, analyzeResult.dataRowStartIndex
            );
            setMapping(mappingConfig);
            setDefaults(defaultsConfig);
            setPreviewResult(data);
            setStep(3);
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi xem trước dữ liệu.");
        } finally {
            if (typeof setIsLoadingCallback === 'function') setIsLoadingCallback(false);
        }
    };

    const handleProcess = async (validRows, defaultsConfig, setIsLoadingCallback) => {
            if (typeof setIsLoadingCallback === 'function') setIsLoadingCallback(true);
            const promise = processPlanImport(plan.ID_KEHOACH, validRows, defaultsConfig);

            toast.promise(promise, {
                loading: 'Đang đồng bộ dữ liệu vào hệ thống...',
                success: (data) => {
                    onSuccess();
                    handleClose();
                    if (typeof setIsLoadingCallback === 'function') setIsLoadingCallback(false);
                    return `${data.message} ${data.description || ''}`;
                },
                error: (error) => {
                    if (typeof setIsLoadingCallback === 'function') setIsLoadingCallback(false);
                    return error.response?.data?.message || "Import thất bại. Vui lòng thử lại.";
                }
            });
        };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className={cn(
                "flex flex-col transition-all duration-300 ease-in-out p-0 overflow-hidden bg-background",
                step === 1 ? 'sm:max-w-lg' : 'sm:max-w-5xl h-[85vh]'
            )}>
                <DialogHeader className="p-5 pb-3 border-b bg-muted/10 shrink-0">
                    <DialogTitle className="text-lg font-bold text-primary flex items-center gap-2">
                        <UploadCloud className="h-5 w-5" /> Import Sinh viên
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                         {step === 1 && "Bước 1/3: Tải file dữ liệu (.xlsx, .xls)"}
                         {step === 2 && "Bước 2/3: Cấu hình & Ánh xạ cột"}
                         {step === 3 && "Bước 3/3: Kiểm tra & Xác nhận"}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-grow min-h-0 flex flex-col relative bg-background">
                    {step > 1 && (
                        <div className="px-6 py-2 border-b">
                            <StepIndicator currentStep={step} />
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div key="step1" variants={motionVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow bg-background">
                                <Step1Upload onFileAccepted={handleFileAccepted} />
                            </motion.div>
                        )}
                        {step === 2 && (
                            <motion.div key="step2" variants={motionVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow flex flex-col overflow-hidden">
                                {isLoadingAux ? (
                                    <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                                ) : (
                                    <Step2Mapping
                                        analyzeResult={analyzeResult}
                                        auxData={auxData}
                                        onBack={() => { setStep(1); setFile(null); }}
                                        onComplete={handlePreview}
                                    />
                                )}
                            </motion.div>
                        )}
                        {step === 3 && (
                            <motion.div key="step3" variants={motionVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow flex flex-col overflow-hidden">
                                <Step3Preview
                                    previewResult={previewResult}
                                    defaults={defaults}
                                    onBack={() => setStep(2)}
                                    onComplete={handleProcess}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}