import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { 
    Loader2, Save, Settings, CalendarClock, Power, 
    CheckCircle2, XCircle, Link as LinkIcon, AlertCircle,
    Users, Percent, LayoutDashboard
} from 'lucide-react';
import { getAllPlans, getPlanSettings, updatePlanSettings, getThesisPlanById } from '@/api/thesisPlanService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils'; 

// --- 1. Schema Validation ---
const settingsSchema = z.object({
    SO_THANHVIEN_TOIDA: z.coerce.number().min(1).max(10),
    TYTRONG_GVHD: z.coerce.number().min(0).max(100),
    TYTRONG_GVPB: z.coerce.number().min(0).max(100),
    TYTRONG_HD: z.coerce.number().min(0).max(100),
    
    GV_RA_DE_MODE: z.string().optional(),
    GV_RA_DE_START: z.string().nullable().optional(),
    GV_RA_DE_END: z.string().nullable().optional(),
    
    SV_TAO_NHOM_MODE: z.string().optional(),
    SV_TAO_NHOM_START: z.string().nullable().optional(),
    SV_TAO_NHOM_END: z.string().nullable().optional(),
    
    SV_DANGKY_DE_MODE: z.string().optional(),
    SV_DANGKY_DE_START: z.string().nullable().optional(),
    SV_DANGKY_DE_END: z.string().nullable().optional(),

    SV_NOP_BAI_MODE: z.string().optional(),
    SV_NOP_BAI_START: z.string().nullable().optional(),
    SV_NOP_BAI_END: z.string().nullable().optional(),
    
    CHAM_DIEM_MODE: z.string().optional(),
    CHAM_DIEM_START: z.string().nullable().optional(),
    CHAM_DIEM_END: z.string().nullable().optional(),
});

