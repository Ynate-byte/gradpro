import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { thesisTopicService } from '@/api/thesisTopicService';
import { getAllPlans, getThesisPlanById } from '@/api/thesisPlanService';
import { Loader2, Copy, AlertCircle, CheckCircle2, Info, RotateCcw, LayoutGrid, List } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import lecturerQuotaService from '@/api/lecturerQuotaService';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';

const ReuseTopicDialog = ({ open, onOpenChange, onReuseSuccess }) => {
    // ==========================================
    // GIỮ NGUYÊN LOGIC GỐC (KHÔNG THAY ĐỔI)
    // ==========================================
    const [loading, setLoading] = useState(false);
    const [topics, setTopics] = useState([]);
    const [allPlans, setAllPlans] = useState([]);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [error, setError] = useState(null);

    const [reuseLimitInfo, setReuseLimitInfo] = useState({
        limit: 0,
        used: 0,
        quota: 0,
        percentage: 0,
        loading: false,
        canReuse: true
    });

    useEffect(() => {
        if (open) loadData();
        else resetForm();
    }, [open]);

    useEffect(() => {
        if (selectedPlanId) {
            calculateReuseLimit(selectedPlanId);
        }
    }, [selectedPlanId]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [plansData, topicsData] = await Promise.all([
                getAllPlans(),
                thesisTopicService.getApprovedTopicsOfLecturer(),
            ]);
            setAllPlans(plansData || []);
            setTopics(topicsData || []);
        } catch (err) {
            setError('Không thể tải dữ liệu. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTopics([]);
        setAllPlans([]);
        setAvailablePlans([]);
        setSelectedTopicId(null);
        setSelectedPlanId('');
        setError(null);
        setReuseLimitInfo({ limit: 0, used: 0, quota: 0, percentage: 0, loading: false, canReuse: true });
    };

    const calculateReuseLimit = async (planId) => {
        setReuseLimitInfo(prev => ({ ...prev, loading: true }));
        try {
            const planRes = await getThesisPlanById(planId);
            const percentage = planRes.TYLE_TAISUDUNG_TOIDA || 20;

            const quotaRes = await lecturerQuotaService.getMyQuota({ plan_id: planId });
            const quotaData = quotaRes.data;

            if (!quotaData) {
                setReuseLimitInfo({ limit: 0, used: 0, quota: 0, percentage, loading: false, canReuse: false, error: "Chưa có Quota" });
                return;
            }

            const assignedQuota = quotaData.quota_assigned || 0;

            const topicsRes = await thesisTopicService.getAdminTopics({
                plan_id: planId,
                filter_mode: 'my'
            });

            const myTopicsInPlan = topicsRes.data?.data || (Array.isArray(topicsRes.data) ? topicsRes.data : []) || [];
            const usedCount = myTopicsInPlan.filter(t => t.LA_TAISUDUNG == 1).length;

            const limit = Math.floor((assignedQuota * percentage) / 100);
            const canReuse = usedCount < limit;

            setReuseLimitInfo({
                limit,
                used: usedCount,
                quota: assignedQuota,
                percentage,
                loading: false,
                canReuse
            });

        } catch (err) {
            console.error(err);
            setReuseLimitInfo(prev => ({ ...prev, loading: false, error: "Lỗi tính toán" }));
        }
    };

    const handleSelectTopic = (topicId) => {
        const topic = topics.find(t => t.ID_DETAI === topicId);
        if (!topic) return;
        setSelectedTopicId(topicId);
        const existingPlanIds = topics
            .filter(t => t.TEN_DETAI === topic.TEN_DETAI && t.TRANGTHAI === 'Đã duyệt')
            .map(t => String(t.ID_KEHOACH));
        const filtered = allPlans.filter(p => !existingPlanIds.includes(String(p.ID_KEHOACH)));
        setAvailablePlans(filtered);
        if (filtered.length > 0 && !filtered.some(p => String(p.ID_KEHOACH) === selectedPlanId)) {
            setSelectedPlanId(String(filtered[0].ID_KEHOACH));
        }
    };

    const handleReuse = async () => {
        if (!reuseLimitInfo.canReuse) {
            setError(`Bạn đã đạt giới hạn tái sử dụng (${reuseLimitInfo.used}/${reuseLimitInfo.limit}) cho kế hoạch này.`);
            return;
        }

        if (!selectedTopicId || !selectedPlanId) {
            setError('Vui lòng chọn đầy đủ đề tài và kế hoạch!');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await thesisTopicService.reuseApprovedTopic({
                existing_topic_id: selectedTopicId,
                new_plan_id: selectedPlanId,
            });
            onReuseSuccess?.();
            onOpenChange(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Tái sử dụng thất bại');
        } finally {
            setLoading(false);
        }
    };

    const uniqueTopics = [...new Map(topics.map(t => [t.TEN_DETAI, t])).values()];
    // ==========================================
    // KẾT THÚC LOGIC GỐC
    // ==========================================

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Tăng chiều rộng dialog lên max-w-6xl để chứa 2 cột thoải mái */}
            <DialogContent className="sm:max-w-[1100px] h-[85vh] p-0 flex flex-col overflow-hidden bg-background">
                
                {/* Header */}
                <DialogHeader className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shrink-0">
                    <DialogTitle className="text-xl font-bold flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg shadow-sm">
                            <Copy className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span>Tái sử dụng đề tài</span>
                            <span className="text-sm font-normal text-blue-100 opacity-90">
                                Chọn đề tài cũ và áp dụng vào kỳ bảo vệ mới
                            </span>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {/* Body - Layout 2 Cột */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
                    
                    {/* CỘT TRÁI (4/12): Cấu hình & Thông tin giới hạn */}
                    <div className="md:col-span-5 lg:col-span-4 bg-muted/30 border-r p-6 overflow-y-auto flex flex-col gap-6">
                        
                        {/* 1. Chọn Kế hoạch */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">1</span>
                                Chọn kế hoạch đích
                            </Label>
                            
                            {selectedTopicId && availablePlans.length === 0 ? (
                                <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
                                    <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                    <AlertDescription className="text-orange-800 dark:text-orange-300 text-xs">
                                        Đề tài này đã có mặt ở tất cả các kế hoạch hiện tại.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={!selectedTopicId || loading}>
                                    <SelectTrigger className="w-full bg-background border-input shadow-sm">
                                        <SelectValue placeholder="-- Chọn kế hoạch --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availablePlans.map(plan => (
                                            <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                                {plan.TEN_DOT} 
                                                <Badge variant="outline" className="ml-2 text-[10px] h-5">{plan.TRANGTHAI}</Badge>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                             {!selectedTopicId && (
                                <div className="text-xs text-muted-foreground italic flex items-center gap-1">
                                    <Info className="w-3 h-3" /> Vui lòng chọn đề tài ở cột bên phải trước
                                </div>
                            )}
                        </div>

                        {/* 2. Thông tin Quota (Hiển thị khi đã chọn Plan) */}
                        {selectedPlanId && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <Label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">2</span>
                                    Kiểm tra hạn ngạch
                                </Label>
                                
                                <Card className={`p-4 border shadow-sm ${reuseLimitInfo.canReuse 
                                    ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' 
                                    : 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-800'}`}>
                                    
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                            <RotateCcw className={`w-4 h-4 ${reuseLimitInfo.canReuse ? 'text-blue-600' : 'text-red-600'}`} />
                                            Giới hạn Tái sử dụng
                                        </div>
                                        <Badge variant={reuseLimitInfo.canReuse ? "default" : "destructive"}>
                                            {reuseLimitInfo.percentage}%
                                        </Badge>
                                    </div>

                                    {reuseLimitInfo.loading ? (
                                        <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                                            <Loader2 className="w-4 h-4 animate-spin mr-2"/> Đang tính toán...
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Đã dùng</span>
                                                    <span className="font-mono font-medium">
                                                        {reuseLimitInfo.used} <span className="text-muted-foreground">/ {reuseLimitInfo.limit}</span>
                                                    </span>
                                                </div>
                                                <Progress 
                                                    value={reuseLimitInfo.limit > 0 ? (reuseLimitInfo.used / reuseLimitInfo.limit) * 100 : 100} 
                                                    className={`h-2.5 ${!reuseLimitInfo.canReuse ? "[&>div]:bg-red-600" : ""}`} 
                                                />
                                            </div>

                                            <div className="pt-3 border-t border-dashed border-gray-300 dark:border-gray-700">
                                                {!reuseLimitInfo.canReuse ? (
                                                    <div className="flex gap-2 text-xs text-red-600 dark:text-red-400 font-medium">
                                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                                        <span>Bạn đã hết lượt tái sử dụng đề tài cho kế hoạch này.</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2 text-xs text-blue-600 dark:text-blue-400">
                                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                        <span>Đủ điều kiện. Đề tài sẽ được <b>Duyệt tự động</b> ngay sau khi thêm.</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        )}

                        {/* Error Box ở cột trái */}
                        {error && (
                            <Alert variant="destructive" className="mt-auto animate-bell-shake">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
                            </Alert>
                        )}
                    </div>

                    {/* CỘT PHẢI (8/12): Danh sách đề tài */}
                    <div className="md:col-span-7 lg:col-span-8 flex flex-col h-full overflow-hidden bg-background">
                        <div className="p-4 border-b bg-card flex items-center justify-between shrink-0">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <List className="w-4 h-4 text-muted-foreground" />
                                Danh sách đề tài đã duyệt ({uniqueTopics.length})
                            </h3>
                            <div className="text-xs text-muted-foreground">
                                Chọn 1 đề tài bên dưới
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <span className="text-sm">Đang tải dữ liệu...</span>
                                </div>
                            ) : uniqueTopics.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground border-2 border-dashed rounded-lg m-4">
                                    <div className="p-4 bg-muted rounded-full">
                                        <LayoutGrid className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p className="text-sm">Bạn chưa có đề tài nào được duyệt trước đây</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 pb-4">
                                    {uniqueTopics.map((topic) => {
                                        const isSelected = selectedTopicId === topic.ID_DETAI;
                                        return (
                                            <div
                                                key={topic.ID_DETAI}
                                                onClick={() => handleSelectTopic(topic.ID_DETAI)}
                                                className={`
                                                    group relative flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer
                                                    hover:shadow-md hover:border-primary/50
                                                    ${isSelected 
                                                        ? 'bg-blue-50 border-blue-600 shadow-sm dark:bg-blue-900/20 dark:border-blue-500 ring-1 ring-blue-600/20' 
                                                        : 'bg-card border-border'}
                                                `}
                                            >
                                                {/* Radio Indicator */}
                                                <div className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors
                                                    ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground group-hover:border-primary'}
                                                `}>
                                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className={`font-semibold text-sm leading-tight mb-1 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                            {topic.TEN_DETAI}
                                                        </h4>
                                                        <Badge variant="secondary" className="text-[10px] shrink-0 whitespace-nowrap">
                                                            Đã duyệt
                                                        </Badge>
                                                    </div>
                                                    
                                                    {topic.MOTA && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 group-hover:text-foreground/80 transition-colors">
                                                            {topic.MOTA}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                                                        <span className="bg-muted px-1.5 py-0.5 rounded border">
                                                            {topic.chuyennganh?.TEN_CHUYENNGANH || topic.khoaBomon?.TEN_KHOA_BOMON || 'N/A'}
                                                        </span>
                                                        {topic.SV_THUCHIEN && (
                                                            <span className="flex items-center gap-1">
                                                                SV cũ: {topic.SV_THUCHIEN}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="p-4 border-t bg-background shrink-0 gap-3">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                        Hủy bỏ
                    </Button>
                    <Button 
                        onClick={handleReuse} 
                        disabled={!selectedTopicId || !selectedPlanId || loading || !reuseLimitInfo.canReuse}
                        className="min-w-[150px] shadow-lg"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                        Xác nhận tái sử dụng
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
};

export default ReuseTopicDialog;