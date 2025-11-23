import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { thesisTopicService } from '@/api/thesisTopicService';
import { getAllPlans } from '@/api/thesisPlanService';
import { Loader2, Copy, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const ReuseTopicDialog = ({ open, onOpenChange, onReuseSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [topics, setTopics] = useState([]);
    const [allPlans, setAllPlans] = useState([]);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) loadData();
        else resetForm();
    }, [open]);

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
    };

    const handleSelectTopic = (topicId) => {
        const topic = topics.find(t => t.ID_DETAI === topicId);
        if (!topic) return;

        setSelectedTopicId(topicId);

        // Lọc kế hoạch chưa có đề tài trùng tên
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

    // Hiển thị mỗi đề tài chỉ 1 lần
    const uniqueTopics = [...new Map(topics.map(t => [t.TEN_DETAI, t])).values()];

    const selectedTopic = topics.find(t => t.ID_DETAI === selectedTopicId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Copy className="w-7 h-7" />
                        </div>
                        Tái sử dụng đề tài đã duyệt
                    </DialogTitle>
                    <p className="text-blue-100 mt-1">
                        Chọn một đề tài đã được duyệt và đưa vào kế hoạch mới
                    </p>
                </DialogHeader>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* Dropdown kế hoạch đích */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                            <Info className="w-4 h-4 text-blue-600" />
                            Kế hoạch đích để import
                        </label>
                        {selectedTopicId && availablePlans.length === 0 ? (
                            <Alert className="border-orange-200 bg-orange-50">
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                <AlertDescription className="text-orange-800">
                                    Đề tài "<strong>{selectedTopic?.TEN_DETAI}</strong>" đã tồn tại ở tất cả các kế hoạch hiện tại.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={!selectedTopicId || loading}>
                                <SelectTrigger className="w-full h-12 text-base">
                                    <SelectValue placeholder="Chọn kế hoạch để đưa đề tài vào..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availablePlans.map(plan => (
                                        <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                            <div className="flex items-center justify-between w-full">
                                                <span>{plan.TEN_DOT}</span>
                                                <Badge variant={plan.TRANGTHAI === 'Đang diễn ra' ? 'default' : 'secondary'} className="ml-3">
                                                    {plan.TRANGTHAI}
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {selectedTopicId && availablePlans.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                Đã tự động loại bỏ các kế hoạch mà đề tài đã tồn tại
                            </p>
                        )}
                    </div>

                    {/* Thông báo lỗi */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Danh sách đề tài */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                            Chọn đề tài để tái sử dụng
                        </h3>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                            </div>
                        ) : uniqueTopics.length === 0 ? (
                            <Card className="p-12 text-center text-muted-foreground border-dashed">
                                <div className="text-5xl mb-4">No topics</div>
                                <p>Bạn chưa có đề tài nào được duyệt</p>
                            </Card>
                        ) : (
                            <div className="grid gap-3 max-h-96 overflow-y-auto">
                                {uniqueTopics.map((topic) => {
                                    const isSelected = selectedTopicId === topic.ID_DETAI;
                                    return (
                                        <Card
                                            key={topic.ID_DETAI}
                                            className={`p-4 cursor-pointer transition-all duration-200 border-2 ${
                                                isSelected
                                                    ? 'border-blue-600 shadow-lg shadow-blue-100 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-400 hover:shadow-md'
                                            }`}
                                            onClick={() => handleSelectTopic(topic.ID_DETAI)}
                                        >
                                            <div className="flex items-start gap-4">
                                                <input
                                                    type="radio"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectTopic(topic.ID_DETAI)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="mt-1.5 w-5 h-5 text-blue-600"
                                                />
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-base text-gray-900">
                                                        {topic.TEN_DETAI}
                                                    </h4>
                                                    {topic.MOTA && (
                                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                            {topic.MOTA}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <span className="font-medium">Chuyên ngành:</span>
                                                            {topic.chuyennganh?.TEN_CHUYENNGANH || 'Không xác định'}
                                                        </span>
                                                        <Badge variant="outline" className="text-xs">
                                                            Đã duyệt
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="p-6 bg-gray-50 border-t flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        {selectedTopicId && selectedPlanId && (
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                Sẵn sàng tái sử dụng vào kế hoạch đã chọn
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" size="lg" onClick={() => onOpenChange(false)} disabled={loading}>
                            Hủy
                        </Button>
                        <Button
                            size="lg"
                            onClick={handleReuse}
                            disabled={!selectedTopicId || !selectedPlanId || loading || (selectedTopicId && availablePlans.length === 0)}
                            className="min-w-40 shadow-lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <Copy className="mr-2 h-5 w-5" />
                                    Tái sử dụng ngay
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ReuseTopicDialog;