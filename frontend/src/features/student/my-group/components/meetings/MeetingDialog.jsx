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
// ===== [SỬA LỖI TẠI ĐÂY] =====
import { 
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form"; // <-- ĐÃ THÊM FormDescription
// =============================
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';

// (Schema validation giữ nguyên)
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
    if (data.HINHTHUC_HOP === 'Trực tiếp') {
        return !!data.DIADIEM && data.DIADIEM.length > 0;
    }
    return true;
}, {
    message: "Địa điểm là bắt buộc khi họp trực tiếp.",
    path: ["DIADIEM"],
}).refine(data => {
    if (data.HINHTHUC_HOP === 'Trực tuyến') {
        return !!data.LINK_TRUCTUYEN && data.LINK_TRUCTUYEN.length > 0;
    }
    return true;
}, {
    message: "Link trực tuyến là bắt buộc khi họp trực tuyến.",
    path: ["LINK_TRUCTUYEN"],
}).refine(data => {
    if (data.THOIGIAN_KETTHUC && data.THOIGIAN_BATDAU) {
        return new Date(data.THOIGIAN_KETTHUC) > new Date(data.THOIGIAN_BATDAU);
    }
    return true;
}, {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
    path: ["THOIGIAN_KETTHUC"],
});

// (Hàm formatDateTimeLocal giữ nguyên)
const formatDateTimeLocal = (dateString) => {
    if (!dateString) return "";
    try {
        return format(parseISO(dateString), "yyyy-MM-dd'T'HH:mm");
    } catch {
        return "";
    }
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

    // (useEffect, mutation, onSubmit, onInvalid giữ nguyên)
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

    const mutation = useMutation({
        mutationFn: (data) => {
            const payload = { ...data };
            if (payload.HINHTHUC_HOP === 'Trực tiếp') {
                payload.LINK_TRUCTUYEN = null;
            } else {
                payload.DIADIEM = null;
            }
            
            if (isEditMode) {
                return updateMeeting(meeting.ID_LICHHOP, payload);
            }
            return createMeeting(nhomId, data);
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
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Chỉnh sửa Lịch họp' : 'Tạo Lịch họp mới'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Cập nhật thông tin chi tiết cho cuộc họp.' : 'Điền thông tin để tạo lịch họp cho nhóm.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6 py-4">
                        
                        {/* (Các trường FormField TIEUDE, THOIGIAN, HINHTHUC, DIADIEM, LINK_TRUCTUYEN, GHICHU giữ nguyên) */}
                        <FormField
                            control={form.control}
                            name="TIEUDE_LICHHOP"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tiêu đề *</FormLabel>
                                    <FormControl><Input placeholder="Ví dụ: Họp báo cáo tiến độ tuần 5" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="THOIGIAN_BATDAU"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Thời gian bắt đầu *</FormLabel>
                                        <FormControl><Input type="datetime-local" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="THOIGIAN_KETTHUC"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Thời gian kết thúc (Tùy chọn)</FormLabel>
                                        <FormControl><Input type="datetime-local" {...field} value={field.value || ''} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="HINHTHUC_HOP"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hình thức *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Chọn hình thức họp" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Trực tiếp">Trực tiếp</SelectItem>
                                            <SelectItem value="Trực tuyến">Trực tuyến</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        {hinhThucHop === 'Trực tiếp' && (
                            <FormField
                                control={form.control}
                                name="DIADIEM"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Địa điểm *</FormLabel>
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
                                        <FormLabel>Link trực tuyến *</FormLabel>
                                        <FormControl><Input type="url" placeholder="https://meet.google.com/..." {...field} value={field.value || ''} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <FormField
                            control={form.control}
                            name="GHICHU"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ghi chú (Tùy chọn)</FormLabel>
                                    <FormControl><Textarea placeholder="Nội dung cần chuẩn bị cho cuộc họp..." {...field} value={field.value || ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        {/* Hiển thị Biên bản họp KHI EDIT */}
                        {isEditMode && (
                            <>
                                <Separator />
                                <FormField
                                    control={form.control}
                                    name="NOIDUNG_HOP"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Biên bản / Nội dung họp</FormLabel>
                                            {/* Dòng <FormDescription> đã gây lỗi */}
                                            <FormDescription>
                                                Cập nhật nội dung, kết luận, hoặc nhiệm vụ sau khi cuộc họp diễn ra.
                                            </FormDescription>
                                            <FormControl>
                                                <Textarea 
                                                    placeholder="Ghi lại nội dung cuộc họp..." 
                                                    {...field} 
                                                    value={field.value || ''}
                                                    rows={6} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}


                        <DialogFooter>
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