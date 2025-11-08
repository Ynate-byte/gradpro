import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from "sonner";
import { Download, UploadCloud, FileText, CheckCircle, XCircle, Loader2, ArrowRight, ArrowLeft, Plus, Trash2, Combine, Wand2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyzePlanImport, previewPlanImport, processPlanImport } from '@/api/thesisPlanService';
import { getChuyenNganhs, getRoles } from '@/api/userService';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from "@/components/ui/badge";

// ----- [SỬA LỖI] Khai báo hằng số animation bị thiếu -----
const motionVariants = {
    hidden: { x: 30, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { x: -30, opacity: 0, transition: { duration: 0.2, ease: "easeInOut" } },
};
// ----- [KẾT THÚC SỬA LỖI] -----

/**
 * Component hiển thị Progress Bar (Step Indicator)
 */
const StepIndicator = ({ currentStep }) => {
    const steps = [
        { step: 1, title: "Tải file", icon: UploadCloud },
        { step: 2, title: "Ánh xạ cột", icon: FileText },
        { step: 3, title: "Xem trước", icon: CheckCircle },
        { step: 4, title: "Hoàn tất", icon: CheckCircle },
    ];
    return (
        <div className="flex justify-between items-center w-full mb-6 relative">
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

// --- GIAI ĐOẠN 1: TẢI FILE ---
const Step1Upload = ({ onFileAccepted }) => {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv'],
        },
        multiple: false
    });

    const handleNext = () => {
        if (!file) {
            toast.error("Vui lòng chọn hoặc kéo thả một file.");
            return;
        }
        onFileAccepted(file, setIsLoading);
    };

    return (
        <div className="flex-grow min-h-0 flex flex-col justify-between">
            <div className="p-4 flex flex-col items-center justify-center">
                <Button 
                    type="button" 
                    variant="outline" 
                    className="mb-6 w-full max-w-sm"
                    onClick={() => toast.info("Tính năng tải file mẫu sẽ được cập nhật sau.")}
                >
                    <Download className="mr-2 h-4 w-4" /> Tải file mẫu (ma_dinh_danh)
                </Button>
                <div
                    {...getRootProps()}
                    className={cn(
                        "mt-4 w-full h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors",
                        isDragActive ? 'border-primary bg-primary/10' : file ? 'border-green-500 bg-green-50/50' : 'border-border'
                    )}
                >
                    <input {...getInputProps()} disabled={isLoading}/>
                    <UploadCloud className={cn("h-12 w-12", file ? 'text-green-600' : 'text-muted-foreground')} />
                    {file ? (
                        <p className="mt-4 font-semibold text-primary">{file.name}</p>
                    ) : (
                        <p className="mt-4 text-muted-foreground text-center">Kéo thả file vào đây, hoặc nhấn để chọn file<br/>(.xlsx, .xls, .csv)</p>
                    )}
                </div>
                <div className="text-xs text-muted-foreground p-4 mt-4 bg-muted/50 rounded-lg max-w-md w-full">
                    <Info className="h-4 w-4 inline-block mr-2 text-primary" />
                    Hệ thống được thiết kế để tự động bỏ qua 9 dòng tiêu đề đầu tiên
                    (dựa trên file mẫu <span className="font-medium">"KHÓA LUẬN CỬ NHÂN.xls"</span>) và đọc header từ dòng thứ 10.
                </div>
            </div>
            <DialogFooter className="p-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => document.getElementById('dialog-close-import-wizard')?.click()}>Hủy</Button>
                <Button onClick={handleNext} disabled={!file || isLoading} className="min-w-[120px]">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Phân tích file"}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
            </DialogFooter>
        </div>
    );
};

