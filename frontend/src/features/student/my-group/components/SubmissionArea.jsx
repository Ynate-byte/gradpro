import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // Dùng cho link
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getSubmissions, submitProduct } from '@/api/groupService';
import { toast } from 'sonner';
import { Loader2, UploadCloud, FileText, Link, Send, History, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Component con: Hiển thị 1 file/link trong lịch sử
const SubmissionFileItem = ({ file }) => {
  const isLink = file.LOAI_FILE === 'LinkDemo' || file.LOAI_FILE === 'LinkRepository';
  const Icon = isLink ? Link : FileText;
  const label = {
    BaoCaoPDF: 'Báo cáo PDF',
    SourceCodeZIP: 'Source Code (ZIP)',
    LinkDemo: 'Link Demo',
    LinkRepository: 'Link Repository',
  }[file.LOAI_FILE] || file.LOAI_FILE;

  return (
    <a
      href={file.url} // Accessor 'url' từ model
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-2 rounded-md border bg-muted/50 hover:bg-muted transition-colors"
    >
      <Icon className="h-4 w-4 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        <p className="text-xs text-muted-foreground truncate">
          {isLink ? file.DUONG_DAN_HOAC_NOI_DUNG : file.TEN_FILE_GOC}
        </p>
      </div>
    </a>
  );
};

// Component con: Hiển thị 1 lần nộp trong lịch sử
const SubmissionAttempt = ({ attempt }) => {
  const getStatusProps = () => {
    switch (attempt.TRANGTHAI) {
      case 'Đã xác nhận':
        return { Icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200' };
      case 'Yêu cầu nộp lại':
        return { Icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
      case 'Chờ xác nhận':
      default:
        return { Icon: Loader2, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' };
    }
  };
  const { Icon, color, bg } = getStatusProps();
  const submittedAt = format(parseISO(attempt.NGAY_NOP), 'dd/MM/yyyy, HH:mm', { locale: vi });

  return (
    <Card className={cn("overflow-hidden", bg)}>
      <CardHeader className="p-4">
        <div className="flex justify-between items-center">
          <CardTitle className={cn("text-base font-semibold flex items-center gap-2", color)}>
            <Icon className={cn("h-5 w-5", attempt.TRANGTHAI === 'Chờ xác nhận' && 'animate-spin')} />
            {attempt.TRANGTHAI}
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            <p>Nộp lúc: {submittedAt}</p>
            <p>Người nộp: {attempt.nguoi_nop?.HODEM_VA_TEN || 'N/A'}</p>
          </div>
        </div>
        {attempt.TRANGTHAI === 'Yêu cầu nộp lại' && attempt.PHANHOI_ADMIN && (
          <Alert variant="destructive" className="mt-3 bg-red-100/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">Phản hồi từ Admin ({attempt.nguoi_xac_nhan?.HODEM_VA_TEN}):</p>
              <p className="italic">"{attempt.PHANHOI_ADMIN}"</p>
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {attempt.files.map(file => (
          <SubmissionFileItem key={file.ID_FILE} file={file} />
        ))}
      </CardContent>
    </Card>
  );
};

// Component chính
export function SubmissionArea({ phancong, refreshData }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState({ BaoCaoPDF: null, SourceCodeZIP: null });
  const [links, setLinks] = useState({ LinkDemo: '', LinkRepository: '' });

  const phancongId = phancong?.ID_PHANCONG;

  const fetchHistory = useCallback(async () => {
    if (!phancongId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getSubmissions(phancongId);
      setHistory(data || []);
    } catch (error) {
      toast.error("Không thể tải lịch sử nộp bài.");
    } finally {
      setIsLoading(false);
    }
  }, [phancongId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) setFiles(prev => ({ ...prev, [fileType]: file }));
  };

  const handleLinkChange = (e, linkType) => {
    setLinks(prev => ({ ...prev, [linkType]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!files.BaoCaoPDF && !files.SourceCodeZIP && !links.LinkDemo && !links.LinkRepository) {
      toast.error("Bạn phải nộp ít nhất 1 sản phẩm (file hoặc link).");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    if (files.BaoCaoPDF) formData.append('BaoCaoPDF', files.BaoCaoPDF);
    if (files.SourceCodeZIP) formData.append('SourceCodeZIP', files.SourceCodeZIP);
    if (links.LinkDemo) formData.append('LinkDemo', links.LinkDemo);
    if (links.LinkRepository) formData.append('LinkRepository', links.LinkRepository);

    try {
      const res = await submitProduct(phancongId, formData);
      toast.success(res.message);
      // Reset form
      setFiles({ BaoCaoPDF: null, SourceCodeZIP: null });
      setLinks({ LinkDemo: '', LinkRepository: '' });
      // Tải lại cả trang MyGroup để cập nhật trạng thái chung
      refreshData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Nộp bài thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kiểm tra trạng thái có cho phép nộp bài hay không
  const latestSubmission = history[0];
  const canSubmit = phancong.TRANGTHAI === 'Đang thực hiện' &&
      (!latestSubmission || latestSubmission.TRANGTHAI === 'Yêu cầu nộp lại');

  return (
    <div className="space-y-8">
      {/* 1. Khu vực nộp bài (chỉ hiển thị nếu được phép) */}
      {canSubmit && (
        <Card className="border-primary shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadCloud className="h-6 w-6 text-primary" /> Nộp sản phẩm Khóa luận
            </CardTitle>
            <CardDescription>
              Tải lên các file và đường link sản phẩm của nhóm. Chỉ nhóm trưởng mới có thể nộp. (Lưu ý: Bạn phải nộp lại TẤT CẢ các mục nếu bị yêu cầu nộp lại).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="BaoCaoPDF">1. Báo cáo tổng kết (PDF)*</Label>
                <Input id="BaoCaoPDF" type="file" accept=".pdf" onChange={e => handleFileChange(e, 'BaoCaoPDF')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="SourceCodeZIP">2. Source Code (ZIP, RAR)*</Label>
                <Input id="SourceCodeZIP" type="file" accept=".zip,.rar,.7z" onChange={e => handleFileChange(e, 'SourceCodeZIP')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="LinkDemo">3. Link Demo (Tùy chọn)</Label>
                <Input id="LinkDemo" type="url" placeholder="https://..." value={links.LinkDemo} onChange={e => handleLinkChange(e, 'LinkDemo')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="LinkRepository">4. Link Repository (Tùy chọn)</Label>
                <Input id="LinkRepository" type="url" placeholder="https://github.com/..." value={links.LinkRepository} onChange={e => handleLinkChange(e, 'LinkRepository')} />
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isSubmitting ? 'Đang nộp...' : 'Xác nhận Nộp sản phẩm'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 2. Lịch sử nộp bài */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-6 w-6" /> Lịch sử Nộp bài
            </div>
            <Button variant="ghost" size="icon" onClick={fetchHistory} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center p-8"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/></div>
          ) : history.length > 0 ? (
            history.map(attempt => (
              <SubmissionAttempt key={attempt.ID_NOP_SANPHAM} attempt={attempt} />
            ))
          ) : (
            <p className="text-center text-muted-foreground p-8">Chưa có lịch sử nộp bài.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}