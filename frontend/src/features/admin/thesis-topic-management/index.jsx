import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Edit, Eye, MoreHorizontal, Search } from "lucide-react";
import { toast } from "sonner";
import TopicDetailDialog from "../../lecturer/thesis-topics/components/TopicDetailDialog";
import RejectDialog from "./components/RejectDialog";
import { thesisTopicService } from "@/api/thesisTopicService";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AdminThesisTopicsPage = () => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTopicDetailDialog, setShowTopicDetailDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [actionType, setActionType] = useState(""); // 'reject' or 'request_edit'
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      setLoading(true);
      const response = await thesisTopicService.getAdminTopics();
      setTopics(response.data || []);
    } catch (error) {
      console.error("Error loading topics:", error);
      toast.error("Không thể tải danh sách đề tài.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewTopicDetails = (topicId) => {
    setSelectedTopicId(topicId);
    setShowTopicDetailDialog(true);
  };

  const handleApprove = async (topicId) => {
    try {
      await thesisTopicService.adminApproveOrReject(topicId, { action: "approve" });
      toast.success("Đề tài đã được duyệt thành công!");
      loadTopics();
    } catch (error) {
      console.error("Error approving topic:", error);
      toast.error("Có lỗi xảy ra khi duyệt đề tài.");
    }
  };

  const handleReject = (topic) => {
    setSelectedTopic(topic);
    setActionType("reject");
    setShowRejectDialog(true);
  };

  const handleRequestEdit = (topic) => {
    setSelectedTopic(topic);
    setActionType("request_edit");
    setShowRejectDialog(true);
  };

  const handleRejectSubmit = async (reason) => {
    try {
      const action = actionType === "reject" ? "reject" : "request_edit";
      await thesisTopicService.adminApproveOrReject(selectedTopic.ID_DETAI, {
        action,
        reason,
      });
      const message =
        actionType === "reject"
          ? "Đề tài đã bị từ chối."
          : "Đã yêu cầu chỉnh sửa đề tài.";
      toast.success(message);
      setShowRejectDialog(false);
      loadTopics();
    } catch (error) {
      console.error("Error processing topic:", error);
      toast.error("Có lỗi xảy ra khi xử lý yêu cầu.");
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      "Nháp": { label: "Nháp", className: "bg-gray-100 text-gray-700" },
      "Chờ duyệt": { label: "Chờ duyệt", className: "bg-yellow-100 text-yellow-700" },
      "Yêu cầu chỉnh sửa": { label: "Yêu cầu chỉnh sửa", className: "bg-red-100 text-red-700" },
      "Đã duyệt": { label: "Đã duyệt", className: "bg-green-100 text-green-700" },
      "Đã đầy": { label: "Đã đầy", className: "bg-gray-200 text-gray-800" },
      "Đã khóa": { label: "Đã khóa", className: "bg-red-200 text-red-800" },
      "Từ chối": { label: "Từ chối", className: "bg-red-100 text-red-700" },
    };
    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" };
    return <Badge className={`px-3 py-1 ${config.className}`}>{config.label}</Badge>;
  };

  const filteredTopics = topics.filter((t) => {
    const matchesSearch = t.TEN_DETAI?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || t.TRANGTHAI === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">Đang tải...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Danh sách Đề tài Khóa luận</h1>
        <p className="text-gray-600">Toàn bộ các đề tài và trạng thái phê duyệt</p>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Input
            placeholder="Tìm theo tên đề tài..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
        </div>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="Chờ duyệt">Chờ duyệt</SelectItem>
            <SelectItem value="Từ chối">Từ chối</SelectItem>
            <SelectItem value="Đã duyệt">Đã duyệt</SelectItem>
            <SelectItem value="Yêu cầu chỉnh sửa">Yêu cầu chỉnh sửa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bảng danh sách */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 text-sm text-gray-700">
              <tr>
                <th className="p-3 w-[30%]">Tên đề tài</th>
                <th className="p-3 w-[15%]">Mã đề tài</th>
                <th className="p-3 w-[20%]">Giảng viên đề xuất</th>
                <th className="p-3 w-[15%]">Số nhóm tối đa</th>
                <th className="p-3 w-[15%]">Trạng thái</th>
                <th className="p-3 w-[10%] text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredTopics.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-500">
                    Không có đề tài nào.
                  </td>
                </tr>
              ) : (
                filteredTopics.map((topic) => (
                  <tr
                    key={topic.ID_DETAI}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-3 font-medium text-gray-900">
                      {topic.TEN_DETAI}
                    </td>
                    <td className="p-3">{topic.MA_DETAI}</td>
                    <td className="p-3">{topic.ten_giang_vien || "N/A"}</td>
                    <td className="p-3">{topic.SO_NHOM_TOIDA}</td>
                    <td className="p-3">{getStatusBadge(topic.TRANGTHAI)}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTopicDetails(topic.ID_DETAI)}
                        >
                          <Eye className="w-4 h-4 mr-1" /> Xem
                        </Button>

                        {topic.TRANGTHAI === "Chờ duyệt" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-500 text-white hover:bg-green-600"
                              onClick={() => handleApprove(topic.ID_DETAI)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Duyệt
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="bg-red-500 text-white hover:bg-red-600"
                              onClick={() => handleReject(topic)}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Từ chối
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRequestEdit(topic)}
                            >
                              <Edit className="w-4 h-4 mr-1" /> Yêu cầu chỉnh sửa
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TopicDetailDialog
        open={showTopicDetailDialog}
        onOpenChange={setShowTopicDetailDialog}
        topicId={selectedTopicId}
      />
      <RejectDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onSubmit={handleRejectSubmit}
        topic={selectedTopic}
        actionType={actionType}
      />
    </div>
  );
};

export default AdminThesisTopicsPage;