const GeneralSettingsPage = () => {
    const [plans, setPlans] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [selectedPlanStatus, setSelectedPlanStatus] = useState('');
    const [isLoadingPlans, setIsLoadingPlans] = useState(true);
    const [isLoadingSettings, setIsLoadingSettings] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [planMilestones, setPlanMilestones] = useState([]);

    const form = useForm({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            SO_THANHVIEN_TOIDA: 4,
            TYTRONG_GVHD: 0, TYTRONG_GVPB: 0, TYTRONG_HD: 0,
            GV_RA_DE_MODE: 'AUTO', GV_RA_DE_START: '', GV_RA_DE_END: '',
            SV_TAO_NHOM_MODE: 'AUTO', SV_TAO_NHOM_START: '', SV_TAO_NHOM_END: '',
            SV_DANGKY_DE_MODE: 'AUTO', SV_DANGKY_DE_START: '', SV_DANGKY_DE_END: '',
            SV_NOP_BAI_MODE: 'AUTO', SV_NOP_BAI_START: '', SV_NOP_BAI_END: '',
            CHAM_DIEM_MODE: 'AUTO', CHAM_DIEM_START: '', CHAM_DIEM_END: '',
        },
    });

    const tytrong = form.watch(['TYTRONG_GVHD', 'TYTRONG_GVPB', 'TYTRONG_HD']);
    const totalWeight = (parseFloat(tytrong[0]) || 0) + (parseFloat(tytrong[1]) || 0) + (parseFloat(tytrong[2]) || 0);
    const isTotalValid = Math.abs(totalWeight - 100) < 0.1;

    useEffect(() => {
        getAllPlans()
            .then((data) => {
                setPlans(data || []);
                const active = data.find(p => p.TRANGTHAI === 'Đang thực hiện');
                if (active) {
                    setSelectedPlanId(String(active.ID_KEHOACH));
                    setSelectedPlanStatus(active.TRANGTHAI);
                } else if (data.length > 0) {
                     setSelectedPlanId(String(data[0].ID_KEHOACH));
                     setSelectedPlanStatus(data[0].TRANGTHAI);
                }
            })
            .catch(() => toast.error("Không thể tải danh sách kế hoạch."))
            .finally(() => setIsLoadingPlans(false));
    }, []);

    useEffect(() => {
        if (!selectedPlanId) return;
        setIsLoadingSettings(true);
        
        const currentPlan = plans.find(p => String(p.ID_KEHOACH) === selectedPlanId);
        if (currentPlan) setSelectedPlanStatus(currentPlan.TRANGTHAI);

        const fetchSettings = getPlanSettings(selectedPlanId);
        const fetchDetail = getThesisPlanById(selectedPlanId);

        Promise.all([fetchSettings, fetchDetail])
            .then(([settingsData, planData]) => {
                const getVal = (key, type) => {
                    if (settingsData.SETTINGS && settingsData.SETTINGS[key]) {
                        if (type === 'mode') {
                            return settingsData.SETTINGS[key].manual_override || 'AUTO';
                        }
                        if (settingsData.SETTINGS[key][type]) {
                            return settingsData.SETTINGS[key][type].split('T')[0];
                        }
                    }
                    return type === 'mode' ? 'AUTO' : '';
                };

                form.reset({
                    SO_THANHVIEN_TOIDA: settingsData.SO_THANHVIEN_TOIDA,
                    TYTRONG_GVHD: Math.round(settingsData.TYTRONG_DIEM_QUATRINH * 100),
                    TYTRONG_GVPB: Math.round(settingsData.TYTRONG_DIEM_PHANBIEN * 100),
                    TYTRONG_HD: Math.round(settingsData.TYTRONG_DIEM_HOIDONG * 100),

                    GV_RA_DE_MODE: getVal('GV_RA_DE', 'mode'),
                    GV_RA_DE_START: getVal('GV_RA_DE', 'start'),
                    GV_RA_DE_END: getVal('GV_RA_DE', 'end'),

                    SV_TAO_NHOM_MODE: getVal('SV_TAO_NHOM', 'mode'),
                    SV_TAO_NHOM_START: getVal('SV_TAO_NHOM', 'start'),
                    SV_TAO_NHOM_END: getVal('SV_TAO_NHOM', 'end'),

                    SV_DANGKY_DE_MODE: getVal('SV_DANGKY_DE', 'mode'),
                    SV_DANGKY_DE_START: getVal('SV_DANGKY_DE', 'start'),
                    SV_DANGKY_DE_END: getVal('SV_DANGKY_DE', 'end'),

                    SV_NOP_BAI_MODE: getVal('SV_NOP_BAI', 'mode'),
                    SV_NOP_BAI_START: getVal('SV_NOP_BAI', 'start'),
                    SV_NOP_BAI_END: getVal('SV_NOP_BAI', 'end'),

                    CHAM_DIEM_MODE: getVal('CHAM_DIEM', 'mode'),
                    CHAM_DIEM_START: getVal('CHAM_DIEM', 'start'),
                    CHAM_DIEM_END: getVal('CHAM_DIEM', 'end'),
                });

                setPlanMilestones(planData.moc_thoigians || []);
            })
            .catch((err) => {
                console.error(err);
                toast.error("Lỗi khi tải dữ liệu.");
            })
            .finally(() => setIsLoadingSettings(false));
    }, [selectedPlanId, plans, form]);

    const onSubmit = async (data) => {
        if (!isTotalValid) {
            toast.error(`Tổng tỷ trọng phải là 100%. Hiện tại là ${totalWeight}%.`);
            return;
        }
        setIsSaving(true);
        try {
            const getMode = (mode) => (mode === 'AUTO' ? null : mode);

            const settingsJson = {
                GV_RA_DE: { 
                    start: data.GV_RA_DE_START, end: data.GV_RA_DE_END, 
                    manual_override: getMode(data.GV_RA_DE_MODE) 
                },
                SV_TAO_NHOM: { 
                    start: data.SV_TAO_NHOM_START, end: data.SV_TAO_NHOM_END,
                    manual_override: getMode(data.SV_TAO_NHOM_MODE) 
                },
                SV_DANGKY_DE: { 
                    start: data.SV_DANGKY_DE_START, end: data.SV_DANGKY_DE_END,
                    manual_override: getMode(data.SV_DANGKY_DE_MODE) 
                },
                SV_NOP_BAI: { 
                    start: data.SV_NOP_BAI_START, end: data.SV_NOP_BAI_END,
                    manual_override: getMode(data.SV_NOP_BAI_MODE) 
                },
                CHAM_DIEM: { 
                    start: data.CHAM_DIEM_START, end: data.CHAM_DIEM_END,
                    manual_override: getMode(data.CHAM_DIEM_MODE) 
                },
            };

            await updatePlanSettings(selectedPlanId, {
                SO_THANHVIEN_TOIDA: data.SO_THANHVIEN_TOIDA,
                TYTRONG_DIEM_QUATRINH: data.TYTRONG_GVHD / 100,
                TYTRONG_DIEM_PHANBIEN: data.TYTRONG_GVPB / 100,
                TYTRONG_DIEM_HOIDONG: data.TYTRONG_HD / 100,
                SETTINGS: settingsJson, 
            });
            toast.success("Đã lưu cài đặt thành công!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Lưu thất bại.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Component UI: Dòng chức năng (Dạng Bảng phẳng) ---
    const FeatureRow = ({ label, modeName, startName, endName, featureKey, isLast }) => {
        const currentMode = form.watch(modeName);
        const startDate = form.watch(startName);
        const endDate = form.watch(endName);
        
        const isAuto = currentMode === 'AUTO';
        const linkedMilestone = planMilestones.find(m => m.FEATURE_KEY === featureKey);

        let isActiveNow = false;
        if (currentMode === 'ENABLED') isActiveNow = true;
        else if (currentMode === 'DISABLED') isActiveNow = false;
        else {
            const now = new Date();
            if (startDate && endDate) {
                isActiveNow = now >= new Date(startDate) && now <= new Date(endDate);
            }
        }

        return (
            <div className={cn(
                "grid grid-cols-1 md:grid-cols-12 gap-4 items-center py-4 px-6 hover:bg-accent/10 transition-colors",
                !isLast && "border-b border-gray-100"
            )}>
                {/* Cột 1: Tên + Trạng thái (4 col) */}
                <div className="md:col-span-4 flex items-center gap-3">
                    <div className={cn(
                        "w-2.5 h-2.5 rounded-full flex-shrink-0",
                        isActiveNow ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-300"
                    )} title={isActiveNow ? "Đang hoạt động" : "Đang đóng"} />
                    
                    <div className="flex flex-col">
                        <div className="font-medium text-sm text-foreground">{label}</div>
                        {isActiveNow ? (
                            <span className="text-[10px] text-green-600 font-medium">Đang mở</span>
                        ) : (
                            <span className="text-[10px] text-muted-foreground">Đang đóng</span>
                        )}
                    </div>
                </div>

                {/* Cột 2: Điều khiển (2 col) */}
                <div className="md:col-span-2">
                    <FormField
                        control={form.control}
                        name={modeName}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className={cn("h-8 text-xs w-full", 
                                        field.value === 'ENABLED' && "border-green-300 bg-green-50 text-green-700 font-medium",
                                        field.value === 'DISABLED' && "border-red-300 bg-red-50 text-red-700 font-medium"
                                    )}>
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="AUTO">🕒 Tự động</SelectItem>
                                    <SelectItem value="ENABLED">✅ Mở (Thủ công)</SelectItem>
                                    <SelectItem value="DISABLED">⛔ Đóng (Thủ công)</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>

                {/* Cột 3: Thời gian (6 col) - LỚN NHẤT */}
                <div className="md:col-span-6 flex flex-col items-center md:items-end gap-1">
                    {/* Luôn hiển thị Input ngày tháng, chỉ disable nếu đang liên kết */}
                    <div className={cn("flex items-center gap-2 w-full justify-end", linkedMilestone && isAuto && "opacity-80")}>
                        <FormField name={startName} render={({ field }) => (
                            <div className="relative flex-1 md:flex-none">
                                <Input 
                                    type="date" {...field} 
                                    value={field.value || ''}
                                    // Disable nếu đang liên kết (để tránh sửa nhầm) HOẶC đang ở chế độ thủ công (vì lúc đó ngày ko có ý nghĩa)
                                    disabled={isLoadingSettings || (!!linkedMilestone && isAuto)} 
                                    className="h-8 text-xs w-full md:w-[140px]" 
                                />
                            </div>
                        )} />
                        <span className="text-muted-foreground text-xs">-</span>
                        <FormField name={endName} render={({ field }) => (
                            <div className="relative flex-1 md:flex-none">
                                <Input 
                                    type="date" {...field} 
                                    value={field.value || ''}
                                    disabled={isLoadingSettings || (!!linkedMilestone && isAuto)} 
                                    className="h-8 text-xs w-full md:w-[140px]" 
                                />
                            </div>
                        )} />
                    </div>
                    
                    {/* Dòng thông báo liên kết (nếu có) */}
                    {isAuto && linkedMilestone && (
                        <div className="text-[11px] text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            <LinkIcon className="w-3 h-3" /> 
                            <span className="truncate max-w-[250px]" title={linkedMilestone.TEN_SUKIEN}>
                                Theo: <strong>{linkedMilestone.TEN_SUKIEN}</strong>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full overflow-y-auto relative">
            <div className="space-y-6 p-4 md:p-6 mx-auto pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                            <Settings className="h-6 w-6" /> THIẾT LẬP CHUNG
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Cấu hình hệ thống & thời gian cho kế hoạch.
                        </p>
                    </div>
                    
                    {/* Chọn kế hoạch */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {isLoadingPlans ? (
                             <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                             </div>
                        ) : (
                            <>
                                <Select value={selectedPlanId} onValueChange={(val) => {
                                    setSelectedPlanId(val);
                                    const p = plans.find(x => String(x.ID_KEHOACH) === val);
                                    if (p) setSelectedPlanStatus(p.TRANGTHAI);
                                }}>
                                    <SelectTrigger className="w-full md:w-[300px] h-9 text-sm">
                                        <SelectValue placeholder="-- Chọn kế hoạch --" />
                                    </SelectTrigger>
                                    <SelectContent align="end">
                                        {plans.map((plan) => (
                                            <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                                <span className="font-medium">{plan.TEN_DOT}</span> 
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedPlanStatus && (
                                    <Badge variant={selectedPlanStatus === 'Đang thực hiện' ? 'default' : 'secondary'} className="h-9 px-3 flex items-center whitespace-nowrap">
                                        {selectedPlanStatus}
                                    </Badge>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {selectedPlanId && (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            
                            {/* --- SECTION 1: CONTROL CENTER (Dạng Bảng) --- */}
                            <Card className="border-none shadow-md overflow-hidden ring-1 ring-border">
                                <CardHeader className="bg-muted/30 pb-4 border-b">
                                    <div className="flex items-center gap-2">
                                        <Power className="h-5 w-5 text-blue-600" />
                                        <CardTitle className="text-lg text-blue-900">Kiểm soát Chức năng</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Quản lý thời gian mở/đóng các chức năng. Nếu liên kết với mốc thời gian, ngày sẽ tự động cập nhật.
                                    </CardDescription>
                                </CardHeader>
                                
                                {/* Header cột giả lập */}
                                <div className="bg-muted/10 px-6 py-2 border-b text-[11px] font-semibold text-muted-foreground grid grid-cols-1 md:grid-cols-12 gap-4 hidden md:grid uppercase tracking-wider">
                                    <div className="md:col-span-4">Chức năng</div>
                                    <div className="md:col-span-2">Chế độ</div>
                                    <div className="md:col-span-6 text-right pr-10">Thời gian hiệu lực</div>
                                </div>

                                <div className="bg-card">
                                    <FeatureRow label="Giảng viên GỬI DUYỆT đề tài" modeName="GV_RA_DE_MODE" startName="GV_RA_DE_START" endName="GV_RA_DE_END" featureKey="GV_RA_DE" />
                                    <FeatureRow label="Sinh viên tạo nhóm" modeName="SV_TAO_NHOM_MODE" startName="SV_TAO_NHOM_START" endName="SV_TAO_NHOM_END" featureKey="SV_TAO_NHOM" />
                                    <FeatureRow label="Sinh viên đăng ký đề tài" modeName="SV_DANGKY_DE_MODE" startName="SV_DANGKY_DE_START" endName="SV_DANGKY_DE_END" featureKey="SV_DANGKY_DE" />
                                    <FeatureRow label="Sinh viên nộp bài" modeName="SV_NOP_BAI_MODE" startName="SV_NOP_BAI_START" endName="SV_NOP_BAI_END" featureKey="SV_NOP_BAI" />
                                    <FeatureRow label="Giảng viên chấm điểm (HD/PB)" modeName="CHAM_DIEM_MODE" startName="CHAM_DIEM_START" endName="CHAM_DIEM_END" featureKey="CHAM_DIEM" isLast />
                                </div>
                            </Card>

                            <Separator className="my-6" />

                            {/* --- SECTION 2: CÀI ĐẶT KHÁC --- */}
                            <div className="grid gap-6 md:grid-cols-2">
                                {/* Cài đặt Nhóm */}
                                <Card className="shadow-sm h-full border bg-card">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Users className="h-4 w-4 text-indigo-500" /> Quy định Nhóm
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <FormField
                                            control={form.control}
                                            name="SO_THANHVIEN_TOIDA"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm text-muted-foreground">Số thành viên tối đa / nhóm</FormLabel>
                                                    <FormControl>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Input type="number" {...field} className="w-20 text-center font-bold bg-background" disabled={isLoadingSettings} />
                                                            <span className="text-sm">sinh viên</span>
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>

                                {/* Cài đặt Điểm */}
                                <Card className="shadow-sm h-full border bg-card">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Percent className="h-4 w-4 text-green-500" /> Tỷ trọng điểm
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-3 gap-2">
                                            <FormField
                                                control={form.control}
                                                name="TYTRONG_GVHD"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1">
                                                        <FormLabel className="text-[11px] text-muted-foreground uppercase">GVHD</FormLabel>
                                                        <FormControl><Input type="number" {...field} className="text-center font-semibold bg-background h-9" /></FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="TYTRONG_GVPB"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1">
                                                        <FormLabel className="text-[11px] text-muted-foreground uppercase">GVPB</FormLabel>
                                                        <FormControl><Input type="number" {...field} className="text-center font-semibold bg-background h-9" /></FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="TYTRONG_HD"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1">
                                                        <FormLabel className="text-[11px] text-muted-foreground uppercase">Hội đồng</FormLabel>
                                                        <FormControl><Input type="number" {...field} className="text-center font-semibold bg-background h-9" /></FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Thanh Progress Bar */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-xs font-medium">
                                                <span>Tổng cộng</span>
                                                <span className={isTotalValid ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                                                    {Math.round(totalWeight)}%
                                                </span>
                                            </div>
                                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden flex">
                                                <div style={{ width: `${form.watch('TYTRONG_GVHD') || 0}%` }} className="bg-blue-500 h-full" />
                                                <div style={{ width: `${form.watch('TYTRONG_GVPB') || 0}%` }} className="bg-purple-500 h-full" />
                                                <div style={{ width: `${form.watch('TYTRONG_HD') || 0}%` }} className="bg-orange-500 h-full" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Floating Action Bar */}
                            <div className="fixed bottom-6 right-6 md:right-10 z-50">
                                <Button 
                                    type="submit" 
                                    size="lg" 
                                    disabled={isSaving || isLoadingSettings || !isTotalValid} 
                                    className="shadow-xl h-11 px-6 rounded-full transition-all hover:scale-105 bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                    Lưu Cài Đặt
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}
            </div>
        </div>
    );
};

export default GeneralSettingsPage;