import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
// IMPORT CHUẨN TỪ CODE CŨ CỦA BẠN
import { getSubmissions, submitProduct } from '@/api/groupService';

import { 
  Loader2, UploadCloud, FileText, Link as LinkIcon, Send, History, 
  CheckCircle2, XCircle, Clock, Download, FileCode, ExternalLink, 
  FileWarning, Paperclip, Github, FileType, CheckCircle, ShieldCheck
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// --- 1. UI Component: File Item (Đẹp hơn code cũ nhưng logic hiển thị giữ nguyên) ---
const SubmissionFileItem = ({ file }) => {
  const isLink = file.LOAI_FILE.startsWith('Link');
  const isRejected = file.IS_REJECTED === 1 || file.IS_REJECTED === true;
  const Icon = file.LOAI_FILE === 'SourceCodeZIP' ? FileCode : (isLink ? ExternalLink : FileText);
  
  const labelMap = {
    BaoCaoPDF: 'Báo cáo PDF',
    SourceCodeZIP: 'Source Code',
    LinkDemo: 'Demo Link',
    LinkRepository: 'Git Repo',
  };

  return (
    <a
      href={file.url} target="_blank" rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 p-2 rounded-md border transition-all hover:shadow-sm group bg-card",
        isRejected 
          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20" 
          : "border-border hover:border-primary/50"
      )}
    >
      <div className={cn(
        "h-8 w-8 rounded flex items-center justify-center shrink-0 border",
        isRejected ? "bg-red-100 text-red-600 border-red-200" : "bg-muted text-muted-foreground border-border"
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
            <span className={cn("text-xs font-bold truncate", isRejected ? "text-red-600" : "text-foreground")}>
                {labelMap[file.LOAI_FILE] || file.LOAI_FILE}
            </span>
            {isRejected && <Badge variant="destructive" className="h-4 px-1 text-[9px]">Sửa</Badge>}
        </div>
        <p className="text-[10px] text-muted-foreground truncate opacity-80 group-hover:opacity-100">
           {isLink ? file.DUONG_DAN_HOAC_NOI_DUNG : file.TEN_FILE_GOC}
        </p>
      </div>
    </a>
  );
};

// --- 2. UI Component: Input Card (Wrapper đẹp cho Input File) ---
const FileInputCard = ({ id, label, icon: Icon, accept, onChange, selectedFile }) => (
    <div className="relative group">
        <Input 
            id={id} 
            type="file" 
            accept={accept} 
            className="hidden" 
            onChange={onChange} // Logic onChange từ code cũ truyền vào đây
        />
        <Label htmlFor={id} className={cn(
            "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer h-[64px]",
            selectedFile 
                ? "bg-primary/5 border-primary/50 ring-1 ring-primary/20" 
                : "bg-card border-border hover:border-primary/50 hover:bg-accent/50"
        )}>
            <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                selectedFile ? "bg-background text-primary shadow-sm" : "bg-muted text-muted-foreground"
            )}>
                <Icon className="h-5 w-5" />
            </div>
            
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground mb-0.5">{label}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                    {selectedFile ? selectedFile.name : "Nhấn để chọn file..."}
                </p>
            </div>

            {selectedFile && <div className="text-primary"><CheckCircle2 className="h-4 w-4" /></div>}
        </Label>
    </div>
);

const LinkInputCard = ({ id, label, icon: Icon, value, onChange, placeholder }) => (
    <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all h-[64px]",
        value ? "bg-primary/5 border-primary/50 ring-1 ring-primary/20" : "bg-card border-border hover:border-primary/50"
    )}>
        <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            value ? "bg-background text-primary shadow-sm" : "bg-muted text-muted-foreground"
        )}>
            <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground mb-0.5">{label}</p>
            <input 
                id={id}
                className="w-full bg-transparent text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/50 h-5"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                autoComplete="off"
            />
        </div>
        {value && <div className="text-primary"><CheckCircle2 className="h-4 w-4" /></div>}
    </div>
);

