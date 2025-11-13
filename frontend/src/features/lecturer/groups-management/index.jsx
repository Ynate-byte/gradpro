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

import { thesisTopicService } from '@/api/thesisTopicService'; // <-- [ĐÃ THÊM] SỬA LỖI TẠI ĐÂY

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
      // Sửa lỗi: Gọi qua thesisTopicService đã được import
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
                <TableHead>Mã nhóm</TableHead>
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
                  <TableCell>{assignment.nhom?.MA_NHOM}</TableCell>
                  <TableCell>{assignment.nhom?.nhomtruong?.HODEM_VA_TEN || 'N/A'}</TableCell>
                  <TableCell>{assignment.detai?.TEN_DETAI || 'N/A'}</TableCell>
                  <TableCell>
                    {assignment.NGAY_PHANCONG
                      ? format(new Date(assignment.NGAY_PHANCONG), 'dd/MM/yyyy', { locale: vi })
                      : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(assignment.TRANGTHAI)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {assignment.nhom?.thanhviens?.filter(
                        (m) => m.ID_NGUOIDUNG !== assignment.nhom?.ID_NHOMTRUONG
                      ).length > 0 ? (
                        assignment.nhom?.thanhviens
                          ?.filter((m) => m.ID_NGUOIDUNG !== assignment.nhom?.ID_NHOMTRUONG)
                          .map((member, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {member.nguoidung?.HODEM_VA_TEN}
                            </Badge>
                          ))
                      ) : (
                        <span className="text-gray-500 text-sm">Chưa có thành viên</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(assignment.nhom?.ID_NHOM)} // <-- SỬA DỤNG HÀM NÀY
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
