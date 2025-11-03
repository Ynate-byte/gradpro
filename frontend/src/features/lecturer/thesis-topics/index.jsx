import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Eye, Edit, Trash2, Send, BookOpen, Loader2, Users, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import CreateTopicDialog from './components/CreateTopicDialog';
import TopicDetailDialog from './components/TopicDetailDialog';
import SuggestionDialog from './components/SuggestionDialog';
import { thesisTopicService } from '@/api/thesisTopicService';
import lecturerQuotaService from '@/api/lecturerQuotaService';
import axios from '@/api/axiosConfig';
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
    const [specializationFilter, setSpecializationFilter] = useState('all');
    const [myTopicsFilter, setMyTopicsFilter] = useState('all');

    const [selectedPlan, setSelectedPlan] = useState('');
    const [plans, setPlans] = useState([]);
    const [specializations, setSpecializations] = useState([]);
    const [myQuota, setMyQuota] = useState(null);

    useEffect(() => {
        loadPlans();
        loadSpecializations();
        loadTopics();
        loadSupervisedTopics();
    }, []);

    // Load quota data when selectedPlan changes
    useEffect(() => {
        if (selectedPlan) {
            loadMyQuota();
        } else {
            setMyQuota(null);
        }
    }, [selectedPlan]);

    const loadPlans = async () => {
        try {
            const response = await axios.get('/admin/thesis-plans/list-all');
            setPlans(response.data);

            // Auto select first plan if available
            if (response.data.length > 0 && !selectedPlan) {
                setSelectedPlan(response.data[0].ID_KEHOACH);
            }
        } catch (error) {
            console.error('Error loading plans:', error);
        }
    };

    const loadSpecializations = async () => {
        try {
            const response = await axios.get('/chuyen-nganhs');
            setSpecializations(response.data);
        } catch (error) {
            console.error('Error loading specializations:', error);
        }
    };

    const loadMyQuota = async () => {
        if (!selectedPlan) return;
        try {
            const response = await lecturerQuotaService.getMyQuota({ plan_id: selectedPlan });
            setMyQuota(response.data);
        } catch (error) {
            console.error('Error loading quota:', error);
            setMyQuota(null);
        }
    };

    const loadTopics = async () => {
        try {
            setLoading(true);
            const params = {};
            if (selectedPlan) {
                params.plan_id = selectedPlan;
            }
            const response = await thesisTopicService.getTopics(params);
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
            loadMyQuota(); // Update quota after creating topic
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
            loadMyQuota(); // Update quota after editing topic
        } catch (error) {
            console.error('Error updating topic:', error);
        }
    };

    const handleSubmitForApproval = async (topicId) => {
        try {
            await thesisTopicService.submitForApproval(topicId);
            loadTopics();
            loadMyQuota(); // Update quota after submitting for approval
        } catch (error) {
            console.error('Error submitting for approval:', error);
        }
    };

    const handleDeleteTopic = async (topicId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa đề tài này?')) return;
        try {
            await thesisTopicService.deleteTopic(topicId);
            loadTopics();
            loadMyQuota(); // Update quota after deleting topic
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
                    <Button
                        onClick={() => setShowCreateDialog(true)}
                        disabled={myQuota && myQuota.topics_created >= myQuota.quota_assigned}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo đề tài mới
                    </Button>
                )}
            </div>

            {/* Plan Selection */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Chọn Kế hoạch Khóa luận:</label>
                <Select
                    value={selectedPlan}
                    onValueChange={setSelectedPlan}
                    disabled={loading}
                >
                    <SelectTrigger className="w-full max-w-md">
                        <SelectValue placeholder="Chọn kế hoạch" />
                    </SelectTrigger>
                    <SelectContent>
                        {plans.map(plan => (
                            <SelectItem key={plan.ID_KEHOACH} value={plan.ID_KEHOACH}>
                                {plan.TEN_DOT} - {plan.NAMHOC}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Quota Information Cards */}
            {myQuota && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Thông tin Quota</h3>
                        <Badge
                            variant={myQuota.quota_assigned === 0 ? "outline" :
                                myQuota.topics_created >= myQuota.quota_assigned ? "default" :
                                    "secondary"}
                            className={myQuota.quota_assigned === 0 ? "" :
                                myQuota.topics_created >= myQuota.quota_assigned ? "bg-green-500 hover:bg-green-600" :
                                    "bg-orange-500 hover:bg-orange-600"}
                        >
                            {myQuota.quota_assigned === 0 ? "Chưa phân công" :
                                myQuota.topics_created >= myQuota.quota_assigned ? "Hoàn thành" :
                                    `Còn ${myQuota.topics_needed} đề tài`}
                        </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Được phân công</CardTitle>
                                <Users className="h-4 w-4 text-blue-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{myQuota.quota_assigned || 0}</div>
                                <p className="text-xs text-gray-500">đề tài</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Đã tạo</CardTitle>
                                <BookOpen className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{myQuota.topics_created || 0}</div>
                                <p className="text-xs text-gray-500">đề tài</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Cần tạo thêm</CardTitle>
                                <CheckCircle className="h-4 w-4 text-orange-600" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${myQuota.topics_needed > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                    {myQuota.topics_needed || 0}
                                </div>
                                <p className="text-xs text-gray-500">đề tài</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Trạng thái</CardTitle>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${myQuota.quota_assigned === 0 ? 'text-gray-500' :
                                    myQuota.topics_created >= myQuota.quota_assigned ? 'text-green-600' : 'text-orange-600'}`}>
                                    {myQuota.quota_assigned === 0 ? 'Chưa phân công' :
                                        myQuota.topics_created >= myQuota.quota_assigned ? 'Đã đủ' : 'Chưa đủ'}
                                </div>
                                <p className="text-xs text-gray-500">đề tài</p>
                            </CardContent>
                        </Card>
                    </div>
                    {myQuota.warning && (
                        <div className="mt-4 text-xs text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
                            <strong>Cảnh báo:</strong> {myQuota.warning}
                        </div>
                    )}
                    {myQuota && myQuota.topics_created >= myQuota.quota_assigned && myQuota.quota_assigned > 0 && (
                        <div className="mt-4 text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                            <strong>Thông báo:</strong> Bạn đã đủ số lượng đề tài cần ra. Không thể tạo thêm đề tài mới hoặc gửi duyệt đề tài.
                        </div>
                    )}
                </div>
            )}

            {/* Bộ lọc */}
            <div className="flex gap-4 mb-4">
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

                <Select value={myTopicsFilter} onValueChange={setMyTopicsFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Lọc đề tài của tôi" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả đề tài</SelectItem>
                        <SelectItem value="my">Đề tài của tôi</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Lọc theo chuyên ngành" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả chuyên ngành</SelectItem>
                        {specializations.map(spec => (
                            <SelectItem key={spec.ID_CHUYENNGANH} value={spec.ID_CHUYENNGANH.toString()}>
                                {spec.TEN_CHUYENNGANH}
                            </SelectItem>
                        ))}
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
                            .filter(t => myTopicsFilter === 'all' || t.ID_NGUOI_DEXUAT === user?.giangvien?.ID_GIANGVIEN)
                            .filter(t => specializationFilter === 'all' || t.ID_CHUYENNGANH?.toString() === specializationFilter)
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
                                                    disabled={myQuota && myQuota.topics_created >= myQuota.quota_assigned}
                                                    onClick={() => {
                                                        if (myQuota && myQuota.topics_created >= myQuota.quota_assigned) {
                                                            toast.error('Bạn đã đủ số lượng đề tài cần ra. Không thể gửi duyệt thêm đề tài mới.');
                                                            return;
                                                        }
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