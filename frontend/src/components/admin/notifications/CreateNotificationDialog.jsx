import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
    Send, Loader2, Users, GraduationCap, UserSquare2, 
    Type, Link as LinkIcon, AlignLeft, Eye, Edit3, BellRing, Calendar 
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { broadcastNotification } from '@/api/notificationService';
import { getAllPlans } from '@/api/thesisPlanService';

// Component giả lập hiển thị thông báo (Preview)
const NotificationPreview = ({ data }) => {
    const today = new Date();
    
    return (
        <div className="border rounded-xl p-4 bg-card shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 gap-1">
                    <BellRing className="w-3 h-3" /> Xem trước
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                    Hiển thị trên thiết bị người dùng
                </span>
            </div>

            {/* Mô phỏng thẻ thông báo */}
            <div className="group relative flex items-start gap-4 p-4 rounded-xl border bg-blue-50/30 border-blue-200">
                {/* Dải màu trạng thái */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl" />
                
                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full mt-1 bg-blue-100 text-blue-600">
                    <MegaphoneIcon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                        <h4 className="text-sm font-bold text-foreground leading-snug">
                            {data.TIEU_DE || "Tiêu đề thông báo..."}
                        </h4>
                        <div className="h-2 w-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
                        {data.NOI_DUNG || "Nội dung thông báo sẽ hiển thị ở đây..."}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            Vừa xong
                        </span>
                    </div>
                </div>
            </div>

            {data.LIEN_KET && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-dashed flex items-center gap-2">
                    <LinkIcon className="w-3 h-3" />
                    User sẽ được chuyển đến: <span className="font-mono text-blue-600">{data.LIEN_KET}</span>
                </div>
            )}
        </div>
    );
};

// Helper Icons cho gọn
const MegaphoneIcon = (props) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
)

const ClockIcon = (props) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
)

