import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Save, Settings, AlertCircle } from 'lucide-react';
import { getAllPlans, getPlanSettings, updatePlanSettings } from '@/api/thesisPlanService';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// Schema validation
const settingsSchema = z.object({
    SO_THANHVIEN_TOIDA: z.coerce.number().min(1, "Tối thiểu 1 thành viên").max(10, "Tối đa 10 thành viên"),
    TYTRONG_DIEM_QUATRINH: z.coerce.number().min(0).max(100),
    TYTRONG_DIEM_PHANBIEN: z.coerce.number().min(0).max(100),
    TYTRONG_DIEM_HOIDONG: z.coerce.number().min(0).max(100),
}).refine((data) => {
    const sum = data.TYTRONG_DIEM_QUATRINH + data.TYTRONG_DIEM_PHANBIEN + data.TYTRONG_DIEM_HOIDONG;
    return Math.abs(sum - 100) < 0.1; // Cho phép sai số nhỏ do số thực
}, {
    message: "Tổng tỷ trọng phải bằng 100%",
    path: ["TYTRONG_DIEM_HOIDONG"], // Hiển thị lỗi ở trường cuối cùng
});

const GeneralSettingsPage = () => {
    const [plans, setPlans] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [isLoadingPlans, setIsLoadingPlans] = useState(true);
    const [isLoadingSettings, setIsLoadingSettings] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            SO_THANHVIEN_TOIDA: 4,
            TYTRONG_DIEM_QUATRINH: 40,
            TYTRONG_DIEM_PHANBIEN: 30,
            TYTRONG_DIEM_HOIDONG: 30,
        },
    });

    // 1. Tải danh sách kế hoạch khi vào trang
    useEffect(() => {
        getAllPlans()
            .then((data) => {
                setPlans(data || []);
                 // Tự động chọn kế hoạch đang thực hiện đầu tiên nếu có
                const activePlan = data.find(p => p.TRANGTHAI === 'Đang thực hiện');
                if (activePlan) {
                    setSelectedPlanId(String(activePlan.ID_KEHOACH));
                }
            })
            .catch(() => toast.error("Không thể tải danh sách kế hoạch."))
            .finally(() => setIsLoadingPlans(false));
    }, []);

    // 2. Tải cài đặt khi chọn kế hoạch
    useEffect(() => {
        if (!selectedPlanId) return;

        setIsLoadingSettings(true);
        getPlanSettings(selectedPlanId)
            .then((settings) => {
                // Backend trả về dạng thập phân (0.4), form dùng dạng phần trăm (40)
                form.reset({
                    SO_THANHVIEN_TOIDA: settings.SO_THANHVIEN_TOIDA,
                    TYTRONG_DIEM_QUATRINH: Math.round(settings.TYTRONG_DIEM_QUATRINH * 100),
                    TYTRONG_DIEM_PHANBIEN: Math.round(settings.TYTRONG_DIEM_PHANBIEN * 100),
                    TYTRONG_DIEM_HOIDONG: Math.round(settings.TYTRONG_DIEM_HOIDONG * 100),
                });
            })
            .catch((error) => {
                console.error("Lỗi tải cài đặt:", error);
                toast.error("Không thể tải cài đặt cho kế hoạch này.");
            })
            .finally(() => setIsLoadingSettings(false));
    }, [selectedPlanId, form]);

    // 3. Xử lý lưu
    const onSubmit = async (data) => {
        if (!selectedPlanId) {
            toast.error("Vui lòng chọn một kế hoạch trước.");
            return;
        }

        setIsSaving(true);
        try {
            // Chuyển đổi ngược từ phần trăm sang thập phân để gửi về backend
            const payload = {
                SO_THANHVIEN_TOIDA: data.SO_THANHVIEN_TOIDA,
                TYTRONG_DIEM_QUATRINH: data.TYTRONG_DIEM_QUATRINH / 100,
                TYTRONG_DIEM_PHANBIEN: data.TYTRONG_DIEM_PHANBIEN / 100,
                TYTRONG_DIEM_HOIDONG: data.TYTRONG_DIEM_HOIDONG / 100,
            };

            await updatePlanSettings(selectedPlanId, payload);
            toast.success("Đã lưu cài đặt thành công!");
        } catch (error) {
            console.error("Lỗi lưu cài đặt:", error);
            if (error.response?.status === 422 && error.response?.data?.errors) {
                 // Hiển thị lỗi validation từ backend nếu có
                 const firstError = Object.values(error.response.data.errors)[0];
                 toast.error(firstError);
            } else {
                 toast.error(error.response?.data?.message || "Lưu thất bại. Vui lòng thử lại.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Tính tổng tỷ trọng hiện tại để hiển thị
    const currentValues = form.watch(['TYTRONG_DIEM_QUATRINH', 'TYTRONG_DIEM_PHANBIEN', 'TYTRONG_DIEM_HOIDONG']);
    const totalWeight = (Number(currentValues[0]) || 0) + (Number(currentValues[1]) || 0) + (Number(currentValues[2]) || 0);
    const isTotalValid = Math.abs(totalWeight - 100) < 0.1;

    return (
        <div className="space-y-6 p-4 md:p-8 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Settings className="h-8 w-8 text-primary" />
                        Thiết lập chung
                    </h2>
                    <p className="text-muted-foreground">
                        Cấu hình các tham số quan trọng cho từng kế hoạch khóa luận.
                    </p>
                </div>
            </div>

            <Card className="border-primary/20 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle>Chọn Kế hoạch</CardTitle>
                    <CardDescription>
                        Vui lòng chọn kế hoạch bạn muốn chỉnh sửa cài đặt.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingPlans ? (
                         <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                             <Loader2 className="h-4 w-4 animate-spin" />
                             <span>Đang tải danh sách kế hoạch...</span>
                         </div>
                    ) : (
                        <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                            <SelectTrigger className="w-full md:w-[400px]">
                                <SelectValue placeholder="-- Chọn kế hoạch --" />
                            </SelectTrigger>
                            <SelectContent>
                                {plans.map((plan) => (
                                    <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                        {plan.TEN_DOT} ({plan.TRANGTHAI})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </CardContent>
            </Card>

            {selectedPlanId && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* CARD 1: CÀI ĐẶT NHÓM */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Quy định Nhóm sinh viên</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="SO_THANHVIEN_TOIDA"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Số thành viên tối đa / nhóm</FormLabel>
                                                <FormControl>
                                                    <div className="flex items-center gap-2">
                                                        <Input type="number" min={1} max={10} {...field} className="w-24" disabled={isLoadingSettings} />
                                                        <span className="text-sm text-muted-foreground">sinh viên</span>
                                                    </div>
                                                </FormControl>
                                                <FormDescription>
                                                    Số lượng sinh viên tối đa được phép trong một nhóm thực hiện khóa luận.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            {/* CARD 2: CÀI ĐẶT ĐIỂM */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Tỷ trọng điểm Tổng kết</CardTitle>
                                    <CardDescription>
                                        Tổng các tỷ trọng thành phần phải bằng 100%.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="TYTRONG_DIEM_QUATRINH"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">GV Hướng dẫn (%)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min={0} max={100} {...field} disabled={isLoadingSettings} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="TYTRONG_DIEM_PHANBIEN"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">GV Phản biện (%)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min={0} max={100} {...field} disabled={isLoadingSettings} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="TYTRONG_DIEM_HOIDONG"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Hội đồng (%)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min={0} max={100} {...field} disabled={isLoadingSettings} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <Separator />
                                    
                                    <div className={`flex items-center justify-between font-medium ${isTotalValid ? 'text-green-600' : 'text-destructive'}`}>
                                        <span>Tổng cộng:</span>
                                        <span className="text-lg">{totalWeight}%</span>
                                    </div>
                                    
                                    {!isTotalValid && (
                                        <Alert variant="destructive" className="py-2">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle className="ml-2 text-sm font-medium">Lỗi tỷ trọng</AlertTitle>
                                            <AlertDescription className="ml-2 text-xs">
                                                Tổng tỷ trọng phải bằng đúng 100%. Vui lòng điều chỉnh lại các giá trị thành phần.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                </CardContent>
                            </Card>
                        </div>

                        <div className="flex justify-end">
                            {isLoadingSettings ? (
                                <Button disabled>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải...
                                </Button>
                            ) : (
                                <Button type="submit" size="lg" disabled={isSaving || !isTotalValid}>
                                    {isSaving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    Lưu cài đặt
                                </Button>
                            )}
                        </div>
                    </form>
                </Form>
            )}

            {!selectedPlanId && !isLoadingPlans && (
                <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
                    <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>Vui lòng chọn một kế hoạch khóa luận ở trên để bắt đầu cấu hình.</p>
                </div>
            )}
        </div>
    );
};

export default GeneralSettingsPage;