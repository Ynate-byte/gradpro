import React, { useEffect, useState, useMemo } from "react";
import axiosClient from "@/api/axiosConfig";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
    Loader2, Eye, Calendar, GraduationCap, Search, Filter, X 
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

// [IMPORT MỚI]
import { CouncilDetailDialog } from "./CouncilDetailDialog";

const ListHoiDong = () => {
  const { user } = useAuth();
  const [hoidong, setHoidong] = useState([]);
  const [kehoach, setKehoach] = useState([]);
  const [chuyennganh, setChuyennganh] = useState([]);
  
  const [filter, setFilter] = useState({ kehoach: "", chuyennganh: "" });
  const [searchTerm, setSearchTerm] = useState("");
  
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const rowsPerPage = 10;

  // [STATE MỚI CHO DIALOG]
  const [selectedCouncilId, setSelectedCouncilId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [hdRes, khRes, cnRes] = await Promise.all([
        axiosClient.get("/giangvien/my-hoidong"),
        axiosClient.get("/admin/hoidong/kehoach-options"),
        axiosClient.get("/admin/hoidong/chuyennganh-options"),
      ]);
      
      setHoidong(hdRes.data || []);
      setKehoach(khRes.data || []);
      setChuyennganh(cnRes.data || []);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
      toast.error("Không thể tải dữ liệu từ máy chủ!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filter, searchTerm]);

  const filteredHoiDong = useMemo(() => {
    return hoidong.filter((h) => {
      const matchKeHoach = !filter.kehoach || String(h.ID_KEHOACH) === String(filter.kehoach);
      const matchChuyenNganh = !filter.chuyennganh || String(h.ID_CHUYENNGANH) === String(filter.chuyennganh);
      const matchSearch = !searchTerm || h.TEN_HOIDONG.toLowerCase().includes(searchTerm.toLowerCase());
      return matchKeHoach && matchChuyenNganh && matchSearch;
    });
  }, [hoidong, filter, searchTerm]);

  const totalPages = Math.ceil(filteredHoiDong.length / rowsPerPage);
  const paginatedHoiDong = filteredHoiDong.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const handleReset = () => {
    setFilter({ kehoach: "", chuyennganh: "" });
    setSearchTerm("");
  };

  // [HÀM MỞ DIALOG]
  const handleViewDetail = (id) => {
    setSelectedCouncilId(id);
    setIsDetailOpen(true);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } }
  };

  if (loading)
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
        <p>Đang tải dữ liệu hội đồng...</p>
      </div>
    );

  return (
    <motion.div 
        className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3 border-b bg-muted/5">
          {/* ... (Phần Filter và Search giữ nguyên như code trước) ... */}
          <div className="flex flex-col md:flex-row gap-4 justify-between">
             <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm tên hội đồng..."
                  className="pl-9 bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>

             <div className="flex flex-wrap gap-2 flex-1 justify-end">
                <Select
                    value={filter.kehoach}
                    onValueChange={(value) => setFilter({ ...filter, kehoach: value === "all" ? "" : value })}
                >
                    <SelectTrigger className="w-[220px] bg-background">
                        <div className="flex items-center gap-2 truncate">
                             <Calendar className="h-4 w-4 text-muted-foreground" />
                             <SelectValue placeholder="Tất cả kế hoạch" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả kế hoạch</SelectItem>
                        {kehoach.map((k) => (
                            <SelectItem key={k.ID_KEHOACH} value={String(k.ID_KEHOACH)}>
                                {k.TEN_DOT}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={filter.chuyennganh}
                    onValueChange={(value) => setFilter({ ...filter, chuyennganh: value === "all" ? "" : value })}
                >
                    <SelectTrigger className="w-[200px] bg-background">
                         <div className="flex items-center gap-2 truncate">
                             <GraduationCap className="h-4 w-4 text-muted-foreground" />
                             <SelectValue placeholder="Tất cả chuyên ngành" />
                         </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả chuyên ngành</SelectItem>
                        {chuyennganh.map((c) => (
                            <SelectItem key={c.ID_CHUYENNGANH} value={String(c.ID_CHUYENNGANH)}>
                                {c.TEN_CHUYENNGANH}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {(filter.kehoach || filter.chuyennganh || searchTerm) && (
                    <Button variant="ghost" size="icon" onClick={handleReset} title="Xóa bộ lọc">
                        <X className="h-4 w-4" />
                    </Button>
                )}
             </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
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
                {paginatedHoiDong.length > 0 ? (
                  paginatedHoiDong.map((h) => (
                    <TableRow key={h.ID_HOIDONG} className="group hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleViewDetail(h.ID_HOIDONG)}>
                      <TableCell className="font-medium">
                         <div className="flex flex-col">
                            <span className="text-primary font-semibold group-hover:underline">{h.TEN_HOIDONG}</span>
                            <span className="text-xs text-muted-foreground md:hidden">{h.TEN_CHUYENNGANH}</span>
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
                              e.stopPropagation(); // Tránh trigger onClick của row
                              handleViewDetail(h.ID_HOIDONG);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" /> 
                          <span className="hidden sm:inline">Chi tiết</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Filter className="h-8 w-8 opacity-20" />
                        <p>Không tìm thấy hội đồng nào phù hợp.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Trước
              </Button>
              <div className="text-sm font-medium">
                Trang {page} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
              >
                Tiếp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOG CHI TIẾT */}
      <CouncilDetailDialog 
        councilId={selectedCouncilId} 
        open={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
      />
    </motion.div>
  );
};

export default ListHoiDong;