export function CreateNotificationDialog({ trigger }) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("compose");
    const [formData, setFormData] = useState({
        TIEU_DE: '',
        NOI_DUNG: '',
        DOI_TUONG: 'ALL',
        ID_KEHOACH: 'all',
        LIEN_KET: ''
    });

    const { data: plans = [] } = useQuery({
        queryKey: ['all-plans-simple'],
        queryFn: getAllPlans,
        enabled: open,
        staleTime: 5 * 60 * 1000
    });

    const mutation = useMutation({
        mutationFn: (data) => {
            const payload = { ...data };
            if (payload.ID_KEHOACH === 'all' || !payload.ID_KEHOACH) {
                delete payload.ID_KEHOACH;
            }
            return broadcastNotification(payload);
        },
        onSuccess: (data) => {
            toast.success(data.message);
            setOpen(false);
            setFormData({ TIEU_DE: '', NOI_DUNG: '', DOI_TUONG: 'ALL', ID_KEHOACH: 'all', LIEN_KET: '' });
            setActiveTab("compose");
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Gửi thông báo thất bại");
        }
    });

    const handleSubmit = () => {
        if (!formData.TIEU_DE || !formData.NOI_DUNG) {
            toast.error("Vui lòng nhập tiêu đề và nội dung", { position: 'top-center' });
            return;
        }
        mutation.mutate(formData);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                        <Send className="mr-2 h-4 w-4" /> Gửi thông báo
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0">
                <DialogHeader className="p-6 pb-2 bg-muted/10 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <BellRing className="w-5 h-5 text-primary" />
                        Gửi thông báo hệ thống
                    </DialogTitle>
                    <DialogDescription>
                        Gửi thông báo đến người dùng. Vui lòng kiểm tra kỹ nội dung trước khi gửi.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="px-6 py-2 bg-muted/10 border-b flex justify-between items-center">
                         <TabsList className="grid w-[200px] grid-cols-2">
                            <TabsTrigger value="compose" className="gap-2">
                                <Edit3 className="w-3.5 h-3.5" /> Soạn thảo
                            </TabsTrigger>
                            <TabsTrigger value="preview" className="gap-2">
                                <Eye className="w-3.5 h-3.5" /> Xem trước
                            </TabsTrigger>
                        </TabsList>
                        <div className="text-xs text-muted-foreground italic hidden sm:block">
                            * Trường bắt buộc nhập
                        </div>
                    </div>

                    <div className="p-6">
                        <TabsContent value="compose" className="mt-0 space-y-5 focus-visible:ring-0">
                            
                            {/* Section 1: Đối tượng */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="target" className="text-xs font-semibold uppercase text-muted-foreground">Đối tượng nhận</Label>
                                    <Select 
                                        value={formData.DOI_TUONG} 
                                        onValueChange={(val) => setFormData({...formData, DOI_TUONG: val})}
                                    >
                                        <SelectTrigger className="h-10">
                                            <div className="flex items-center gap-2">
                                                {formData.DOI_TUONG === 'ALL'}
                                                {formData.DOI_TUONG === 'STUDENT'}
                                                {formData.DOI_TUONG === 'LECTURER'}
                                                <SelectValue />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-gray-500" /> <span>Tất cả người dùng</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="STUDENT">
                                                <div className="flex items-center gap-2">
                                                    <GraduationCap className="w-4 h-4 text-blue-500" /> <span>Sinh viên</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="LECTURER">
                                                <div className="flex items-center gap-2">
                                                    <UserSquare2 className="w-4 h-4 text-purple-500" /> <span>Giảng viên</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Dropdown kế hoạch (Chỉ hiện khi chọn Sinh viên) */}
                                {formData.DOI_TUONG === 'STUDENT' && (
                                    <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                        <Label htmlFor="plan" className="text-xs font-semibold uppercase text-muted-foreground">Lọc theo Kế hoạch</Label>
                                        <Select 
                                            value={String(formData.ID_KEHOACH)} 
                                            onValueChange={(val) => setFormData({...formData, ID_KEHOACH: val})}
                                        >
                                            <SelectTrigger className="h-10">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-orange-500" />
                                                    <SelectValue placeholder="Chọn kế hoạch" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[200px]">
                                                <SelectItem value="all">Tất cả các khóa</SelectItem>
                                                {plans.map((plan) => (
                                                    <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                                        {plan.TEN_DOT}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Section 2: Nội dung */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title" className="flex items-center gap-2">
                                        <Type className="w-4 h-4 text-muted-foreground" /> Tiêu đề <span className="text-red-500">*</span>
                                    </Label>
                                    <Input 
                                        id="title" 
                                        value={formData.TIEU_DE}
                                        onChange={(e) => setFormData({...formData, TIEU_DE: e.target.value})}
                                        placeholder="VD: Thông báo bảo trì hệ thống..." 
                                        className="font-medium"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label htmlFor="content" className="flex items-center gap-2">
                                            <AlignLeft className="w-4 h-4 text-muted-foreground" /> Nội dung <span className="text-red-500">*</span>
                                        </Label>
                                        <span className="text-xs text-muted-foreground">{formData.NOI_DUNG.length} ký tự</span>
                                    </div>
                                    <Textarea 
                                        id="content" 
                                        value={formData.NOI_DUNG}
                                        onChange={(e) => setFormData({...formData, NOI_DUNG: e.target.value})}
                                        placeholder="Nhập nội dung chi tiết thông báo..." 
                                        className="min-h-[120px] resize-y"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="preview" className="mt-0 focus-visible:ring-0">
                            <div className="py-2">
                                <h3 className="text-sm font-medium mb-4 text-muted-foreground">Xem trước hiển thị</h3>
                                <NotificationPreview data={formData} />
                                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 flex gap-2">
                                    <div className="shrink-0 mt-0.5">⚠️</div>
                                    <div>
                                        <strong>Lưu ý:</strong> Thông báo sẽ được gửi đến 
                                        {formData.DOI_TUONG === 'ALL' ? ' toàn bộ người dùng hệ thống' : 
                                         (formData.DOI_TUONG === 'STUDENT' ? ' danh sách sinh viên' : ' danh sách giảng viên')}
                                        {formData.ID_KEHOACH !== 'all' && formData.DOI_TUONG === 'STUDENT' ? ' thuộc kế hoạch đã chọn' : ''}.
                                        <br/>Hành động này không thể hoàn tác.
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <DialogFooter className="p-6 pt-2 bg-muted/10 border-t">
                    <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={mutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
                    >
                        {mutation.isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang gửi...</>
                        ) : (
                            <><Send className="mr-2 h-4 w-4" /> Gửi ngay</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}