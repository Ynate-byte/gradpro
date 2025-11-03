import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyGradingTasks } from "@/api/chamDiemService";
import { Loader2, PenSquare, BookUser, MessageSquare, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GradingModal } from "./GradingModal"; // Import modal

/**
 * Component con hiển thị bảng danh sách các nhóm cần chấm.
 */
const GradingTable = ({ data, onGradeClick, role }) => {
  if (data.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        Bạn không có nhóm nào cần chấm ở mục này.
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tên Nhóm</TableHead>
          <TableHead>Đề Tài</TableHead>
          <TableHead>Trạng Thái</TableHead>
          <TableHead className="text-right">Chấm điểm</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((nhom) => (
          <TableRow key={nhom.ID_NHOM}>
            <TableCell className="font-medium">{nhom.TEN_NHOM}</TableCell>
            <TableCell>
              {nhom.detai?.TEN_DETAI ||
                nhom.phancong_detai_nhom?.detai?.TEN_DETAI ||
                "N/A"}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{nhom.TRANGTHAI}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onGradeClick(nhom, role)}
              >
                <PenSquare className="mr-2 h-4 w-4" /> Chấm điểm
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/**
 * Component chính của trang chấm điểm dành cho giảng viên.
 */
const LecturerGradingPage = () => {
  // --- Logic giữ nguyên ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["myGradingTasks"],
    queryFn: getMyGradingTasks,
  });

  const handleGradeClick = (nhom, role) => {
    setSelectedGroup(nhom);
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedGroup(null);
    setSelectedRole("");
  };

  const handleSaveSuccess = () => {
    handleModalClose();
    queryClient.invalidateQueries(["myGradingTasks"]);
  };

  // --- JSX (Giao diện mới) ---

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="p-8 text-center text-red-600">
        Lỗi khi tải danh sách cần chấm.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-bold">Chấm điểm Khóa luận</h1>
      <p className="text-muted-foreground">
        Đây là danh sách các nhóm bạn được phân công chấm điểm.
      </p>

      <Tabs defaultValue="huongdan" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="huongdan">
            <BookUser className="mr-2 h-4 w-4" />
            Hướng Dẫn ({data.huongdan?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="phanbien">
            <MessageSquare className="mr-2 h-4 w-4" />
            Phản Biện ({data.phanbien?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="hoidong">
            <Users className="mr-2 h-4 w-4" />
            Hội Đồng ({data.hoidong?.length || 0})
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4 shadow-sm">
          <CardContent className="p-0">
            <TabsContent value="huongdan" className="m-0">
              <GradingTable
                data={data.huongdan}
                onGradeClick={handleGradeClick}
                role="huongdan"
              />
            </TabsContent>
            <TabsContent value="phanbien" className="m-0">
              <GradingTable
                data={data.phanbien}
                onGradeClick={handleGradeClick}
                role="phanbien"
              />
            </TabsContent>
            <TabsContent value="hoidong" className="m-0">
              <GradingTable
                data={data.hoidong}
                onGradeClick={handleGradeClick}
                role="hoidong"
              />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Modal chấm điểm */}
      {selectedGroup && (
        <GradingModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSaveSuccess={handleSaveSuccess}
          group={selectedGroup}
          role={selectedRole}
        />
      )}
    </div>
  );
};

export default LecturerGradingPage;