// --- 3. UI Component: Timeline Row (Thay thế SubmissionAttempt cũ) ---
const TimelineRow = ({ attempt, index, isLast }) => {
  const statusConfig = {
    'Đã xác nhận': { icon: CheckCircle2, color: 'text-emerald-600', border: 'border-emerald-200 bg-emerald-50' },
    'Yêu cầu nộp lại': { icon: XCircle, color: 'text-red-600', border: 'border-red-200 bg-red-50' },
    'Chờ xác nhận': { icon: Clock, color: 'text-blue-600', border: 'border-blue-200 bg-blue-50' },
  };
  const config = statusConfig[attempt.TRANGTHAI] || statusConfig['Chờ xác nhận'];
  const StatusIcon = config.icon;

  return (
    <div className="flex gap-3 relative">
        <div className="flex flex-col items-center">
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border shrink-0 z-10 bg-background", config.color)}>
                <StatusIcon className="w-3.5 h-3.5" />
            </div>
            {!isLast && <div className="w-px flex-1 bg-border my-1"></div>}
        </div>
        <div className="flex-1 pb-6">
            <div className="bg-card/50 border rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm border", config.border, config.color)}>
                            {attempt.TRANGTHAI}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            {format(parseISO(attempt.NGAY_NOP), "HH:mm dd/MM", { locale: vi })}
                        </span>
                    </div>
                </div>
                <div className="p-3 space-y-3">
                    {/* Hiển thị phản hồi Admin nếu có */}
                    {attempt.TRANGTHAI === 'Yêu cầu nộp lại' && attempt.PHANHOI_ADMIN && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            <p className="font-bold flex items-center gap-1 mb-1"><FileWarning className="w-3 h-3" /> Yêu cầu sửa:</p>
                            <p className="italic opacity-90">"{attempt.PHANHOI_ADMIN}"</p>
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-2">
                        {attempt.files.map(file => (
                            <SubmissionFileItem key={file.ID_FILE} file={file} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

// --- 4. Main Component (Logic GIỮ NGUYÊN từ code cũ) ---
export function SubmissionDialog({ isOpen, setIsOpen, phancong }) {
  const [files, setFiles] = useState({ BaoCaoPDF: null, SourceCodeZIP: null });
  const [links, setLinks] = useState({ LinkDemo: '', LinkRepository: '' });
  const phancongId = phancong?.ID_PHANCONG;
  const queryClient = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['submissions', phancongId],
    queryFn: () => getSubmissions(phancongId),
    enabled: !!phancongId && isOpen,
  });

  const submitMutation = useMutation({
    mutationFn: (formData) => submitProduct(phancongId, formData),
    onSuccess: (res) => {
      toast.success(res.message);
      setFiles({ BaoCaoPDF: null, SourceCodeZIP: null });
      setLinks({ LinkDemo: '', LinkRepository: '' });
      queryClient.invalidateQueries({ queryKey: ['submissions', phancongId] });
      queryClient.invalidateQueries({ queryKey: ['myGroupDetails'] });
      
      // Reset input values
      const inputPDF = document.getElementById('BaoCaoPDF');
      const inputZIP = document.getElementById('SourceCodeZIP');
      if(inputPDF) inputPDF.value = "";
      if(inputZIP) inputZIP.value = "";
    },
    onError: (error) => toast.error(error.response?.data?.message || "Nộp bài thất bại.")
  });

  // LOGIC CŨ: Hàm xử lý file change
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) setFiles(prev => ({ ...prev, [type]: file }));
  };

  // LOGIC CŨ: Hàm submit
  const handleSubmit = () => {
    if (!files.BaoCaoPDF && !files.SourceCodeZIP && !links.LinkDemo && !links.LinkRepository) {
      toast.error("Vui lòng nộp ít nhất 1 nội dung.");
      return;
    }
    const formData = new FormData();
    if (files.BaoCaoPDF) formData.append('BaoCaoPDF', files.BaoCaoPDF);
    if (files.SourceCodeZIP) formData.append('SourceCodeZIP', files.SourceCodeZIP);
    if (links.LinkDemo) formData.append('LinkDemo', links.LinkDemo);
    if (links.LinkRepository) formData.append('LinkRepository', links.LinkRepository);

    submitMutation.mutate(formData);
  };

  if (!phancong) return null;
  const latestSubmission = history[0];
  const canSubmit = phancong.TRANGTHAI === 'Đang thực hiện' && (!latestSubmission || latestSubmission.TRANGTHAI === 'Yêu cầu nộp lại');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* LAYOUT 100% HEIGHT - NO WINDOW SCROLL (DASHBOARD STYLE)
         Thay đổi lớn ở đây: Layout Dashboard nhưng Logic giữ nguyên
      */}
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border-border shadow-2xl focus:outline-none sm:rounded-2xl">
        
        {/* HEADER */}
        <DialogHeader className="h-14 px-5 border-b border-border bg-card flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <UploadCloud className="h-4 w-4" />
                </div>
                <div>
                    <DialogTitle className="text-base font-bold">Nộp sản phẩm</DialogTitle>
                    <p className="text-xs text-muted-foreground font-normal">{phancong.detai?.TEN_DETAI}</p>
                </div>
            </div>
            <div className="hidden sm:flex">
                {latestSubmission ? (
                    <Badge variant={latestSubmission.TRANGTHAI === 'Đã xác nhận' ? 'success' : 'outline'} className="text-xs">
                        {latestSubmission.TRANGTHAI}
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="text-xs">Chưa nộp bài</Badge>
                )}
            </div>
        </DialogHeader>

        {/* BODY (Split View) */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT: FORM (Fixed width 400px) */}
            <div className="w-[400px] border-r border-border bg-muted/10 flex flex-col shrink-0">
                <ScrollArea className="flex-1">
                    <div className="p-5 space-y-6">
                        {canSubmit ? (
                            <div className="animate-in fade-in duration-500 space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold flex items-center gap-2 mb-1 text-foreground">
                                        <div className="w-1 h-4 bg-primary rounded-full"></div>
                                        Gửi bài mới
                                    </h3>
                                    <p className="text-xs text-muted-foreground">Điền thông tin và tải file bên dưới.</p>
                                </div>

                                <div className="space-y-3">
                                    {/* Sử dụng UI Card nhưng gọi logic onChange cũ */}
                                    <FileInputCard 
                                        id="BaoCaoPDF" label="Báo cáo (PDF)" icon={FileType} accept=".pdf"
                                        selectedFile={files.BaoCaoPDF}
                                        onChange={(e) => handleFileChange(e, 'BaoCaoPDF')}
                                    />
                                    <FileInputCard 
                                        id="SourceCodeZIP" label="Source Code (ZIP)" icon={FileCode} accept=".zip,.rar,.7z"
                                        selectedFile={files.SourceCodeZIP}
                                        onChange={(e) => handleFileChange(e, 'SourceCodeZIP')}
                                    />
                                    <LinkInputCard 
                                        id="LinkDemo" label="Link Demo" icon={ExternalLink} placeholder="https://..."
                                        value={links.LinkDemo}
                                        onChange={e => setLinks(p => ({...p, LinkDemo: e.target.value}))}
                                    />
                                    <LinkInputCard 
                                        id="LinkRepository" label="Git Repository" icon={Github} placeholder="https://github.com/..."
                                        value={links.LinkRepository}
                                        onChange={e => setLinks(p => ({...p, LinkRepository: e.target.value}))}
                                    />
                                </div>

                                {/* FIX QUAN TRỌNG: type="button" để tránh reset connection */}
                                <Button 
                                    type="button" 
                                    onClick={handleSubmit} 
                                    disabled={submitMutation.isPending} 
                                    className="w-full bg-primary text-primary-foreground shadow-md"
                                >
                                    {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    Xác nhận nộp bài
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-10 text-center space-y-4">
                                <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                                    <CheckCircle className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">Đã nộp bài</h3>
                                    <p className="text-xs text-muted-foreground mt-1 px-4">
                                        Vui lòng chờ Giảng viên phản hồi.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* RIGHT: HISTORY (Flexible) */}
            <div className="flex-1 bg-background flex flex-col relative min-w-0">
                <div className="h-10 border-b border-border bg-muted/20 px-4 flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5" /> Lịch sử hoạt động
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                        {history.length} lượt nộp
                    </span>
                </div>

                <ScrollArea className="flex-1 p-5">
                    {isLoading ? (
                         <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : history.length > 0 ? (
                        <div className="pl-1 max-w-2xl mx-auto">
                            {history.map((attempt, index) => (
                                <TimelineRow 
                                    key={attempt.ID_NOP_SANPHAM} 
                                    attempt={attempt} 
                                    index={index}
                                    isLast={index === history.length - 1}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 space-y-2">
                             <UploadCloud className="h-12 w-12" />
                             <p className="text-sm font-medium">Chưa có dữ liệu</p>
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>

        {/* FOOTER */}
        <DialogFooter className="h-14 px-5 border-t border-border bg-card flex items-center justify-between shrink-0 z-20">
             <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                Đóng
             </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}