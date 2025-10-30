import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { thesisTopicService } from '@/api/thesisTopicService';
import { Users, Calendar, BookOpen, GraduationCap } from 'lucide-react';

const GroupsManagementDialog = ({ open, onOpenChange }) => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadGroups();
        }
    }, [open]);

    const loadGroups = async () => {
        try {
            setLoading(true);
            const response = await thesisTopicService.getGroupsForLecturer();
            setGroups(response.data || []);
        } catch (error) {
            console.error('Error loading groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'Đang thực hiện': { variant: 'default', label: 'Đang thực hiện' },
            'Đã hoàn thành': { variant: 'secondary', label: 'Đã hoàn thành' },
            'Không đạt': { variant: 'destructive', label: 'Không đạt' }
        };

        const config = statusConfig[status] || { variant: 'secondary', label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Quản lý nhóm đăng ký đề tài
                    </DialogTitle>
                    <DialogDescription>
                        Danh sách các nhóm đã đăng ký đề tài của bạn
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="text-gray-500">Đang tải...</div>
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Chưa có nhóm nào đăng ký đề tài của bạn
                        </div>
                    ) : (
                        groups.map((assignment) => (
                            <div key={assignment.ID_PHANCONG} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <GraduationCap className="w-4 h-4" />
                                            {assignment.nhom?.TEN_NHOM}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Mã nhóm: {assignment.nhom?.MA_NHOM}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(assignment.TRANGTHAI)}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Users className="w-4 h-4 text-gray-500" />
                                        <span>Trưởng nhóm: {assignment.nhom?.nhomtruong?.HODEM_VA_TEN || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <BookOpen className="w-4 h-4 text-gray-500" />
                                        <span>Đề tài: {assignment.detai?.TEN_DETAI || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="w-4 h-4 text-gray-500" />
                                        <span>Ngày phân công: {new Date(assignment.NGAY_PHANCONG).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </div>

                                <div className="border-t pt-3">
                                    <h4 className="font-medium mb-2">Thành viên nhóm:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {assignment.nhom?.thanhvienNhom?.map((member, index) => (
                                            <Badge key={index} variant="outline">
                                                {member.nguoidung?.HODEM_VA_TEN}
                                            </Badge>
                                        )) || <span className="text-sm text-gray-500">Chưa có thành viên</span>}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 mt-4">
                                    <Button variant="outline" size="sm">
                                        Xem chi tiết
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        Đánh giá
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GroupsManagementDialog;
