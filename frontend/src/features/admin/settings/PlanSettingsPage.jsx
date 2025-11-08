import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Save, Settings, AlertCircle } from 'lucide-react';
import { getAllPlans, getPlanSettings, updatePlanSettings } from '@/api/thesisPlanService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// Schema validation: Sử dụng % (0-100) cho dễ nhập liệu
const settingsSchema = z.object({
    SO_THANHVIEN_TOIDA: z.coerce.number().min(1, "Tối thiểu 1").max(10, "Tối đa 10"),
    TYTRONG_GVHD: z.coerce.number().min(0).max(100),
    TYTRONG_GVPB: z.coerce.number().min(0).max(100),
    TYTRONG_HD: z.coerce.number().min(0).max(100),
});

const PlanSettingsPage = () => {
    const [plans, setPlans] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [isLoadingPlans, setIsLoadingPlans] = useState(true);
    const [isLoadingSettings, setIsLoadingSettings] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            SO_THANHVIEN_TOIDA: 4,
            TYTRONG_GVHD: 0,
            TYTRONG_GVPB: 0,
            TYTRONG_HD: 0,
        },
    });

    // Theo dõi tổng tỷ trọng để hiển thị realtime
    const tytrong = form.watch(['TYTRONG_GVHD', 'TYTRONG_GVPB', 'TYTRONG_HD']);
    const totalWeight = (parseFloat(tytrong[0]) || 0) + (parseFloat(tytrong[1]) || 0) + (parseFloat(tytrong[2]) || 0);
    const isTotalValid = Math.abs(totalWeight - 100) < 0.1;

    // 1. Tải danh sách kế hoạch
    useEffect(() => {
        getAllPlans()
            .then((data) => {
                setPlans(data || []);
                // Tự động chọn kế hoạch đang thực hiện nếu có
                const active = data.find(p => p.TRANGTHAI === 'Đang thực hiện');
                if (active) setSelectedPlanId(String(active.ID_KEHOACH));
            })
            .catch(() => toast.error("Không thể tải danh sách kế hoạch."))
            .finally(() => setIsLoadingPlans(false));
    }, []);

    // 2. Tải cài đặt khi chọn kế hoạch
    useEffect(() => {
        if (!selectedPlanId) return;
        setIsLoadingSettings(true);
        getPlanSettings(selectedPlanId)
            .then((data) => {
                form.reset({
                    SO_THANHVIEN_TOIDA: data.SO_THANHVIEN_TOIDA,
                    // Chuyển từ decimal (0.4) sang percent (40) để hiển thị
                    TYTRONG_GVHD: Math.round(data.TYTRONG_DIEM_QUATRINH * 100),
                    TYTRONG_GVPB: Math.round(data.TYTRONG_DIEM_PHANBIEN * 100),
                    TYTRONG_HD: Math.round(data.TYTRONG_DIEM_HOIDONG * 100),
                });
            })
            .catch(() => toast.error("Lỗi khi tải cài đặt của kế hoạch."))
            .finally(() => setIsLoadingSettings(false));
    }, [selectedPlanId, form]);

    // 3. Lưu cài đặt
    const onSubmit = async (data) => {
        if (!isTotalValid) {
            toast.error(`Tổng tỷ trọng phải là 100%. Hiện tại là ${totalWeight}%.`);
            return;
        }
        setIsSaving(true);
        try {
            // Chuyển ngược từ percent (40) sang decimal (0.4) để gửi về server
            await updatePlanSettings(selectedPlanId, {
                SO_THANHVIEN_TOIDA: data.SO_THANHVIEN_TOIDA,
                TYTRONG_DIEM_QUATRINH: data.TYTRONG_GVHD / 100,
                TYTRONG_DIEM_PHANBIEN: data.TYTRONG_GVPB / 100,
                TYTRONG_DIEM_HOIDONG: data.TYTRONG_HD / 100,
            });
            toast.success("Đã lưu cài đặt thành công!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Lưu thất bại.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 p-6 max-w-4xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Settings className="h-8 w-8" /> Thiết lập chung
                </h2>
                <p className="text-muted-foreground">
                    Cấu hình các thông số quan trọng cho từng kế hoạch khóa luận.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Chọn Kế hoạch</CardTitle>
                    <CardDescription>Vui lòng chọn kế hoạch bạn muốn cấu hình.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingPlans ? (
                        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải...</div>
                    ) : (
                        <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                            <SelectTrigger className="w-full md:w-[400px]">
                                <SelectValue placeholder="-- Chọn kế hoạch --" />
                            </SelectTrigger>
                            <SelectContent>
                                {plans.map((plan) => (
                                    <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                        {plan.TEN_DOT} <span className="text-muted-foreground text-xs">({plan.TRANGTHAI})</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </CardContent>
            </Card>

            {selectedPlanId && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* CÀI ĐẶT NHÓM */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Quy định Nhóm</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <FormField
                                        control={form.control}
                                        name="SO_THANHVIEN_TOIDA"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Số thành viên tối đa / nhóm</FormLabel>
                                                <FormControl>
                                                    <div className="flex items-center gap-2">
                                                        <Input type="number" {...field} className="w-24" disabled={isLoadingSettings} />
                                                        <span className="text-sm text-muted-foreground">sinh viên</span>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            {/* CÀI ĐẶT TỶ TRỌNG ĐIỂM */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Tỷ trọng điểm Tổng kết</CardTitle>
                                    <CardDescription>Tổng các thành phần phải bằng 100%.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="TYTRONG_GVHD"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center justify-between space-y-0">
                                                    <FormLabel className="font-normal">GV Hướng dẫn</FormLabel>
                                                    <div className="flex items-center gap-2">
                                                        <FormControl><Input type="number" {...field} className="w-20 text-right" disabled={isLoadingSettings} /></FormControl>
                                                        <span className="text-sm w-4">%</span>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="TYTRONG_GVPB"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center justify-between space-y-0">
                                                    <FormLabel className="font-normal">GV Phản biện</FormLabel>
                                                    <div className="flex items-center gap-2">
                                                        <FormControl><Input type="number" {...field} className="w-20 text-right" disabled={isLoadingSettings} /></FormControl>
                                                        <span className="text-sm w-4">%</span>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="TYTRONG_HD"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center justify-between space-y-0">
                                                    <FormLabel className="font-normal">Hội đồng bảo vệ</FormLabel>
                                                    <div className="flex items-center gap-2">
                                                        <FormControl><Input type="number" {...field} className="w-20 text-right" disabled={isLoadingSettings} /></FormControl>
                                                        <span className="text-sm w-4">%</span>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Separator />
                                    <div className={`flex items-center justify-between font-bold ${isTotalValid ? 'text-green-600' : 'text-destructive'}`}>
                                        <span>Tổng cộng</span>
                                        <span className="mr-6">{totalWeight}%</span>
                                    </div>
                                    {!isTotalValid && (
                                        <Alert variant="destructive" className="py-2">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle className="ml-2 text-sm">Tổng tỷ trọng chưa đúng 100%</AlertTitle>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" size="lg" disabled={isSaving || isLoadingSettings || !isTotalValid}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" /> Lưu cài đặt
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    );
};

export default PlanSettingsPage;