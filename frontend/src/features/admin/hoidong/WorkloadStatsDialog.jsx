import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getLecturerWorkload } from "@/api/adminHoiDongService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const WorkloadStatsDialog = ({ isOpen, setIsOpen, planId }) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["hoidongWorkload", planId],
    queryFn: () => getLecturerWorkload(planId),
    enabled: isOpen && !!planId,
  });

  // Hàm tính màu sắc dựa trên số lượng (để highlight sự chênh lệch)
  const getLoadColor = (count) => {
    if (count === 0) return "text-muted-foreground";
    if (count <= 2) return "text-blue-600 font-medium";
    if (count <= 5) return "text-orange-600 font-bold";
    return "text-red-600 font-bold"; // Ôm nhiều việc quá báo đỏ
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/10">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="w-5 h-5 text-primary" />
            Thống kê Tải công việc Giảng viên
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-0">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="bg-background sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[50px] text-center">#</TableHead>
                    <TableHead className="min-w-[200px]">Giảng viên</TableHead>
                    <TableHead>Bộ môn</TableHead>
                    <TableHead className="text-center bg-blue-50/50 text-blue-700">Tổng HĐ</TableHead>
                    <TableHead className="text-center text-xs">Chủ tịch</TableHead>
                    <TableHead className="text-center text-xs">Thư ký</TableHead>
                    <TableHead className="text-center text-xs">Thành viên</TableHead>
                    <TableHead className="text-center text-xs">Phản biện</TableHead>
                    <TableHead className="text-center bg-green-50/50 text-green-700 border-l">Quota Hướng dẫn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats && stats.length > 0 ? (
                    stats.map((item, index) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="text-center text-muted-foreground text-xs">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.ho_ten}</div>
                          <div className="text-[10px] text-muted-foreground">{item.ma_gv}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.don_vi}
                        </TableCell>
                        
                        {/* Cột Tổng Hội Đồng */}
                        <TableCell className="text-center bg-blue-50/30">
                            <Badge variant="outline" className={cn("border-0 bg-transparent text-base", getLoadColor(item.total_hoidong))}>
                                {item.total_hoidong}
                            </Badge>
                        </TableCell>

                        {/* Chi tiết vai trò */}
                        <TableCell className="text-center text-xs text-muted-foreground">{item.role_chutich || '-'}</TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">{item.role_thuky || '-'}</TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">{item.role_thanhvien || '-'}</TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">{item.role_phanbien || '-'}</TableCell>

                        {/* Cột Quota Hướng dẫn */}
                        <TableCell className="text-center bg-green-50/30 border-l font-medium text-green-700">
                          {item.quota_huongdan}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                        Chưa có dữ liệu phân công.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
        
        <div className="p-3 border-t bg-muted/20 text-xs text-muted-foreground flex justify-between px-6">
            <span>* HĐ: Hội đồng bảo vệ & Phản biện</span>
            <span className="flex gap-4">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Thấp (1-2)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-600"></span> Trung bình (3-5)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600"></span> Cao (&gt;5)</span>
            </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};