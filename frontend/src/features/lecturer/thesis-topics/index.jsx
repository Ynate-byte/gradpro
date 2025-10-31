import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, Edit, Trash2, Send, BookOpen, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import CreateTopicDialog from './components/CreateTopicDialog';
import TopicDetailDialog from './components/TopicDetailDialog';
import SuggestionDialog from './components/SuggestionDialog';
import { thesisTopicService } from '@/api/thesisTopicService';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

const ThesisTopicsPage = () => {
    const { user } = useAuth();
    const [topics, setTopics] = useState([]);
    const [supervisedTopics, setSupervisedTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showTopicDetailDialog, setShowTopicDetailDialog] = useState(false);
    const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
    const [showSubmitApprovalDialog, setShowSubmitApprovalDialog] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [editingTopic, setEditingTopic] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [topicFilter, setTopicFilter] = useState('all');

    useEffect(() => {
        loadTopics();
        loadSupervisedTopics();
    }, []);

    const loadTopics = async () => {
        try {
            setLoading(true);
            const response = await thesisTopicService.getTopics({});
            setTopics(response.data.data || []);
        } catch (error) {
            console.error('Error loading topics:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSupervisedTopics = async () => {
        try {
            const response = await thesisTopicService.getSupervisedTopics();
            setSupervisedTopics(response.data.data || []);
        } catch (error) {
            console.error('Error loading supervised topics:', error);
            setSupervisedTopics([]);
        }
    };

    const handleCreateTopic = async (topicData) => {
        try {
            await thesisTopicService.createTopic(topicData);
            setShowCreateDialog(false);
            setEditingTopic(null);
            loadTopics();
        } catch (error) {
            console.error('Error creating topic:', error);
        }
    };

    const handleEditTopic = async (topicData) => {
        try {
            await thesisTopicService.updateTopic(editingTopic.ID_DETAI, topicData);
            setShowCreateDialog(false);
            setEditingTopic(null);
            loadTopics();
        } catch (error) {
            console.error('Error updating topic:', error);
        }
    };

    const handleSubmitForApproval = async (topicId) => {
        try {
            await thesisTopicService.submitForApproval(topicId);
            loadTopics();
        } catch (error) {
            console.error('Error submitting for approval:', error);
        }
    };

    const handleDeleteTopic = async (topicId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa đề tài này?')) return;
        try {
            await thesisTopicService.deleteTopic(topicId);
            loadTopics();
        } catch (error) {
            console.error('Error deleting topic:', error);
        }
    };

    const handleViewTopicDetails = (topicId) => {
        setSelectedTopicId(topicId);
        setShowTopicDetailDialog(true);
    };

    const handleAddSuggestion = (topicId) => {
        setSelectedTopicId(topicId);
        setShowSuggestionDialog(true);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Nháp':
                return <Badge className="bg-gray-400 text-white">Nháp</Badge>;
            case 'Chờ duyệt':
                return <Badge className="bg-yellow-500 text-white">Chờ duyệt</Badge>;
            case 'Yêu cầu chỉnh sửa':
                return <Badge className="bg-orange-500 text-white">Yêu cầu chỉnh sửa</Badge>;
            case 'Đã duyệt':
                return <Badge className="bg-green-600 text-white">Đã duyệt</Badge>;
            case 'Từ chối':
                return <Badge className="bg-red-600 text-white">Từ chối</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };


    if (loading) {
        return <div className="flex justify-center items-center h-64">Đang tải...</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Quản lý Đề tài Khóa luận</h1>
                {(user?.vaitro?.TEN_VAITRO === 'Giảng viên' || user?.vaitro?.TEN_VAITRO === 'Admin') && (
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo đề tài mới
                    </Button>
                )}
            </div>

            {/* Bộ lọc */}
            <div className="flex gap-4 mb-4">
                <Select value={topicFilter} onValueChange={setTopicFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Lọc theo đề tài" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả các đề tài</SelectItem>
                        <SelectItem value="mine">Đề tài của tôi</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Lọc theo trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="Nháp">Nháp</SelectItem>
                        <SelectItem value="Chờ duyệt">Chờ duyệt</SelectItem>
                        <SelectItem value="Yêu cầu chỉnh sửa">Yêu cầu chỉnh sửa</SelectItem>
                        <SelectItem value="Đã duyệt">Đã duyệt</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Danh sách đề tài dạng bảng */}
            <div className="border rounded-lg shadow-sm overflow-hidden bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px] text-center">STT</TableHead>
                            <TableHead>Tên đề tài</TableHead>
                            <TableHead>Mã đề tài</TableHead>
                            <TableHead>Chuyên ngành</TableHead>
                            <TableHead>Giảng viên đề xuất</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead className="text-center w-[250px]">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {topics
                            .filter(t => statusFilter === 'all' || t.TRANGTHAI === statusFilter)
                            .filter(t => topicFilter === 'all' || t.ID_NGUOI_DEXUAT === user?.giangvien?.ID_GIANGVIEN)
                            .map((topic, index) => (
                                <TableRow key={topic.ID_DETAI}>
                                    <TableCell className="text-center">{index + 1}</TableCell>
                                    <TableCell className="font-medium">{topic.TEN_DETAI}</TableCell>
                                    <TableCell>{topic.MA_DETAI}</TableCell>
                                    <TableCell>{topic.chuyennganh?.TEN_CHUYENNGANH || 'Tất cả'}</TableCell>
                                    <TableCell>{topic.ten_giang_vien || 'N/A'}</TableCell>
                                    <TableCell>{getStatusBadge(topic.TRANGTHAI)}</TableCell>
                                    <TableCell className="text-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewTopicDetails(topic.ID_DETAI)}
                                        >
                                            <Eye className="w-4 h-4 mr-1" /> Xem
                                        </Button>

                                        {topic.ID_NGUOI_DEXUAT === user?.giangvien?.ID_GIANGVIEN && ['Nháp', 'Yêu cầu chỉnh sửa'].includes(topic.TRANGTHAI) && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingTopic(topic);
                                                        setShowCreateDialog(true);
                                                    }}
                                                >
                                                    <Edit className="w-4 h-4 mr-1" /> Sửa
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedTopicId(topic.ID_DETAI);
                                                        setShowSubmitApprovalDialog(true);
                                                    }}
                                                >
                                                    <Send className="w-4 h-4 mr-1" /> Gửi
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDeleteTopic(topic.ID_DETAI)}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-1" /> Xóa
                                                </Button>
                                            </>
                                        )}

                                        {topic.ID_NGUOI_DEXUAT !== user?.giangvien?.ID_GIANGVIEN && ['Nháp', 'Chờ duyệt'].includes(topic.TRANGTHAI) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddSuggestion(topic.ID_DETAI)}
                                            >
                                                <Send className="w-4 h-4 mr-1" /> Góp ý
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>

            {/* Dialogs */}
            <CreateTopicDialog
                open={showCreateDialog}
                onOpenChange={(open) => {
                    setShowCreateDialog(open);
                    if (!open) setEditingTopic(null);
                }}
                onSubmit={editingTopic ? handleEditTopic : handleCreateTopic}
                topic={editingTopic}
            />

            <TopicDetailDialog
                open={showTopicDetailDialog}
                onOpenChange={setShowTopicDetailDialog}
                topicId={selectedTopicId}
            />

            <SuggestionDialog
                open={showSuggestionDialog}
                onOpenChange={setShowSuggestionDialog}
                onSubmit={async (suggestion) => {
                    try {
                        const res = await thesisTopicService.addSuggestion(selectedTopicId, { NOIDUNG_GOIY: suggestion });
                        toast.success(res.data.message || 'Góp ý đã được gửi!');
                        setShowSuggestionDialog(false);
                        loadTopics();
                    } catch (error) {
                        toast.error('Có lỗi khi gửi góp ý');
                    }
                }}
                topic={topics.find(t => t.ID_DETAI === selectedTopicId)}
            />

            <Dialog open={showSubmitApprovalDialog} onOpenChange={setShowSubmitApprovalDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Gửi duyệt đề tài</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn gửi đề tài này để duyệt không?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-sm text-gray-600">
                        Sau khi gửi duyệt, đề tài sẽ chuyển sang trạng thái "Chờ duyệt".
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowSubmitApprovalDialog(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={() => {
                                handleSubmitForApproval(selectedTopicId);
                                setShowSubmitApprovalDialog(false);
                            }}
                        >
                            Gửi duyệt
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ThesisTopicsPage;