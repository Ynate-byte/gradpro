import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Send, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { thesisTopicService } from '@/api/thesisTopicService';
import SuggestionDialog from './SuggestionDialog';
import { toast } from 'sonner';

const TopicDetailDialog = ({ open, onOpenChange, topicId }) => {
    const { user } = useAuth();
    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);

    useEffect(() => {
        if (open && topicId) {
            loadTopicDetails();
        }
    }, [open, topicId]);

    const loadTopicDetails = async () => {
        try {
            setLoading(true);
            const response = await thesisTopicService.getTopicById(topicId);
            setTopic(response.data);
        } catch (error) {
            console.error('Error loading topic details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSuggestion = () => {
        setShowSuggestionDialog(true);
    };

    const handleSubmitSuggestion = async (suggestion) => {
        try {
            const response = await thesisTopicService.addSuggestion(topic.ID_DETAI, { NOIDUNG_GOIY: suggestion });
            toast.success(response.data.message || 'Góp ý đã được gửi thành công!');
            setShowSuggestionDialog(false);
            loadTopicDetails(); // Reload to show new suggestion
        } catch (error) {
            console.error('Error adding suggestion:', error);
            const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi gửi góp ý.';
            toast.error(errorMessage);
        }
    };



    const getStatusBadge = (status) => {
        const statusConfig = {
            'Nháp': { variant: 'secondary', label: 'Nháp' },
            'Chờ duyệt': { variant: 'warning', label: 'Chờ duyệt' },
            'Yêu cầu chỉnh sửa': { variant: 'destructive', label: 'Yêu cầu chỉnh sửa' },
            'Đã duyệt': { variant: 'default', label: 'Đã duyệt' },
            'Đã đầy': { variant: 'outline', label: 'Đã đầy' },
            'Đã khóa': { variant: 'destructive', label: 'Đã khóa' }
        };

        const config = statusConfig[status] || { variant: 'secondary', label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    if (loading) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-center items-center h-64">
                        Đang tải...
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (!topic) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Chi tiết đề tài
                        {getStatusBadge(topic.TRANGTHAI)}
                    </DialogTitle>
                    <DialogDescription>
                        Mã đề tài: {topic.MA_DETAI}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Thông tin cơ bản</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Tên đề tài</label>
                                <p className="text-lg font-semibold">{topic.TEN_DETAI}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Mô tả</label>
                                <p className="text-gray-600">{topic.MOTA}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Chuyên ngành</label>
                                    <p>{topic.chuyennganh?.TEN_CHUYENNGANH || 'Tất cả'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Giảng viên đề xuất</label>
                                    <p>{topic.ten_giang_vien || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Số nhóm tối đa</label>
                                    <p>{topic.SO_NHOM_TOIDA}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Đã đăng ký</label>
                                    <p>{topic.SO_NHOM_HIENTAI}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Ngày tạo</label>
                                <p>{new Date(topic.NGAYTAO).toLocaleDateString('vi-VN')}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Admin Edit Request */}
                    {topic.TRANGTHAI === 'Yêu cầu chỉnh sửa' && topic.LYDO_TUCHOI && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-red-600">Yêu cầu chỉnh sửa từ Admin</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <label className="text-sm font-medium text-red-700">Lý do yêu cầu chỉnh sửa</label>
                                    <p className="text-red-600 mt-1">{topic.LYDO_TUCHOI}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Detailed Requirements */}
                    {(topic.YEUCAU || topic.MUCTIEU || topic.KETQUA_MONGDOI) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Yêu cầu chi tiết</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {topic.YEUCAU && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Yêu cầu</label>
                                        <p className="text-gray-600">{topic.YEUCAU}</p>
                                    </div>
                                )}
                                {topic.MUCTIEU && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Mục tiêu</label>
                                        <p className="text-gray-600">{topic.MUCTIEU}</p>
                                    </div>
                                )}
                                {topic.KETQUA_MONGDOI && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Kết quả mong đợi</label>
                                        <p className="text-gray-600">{topic.KETQUA_MONGDOI}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Suggestions */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Góp ý từ giảng viên</CardTitle>
                                <div className="flex gap-2">
                                    {topic.ID_NGUOI_DEXUAT !== user?.giangvien?.ID_GIANGVIEN && (topic.TRANGTHAI === 'Nháp' || topic.TRANGTHAI === 'Chờ duyệt') && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddSuggestion}
                                        >
                                            <Send className="w-4 h-4 mr-1" />
                                            Thêm góp ý
                                        </Button>
                                    )}

                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {topic.goiyDetai && topic.goiyDetai.length > 0 ? (
                                <div className="space-y-4">
                                    {topic.goiyDetai.map((suggestion) => (
                                        <div key={suggestion.ID_GOIY} className="border rounded-lg p-4 bg-gray-50">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {suggestion.nguoiGoiy?.nguoidung?.HODEM_VA_TEN || 'N/A'}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(suggestion.NGAYTAO).toLocaleDateString('vi-VN')}
                                                </span>
                                            </div>
                                            <p className="text-gray-600">{suggestion.NOIDUNG_GOIY}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">Chưa có góp ý nào</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Registered Groups */}
                    {topic.phancongDetaiNhom && topic.phancongDetaiNhom.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Nhóm đã đăng ký</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {topic.phancongDetaiNhom.map((assignment) => (
                                    <div key={assignment.ID_PHANCONG} className="border rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium">
                                                Nhóm: {assignment.nhom?.TEN_NHOM || 'N/A'}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {new Date(assignment.NGAY_PHANCONG).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            <p>Trưởng nhóm: {assignment.nhom?.nhomtruong?.nguoidung?.HODEM_VA_TEN || 'N/A'}</p>
                                            <p>Thành viên: {assignment.nhom?.thanhvienNhom?.map(tv => tv.nguoidung?.HODEM_VA_TEN).join(', ') || 'N/A'}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <SuggestionDialog
                    open={showSuggestionDialog}
                    onOpenChange={setShowSuggestionDialog}
                    onSubmit={handleSubmitSuggestion}
                    topic={topic}
                />
            </DialogContent>
        </Dialog>
    );
};

export default TopicDetailDialog;