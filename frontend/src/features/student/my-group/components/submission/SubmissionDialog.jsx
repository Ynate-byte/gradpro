import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getSubmissions, submitProduct } from '@/api/groupService';
import { toast } from 'sonner';
import { 
  Loader2, UploadCloud, FileText, Link as LinkIcon, Send, History, 
  CheckCircle2, XCircle, AlertCircle, Clock, Download, FileCode, ExternalLink
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// --- 1. Component con: Hiển thị 1 file ---
const SubmissionFileItem = ({ file }) => {
  const isLink = file.LOAI_FILE === 'LinkDemo' || file.LOAI_FILE === 'LinkRepository';
  
  const getIcon = () => {
    if (file.LOAI_FILE === 'SourceCodeZIP') return FileCode;
    if (isLink) return LinkIcon;
    return FileText; // PDF
  };
  const Icon = getIcon();

  const labelMap = {
    BaoCaoPDF: 'Báo cáo Tổng kết',
    SourceCodeZIP: 'Source Code',
    LinkDemo: 'Link Demo',
    LinkRepository: 'Repository',
  };

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all duration-200"
    >
      <div className={cn("p-2 rounded-md bg-muted group-hover:bg-background transition-colors", 
          file.LOAI_FILE === 'BaoCaoPDF' && "text-red-500 bg-red-50",
          file.LOAI_FILE === 'SourceCodeZIP' && "text-yellow-600 bg-yellow-50",
          isLink && "text-blue-500 bg-blue-50"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
          {labelMap[file.LOAI_FILE] || file.LOAI_FILE}
        </p>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
           {isLink ? (
             <span className="flex items-center gap-1">
               {file.DUONG_DAN_HOAC_NOI_DUNG} <ExternalLink className="h-3 w-3 opacity-70"/>
             </span>
           ) : file.TEN_FILE_GOC}
        </p>
      </div>
      {!isLink && (
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
             <Download className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </a>
  );
};

// --- 2. Component con: Hiển thị 1 lần nộp trong lịch sử ---
const SubmissionAttempt = ({ attempt, index, total }) => {
  const statusConfig = {
    'Đã xác nhận': { 
      icon: CheckCircle2, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      badge: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-300'
    },
    'Yêu cầu nộp lại': { 
      icon: XCircle, 
      color: 'text-destructive', 
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
      badge: 'destructive' // Use default destructive variant
    },
    'Chờ xác nhận': { 
      icon: Clock, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      badge: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-300'
    },
  };

  const config = statusConfig[attempt.TRANGTHAI] || statusConfig['Chờ xác nhận'];
  const StatusIcon = config.icon;
  const submittedAt = format(parseISO(attempt.NGAY_NOP), "HH:mm 'ngày' dd/MM/yyyy", { locale: vi });

  return (
    <div className="relative pl-6 pb-8 last:pb-0">
      {/* Timeline line */}
      {index !== total - 1 && (
        <div className="absolute left-[11px] top-8 bottom-0 w-px bg-border" />
      )}
      
      {/* Timeline dot */}
      <div className={cn(
        "absolute left-0 top-1 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-background z-10",
        config.border, config.color
      )}>
        <StatusIcon className="h-3.5 w-3.5" />
      </div>

      <Card className={cn("overflow-hidden transition-all hover:shadow-sm", attempt.TRANGTHAI === 'Chờ xác nhận' && "border-primary/50 shadow-md")}>
        <CardHeader className="p-4 pb-2 bg-muted/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
                <Badge variant={attempt.TRANGTHAI === 'Yêu cầu nộp lại' ? 'destructive' : 'outline'} className={cn("font-medium", config.badge !== 'destructive' && config.badge)}>
                    {attempt.TRANGTHAI}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {submittedAt}
                </span>
            </div>
            
            {attempt.nguoi_nop && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background px-2 py-1 rounded-full border">
                    <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px]">{attempt.nguoi_nop.HODEM_VA_TEN?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{attempt.nguoi_nop.HODEM_VA_TEN}</span>
                </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-3">
          {/* Files Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {attempt.files.map(file => (
              <SubmissionFileItem key={file.ID_FILE} file={file} />
            ))}
          </div>

          {/* Admin Feedback */}
          {attempt.TRANGTHAI === 'Yêu cầu nộp lại' && attempt.PHANHOI_ADMIN && (
            <Alert variant="destructive" className="mt-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="mb-1 text-sm font-semibold flex items-center gap-2">
                 Phản hồi từ Giảng viên
                 {attempt.nguoi_xac_nhan && <span className="text-xs font-normal opacity-80">({attempt.nguoi_xac_nhan.HODEM_VA_TEN})</span>}
              </AlertTitle>
              <AlertDescription className="text-sm italic">
                "{attempt.PHANHOI_ADMIN}"
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// --- 3. Component chính: Dialog Nộp sản phẩm ---
export function SubmissionDialog({ isOpen, setIsOpen, phancong, planId }) {
  const [files, setFiles] = useState({ BaoCaoPDF: null, SourceCodeZIP: null });
  const [links, setLinks] = useState({ LinkDemo: '', LinkRepository: '' });
  const phancongId = phancong?.ID_PHANCONG;
  const queryClient = useQueryClient();

  // Fetch history
  const { 
    data: history = [], 
    isLoading, 
    isRefetching 
  } = useQuery({
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
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['submissions', phancongId] });
      queryClient.invalidateQueries({ queryKey: ['myGroupDetails'] });
      // Reset file inputs thủ công nếu cần (React way: dùng key hoặc ref, ở đây state reset là đủ logic, input value cần reset)
      document.getElementById('BaoCaoPDF').value = "";
      document.getElementById('SourceCodeZIP').value = "";
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Nộp bài thất bại.");
    }
  });

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) setFiles(prev => ({ ...prev, [type]: file }));
  };

  const handleSubmit = () => {
    if (!files.BaoCaoPDF && !files.SourceCodeZIP && !links.LinkDemo && !links.LinkRepository) {
      toast.error("Vui lòng nộp ít nhất 1 nội dung (File hoặc Link).");
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

  // Logic check quyền nộp
  const latestSubmission = history[0];
  const canSubmit = phancong.TRANGTHAI === 'Đang thực hiện' && 
                    (!latestSubmission || latestSubmission.TRANGTHAI === 'Yêu cầu nộp lại');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        
        {/* --- Header --- */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
              <div>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <UploadCloud className="h-5 w-5 text-primary" />
                    </div>
                    Nộp sản phẩm Khóa luận
                  </DialogTitle>
                  <DialogDescription className="mt-1.5">
                    {phancong.detai?.TEN_DETAI || "Đề tài chưa đặt tên"}
                  </DialogDescription>
              </div>
              {/* Trạng thái tổng quan */}
              {!canSubmit && latestSubmission && (
                  <Badge variant={latestSubmission.TRANGTHAI === 'Đã xác nhận' ? 'success' : 'secondary'} className="text-sm px-3 py-1 h-auto">
                      {latestSubmission.TRANGTHAI === 'Chờ xác nhận' ? 'Đang chờ duyệt' : 'Đã hoàn thành'}
                  </Badge>
              )}
          </div>
        </DialogHeader>

        {/* --- Main Content (Scrollable) --- */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            
            {/* 1. FORM NỘP BÀI (Chỉ hiện khi được phép) */}
            {canSubmit ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold flex items-center gap-2 text-primary">
                        <Send className="h-4 w-4" /> Tạo lần nộp mới
                    </h3>
                    <span className="text-xs text-muted-foreground italic">* Bắt buộc: Báo cáo PDF hoặc Source Code</span>
                </div>
                
                <Card className="border-dashed shadow-sm bg-muted/5">
                    <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Cột Trái: Files */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="BaoCaoPDF" className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-red-500" /> Báo cáo Tổng kết (PDF)
                                </Label>
                                <Input id="BaoCaoPDF" type="file" accept=".pdf" 
                                    onChange={e => handleFileChange(e, 'BaoCaoPDF')} 
                                    className="cursor-pointer file:text-primary hover:bg-accent/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="SourceCodeZIP" className="flex items-center gap-2">
                                    <FileCode className="h-4 w-4 text-yellow-600" /> Source Code (ZIP/RAR)
                                </Label>
                                <Input id="SourceCodeZIP" type="file" accept=".zip,.rar,.7z" 
                                    onChange={e => handleFileChange(e, 'SourceCodeZIP')} 
                                    className="cursor-pointer file:text-primary hover:bg-accent/50"
                                />
                            </div>
                        </div>

                        {/* Cột Phải: Links */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="LinkDemo" className="flex items-center gap-2">
                                    <ExternalLink className="h-4 w-4 text-blue-500" /> Link Demo (Website/Video)
                                </Label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input id="LinkDemo" type="url" placeholder="https://..." className="pl-9"
                                        value={links.LinkDemo} onChange={e => {
                                          setLinks(prev => ({ ...prev, LinkDemo: e.target.value }))
                                        }} 
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="LinkRepository" className="flex items-center gap-2">
                                    <FileCode className="h-4 w-4 text-slate-700 dark:text-slate-300" /> Link Repository (Github/Gitlab)
                                </Label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input id="LinkRepository" type="url" placeholder="https://github.com/..." className="pl-9"
                                        value={links.LinkRepository} onChange={e => {
                                          setLinks(prev => ({ ...prev, LinkRepository: e.target.value }))
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    {/* Footer của Card Form */}
                    <div className="p-4 bg-muted/20 border-t flex justify-end">
                        <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="w-full sm:w-auto min-w-[150px]">
                            {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {submitMutation.isPending ? 'Đang tải lên...' : 'Xác nhận Nộp'}
                        </Button>
                    </div>
                </Card>
              </div>
            ) : (
                <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-700 dark:text-blue-300 mb-1">Trạng thái nộp bài</AlertTitle>
                    <AlertDescription className="text-blue-600/90 dark:text-blue-300/90">
                        Bạn đã hoàn thành việc nộp bài hoặc đang chờ giảng viên duyệt lần nộp gần nhất. 
                        Vui lòng theo dõi trạng thái bên dưới.
                    </AlertDescription>
                </Alert>
            )}

            <Separator />

            {/* 2. LỊCH SỬ (Timeline) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between sticky top-0 bg-background py-2 z-10">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                        <History className="h-4 w-4 text-muted-foreground" /> Lịch sử hoạt động
                    </h3>
                    {/* Chỉ hiện loading indicator nhỏ nếu đang refetch background */}
                    {isRefetching && !isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm">Đang tải lịch sử...</p>
                    </div>
                ) : history.length > 0 ? (
                    <div className="pl-2">
                        {history.map((attempt, index) => (
                            <SubmissionAttempt 
                                key={attempt.ID_NOP_SANPHAM} 
                                attempt={attempt} 
                                index={index}
                                total={history.length}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/5">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                            <History className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground font-medium">Chưa có lịch sử nộp bài nào.</p>
                        <p className="text-xs text-muted-foreground mt-1">Các lần nộp sản phẩm sẽ xuất hiện tại đây.</p>
                    </div>
                )}
            </div>
          </div>
        </ScrollArea>

        {/* --- Footer --- */}
        <DialogFooter className="p-4 border-t bg-muted/10 shrink-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="min-w-[100px]">Đóng</Button>
          </DialogClose>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}