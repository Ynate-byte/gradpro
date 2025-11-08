import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getAllPlans } from '@/api/thesisPlanService';
import { getChuyenNganhs } from '@/api/userService';

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
                    ID_KEHOACH: topic.ID_KEHOACH || '',
                    TEN_DETAI: topic.TEN_DETAI || '',
                    MOTA: topic.MOTA || '',
                    ID_CHUYENNGANH: topic.ID_CHUYENNGANH || '',
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
            const plans = await getAllPlans();
            console.log('Plans:', plans);

            const majors = await getChuyenNganhs();
            console.log('Majors:', majors);

            setPlans(plans || []);
            setMajors(majors || []);
        } catch (error) {
            console.error('Error loading data:', error);
            setError('Không thể tải dữ liệu. Vui lòng thử lại.');
        } finally {
            setDataLoading(false);
        }
    };


    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.ID_KEHOACH || !formData.TEN_DETAI || !formData.MOTA) {
            alert('Vui lòng điền đầy đủ thông tin bắt buộc');
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {topic ? 'Chỉnh sửa đề tài' : 'Tạo đề tài mới'}
                    </DialogTitle>
                    <DialogDescription>
                        {topic ? 'Cập nhật thông tin đề tài' : 'Điền thông tin để tạo đề tài khóa luận mới'}
                    </DialogDescription>
                </DialogHeader>
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="ID_KEHOACH">Kế hoạch khóa luận <span className="text-red-500">*</span></Label>
                            <Select
                                value={formData.ID_KEHOACH}
                                onValueChange={(value) => handleInputChange('ID_KEHOACH', value)}
                                disabled={dataLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={dataLoading ? "Đang tải..." : "Chọn kế hoạch"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {plans.map((plan) => (
                                        <SelectItem key={plan.ID_KEHOACH} value={plan.ID_KEHOACH.toString()}>
                                            {plan.TEN_DOT} - {plan.NAMHOC} ({plan.TRANGTHAI})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ID_CHUYENNGANH">Chuyên ngành</Label>
                            <Select
                                value={formData.ID_CHUYENNGANH}
                                onValueChange={(value) => handleInputChange('ID_CHUYENNGANH', value)}
                                disabled={dataLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={dataLoading ? "Đang tải..." : "Chọn chuyên ngành (tùy chọn)"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {majors.map((major) => (
                                        <SelectItem key={major.ID_CHUYENNGANH} value={major.ID_CHUYENNGANH.toString()}>
                                            {major.TEN_CHUYENNGANH}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="TEN_DETAI">Tên đề tài <span className="text-red-500">*</span></Label>
                        <Input
                            id="TEN_DETAI"
                            value={formData.TEN_DETAI}
                            onChange={(e) => handleInputChange('TEN_DETAI', e.target.value)}
                            placeholder="Nhập tên đề tài"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="MOTA">Mô tả đề tài <span className="text-red-500">*</span></Label>
                        <Textarea
                            id="MOTA"
                            value={formData.MOTA}
                            onChange={(e) => handleInputChange('MOTA', e.target.value)}
                            placeholder="Mô tả chi tiết về đề tài"
                            rows={3}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="YEUCAU">Yêu cầu</Label>
                            <Textarea
                                id="YEUCAU"
                                value={formData.YEUCAU}
                                onChange={(e) => handleInputChange('YEUCAU', e.target.value)}
                                placeholder="Yêu cầu của đề tài"
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="MUCTIEU">Mục tiêu</Label>
                            <Textarea
                                id="MUCTIEU"
                                value={formData.MUCTIEU}
                                onChange={(e) => handleInputChange('MUCTIEU', e.target.value)}
                                placeholder="Mục tiêu của đề tài"
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="KETQUA_MONGDOI">Kết quả mong đợi</Label>
                        <Textarea
                            id="KETQUA_MONGDOI"
                            value={formData.KETQUA_MONGDOI}
                            onChange={(e) => handleInputChange('KETQUA_MONGDOI', e.target.value)}
                            placeholder="Kết quả mong đợi của đề tài"
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="SO_NHOM_TOIDA">Số nhóm tối đa</Label>
                        <Input
                            id="SO_NHOM_TOIDA"
                            type="number"
                            min="1"
                            max="10"
                            value={formData.SO_NHOM_TOIDA}
                            onChange={(e) => handleInputChange('SO_NHOM_TOIDA', parseInt(e.target.value) || 1)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Đang xử lý...' : (topic ? 'Cập nhật' : 'Tạo đề tài')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateTopicDialog;