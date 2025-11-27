import React from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Filter } from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

const CouncilTable = ({ data, onViewDetail }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
        <Filter className="h-8 w-8 opacity-20" />
        <p>Không tìm thấy hội đồng nào phù hợp.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[250px]">Tên hội đồng</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Kế hoạch</TableHead>
            <TableHead>Thời gian</TableHead>
            <TableHead>Phòng</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((h) => (
            <TableRow key={h.ID_HOIDONG} className="group hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onViewDetail(h.ID_HOIDONG)}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span className="text-primary font-semibold group-hover:underline">{h.TEN_HOIDONG}</span>
                  {/* [SỬA] Hiển thị Tên Khoa/Bộ môn */}
                  <span className="text-xs text-muted-foreground md:hidden">{h.TEN_KHOA_BOMON}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={h.LOAI === "phanbien" ? "secondary" : "default"}
                  className={h.LOAI === "phanbien" ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}
                >
                  {h.LOAI === "phanbien" ? "Phản biện" : "Hội đồng"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[200px] truncate" title={h.TEN_KEHOACH}>
                {h.TEN_KEHOACH}
              </TableCell>
              <TableCell>
                <div className="flex flex-col text-sm">
                  <span>{h.NGAY_BAOCAO ? format(parseISO(h.NGAY_BAOCAO), "dd/MM/yyyy", { locale: vi }) : "--/--/----"}</span>
                  <span className="text-xs text-muted-foreground">{h.GIO_BAOCAO ? h.GIO_BAOCAO.substring(0, 5) : ""}</span>
                </div>
              </TableCell>
              <TableCell>
                {h.PHONG ? <Badge variant="outline">{h.PHONG}</Badge> : <span className="text-muted-foreground text-xs italic">Chưa xếp</span>}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetail(h.ID_HOIDONG);
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Chi tiết</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CouncilTable;