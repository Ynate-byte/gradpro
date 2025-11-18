import React, { useState, useEffect } from 'react';
import axiosClient from "@/api/axiosConfig";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Eye, Star, Users, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { thesisTopicService } from '@/api/thesisTopicService';

// Hàm helper hiển thị Badge trạng thái
const getStatusBadge = (status) => {
  const statusConfig = {
    'Đang thực hiện': { label: 'Đang thực hiện', className: 'bg-blue-500 text-white' },
    'Đã hoàn thành': { label: 'Đã hoàn thành', className: 'bg-green-600 text-white' },
    'Không đạt': { label: 'Không đạt', className: 'bg-red-600 text-white' },
    'Chưa bắt đầu': { label: 'Chưa bắt đầu', className: 'bg-gray-400 text-white' },
  };
  const config = statusConfig[status] || { label: status, className: 'bg-gray-300 text-black' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

// Component Dialog hiển thị danh sách thành viên
const MemberListDialog = ({ members, teamName, teamLeaderId }) => {
  if (!members || members.length === 0) return null;

  // Xử lý danh sách thành viên để xác định trưởng nhóm
  const formattedMembers = members.map(member => ({
    ...member.nguoidung,
    ID_NGUOIDUNG: member.ID_NGUOIDUNG, // Đảm bảo ID người dùng có sẵn
    isLeader: member.ID_NGUOIDUNG === teamLeaderId,
  }));

  // Tách trưởng nhóm ra khỏi danh sách thành viên khác
  const teamLeader = formattedMembers.find(m => m.isLeader);
  const nonLeaderMembers = formattedMembers.filter(m => !m.isLeader);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
          <Users className="w-3 h-3 mr-1" />
          Xem ({members.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Thành viên nhóm: {teamName}</DialogTitle>
          <DialogDescription>
            Danh sách chi tiết các thành viên tham gia đề tài.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <h4 className="font-semibold mb-2 flex items-center text-blue-600">
            <GraduationCap className="w-4 h-4 mr-2" /> Trưởng nhóm
          </h4>

          {/* Nổi bật trưởng nhóm */}
          <p className="border-l-4 border-blue-500 pl-3 py-1 bg-blue-50 text-blue-800 font-bold text-base rounded-sm flex items-center">
            <span className="mr-2">👑</span>
            {teamLeader?.HODEM_VA_TEN || 'N/A'}
          </p>

          <h4 className="font-semibold mt-4 mb-2 flex items-center">
            <Users className="w-4 h-4 mr-2" /> Thành viên khác ({nonLeaderMembers.length})
          </h4>
          {nonLeaderMembers.length > 0 ? (
            <ul className="space-y-2">
              {nonLeaderMembers.map((member, index) => (
                <li key={index} className="border-b pb-1 text-sm">
                  {member.HODEM_VA_TEN}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">Hiện chưa có thành viên khác.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Component chính
const GroupsManagementPage = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await thesisTopicService.getGroupsForLecturer();
      setGroups(response.data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Không thể tải dữ liệu nhóm.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (nhomId) => {
    navigate(`/lecturer/groups-management/${nhomId}/details`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-lg font-medium">
        <Loader2 className="h-8 w-8 animate-spin" />
        Đang tải...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Quản lý Nhóm</h1>
        <p className="text-gray-600">Danh sách các nhóm sinh viên bạn đang hướng dẫn</p>
      </div>

      {/* Danh sách nhóm dạng bảng */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {groups.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            Chưa có nhóm nào đăng ký đề tài của bạn
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="w-[60px] text-center">STT</TableHead>
                <TableHead>Tên nhóm</TableHead>
                <TableHead>Trưởng nhóm</TableHead>
                <TableHead>Đề tài</TableHead>
                <TableHead>Ngày phân công</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-center">Thành viên</TableHead>
                <TableHead className="text-center w-[200px]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((assignment, index) => (
                <TableRow key={assignment.ID_PHANCONG} className="hover:bg-gray-50">
                  <TableCell className="text-center font-medium">{index + 1}</TableCell>
                  <TableCell className="font-semibold">{assignment.nhom?.TEN_NHOM}</TableCell>
                  <TableCell>{assignment.nhom?.nhomtruong?.HODEM_VA_TEN || 'N/A'}</TableCell>
                  <TableCell>{assignment.detai?.TEN_DETAI || 'N/A'}</TableCell>
                  <TableCell>
                    {assignment.NGAY_PHANCONG
                      ? format(new Date(assignment.NGAY_PHANCONG), 'dd/MM/yyyy', { locale: vi })
                      : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(assignment.TRANGTHAI)}</TableCell>
                  {/* Sử dụng MemberListDialog */}
                  <TableCell className="text-center">
                    <MemberListDialog
                      members={assignment.nhom?.thanhviens}
                      teamName={assignment.nhom?.TEN_NHOM}
                      teamLeaderId={assignment.nhom?.ID_NHOMTRUONG} // Truyền ID trưởng nhóm
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(assignment.nhom?.ID_NHOM)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Quản lý
                      </Button>
                      <Button variant="outline" size="sm">
                        <Star className="w-4 h-4 mr-1" />
                        Đánh giá
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default GroupsManagementPage;