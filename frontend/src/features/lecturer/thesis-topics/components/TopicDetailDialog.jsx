import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Send, MessageSquare, BookOpen, User,
  Star, Target, Check, Layers, Users, Calendar, AlertTriangle,
  CheckCircle, Edit, XCircle, ArrowRight, ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { thesisTopicService } from '@/api/thesisTopicService';
import SuggestionDialog from './SuggestionDialog';
import ReplyDialog from './ReplyDialog';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

const InfoItem = ({ icon: Icon, label, value, children }) => (
  <div className="flex items-start">
    <Icon className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
    <div className="ml-3 flex-1">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</p>
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
        {value || children || (
          <span className="text-xs italic text-gray-400 dark:text-gray-500">Chưa có thông tin</span>
        )}
      </div>
    </div>
  </div>
);

const DialogLoadingSkeleton = () => (
  <div className="p-6 space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-16 w-16 rounded-lg shrink-0 border-2 border-blue-200 dark:border-blue-700" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full max-w-xs" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>
    </div>
    <Skeleton className="h-40 w-full rounded-lg shadow-sm border border-blue-200 dark:border-blue-700" />
    <Skeleton className="h-32 w-full rounded-lg shadow-sm border border-blue-200 dark:border-blue-700" />
    <Skeleton className="h-40 w-full rounded-lg shadow-sm border border-blue-200 dark:border-blue-700" />
  </div>
);

