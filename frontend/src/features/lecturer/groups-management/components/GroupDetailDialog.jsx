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
import { Button } from '@/components/ui/button';
import { Star, Users, Calendar, BookOpen, GraduationCap } from 'lucide-react';
import { thesisTopicService } from '@/api/thesisTopicService';
import { toast } from 'sonner';

const GroupDetailDialog = ({ open, onOpenChange, groupId }) => {
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && groupId) {
            loadGroupDetails();
        }
    }, [open, groupId]);

    const loadGroupDetails = async () => {
        try {
            setLoading(true);
            const response = await thesisTopicService.getGroupById(groupId);
            setGroup(response.data);
        } catch (error) {
            console.error('Error loading group details:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'Đang thực hiện': { variant: 'default', label: 'Đang thực hiện', className: 'bg-green-500 text-white hover:bg-green-600' },
            'Đã hoàn thành': { variant: 'secondary', label: 'Đã hoàn thành' },
            'Không đạt': { variant: 'destructive', label: 'Không đạt' }
        };

        const config = statusConfig[status] || { variant: 'secondary', label: status };
        return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
    };

    const handleEvaluateGroup = async (evaluation) => {
        try {
            // This would need to be implemented in the API service
            await thesisTopicService.evaluateGroup(groupId, evaluation);
            toast.success('Đánh giá đã được lưu thành công!');
            onOpenChange(false);
            // Reload data if needed
        } catch (error) {
            console.error('Error evaluating group:', error);
            toast.error('Có lỗi xảy ra khi đánh giá nhóm.');
        }
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

    if (!group) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5" />
                        Chi tiết nhóm: {group.TEN_NHOM}
                        {getStatusBadge(group.trang_thai)}
                    </DialogTitle>
                    <DialogDescription>
                        Mã nhóm: {group.MA_NHOM}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Thông tin cơ bản</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Tên nhóm</label>
                                    <p className="text-lg font-semibold">{group.TEN_NHOM}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Mã nhóm</label>
                                    <p>{group.MA_NHOM}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Trưởng nhóm</label>
                                    <p>{group.nhomtruong?.HODEM_VA_TEN || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Đề tài</label>
                                    <p>{group.detai?.TEN_DETAI || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Ngày phân công</label>
                                    <p>{group.ngay_phan_cong ? new Date(group.ngay_phan_cong).toLocaleDateString('vi-VN') : 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Trạng thái</label>
                                    <div className="mt-1">{getStatusBadge(group.trang_thai)}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Group Members */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Thành viên nhóm ({group.thanhviens?.length || 0})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {group.thanhviens?.map((member, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                <span className="text-sm font-medium text-blue-600">
                                                    {member.nguoidung?.HODEM_VA_TEN?.charAt(0) || '?'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium">{member.nguoidung?.HODEM_VA_TEN}</p>
                                                <p className="text-sm text-gray-500">{member.nguoidung?.EMAIL}</p>
                                            </div>
                                        </div>
                                        {member.ID_NGUOIDUNG === group.ID_NHOMTRUONG && (
                                            <Badge variant="outline">Trưởng nhóm</Badge>
                                        )}
                                    </div>
                                )) || (
                                        <p className="text-gray-500 text-center py-4">Chưa có thành viên</p>
                                    )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Topic Information */}
                    {group.detai && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5" />
                                    Thông tin đề tài
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Tên đề tài</label>
                                    <p className="text-lg font-semibold">{group.detai.TEN_DETAI}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Mô tả</label>
                                    <p className="text-gray-600">{group.detai.MOTA}</p>
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Chuyên ngành</label>
                                        <p>{group.detai.chuyennganh?.TEN_CHUYENNGANH || 'Tất cả'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Giảng viên hướng dẫn</label>
                                        <p>{group.gvhd?.nguoidung?.HODEM_VA_TEN || 'N/A'}</p>
                                    </div>

                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Progress and Evaluation */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Tiến độ và đánh giá
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center py-8">
                                <p className="text-gray-500">Chức năng đánh giá sẽ được phát triển trong tương lai</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Đóng
                    </Button>
                    <Button onClick={() => handleEvaluateGroup({})}>
                        <Star className="w-4 h-4 mr-1" />
                        Đánh giá
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GroupDetailDialog;