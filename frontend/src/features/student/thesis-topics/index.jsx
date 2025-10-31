import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Eye, UserPlus, Search, BookCopy } from 'lucide-react';
import { toast } from 'sonner';
import { thesisTopicService } from '@/api/thesisTopicService';
import { getChuyenNganhs } from '@/api/userService';


const TopicDetailDialog = ({
    open,
    onOpenChange,
    topicId,
    isGroupLeader,
    onRegisterGroup,
    hasRegisteredTopic,
    myRegisteredTopic,
}) => {
    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && topicId) loadTopicDetails();
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

    const getStatusBadge = (status) => {
        const statusColors = {
            'Nháp': 'bg-gray-400 text-white',
            'Chờ duyệt': 'bg-yellow-500 text-white',
            'Yêu cầu chỉnh sửa': 'bg-orange-500 text-white',
            'Đã duyệt': 'bg-green-600 text-white',
            'Từ chối': 'bg-red-600 text-white',
            'Đã đầy': 'bg-blue-500 text-white',
            'Đã khóa': 'bg-black text-white',
        };
        return <Badge className={statusColors[status] || 'bg-gray-300'}>{status}</Badge>;
    };

    if (loading)
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-center items-center h-64">Đang tải...</div>
                </DialogContent>
            </Dialog>
        );

    if (!topic) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {topic.TEN_DETAI} {getStatusBadge(topic.TRANGTHAI)}
                    </DialogTitle>
                    <DialogDescription>Mã đề tài: {topic.MA_DETAI}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <Card>
                        <CardContent className="space-y-3 p-4">
                            <p><strong>Mô tả:</strong> {topic.MOTA}</p>
                            <p><strong>Giảng viên:</strong> {topic.ten_giang_vien || 'N/A'}</p>
                            <p><strong>Chuyên ngành:</strong> {topic.chuyennganh?.TEN_CHUYENNGANH || 'Tất cả'}</p>
                            <p><strong>Số nhóm tối đa:</strong> {topic.SO_NHOM_TOIDA}</p>
                            <p><strong>Đã đăng ký:</strong> {topic.SO_NHOM_HIENTAI}</p>
                            <p><strong>Ngày tạo:</strong> {new Date(topic.NGAYTAO).toLocaleDateString('vi-VN')}</p>
                        </CardContent>
                    </Card>

                    {isGroupLeader && !hasRegisteredTopic && (
                        <div className="flex justify-end">
                            <Button onClick={() => onRegisterGroup(topic)}>
                                <UserPlus className="w-4 h-4 mr-2" /> Đăng ký đề tài
                            </Button>
                        </div>
                    )}

                    {hasRegisteredTopic && topicId === myRegisteredTopic?.ID_DETAI && (
                        <div className="flex justify-end">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                <Eye className="w-4 h-4 mr-2" /> Đề tài của tôi
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const RegisterGroupDialog = ({ open, onOpenChange, topic, onSuccess }) => {
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        setLoading(true);
        try {
            await thesisTopicService.registerGroup(topic.ID_DETAI);
            toast.success('Đăng ký đề tài thành công!');
            onOpenChange(false);
            onSuccess(topic);
        } catch (error) {
            console.error('Error registering group:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký đề tài.');
        } finally {
            setLoading(false);
        }
    };

    if (!topic) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Đăng ký đề tài</DialogTitle>
                    <DialogDescription>
                        Đăng ký đề tài "{topic?.TEN_DETAI}" cho nhóm của bạn.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-gray-600">
                        Bạn có chắc chắn muốn đăng ký đề tài này cho nhóm của mình không? Hành động này không thể hoàn tác.
                    </p>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Hủy
                    </Button>
                    <Button onClick={handleRegister} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Đăng ký
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const StudentThesisTopicsPage = () => {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMajor, setSelectedMajor] = useState('all');
    const [majors, setMajors] = useState([]);
    const [isGroupLeader, setIsGroupLeader] = useState(false);
    const [hasRegisteredTopic, setHasRegisteredTopic] = useState(false);
    const [myRegisteredTopic, setMyRegisteredTopic] = useState(null);

    const [showTopicDetailDialog, setShowTopicDetailDialog] = useState(false);
    const [showRegisterDialog, setShowRegisterDialog] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState(null);

    useEffect(() => {
        loadMajors();
        checkGroupStatus();
        loadTopics();
    }, []);

    // Tìm kiếm theo tên đề tài — realtime, không bị văng input
    useEffect(() => {
        const delaySearch = setTimeout(() => {
            loadTopics();
        }, 500); // 0.4 giây sau khi người dùng dừng gõ

        return () => clearTimeout(delaySearch);
    }, [searchTerm, selectedMajor]);

    const loadTopics = async () => {
        try {
            setLoading(true);
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (selectedMajor && selectedMajor !== 'all') params.major_id = selectedMajor;
            const response = await thesisTopicService.getTopics(params);
            setTopics(response.data.data || []);
        } catch (error) {
            console.error('Error loading topics:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMajors = async () => {
        try {
            const data = await getChuyenNganhs();
            setMajors(data || []);
        } catch (error) {
            console.error('Error loading majors:', error);
        }
    };



    const checkGroupStatus = async () => {
        try {
            const [leaderResponse, statusResponse] = await Promise.all([
                thesisTopicService.isGroupLeader(),
                thesisTopicService.getGroupStatus(),
            ]);
            setIsGroupLeader(leaderResponse.data.isGroupLeader);
            setHasRegisteredTopic(statusResponse.data.hasRegisteredTopic);
            if (statusResponse.data.hasRegisteredTopic)
                setMyRegisteredTopic(statusResponse.data.topic);
        } catch (error) {
            console.error('Error checking group status:', error);
        }
    };

    const getStatusBadge = (status) => {
        const colors = {
            'Nháp': 'bg-gray-400 text-white',
            'Chờ duyệt': 'bg-yellow-400 text-black',
            'Yêu cầu chỉnh sửa': 'bg-orange-400 text-white',
            'Đã duyệt': 'bg-green-500 text-white',
            'Từ chối': 'bg-red-500 text-white',
            'Đã đầy': 'bg-blue-400 text-white',
            'Đã khóa': 'bg-black text-white',
        };
        return <Badge className={colors[status] || 'bg-gray-200'}>{status}</Badge>;
    };

    const handleViewTopicDetails = (id) => {
        setSelectedTopicId(id);
        setShowTopicDetailDialog(true);
    };

    const handleRegisterGroup = (topic) => {
        setSelectedTopic(topic);
        setShowRegisterDialog(true);
    };

    const handleRegisterSuccess = (registeredTopic) => {
        setHasRegisteredTopic(true);
        setMyRegisteredTopic(registeredTopic);
        loadTopics();
    };

    if (loading) return <div className="flex justify-center items-center h-64">Đang tải...</div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-2">Danh sách Đề tài</h1>
            <p className="text-sm text-gray-500 mb-4">Tất cả đề tài có sẵn và đang triển khai.</p>

            {/* Bộ lọc tìm kiếm */}
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                {/* Ô tìm kiếm dài hơn */}
                <div className="relative flex-[2] w-full">
                    <Input
                        placeholder="Tìm theo tên đề tài..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                    />
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                </div>

                {/* Dropdown ngắn hơn */}
                <div className="flex flex-row items-center gap-3 flex-[1] w-full md:w-auto">
                    <Select value={selectedMajor} onValueChange={setSelectedMajor}>
                        <SelectTrigger className="w-full md:w-48">
                            <SelectValue placeholder="Chuyên ngành" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả chuyên ngành</SelectItem>
                            {majors.map((m) => (
                                <SelectItem key={m.ID_CHUYENNGANH} value={m.ID_CHUYENNGANH}>
                                    {m.TEN_CHUYENNGANH}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* ✅ Nút "Đề tài của tôi" chỉ hiển thị khi đã đăng ký */}
                    {hasRegisteredTopic && myRegisteredTopic && (
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setSelectedTopicId(myRegisteredTopic.ID_DETAI);
                                setShowTopicDetailDialog(true);
                            }}
                            className="whitespace-nowrap"
                        >
                            <BookCopy className="w-4 h-4 mr-2" />
                            Đề tài của tôi
                        </Button>
                    )}
                </div>
            </div>


            {/* Bảng danh sách */}
            <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold">Tên đề tài</th>
                            <th className="px-4 py-3 text-left font-semibold">Giảng viên</th>
                            <th className="px-4 py-3 text-left font-semibold">Chuyên ngành</th>
                            <th className="px-4 py-3 text-left font-semibold">Số nhóm</th>
                            <th className="px-4 py-3 text-left font-semibold">Ngày tạo</th>
                            <th className="px-4 py-3 text-left font-semibold">Trạng thái</th>
                            <th className="px-4 py-3 text-center font-semibold">Hành động</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                        {topics.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="py-10 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <BookCopy className="w-8 h-8 mb-2 text-gray-400" />
                                        Không có đề tài nào
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            topics.map((topic) => (
                                <tr key={topic.ID_DETAI} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 font-medium">{topic.TEN_DETAI}</td>
                                    <td className="px-4 py-3">{topic.ten_giang_vien || 'N/A'}</td>
                                    <td className="px-4 py-3">{topic.chuyennganh?.TEN_CHUYENNGANH || 'Tất cả'}</td>
                                    <td className="px-4 py-3">{`${topic.SO_NHOM_HIENTAI}/${topic.SO_NHOM_TOIDA}`}</td>
                                    <td className="px-4 py-3">
                                        {new Date(topic.NGAYTAO).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-4 py-3">{getStatusBadge(topic.TRANGTHAI)}</td>
                                    <td className="px-4 py-3 text-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewTopicDetails(topic.ID_DETAI)}
                                        >
                                            <Eye className="w-4 h-4 mr-1" /> Xem
                                        </Button>

                                        {topic.TRANGTHAI === 'Đã duyệt' &&
                                            topic.SO_NHOM_HIENTAI < topic.SO_NHOM_TOIDA &&
                                            !hasRegisteredTopic &&
                                            isGroupLeader && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleRegisterGroup(topic)}
                                                >
                                                    <UserPlus className="w-4 h-4 mr-1" /> Đăng ký
                                                </Button>
                                            )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Dialogs */}
            <TopicDetailDialog
                open={showTopicDetailDialog}
                onOpenChange={setShowTopicDetailDialog}
                topicId={selectedTopicId}
                isGroupLeader={isGroupLeader}
                onRegisterGroup={handleRegisterGroup}
                hasRegisteredTopic={hasRegisteredTopic}
                myRegisteredTopic={myRegisteredTopic}
            />

            <RegisterGroupDialog
                open={showRegisterDialog}
                onOpenChange={setShowRegisterDialog}
                topic={selectedTopic}
                onSuccess={handleRegisterSuccess}
            />
        </div>
    );
};

export default StudentThesisTopicsPage;