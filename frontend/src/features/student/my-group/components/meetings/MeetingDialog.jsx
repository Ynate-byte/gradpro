import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMeeting, updateMeeting } from '@/api/meetingService';
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { 
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form"; 
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Calendar, Clock, Link as LinkIcon, MapPin, NotebookPen, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Schema validation cho Form Lịch họp (GIỮ NGUYÊN LOGIC)
const meetingSchema = z.object({
    TIEUDE_LICHHOP: z.string().min(5, { message: "Tiêu đề phải có ít nhất 5 ký tự." }).max(255),
    THOIGIAN_BATDAU: z.string().min(1, "Thời gian bắt đầu là bắt buộc."), 
    THOIGIAN_KETTHUC: z.string().optional().nullable(),
    HINHTHUC_HOP: z.enum(['Trực tiếp', 'Trực tuyến']),
    DIADIEM: z.string().optional().nullable(), 
    LINK_TRUCTUYEN: z.string()
        .url("Link phải là một URL hợp lệ.")
        .or(z.literal('')) 
        .optional()
        .nullable(),
    GHICHU: z.string().max(1000, "Ghi chú quá dài.").optional().nullable(),
    NOIDUNG_HOP: z.string().optional().nullable(),
}).refine(data => {
    // Kiểm tra: Địa điểm là bắt buộc khi họp Trực tiếp
    if (data.HINHTHUC_HOP === 'Trực tiếp') {
        return !!data.DIADIEM && data.DIADIEM.length > 0;
    }
    return true;
}, {
    message: "Địa điểm là bắt buộc khi họp trực tiếp.",
    path: ["DIADIEM"],
}).refine(data => {
    // Kiểm tra: Link trực tuyến là bắt buộc khi họp Trực tuyến
    if (data.HINHTHUC_HOP === 'Trực tuyến') {
        return !!data.LINK_TRUCTUYEN && data.LINK_TRUCTUYEN.length > 0;
    }
    return true;
}, {
    message: "Link trực tuyến là bắt buộc khi họp trực tuyến.",
    path: ["LINK_TRUCTUYEN"],
}).refine(data => {
    // Kiểm tra: Thời gian kết thúc phải sau thời gian bắt đầu
    if (data.THOIGIAN_KETTHUC && data.THOIGIAN_BATDAU) {
        return new Date(data.THOIGIAN_KETTHUC) > new Date(data.THOIGIAN_BATDAU);
    }
    return true;
}, {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
    path: ["THOIGIAN_KETTHUC"],
});

// Hàm xử lý thời gian
const formatDateTimeLocal = (dateString) => {
    if (!dateString) return "";
    try {
        return format(parseISO(dateString), "yyyy-MM-dd'T'HH:mm");
    } catch {
        return "";
    }
};

// [SỬA LỖI]: Hàm này giờ sẽ giữ nguyên giờ địa phương thay vì chuyển sang UTC
const toISOStringWithLocalTimezone = (localTimeString) => {
    if (!localTimeString) return null;
    // Sử dụng format của date-fns để tạo chuỗi ISO giữ nguyên giờ địa phương
    // Ví dụ: 2023-12-22T18:00 sẽ thành "2023-12-22T18:00:00" để gửi lên server
    return format(new Date(localTimeString), "yyyy-MM-dd'T'HH:mm:ss");
};


export function MeetingDialog({ isOpen, setIsOpen, nhomId, planId, meeting }) {
    const queryClient = useQueryClient();
    const isEditMode = !!meeting;

    const form = useForm({
        resolver: zodResolver(meetingSchema),
        defaultValues: {
            TIEUDE_LICHHOP: '',
            THOIGIAN_BATDAU: '',
            THOIGIAN_KETTHUC: '',
            HINHTHUC_HOP: 'Trực tiếp',
            DIADIEM: '',
            LINK_TRUCTUYEN: '',
            GHICHU: '',
            NOIDUNG_HOP: '',
        }
    });

    const hinhThucHop = form.watch('HINHTHUC_HOP');

    // Thiết lập giá trị mặc định khi mở dialog
    useEffect(() => {
        if (isEditMode && meeting) {
            form.reset({
                TIEUDE_LICHHOP: meeting.TIEUDE_LICHHOP,
                THOIGIAN_BATDAU: formatDateTimeLocal(meeting.THOIGIAN_BATDAU),
                THOIGIAN_KETTHUC: formatDateTimeLocal(meeting.THOIGIAN_KETTHUC),
                HINHTHUC_HOP: meeting.HINHTHUC_HOP,
                DIADIEM: meeting.DIADIEM || '',
                LINK_TRUCTUYEN: meeting.LINK_TRUCTUYEN || '',
                GHICHU: meeting.GHICHU || '',
                NOIDUNG_HOP: meeting.NOIDUNG_HOP || '',
            });
        } else {
            // Thiết lập thời gian bắt đầu mặc định là 5 phút sau hiện tại (local time)
            const defaultStartTime = format(new Date(Date.now() + 5 * 60000), "yyyy-MM-dd'T'HH:mm");
            form.reset({
                TIEUDE_LICHHOP: '',
                THOIGIAN_BATDAU: defaultStartTime,
                THOIGIAN_KETTHUC: '',
                HINHTHUC_HOP: 'Trực tiếp',
                DIADIEM: '',
                LINK_TRUCTUYEN: '',
                GHICHU: '',
                NOIDUNG_HOP: '',
            });
        }
    }, [isOpen, isEditMode, meeting, form]);

    // Hook xử lý tạo/cập nhật lịch họp
    const mutation = useMutation({
        mutationFn: (formData) => {
            const payload = {
                ...formData,
                THOIGIAN_BATDAU: toISOStringWithLocalTimezone(formData.THOIGIAN_BATDAU),
                THOIGIAN_KETTHUC: toISOStringWithLocalTimezone(formData.THOIGIAN_KETTHUC)
            };

            if (payload.HINHTHUC_HOP === 'Trực tiếp') {
                payload.LINK_TRUCTUYEN = null;
            } else {
                payload.DIADIEM = null;
            }
            
            if (isEditMode) {
                return updateMeeting(meeting.ID_LICHHOP, payload);
            }
            return createMeeting(nhomId, payload);
        },
        onSuccess: () => {
            toast.success(isEditMode ? "Cập nhật lịch họp thành công!" : "Tạo lịch họp thành công!");
            queryClient.invalidateQueries({ queryKey: ['meetings', nhomId] });
            queryClient.invalidateQueries({ queryKey: ['myGroupDetails', planId] });
            setIsOpen(false);
        },
        onError: (error) => {
            if (error.response?.status === 422) {
                const errors = error.response.data.errors;
                if (errors.THOIGIAN_BATDAU) {
                    form.setError('THOIGIAN_BATDAU', { type: 'backend', message: errors.THOIGIAN_BATDAU[0] });
                } else {
                    toast.error(error.response.data.message || "Dữ liệu không hợp lệ.");
                }
            } else {
                toast.error(error.response?.data?.message || "Thao tác thất bại.");
            }
        }
    });

    const onSubmit = (data) => {
        mutation.mutate(data);
    };

    const onInvalid = (errors) => {
        const firstErrorKey = Object.keys(errors)[0];
        if (!firstErrorKey) {
            toast.error("Dữ liệu không hợp lệ", { description: "Vui lòng kiểm tra lại các trường đã nhập." });
            return;
        }
        const errorFieldMap = {
            'TIEUDE_LICHHOP': 'Tiêu đề',
            'THOIGIAN_BATDAU': 'Thời gian bắt đầu',
            'THOIGIAN_KETTHUC': 'Thời gian kết thúc',
            'DIADIEM': 'Địa điểm',
            'LINK_TRUCTUYEN': 'Link trực tuyến',
        };
        const fieldName = errorFieldMap[firstErrorKey] || 'Một trường';
        const message = errors[firstErrorKey]?.message;
        toast.error(`Lỗi: ${fieldName}`, {
            description: message || "Dữ liệu nhập không đúng."
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Calendar className="h-5 w-5 text-primary" /> {isEditMode ? 'Chỉnh sửa Lịch họp' : 'Tạo Lịch họp mới'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditMode 
                            ? 'Cập nhật thông tin chi tiết hoặc biên bản cuộc họp.' 
                            : 'Điền thông tin cần thiết để tạo lịch họp mới cho nhóm.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6 py-4">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* ===== CỘT TRÁI: TIÊU ĐỀ, THỜI GIAN, HÌNH THỨC & ĐỊA ĐIỂM (General Details) ===== */}
                            <div className="space-y-6">
                                {/* HÀNG 1: TIÊU ĐỀ */}
                                <FormField
                                    control={form.control}
                                    name="TIEUDE_LICHHOP"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><NotebookPen className="h-4 w-4" /> Tiêu đề *</FormLabel>
                                            <FormControl><Input placeholder="Ví dụ: Họp báo cáo tiến độ tuần 5" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                {/* HÀNG 2: THỜI GIAN (2 CỘT) */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Bắt đầu */}
                                    <FormField
                                        control={form.control}
                                        name="THOIGIAN_BATDAU"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2"><Clock className="h-4 w-4" /> Bắt đầu *</FormLabel>
                                                <FormControl><Input type="datetime-local" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {/* Kết thúc */}
                                    <FormField
                                        control={form.control}
                                        name="THOIGIAN_KETTHUC"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2 opacity-70"><Clock className="h-4 w-4" /> Kết thúc (Tùy chọn)</FormLabel>
                                                <FormControl><Input type="datetime-local" {...field} value={field.value || ''} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* HÀNG 3: HÌNH THỨC & ĐỊA ĐIỂM */}
                                <div className="grid grid-cols-3 gap-4">
                                    {/* Hình thức */}
                                    <FormField
                                        control={form.control}
                                        name="HINHTHUC_HOP"
                                        render={({ field }) => (
                                            <FormItem className="col-span-1">
                                                <FormLabel className="flex items-center gap-2">Hình thức *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger><SelectValue placeholder="Chọn hình thức họp" /></SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Trực tiếp">Trực tiếp</SelectItem>
                                                        <SelectItem value="Trực tuyến">Trực tuyến</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    
                                    {/* Địa điểm/Link (Chiếm 2/3 không gian, conditional) */}
                                    <div className="col-span-2">
                                        {hinhThucHop === 'Trực tiếp' && (
                                            <FormField
                                                control={form.control}
                                                name="DIADIEM"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="flex items-center gap-2"><MapPin className="h-4 w-4 text-red-600" /> Địa điểm *</FormLabel>
                                                        <FormControl><Input placeholder="Ví dụ: Phòng H.301" {...field} value={field.value || ''} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                        {hinhThucHop === 'Trực tuyến' && (
                                            <FormField
                                                control={form.control}
                                                name="LINK_TRUCTUYEN"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="flex items-center gap-2"><LinkIcon className="h-4 w-4 text-indigo-600" /> Link trực tuyến *</FormLabel>
                                                        <FormControl><Input type="url" placeholder="https://meet.google.com/..." {...field} value={field.value || ''} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ===== CỘT PHẢI: GHI CHÚ & BIÊN BẢN (Extended Details) ===== */}
                            <div className="space-y-6">
                                {/* Trường Ghi chú */}
                                <FormField
                                    control={form.control}
                                    name="GHICHU"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2 opacity-70"><MessageSquare className="h-4 w-4" /> Ghi chú (Tùy chọn)</FormLabel>
                                            <FormDescription>Nội dung cần chuẩn bị hoặc thông báo ngắn gọn trước cuộc họp.</FormDescription>
                                            <FormControl><Textarea placeholder="Nội dung cần chuẩn bị cho cuộc họp..." {...field} value={field.value || ''} rows={4} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                {isEditMode && (
                                    <>
                                        <Separator />
                                        {/* Trường Biên bản họp */}
                                        <FormField
                                            control={form.control}
                                            name="NOIDUNG_HOP"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="flex items-center gap-2"><NotebookPen className="h-4 w-4" /> Biên bản / Nội dung họp</FormLabel>
                                                    <FormDescription>Cập nhật nội dung, kết luận, hoặc nhiệm vụ sau khi cuộc họp diễn ra.</FormDescription>
                                                    <FormControl>
                                                        <Textarea 
                                                            placeholder="Ghi lại nội dung cuộc họp..." 
                                                            {...field} 
                                                            value={field.value || ''}
                                                            rows={8}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditMode ? 'Lưu thay đổi' : 'Tạo lịch họp'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}