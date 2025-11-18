import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Save, Settings, CalendarClock, AlertCircle } from 'lucide-react';
import { getAllPlans, getPlanSettings, updatePlanSettings } from '@/api/thesisPlanService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch'; // Cần đảm bảo bạn có component này hoặc dùng checkbox

// Schema validation
const settingsSchema = z.object({
    SO_THANHVIEN_TOIDA: z.coerce.number().min(1).max(10),
    TYTRONG_GVHD: z.coerce.number().min(0).max(100),
    TYTRONG_GVPB: z.coerce.number().min(0).max(100),
    TYTRONG_HD: z.coerce.number().min(0).max(100),
    
    // Schema cho Feature Flags (SETTINGS)
    GV_RA_DE_START: z.string().nullable().optional(),
    GV_RA_DE_END: z.string().nullable().optional(),
    
    SV_TAO_NHOM_START: z.string().nullable().optional(),
    SV_TAO_NHOM_END: z.string().nullable().optional(),
    
    SV_DANGKY_DE_START: z.string().nullable().optional(),
    SV_DANGKY_DE_END: z.string().nullable().optional(),
    
    CHAM_DIEM_START: z.string().nullable().optional(),
    CHAM_DIEM_END: z.string().nullable().optional(),
    
    TAO_HOIDONG_START: z.string().nullable().optional(),
    TAO_HOIDONG_END: z.string().nullable().optional(),
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
            TYTRONG_GVHD: 0, TYTRONG_GVPB: 0, TYTRONG_HD: 0,
            GV_RA_DE_START: '', GV_RA_DE_END: '',
            SV_TAO_NHOM_START: '', SV_TAO_NHOM_END: '',
            SV_DANGKY_DE_START: '', SV_DANGKY_DE_END: '',
            CHAM_DIEM_START: '', CHAM_DIEM_END: '',
            TAO_HOIDONG_START: '', TAO_HOIDONG_END: '',
        },
    });

    // Theo dõi tổng tỷ trọng
    const tytrong = form.watch(['TYTRONG_GVHD', 'TYTRONG_GVPB', 'TYTRONG_HD']);
    const totalWeight = (parseFloat(tytrong[0]) || 0) + (parseFloat(tytrong[1]) || 0) + (parseFloat(tytrong[2]) || 0);
    const isTotalValid = Math.abs(totalWeight - 100) < 0.1;

    // 1. Tải danh sách kế hoạch
    useEffect(() => {
        getAllPlans()
            .then((data) => {
                setPlans(data || []);
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
                // Helper để lấy ngày từ SETTINGS json
                const getSettingDate = (key, type) => {
                    if (data.SETTINGS && data.SETTINGS[key] && data.SETTINGS[key][type]) {
                        // Cắt chuỗi để lấy yyyy-MM-dd cho input date
                        return data.SETTINGS[key][type].split('T')[0];
                    }
                    return '';
                };

                form.reset({
                    SO_THANHVIEN_TOIDA: data.SO_THANHVIEN_TOIDA,
                    TYTRONG_GVHD: Math.round(data.TYTRONG_DIEM_QUATRINH * 100),
                    TYTRONG_GVPB: Math.round(data.TYTRONG_DIEM_PHANBIEN * 100),
                    TYTRONG_HD: Math.round(data.TYTRONG_DIEM_HOIDONG * 100),

                    // Load Feature Flags
                    GV_RA_DE_START: getSettingDate('GV_RA_DE', 'start'),
                    GV_RA_DE_END: getSettingDate('GV_RA_DE', 'end'),
                    
                    SV_TAO_NHOM_START: getSettingDate('SV_TAO_NHOM', 'start'),
                    SV_TAO_NHOM_END: getSettingDate('SV_TAO_NHOM', 'end'),
                    
                    SV_DANGKY_DE_START: getSettingDate('SV_DANGKY_DE', 'start'),
                    SV_DANGKY_DE_END: getSettingDate('SV_DANGKY_DE', 'end'),
                    
                    CHAM_DIEM_START: getSettingDate('CHAM_DIEM', 'start'),
                    CHAM_DIEM_END: getSettingDate('CHAM_DIEM', 'end'),
                    
                    TAO_HOIDONG_START: getSettingDate('TAO_HOIDONG', 'start'),
                    TAO_HOIDONG_END: getSettingDate('TAO_HOIDONG', 'end'),
                });
            })
            .catch(() => toast.error("Lỗi khi tải cài đặt."))
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
            // Construct SETTINGS JSON object
            const settingsJson = {
                GV_RA_DE: { start: data.GV_RA_DE_START, end: data.GV_RA_DE_END },
                SV_TAO_NHOM: { start: data.SV_TAO_NHOM_START, end: data.SV_TAO_NHOM_END },
                SV_DANGKY_DE: { start: data.SV_DANGKY_DE_START, end: data.SV_DANGKY_DE_END },
                CHAM_DIEM: { start: data.CHAM_DIEM_START, end: data.CHAM_DIEM_END },
                TAO_HOIDONG: { start: data.TAO_HOIDONG_START, end: data.TAO_HOIDONG_END },
            };

            await updatePlanSettings(selectedPlanId, {
                SO_THANHVIEN_TOIDA: data.SO_THANHVIEN_TOIDA,
                TYTRONG_DIEM_QUATRINH: data.TYTRONG_GVHD / 100,
                TYTRONG_DIEM_PHANBIEN: data.TYTRONG_GVPB / 100,
                TYTRONG_DIEM_HOIDONG: data.TYTRONG_HD / 100,
                SETTINGS: settingsJson, // Gửi cục JSON này về backend
            });
            toast.success("Đã lưu cài đặt thành công!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Lưu thất bại.");
        } finally {
            setIsSaving(false);
        }
    };

    // Component con để render từng dòng Feature
    const FeatureDateRow = ({ label, startName, endName }) => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end border-b pb-4 last:border-0 last:pb-0">
            <div className="flex items-center h-10 font-medium text-sm md:text-base">
                {label}
            </div>
            <FormField
                control={form.control}
                name={startName}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Bắt đầu</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} value={field.value || ''} disabled={isLoadingSettings} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name={endName}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Kết thúc</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} value={field.value || ''} disabled={isLoadingSettings} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );

    return (
        <div className="space-y-6 p-6 max-w-5xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Settings className="h-8 w-8" /> Thiết lập chung
                </h2>
                <p className="text-muted-foreground">
                    Cấu hình các thông số và thời gian hiệu lực cho từng chức năng của kế hoạch.
                </p>
            </div>

            <Card className="border-blue-100 bg-blue-50/30">
                <CardHeader className="pb-3">
                    <CardTitle>Chọn Kế hoạch</CardTitle>
                    <CardDescription>Vui lòng chọn kế hoạch bạn muốn cấu hình.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingPlans ? (
                        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải...</div>
                    ) : (
                        <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                            <SelectTrigger className="w-full md:w-[400px] bg-white">
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
                        
                        {/* SECTION 1: CẤU HÌNH THỜI GIAN (FEATURE FLAGS) */}
                        <Card className="border-l-4 border-l-primary shadow-md">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <CalendarClock className="h-6 w-6 text-primary" />
                                    <CardTitle className="text-lg">Thời gian & Hiệu lực Chức năng</CardTitle>
                                </div>
                                <CardDescription>
                                    Hệ thống sẽ <strong>tự động BẬT</strong> chức năng khi nằm trong khoảng thời gian này. 
                                    Để <strong>TẮT</strong> vĩnh viễn, hãy xóa trắng ngày.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FeatureDateRow label="Giảng viên ra đề tài" startName="GV_RA_DE_START" endName="GV_RA_DE_END" />
                                <FeatureDateRow label="Sinh viên tạo nhóm" startName="SV_TAO_NHOM_START" endName="SV_TAO_NHOM_END" />
                                <FeatureDateRow label="Sinh viên đăng ký đề tài" startName="SV_DANGKY_DE_START" endName="SV_DANGKY_DE_END" />
                                <FeatureDateRow label="Giảng viên chấm điểm" startName="CHAM_DIEM_START" endName="CHAM_DIEM_END" />
                                <FeatureDateRow label="Tổ chức Hội đồng" startName="TAO_HOIDONG_START" endName="TAO_HOIDONG_END" />
                            </CardContent>
                        </Card>

                        <div className="grid gap-6 md:grid-cols-2">
                            {/* SECTION 2: CÀI ĐẶT NHÓM */}
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

                            {/* SECTION 3: CÀI ĐẶT ĐIỂM */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Tỷ trọng điểm Tổng kết</CardTitle>
                                    <CardDescription>Tổng các thành phần phải bằng 100%.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="TYTRONG_GVHD"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-normal text-xs">GV Hướng dẫn (%)</FormLabel>
                                                        <FormControl><Input type="number" {...field} className="text-right" disabled={isLoadingSettings} /></FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="TYTRONG_GVPB"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-normal text-xs">GV Phản biện (%)</FormLabel>
                                                        <FormControl><Input type="number" {...field} className="text-right" disabled={isLoadingSettings} /></FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="TYTRONG_HD"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-normal text-xs">Hội đồng bảo vệ (%)</FormLabel>
                                                    <FormControl><Input type="number" {...field} className="text-right" disabled={isLoadingSettings} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Separator />
                                    <div className={`flex items-center justify-between font-bold ${isTotalValid ? 'text-green-600' : 'text-destructive'}`}>
                                        <span>Tổng cộng</span>
                                        <span className="mr-2">{totalWeight}%</span>
                                    </div>
                                    {!isTotalValid && (
                                        <Alert variant="destructive" className="py-2">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle className="ml-2 text-sm">Lỗi tỷ trọng</AlertTitle>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="flex justify-end sticky bottom-4 bg-background/80 backdrop-blur p-4 rounded-lg border shadow-sm">
                            <Button type="submit" size="lg" disabled={isSaving || isLoadingSettings || !isTotalValid} className="w-full md:w-auto">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" /> Lưu tất cả cài đặt
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    );
};

export default PlanSettingsPage;