// --- GIAI ĐOẠN 2: ÁNH XẠ CỘT ---
const Step2Mapping = ({ onBack, onComplete, analyzeResult, auxData }) => {
    const [isLoading, setIsLoading] = useState(false);
    
    // --- State cho Mapping ---
    const [mssvCol, setMssvCol] = useState(analyzeResult.detectedHeaders.find(h => h.toLowerCase().includes('mã sv')) || '');
    const [hoTenCols, setHoTenCols] = useState(
        analyzeResult.detectedHeaders.includes('Họ Và Tên') && analyzeResult.detectedHeaders.includes('(Cột 3)')
        ? ['Họ Và Tên', '(Cột 3)']
        : []
    );
    const [ngaySinhCol, setNgaySinhCol] = useState(analyzeResult.detectedHeaders.find(h => h.toLowerCase().includes('ng/sinh')) || '');
    const [tenLopCol, setTenLopCol] = useState(analyzeResult.detectedHeaders.find(h => h.toLowerCase().includes('tên lớp')) || '');
    
    const [nienKhoaSource, setNienKhoaSource] = useState('ten_lop');
    const [nienKhoaValue, setNienKhoaValue] = useState(analyzeResult.detectedHeaders.find(h => h.toLowerCase().includes('tên lớp')) || '');
    const [nienKhoaPrefix, setNienKhoaPrefix] = useState('K');
    const [nienKhoaLength, setNienKhoaLength] = useState(2);

    const [defaultChuyenNganh, setDefaultChuyenNganh] = useState('');
    const [defaultHeDaoTao, setDefaultHeDaoTao] = useState('Cử nhân');
    const svRoleId = auxData.roles.find(r => r.TEN_VAITRO === 'Sinh viên')?.ID_VAITRO || null;

    const addHoTenCol = () => setHoTenCols([...hoTenCols, null]); 
    const updateHoTenCol = (index, value) => {
        const newCols = [...hoTenCols];
        newCols[index] = value;
        setHoTenCols(newCols);
    };
    const removeHoTenCol = (index) => setHoTenCols(hoTenCols.filter((_, i) => i !== index));

    const handleSubmit = () => {
        if (!mssvCol) { toast.error("Vui lòng ánh xạ cột 'Mã Định Danh (MSSV)'."); return; }
        if (hoTenCols.length === 0 || hoTenCols.some(c => c === null || c === '')) { 
            toast.error("Vui lòng chọn đủ các cột cho 'Họ Tên'."); return; 
        }
        if (nienKhoaSource === 'default' && !nienKhoaValue) { toast.error("Vui lòng nhập giá trị 'Niên Khóa' mặc định."); return; }
        if (nienKhoaSource === 'ten_lop' && !nienKhoaValue) { toast.error("Vui lòng chọn cột 'Tên lớp' để trích xuất Niên Khóa."); return; }
        if (!defaultChuyenNganh) { toast.error("Vui lòng chọn 'Chuyên Ngành' mặc định."); return; }
        if (!defaultHeDaoTao) { toast.error("Vui lòng chọn 'Hệ Đào Tạo' mặc định."); return; }
        if (!svRoleId) { toast.error("Không tìm thấy vai trò 'Sinh viên' trong hệ thống."); return; }

        const mapping = {
            ma_dinh_danh: mssvCol,
            ho_ten: hoTenCols,
            ngay_sinh: ngaySinhCol,
            ten_lop: tenLopCol,
            nien_khoa: {
                source: nienKhoaSource,
                value: nienKhoaValue,
                prefix: nienKhoaPrefix,
                length: nienKhoaLength,
            }
        };
        const defaults = {
            ID_CHUYENNGANH: defaultChuyenNganh,
            HEDAOTAO: defaultHeDaoTao,
            ID_VAITRO: svRoleId,
        };
        
        onComplete(mapping, defaults, setIsLoading);
    };

    return (
        <div className="flex-grow min-h-0 flex flex-col justify-between">
            <ScrollArea className="flex-grow">
                {/* THAY ĐỔI CHỈNH SỬA: 2 CỘT CÓ THANH CUỘN RIÊNG */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                    {/* CỘT 1: ÁNH XẠ & QUY TẮC - CÓ THANH CUỘN DỌC */}
                    <ScrollArea className="h-[600px] pr-4">
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle>1. Ánh xạ Cột (Mapping)</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <MappingRow label="Mã Định Danh (MSSV) *" headers={analyzeResult.detectedHeaders} value={mssvCol} onChange={setMssvCol} />
                                    <MappingRowMulti label="Họ Đệm và Tên *" headers={analyzeResult.detectedHeaders} values={hoTenCols} onAdd={addHoTenCol} onUpdate={updateHoTenCol} onRemove={removeHoTenCol} />
                                    <MappingRow label="Ngày Sinh" headers={analyzeResult.detectedHeaders} value={ngaySinhCol} onChange={setNgaySinhCol} />
                                    <MappingRow label="Tên Lớp" headers={analyzeResult.detectedHeaders} value={tenLopCol} onChange={setTenLopCol} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>2. Quy tắc Niên Khóa (vd: K13)</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <Select value={nienKhoaSource} onValueChange={setNienKhoaSource}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ten_lop">Trích xuất từ cột 'Tên Lớp'</SelectItem>
                                            <SelectItem value="default">Sử dụng giá trị mặc định</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {nienKhoaSource === 'ten_lop' ? (
                                        <div className="space-y-2">
                                            <Label>Cột nguồn</Label>
                                            <Select value={nienKhoaValue} onValueChange={setNienKhoaValue}>
                                                <SelectTrigger><SelectValue placeholder="Chọn cột..." /></SelectTrigger>
                                                <SelectContent>{analyzeResult.detectedHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <div className="flex items-center gap-2">
                                                <Input value={nienKhoaPrefix} onChange={e => setNienKhoaPrefix(e.target.value)} placeholder="Tiền tố (vd: K)" className="w-24"/>
                                                <Input type="number" value={nienKhoaLength} onChange={e => setNienKhoaLength(Number(e.target.value))} placeholder="Độ dài (vd: 2)" className="w-24"/>
                                                <span className="text-sm text-muted-foreground">ký tự đầu.</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <Input value={nienKhoaValue} onChange={e => setNienKhoaValue(e.target.value)} placeholder="Nhập giá trị (vd: K13)" />
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>3. Giá trị Mặc định (Khi tạo mới)</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <Select value={defaultChuyenNganh} onValueChange={setDefaultChuyenNganh}>
                                        <Label>Chuyên Ngành *</Label>
                                        <SelectTrigger><SelectValue placeholder="Chọn chuyên ngành..." /></SelectTrigger>
                                        <SelectContent>{auxData.chuyenNganhs.map(cn => <SelectItem key={cn.ID_CHUYENNGANH} value={String(cn.ID_CHUYENNGANH)}>{cn.TEN_CHUYENNGANH}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={defaultHeDaoTao} onValueChange={setDefaultHeDaoTao}>
                                        <Label>Hệ Đào tạo *</Label>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Cử nhân">Cử nhân</SelectItem>
                                            <SelectItem value="Kỹ sư">Kỹ sư</SelectItem>
                                            <SelectItem value="Thạc sỹ">Thạc sỹ</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </CardContent>
                            </Card>
                        </div>
                    </ScrollArea>

                    {/* CỘT 2: XEM TRƯỚC - CÓ THANH CUỘN DỌC */}
                    <div className="space-y-3 flex flex-col h-[600px]">
                        <Label className="text-base">Xem trước File (5 Dòng đầu)</Label>
                        <ScrollArea className="flex-1 border rounded-md">
                            <Table className="text-xs">
                                <TableHeader className="sticky top-0 bg-muted">
                                    <TableRow>
                                        {analyzeResult.detectedHeaders.map((h, i) => <TableHead key={`${h}-${i}`}>{h}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analyzeResult.previewData.map((row, i) => (
                                        <TableRow key={`row-${i}`}>
                                            {row.map((cell, j) => <TableCell key={`cell-${i}-${j}`}>{cell}</TableCell>)}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter className="p-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading} className="min-w-[120px]">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Xem trước"}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
            </DialogFooter>
        </div>
    );
};

// Component con cho Giai đoạn 2
const MappingRow = ({ label, headers, value, onChange }) => (
    <div className="space-y-2">
        <Label>{label}</Label>
        <Select 
            value={value || "__IGNORE__"} 
            onValueChange={(val) => onChange(val === "__IGNORE__" ? "" : val)}
        >
            <SelectTrigger><SelectValue placeholder="Chọn cột từ file..." /></SelectTrigger>
            <SelectContent>
                <SelectItem value="__IGNORE__">-- Bỏ qua --</SelectItem>
                {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
        </Select>
    </div>
);

const MappingRowMulti = ({ label, headers, values, onAdd, onUpdate, onRemove }) => (
    <div className="space-y-2">
        <Label>{label}</Label>
        {values.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
                {index > 0 && <Combine className="h-4 w-4 text-muted-foreground shrink-0" />}
                <Select 
                    value={value || "__IGNORE__"} 
                    onValueChange={(v) => onUpdate(index, v === "__IGNORE__" ? null : v)} 
                    className="flex-grow"
                >
                    <SelectTrigger><SelectValue placeholder="Chọn cột..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__IGNORE__">-- Bỏ qua --</SelectItem>
                        {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)} className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={onAdd} className="w-full border-dashed">
            <Plus className="mr-2 h-4 w-4" /> Ghép thêm cột
        </Button>
    </div>
);

// --- GIAI ĐOẠN 3: XEM TRƯỚC (PREVIEW) ---
const Step3Preview = ({ onBack, onComplete, previewResult, defaults }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = () => {
        onComplete(previewResult.validRows, defaults, setIsLoading);
    };

    const totalValid = previewResult.validRows.length;
    const totalInvalid = previewResult.invalidRows.length;
    const totalIgnored = previewResult.ignoredRows.length;

    const renderRow = (row, index, isError = false) => (
        <TableRow key={index} className={isError ? "bg-red-50/50" : ""}>
            <TableCell className="text-xs">{row.data.row_index}</TableCell>
            <TableCell>{row.data.HODEM_VA_TEN}</TableCell>
            <TableCell>{row.data.MA_DINHDANH}</TableCell>
            <TableCell className="text-xs">{isError ? <span className="text-destructive">{row.error}</span> : (
                row.action === 'create_and_link' ? 
                <Badge variant="outline" className="text-green-600 border-green-400"><Plus className="h-3 w-3 mr-1"/>Tạo mới</Badge> : 
                <Badge variant="secondary">Liên kết</Badge>
            )}</TableCell>
        </TableRow>
    );

    return (
        <div className="flex-grow min-h-0 flex flex-col">
            <div className="p-6 space-y-4 flex-grow min-h-0 flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <CheckCircle className="h-8 w-8 text-green-600 shrink-0" />
                            <div>
                                <p className="text-2xl font-bold">{totalValid}</p>
                                <p className="text-sm font-medium text-green-700 dark:text-green-300">Hợp lệ (Sẽ được import)</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Info className="h-8 w-8 text-yellow-600 shrink-0" />
                            <div>
                                <p className="text-2xl font-bold">{totalIgnored}</p>
                                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Bỏ qua (Đã tồn tại)</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <XCircle className="h-8 w-8 text-red-600 shrink-0" />
                            <div>
                                <p className="text-2xl font-bold">{totalInvalid}</p>
                                <p className="text-sm font-medium text-red-700 dark:text-red-300">Lỗi (Sẽ bị hủy)</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                <Tabs defaultValue="valid" className="flex-grow min-h-0 flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="valid">Hợp lệ ({totalValid})</TabsTrigger>
                        <TabsTrigger value="invalid">Lỗi ({totalInvalid})</TabsTrigger>
                        <TabsTrigger value="ignored">Bỏ qua ({totalIgnored})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="valid" className="flex-grow min-h-0 mt-2">
                        <ScrollArea className="h-[400px] border rounded-md">
                            <Table><TableHeader><TableRow><TableHead>Dòng</TableHead><TableHead>Họ Tên</TableHead><TableHead>MSSV</TableHead><TableHead>Hành động</TableHead></TableRow></TableHeader>
                            <TableBody>{previewResult.validRows.map((row, i) => renderRow(row, i))}</TableBody></Table>
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="invalid" className="flex-grow min-h-0 mt-2">
                        <ScrollArea className="h-[400px] border rounded-md">
                            <Table><TableHeader><TableRow><TableHead>Dòng</TableHead><TableHead>Họ Tên</TableHead><TableHead>MSSV</TableHead><TableHead>Lỗi</TableHead></TableRow></TableHeader>
                            <TableBody>{previewResult.invalidRows.map((row, i) => renderRow(row, i, true))}</TableBody></Table>
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="ignored" className="flex-grow min-h-0 mt-2">
                        <ScrollArea className="h-[400px] border rounded-md">
                            <Table><TableHeader><TableRow><TableHead>Dòng</TableHead><TableHead>Họ Tên</TableHead><TableHead>MSSV</TableHead><TableHead>Lý do</TableHead></TableRow></TableHeader>
                            <TableBody>{previewResult.ignoredRows.map((row, i) => (
                                 <TableRow key={i}><TableCell className="text-xs">{row.data.row_index}</TableCell><TableCell>{row.data.HODEM_VA_TEN}</TableCell><TableCell>{row.data.MA_DINHDANH}</TableCell><TableCell className="text-xs text-muted-foreground">{row.reason}</TableCell></TableRow>
                            ))}</TableBody></Table>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>
            <DialogFooter className="p-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading || totalValid === 0} className="min-w-[150px]">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Xác nhận Import ({totalValid})
                </Button>
            </DialogFooter>
        </div>
    );
};

/**
 * Component Dialog chính cho Import Wizard
 */
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
            setStep(1);
            setFile(null);
            setAnalyzeResult(null);
            setMapping(null);
            setDefaults(null);
            setPreviewResult(null);
        }, 300);
    };

    const handleFileAccepted = async (file, setIsLoading) => {
        setIsLoading(true);
        try {
            const data = await analyzePlanImport(plan.ID_KEHOACH, file);
            setFile(file);
            setAnalyzeResult(data);
            setStep(2);
        } catch (error) {
            console.error("Lỗi khi phân tích file:", error);
            toast.error(error.response?.data?.message || "Không thể phân tích file.");
        } finally {
            setIsLoading(false);
        }
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

    const handlePreview = async (mappingConfig, defaultsConfig, setIsLoading) => {
        setIsLoading(true);
        try {
            const data = await previewPlanImport(
                plan.ID_KEHOACH, 
                file, 
                mappingConfig, 
                defaultsConfig,
                analyzeResult.headerRowIndex,
                analyzeResult.dataRowStartIndex
            );
            setMapping(mappingConfig);
            setDefaults(defaultsConfig);
            setPreviewResult(data);
            setStep(3);
        } catch (error) {
            console.error("Lỗi khi xem trước:", error);
            toast.error(error.response?.data?.message || "Lỗi khi xem trước dữ liệu.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleProcess = async (validRows, defaultsConfig, setIsLoading) => {
    setIsLoading(true);

    // === LOG ĐỂ DEBUG ===
    console.log('Sending validRows to backend:', validRows);
    const invalidRows = validRows.filter(row => !row.data || typeof row.data !== 'object');
    if (invalidRows.length > 0) {
        console.error('Some rows missing "data":', invalidRows);
        toast.error('Dữ liệu bị lỗi. Vui lòng thử lại.');
        setIsLoading(false);
        return;
    }

    try {
        const result = await processPlanImport(plan.ID_KEHOACH, validRows, defaultsConfig);
        toast.success(result.message, { description: result.description });
        onSuccess();
        handleClose();
    } catch (error) {
        console.error("Import failed:", error);
        const msg = error.response?.data?.message || "Import thất bại. Vui lòng kiểm tra log.";
        toast.error(msg);
    } finally {
        setIsLoading(false);
    }
};

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className={cn(
                "flex flex-col transition-all duration-300 ease-in-out p-0 max-h-[90vh]",
                step === 1 ? 'sm:max-w-lg' : 'sm:max-w-6xl'
            )}>
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="text-xl font-bold">Import Sinh viên vào Kế hoạch</DialogTitle>
                    <DialogDescription>
                        Trình hướng dẫn {step}/4: {
                            step === 1 ? "Tải file dữ liệu" :
                            step === 2 ? "Ánh xạ cột & Quy tắc" :
                            step === 3 ? "Xem trước & Xác thực" : "Hoàn tất"
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-grow min-h-0 flex flex-col">
                    <div className="px-6 pt-6">
                        <StepIndicator currentStep={step} />
                        <Separator className="mb-2" />
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div key="step1" variants={motionVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow min-h-0 flex flex-col">
                                <Step1Upload onFileAccepted={handleFileAccepted} />
                            </motion.div>
                        )}
                        
                        {step === 2 && (
                            <motion.div key="step2" variants={motionVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow min-h-0 flex flex-col">
                                {isLoadingAux ? (
                                    <div className="flex-grow flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                                ) : (
                                    <Step2Mapping
                                        analyzeResult={analyzeResult}
                                        auxData={auxData}
                                        onBack={() => { setStep(1); setAnalyzeResult(null); setFile(null); }}
                                        onComplete={handlePreview}
                                    />
                                )}
                            </motion.div>
                        )}
                        
                        {step === 3 && (
                             <motion.div key="step3" variants={motionVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow min-h-0 flex flex-col">
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
                
                <DialogClose id="dialog-close-import-wizard" className="hidden"/>
            </DialogContent>
        </Dialog>
    );
}