const getStatusBadge = (status) => {
  const statusConfig = {
    'Nháp': { label: "Nháp", className: "bg-gray-100 text-gray-700" },
    'Chờ duyệt': { label: "Chờ duyệt", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700" },
    'Yêu cầu chỉnh sửa': { label: "Yêu cầu chỉnh sửa", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700" },
    'Đã duyệt': { label: "Đã duyệt", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700" },
    'Đã đầy': { label: "Đã đầy", className: "bg-gray-200 text-gray-800" },
    'Đã khóa': { label: "Đã khóa", className: "bg-red-200 text-red-800" },
    'Từ chối': { label: "Từ chối", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700" },
  };
  const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" };
  return <Badge variant="outline" className={`px-2 py-0.5 text-xs ${config.className}`}>{config.label}</Badge>;
};

const TopicDetailDialog = ({ open, onOpenChange, topicId, showAdminActions = false, onApprove, onReject, onRequestEdit, onNext, onPrevious }) => {
  const { user } = useAuth();
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (open && topicId) {
      loadTopicDetails();
    } else if (!open) {
      setTopic(null);
    }
  }, [open, topicId]);

  const loadTopicDetails = async () => {
    try {
      setLoading(true);
      const response = await thesisTopicService.getTopicById(topicId);
      setTopic(response.data);
    } catch (error) {
      console.error('Error loading topic details:', error);
      toast.error("Không thể tải chi tiết đề tài.");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };



  const handleSubmitSuggestion = async (suggestion) => {
    try {
      const response = await thesisTopicService.addSuggestion(topic.ID_DETAI, { NOIDUNG_GOIY: suggestion });
      toast.success(response.data.message || 'Góp ý đã được gửi thành công!');
      setShowSuggestionDialog(false);
      loadTopicDetails();
    } catch (error) {
      console.error('Error adding suggestion:', error);
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi gửi góp ý.';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleReplyToSuggestion = (suggestion) => {
    setSelectedSuggestion(suggestion);
    setShowReplyDialog(true);
  };

  const handleReplySuccess = () => {
    loadTopicDetails();
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    try {
      await thesisTopicService.addSuggestion(topic.ID_DETAI, { NOIDUNG_GOIY: commentText });
      toast.success('Góp ý đã được gửi thành công!');
      setShowCommentInput(false);
      setCommentText('');
      loadTopicDetails();
    } catch (error) {
      console.error('Error adding suggestion:', error);
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi gửi góp ý.';
      toast.error(errorMessage);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-4xl w-full h-full max-h-[90vh] p-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 border-l-4 border-blue-500"
          style={{ maxHeight: '90vh' }}
        >
          <div className="flex flex-col h-full overflow-hidden">
            {loading ? (
              <DialogLoadingSkeleton />
            ) : !topic ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">Không thể tải dữ liệu đề tài.</div>
            ) : (
              <>
                <DialogHeader className="p-6 pb-4 space-y-4 bg-white dark:bg-gray-800 border-b border-blue-200 dark:border-blue-700 shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 flex items-center justify-center rounded-lg shrink-0 border-2 border-blue-300 dark:border-blue-600 bg-blue-100 dark:bg-blue-800">
                      <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 line-clamp-2">
                        {topic.TEN_DETAI}
                      </DialogTitle>
                      <DialogDescription className="text-gray-600 dark:text-gray-300 break-all">
                        Mã đề tài: {topic.MA_DETAI}
                      </DialogDescription>
                      <div className="flex items-center flex-wrap gap-2 pt-2">
                        {getStatusBadge(topic.TRANGTHAI)}
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <ScrollArea className="flex-1 overflow-y-auto">
                  <div className="px-6 pb-6 space-y-6 pt-6">
                    {topic.TRANGTHAI === 'Yêu cầu chỉnh sửa' && topic.LYDO_TUCHOI && (
                      <Card className="border-orange-200 dark:border-orange-700 shadow-md bg-orange-50 dark:bg-orange-900/20">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Yêu cầu chỉnh sửa từ Admin
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <InfoItem icon={MessageSquare} label="Lý do">
                            <p className="text-orange-800 dark:text-orange-200">{topic.LYDO_TUCHOI}</p>
                          </InfoItem>
                        </CardContent>
                      </Card>
                    )}

                    <Card className="border border-blue-200 dark:border-blue-700 shadow-md bg-white dark:bg-gray-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                          <Layers className="h-5 w-5 text-blue-500" /> Thông tin cơ bản
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-4">
                          <InfoItem icon={User} label="Giảng viên đề xuất" value={topic.ten_giang_vien} />
                          <InfoItem icon={Layers} label="Chuyên ngành" value={topic.chuyennganh?.TEN_CHUYENNGANH} />
                          <InfoItem icon={Users} label="Số nhóm tối đa" value={topic.SO_NHOM_TOIDA} />
                          <InfoItem icon={Users} label="Đã đăng ký" value={topic.SO_NHOM_HIENTAI} />
                          <InfoItem icon={Calendar} label="Ngày tạo" value={new Date(topic.NGAYTAO).toLocaleDateString('vi-VN')} />
                        </div>
                        <div className="flex items-start">
                          <BookOpen className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                          <div className="ml-3 flex-1">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Mô tả</p>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                              <div className="flex flex-col space-y-4">
                                <div className="flex-1">
                                  <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50 dark:bg-gray-800">
                                    {topic.MOTA}
                                  </div>
                                </div>
                                {showCommentInput && (
                                  <div>
                                    <strong>Góp ý:</strong>
                                    <textarea
                                      className="mt-2 w-full border rounded p-2 resize-none"
                                      rows="4"
                                      placeholder="Nhập góp ý của bạn về đề tài này..."
                                      value={commentText}
                                      onChange={(e) => setCommentText(e.target.value)}
                                    />
                                    <div className="flex gap-2 mt-2">
                                      <Button
                                        size="sm"
                                        onClick={handleSubmitComment}
                                        disabled={!commentText.trim()}
                                      >
                                        Gửi góp ý
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setShowCommentInput(false);
                                          setCommentText('');
                                        }}
                                      >
                                        Hủy
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {(topic.YEUCAU || topic.MUCTIEU || topic.KETQUA_MONGDOI) && (
                      <Card className="border border-blue-200 dark:border-blue-700 shadow-md bg-white dark:bg-gray-800">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Star className="h-5 w-5 text-blue-500" /> Yêu cầu chi tiết
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {topic.YEUCAU && <InfoItem icon={Check} label="Yêu cầu" value={topic.YEUCAU} />}
                          {topic.MUCTIEU && <InfoItem icon={Target} label="Mục tiêu" value={topic.MUCTIEU} />}
                          {topic.KETQUA_MONGDOI && <InfoItem icon={Check} label="Kết quả mong đợi" value={topic.KETQUA_MONGDOI} />}
                        </CardContent>
                      </Card>
                    )}

                    <Card className="border border-blue-200 dark:border-blue-700 shadow-md bg-white dark:bg-gray-800">
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-blue-500" /> Góp ý & Thảo luận
                          </CardTitle>
                          <div className="flex gap-2">
                            {topic.ID_NGUOI_DEXUAT !== user?.giangvien?.ID_GIANGVIEN && (topic.TRANGTHAI === 'Nháp' || topic.TRANGTHAI === 'Chờ duyệt') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCommentInput(true)}
                                className="border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
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
                              <div key={suggestion.ID_GOIY} className="border border-blue-100 dark:border-blue-800 rounded-lg p-4 bg-blue-50/30 dark:bg-blue-900/10 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {suggestion.giangvien?.nguoidung?.HODEM_VA_TEN || 'N/A'}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(suggestion.NGAYTAO).toLocaleString('vi-VN')}
                                  </span>
                                </div>
                                <p className="text-gray-800 dark:text-gray-100 mb-3">{suggestion.NOIDUNG_GOIY}</p>

                                {suggestion.phanhois && suggestion.phanhois.length > 0 && (
                                  <div className="space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-700 ml-2">
                                    {suggestion.phanhois.map((reply) => (
                                      <div key={reply.ID_PHANHOI} className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm border border-blue-100 dark:border-blue-800">
                                        <div className="flex justify-between items-start mb-1">
                                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                            {reply.giangvien?.nguoidung?.HODEM_VA_TEN || 'N/A'}
                                            {reply.ID_GIANGVIEN === topic.ID_NGUOI_DEXUAT && (
                                              <Badge variant="secondary" className="ml-2 text-xs">Tác giả</Badge>
                                            )}
                                          </span>
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(reply.created_at).toLocaleString('vi-VN')}
                                          </span>
                                        </div>
                                        <p className="text-gray-700 dark:text-gray-200">{reply.NOIDUNG}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {(topic.TRANGTHAI === 'Nháp' || topic.TRANGTHAI === 'Chờ duyệt' || topic.TRANGTHAI === 'Yêu cầu chỉnh sửa') && (
                                  <div className="mt-3">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReplyToSuggestion(suggestion)}
                                      className="border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    >
                                      <MessageSquare className="w-4 h-4 mr-1" />
                                      Phản hồi
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">Chưa có góp ý nào</p>
                        )}
                      </CardContent>
                    </Card>

                    {topic.phancongDetaiNhom && topic.phancongDetaiNhom.length > 0 && (
                      <Card className="border border-blue-200 dark:border-blue-700 shadow-md bg-white dark:bg-gray-800">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-500" /> Nhóm đã đăng ký
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {topic.phancongDetaiNhom.map((assignment) => (
                            <div key={assignment.ID_PHANCONG} className="border border-blue-100 dark:border-blue-800 rounded-lg p-4 bg-blue-50/30 dark:bg-blue-900/10 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  Nhóm: {assignment.nhom?.TEN_NHOM || 'N/A'}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(assignment.NGAY_PHANCONG).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">
                                <p>Trưởng nhóm: {assignment.nhom?.nhomtruong?.HODEM_VA_TEN || 'N/A'}</p>
                                <p>Thành viên: {assignment.nhom?.thanhvienNhom?.map(tv => tv.nguoidung?.HODEM_VA_TEN).join(', ') || 'N/A'}</p>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>

                {showAdminActions && topic.TRANGTHAI === 'Chờ duyệt' && (
                  <div className="flex-shrink-0 border-t border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 p-4">
                    <div className="flex flex-wrap gap-3 justify-center">
                      <Button
                        onClick={onPrevious}
                        variant="outline"
                        className="border-gray-300 text-gray-600 hover:bg-gray-50"
                        size="sm"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Quay lại
                      </Button>
                      <Button
                        onClick={() => onApprove(topic.ID_DETAI)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Duyệt đề tài
                      </Button>
                      <Button
                        onClick={() => onRequestEdit(topic)}
                        variant="outline"
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                        size="sm"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Yêu cầu chỉnh sửa
                      </Button>
                      <Button
                        onClick={() => onReject(topic)}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        size="sm"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Từ chối
                      </Button>
                      <Button
                        onClick={onNext}
                        variant="outline"
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        size="sm"
                      >
                        <ArrowRight className="w-4 h-4 mr-1" />
                        Tiếp theo
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SuggestionDialog
        open={showSuggestionDialog}
        onOpenChange={setShowSuggestionDialog}
        onSubmit={handleSubmitSuggestion}
        topic={topic}
      />
      <ReplyDialog
        open={showReplyDialog}
        onOpenChange={setShowReplyDialog}
        suggestion={selectedSuggestion}
        onReplySuccess={handleReplySuccess}
      />
    </>
  );
};

export default TopicDetailDialog;