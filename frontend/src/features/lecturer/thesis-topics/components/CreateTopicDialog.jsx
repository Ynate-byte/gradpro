import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getAllPlans } from '@/api/thesisPlanService';
import { getChuyenNganhs } from '@/api/userService';
import { 
    Loader2, Save, BookType, Layers, FileText, 
    Target, CheckSquare, Award, Users, Calendar, Edit, Plus
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const CreateTopicDialog = ({ open, onOpenChange, onSubmit, topic = null }) => {
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const [plans, setPlans] = useState([]);
    const [majors, setMajors] = useState([]);
    const [error, setError] = useState(null);
    
    const [formData, setFormData] = useState({
        ID_KEHOACH: '',
        TEN_DETAI: '',
        MOTA: '',
        ID_CHUYENNGANH: '',
        YEUCAU: '',
        MUCTIEU: '',
        KETQUA_MONGDOI: '',
        SO_NHOM_TOIDA: 1,
    });

    useEffect(() => {
        if (open) {
            loadData();
            if (topic) {
                setFormData({
                    ID_KEHOACH: topic.ID_KEHOACH ? String(topic.ID_KEHOACH) : '',
                    TEN_DETAI: topic.TEN_DETAI || '',
                    MOTA: topic.MOTA || '',
                    ID_CHUYENNGANH: topic.ID_CHUYENNGANH ? String(topic.ID_CHUYENNGANH) : '',
                    YEUCAU: topic.YEUCAU || '',
                    MUCTIEU: topic.MUCTIEU || '',
                    KETQUA_MONGDOI: topic.KETQUA_MONGDOI || '',
                    SO_NHOM_TOIDA: topic.SO_NHOM_TOIDA || 1,
                });
            } else {
                setFormData({
                    ID_KEHOACH: '',
                    TEN_DETAI: '',
                    MOTA: '',
                    ID_CHUYENNGANH: '',
                    YEUCAU: '',
                    MUCTIEU: '',
                    KETQUA_MONGDOI: '',
                    SO_NHOM_TOIDA: 1,
                });
            }
        }
    }, [open, topic]);

    const loadData = async () => {
        setDataLoading(true);
        setError(null);
        try {
            const [plansData, majorsData] = await Promise.all([
                getAllPlans(), 
                getChuyenNganhs()
            ]);
            setPlans(plansData || []);
            setMajors(majorsData || []);
            
            if (!topic && plansData && plansData.length > 0 && !formData.ID_KEHOACH) {
                 setFormData(prev => ({...prev, ID_KEHOACH: String(plansData[0].ID_KEHOACH)}));
            }
        } catch (error) {
            console.error('Error loading data:', error);
            setError('Không thể tải dữ liệu kế hoạch/chuyên ngành. Vui lòng thử lại.');
        } finally {
            setDataLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.ID_KEHOACH || !formData.TEN_DETAI || !formData.MOTA) {
            return;
        }
        setLoading(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* [LAYOUT] Max width lớn hơn, bo góc mềm mại, shadow sâu */}
            <DialogContent className="max-w-3xl w-full h-[90vh] p-0 flex flex-col overflow-hidden bg-background gap-0 sm:rounded-xl shadow-2xl border-border/60">
                
                {/* 1. HEADER */}
                <DialogHeader className="px-8 py-6 border-b bg-muted/10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            {topic ? <Edit className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-bold tracking-tight">
                                {topic ? 'Chỉnh sửa đề tài' : 'Tạo đề tài mới'}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground">
                                {topic 
                                    ? 'Cập nhật thông tin chi tiết cho đề tài hiện có.' 
                                    : 'Điền đầy đủ thông tin để đề xuất đề tài khóa luận mới.'}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* 2. BODY (SCROLLABLE) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="px-8 py-6">
                        
                        {error && (
                            <Alert variant="destructive" className="mb-6">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <form id="create-topic-form" onSubmit={handleSubmit} className="space-y-8">
                            
                            {/* BLOCK 1: BỐI CẢNH (KẾ HOẠCH & CHUYÊN NGÀNH) */}
                            <div className="bg-secondary/30 p-5 rounded-xl border border-border/50 space-y-4">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3">Thiết lập chung</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2.5">
                                        <Label htmlFor="ID_KEHOACH" className="flex items-center gap-2 text-sm font-semibold">
                                            <Calendar className="w-4 h-4 text-blue-500" /> Kế hoạch khóa luận <span className="text-red-500">*</span>
                                        </Label>
                                        <Select 
                                            value={formData.ID_KEHOACH} 
                                            onValueChange={(value) => handleInputChange('ID_KEHOACH', value)} 
                                            disabled={dataLoading}
                                        >
                                            <SelectTrigger id="ID_KEHOACH" className="bg-background h-10">
                                                <SelectValue placeholder={dataLoading ? "Đang tải..." : "Chọn kế hoạch"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {plans.map((plan) => (
                                                    <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                                        {plan.TEN_DOT} ({plan.TRANGTHAI})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label htmlFor="ID_CHUYENNGANH" className="flex items-center gap-2 text-sm font-semibold">
                                            <Layers className="w-4 h-4 text-indigo-500" /> Chuyên ngành
                                        </Label>
                                        <Select 
                                            value={formData.ID_CHUYENNGANH} 
                                            onValueChange={(value) => handleInputChange('ID_CHUYENNGANH', value)} 
                                            disabled={dataLoading}
                                        >
                                            <SelectTrigger id="ID_CHUYENNGANH" className="bg-background h-10">
                                                <SelectValue placeholder={dataLoading ? "Đang tải..." : "Chọn chuyên ngành (Tùy chọn)"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {majors.map((major) => (
                                                    <SelectItem key={major.ID_CHUYENNGANH} value={String(major.ID_CHUYENNGANH)}>
                                                        {major.TEN_CHUYENNGANH}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* BLOCK 2: THÔNG TIN CHÍNH */}
                            <div className="space-y-5">
                                <div className="space-y-2.5">
                                    <Label htmlFor="TEN_DETAI" className="flex items-center gap-2 text-base font-semibold">
                                        <BookType className="w-4 h-4 text-primary" /> Tên đề tài <span className="text-red-500">*</span>
                                    </Label>
                                    <Input 
                                        id="TEN_DETAI" 
                                        value={formData.TEN_DETAI} 
                                        onChange={(e) => handleInputChange('TEN_DETAI', e.target.value)} 
                                        placeholder="Nhập tên đề tài đầy đủ, rõ ràng..." 
                                        required 
                                        className="h-12 text-base font-medium shadow-sm focus-visible:ring-primary/30"
                                    />
                                </div>

                                <div className="space-y-2.5">
                                    <Label htmlFor="MOTA" className="flex items-center gap-2 text-sm font-semibold">
                                        <FileText className="w-4 h-4 text-muted-foreground" /> Mô tả chi tiết <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea 
                                        id="MOTA" 
                                        value={formData.MOTA} 
                                        onChange={(e) => handleInputChange('MOTA', e.target.value)} 
                                        placeholder="Mô tả phạm vi, bối cảnh và nội dung chính của đề tài..." 
                                        rows={5} 
                                        required 
                                        className="leading-relaxed resize-y min-h-[100px] focus-visible:ring-primary/30"
                                    />
                                </div>
                            </div>

                            {/* BLOCK 3: CHI TIẾT CHUYÊN MÔN */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                <div className="space-y-2.5">
                                    <Label htmlFor="YEUCAU" className="flex items-center gap-2 text-sm font-semibold">
                                        <CheckSquare className="w-4 h-4 text-green-600" /> Yêu cầu kiến thức/kỹ năng
                                    </Label>
                                    <Textarea 
                                        id="YEUCAU" 
                                        value={formData.YEUCAU} 
                                        onChange={(e) => handleInputChange('YEUCAU', e.target.value)} 
                                        placeholder="- Nắm vững ReactJS, Laravel...&#10;- Kỹ năng phân tích thiết kế..." 
                                        rows={4}
                                        className="bg-muted/20 focus:bg-background transition-colors"
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="MUCTIEU" className="flex items-center gap-2 text-sm font-semibold">
                                        <Target className="w-4 h-4 text-red-600" /> Mục tiêu đề tài
                                    </Label>
                                    <Textarea 
                                        id="MUCTIEU" 
                                        value={formData.MUCTIEU} 
                                        onChange={(e) => handleInputChange('MUCTIEU', e.target.value)} 
                                        placeholder="VD: Xây dựng hoàn thiện hệ thống quản lý..." 
                                        rows={4} 
                                        className="bg-muted/20 focus:bg-background transition-colors"
                                    />
                                </div>
                            </div>

                            {/* BLOCK 4: KẾT QUẢ & SỐ LƯỢNG */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 items-start">
                                <div className="md:col-span-2 space-y-2.5">
                                    <Label htmlFor="KETQUA_MONGDOI" className="flex items-center gap-2 text-sm font-semibold">
                                        <Award className="w-4 h-4 text-orange-500" /> Kết quả mong đợi
                                    </Label>
                                    <Input 
                                        id="KETQUA_MONGDOI" 
                                        value={formData.KETQUA_MONGDOI} 
                                        onChange={(e) => handleInputChange('KETQUA_MONGDOI', e.target.value)} 
                                        placeholder="VD: Báo cáo, Source code, Demo, Bài báo khoa học..." 
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="SO_NHOM_TOIDA" className="flex items-center gap-2 text-sm font-semibold">
                                        <Users className="w-4 h-4 text-purple-500" /> Số nhóm tối đa
                                    </Label>
                                    <div className="relative">
                                        <Input 
                                            id="SO_NHOM_TOIDA" 
                                            type="number" 
                                            min="1" 
                                            max="10" 
                                            value={formData.SO_NHOM_TOIDA} 
                                            onChange={(e) => handleInputChange('SO_NHOM_TOIDA', parseInt(e.target.value) || 1)} 
                                            className="h-11 pl-4 text-lg font-bold text-center"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                            nhóm
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </form>
                    </div>
                </div>

                {/* 3. FOOTER (Fixed) */}
                <DialogFooter className="px-8 py-5 border-t bg-background shrink-0 flex items-center justify-between sm:justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="h-10 px-6">
                        Hủy bỏ
                    </Button>
                    <Button type="submit" form="create-topic-form" disabled={loading} className="h-10 px-8 font-semibold shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {topic ? 'Lưu thay đổi' : 'Tạo đề tài'}
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
};

export default CreateTopicDialog;