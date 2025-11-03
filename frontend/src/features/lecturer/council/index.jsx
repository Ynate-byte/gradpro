import React, { useEffect, useState, useMemo } from "react";
import axiosClient from "@/api/axiosConfig";
import { useNavigate } from "react-router-dom"; // Sửa: Thêm Link
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
import { Loader2, Pencil, Calendar, GraduationCap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge"; // Sửa: Thêm Badge

const ListHoiDong = () => {
  const { user } = useAuth();
  const [hoidong, setHoidong] = useState([]);
  const [kehoach, setKehoach] = useState([]);
  const [chuyennganh, setChuyennganh] = useState([]);
  const [filter, setFilter] = useState({ kehoach: "", chuyennganh: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const rowsPerPage = 10;
  const navigate = useNavigate();

  // --- Toàn bộ logic giữ nguyên ---
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async (
    selectedKeHoach = "",
    selectedChuyenNganh = ""
  ) => {
    try {
      setLoading(true);
      const [hdRes, khRes, cnRes] = await Promise.all([
        axiosClient.get("/giangvien/my-hoidong"),
        axiosClient.get("/admin/hoidong/kehoach-options"),
        axiosClient.get("/admin/hoidong/chuyennganh-options"),
      ]);
      const hoidongData = (hdRes.data || []).map((h) => ({
        ...h,
        TEN_KEHOACH: h.TEN_KEHOACH || "-",
        TEN_CHUYENNGANH: h.TEN_CHUYENNGANH || "-",
      }));
      setHoidong(hoidongData);
      setKehoach(khRes.data || []);
      setChuyennganh(cnRes.data || []);
      setError("");
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
      setError("Không thể tải dữ liệu từ máy chủ!");
      toast.error("Không thể tải dữ liệu từ máy chủ!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filter.kehoach, filter.chuyennganh]);

  const filteredHoiDong = useMemo(() => {
    return hoidong.filter((h) => {
      const matchKeHoach =
        !filter.kehoach || String(h.ID_KEHOACH) === String(filter.kehoach);
      const matchChuyenNganh =
        !filter.chuyennganh ||
        String(h.ID_CHUYENNGANH) === String(filter.chuyennganh);
      return matchKeHoach && matchChuyenNganh;
    });
  }, [hoidong, filter]);

  const totalPages = Math.ceil(filteredHoiDong.length / rowsPerPage);
  const paginatedHoiDong = filteredHoiDong.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const handleReset = () => {
    setFilter({ kehoach: "", chuyennganh: "" });
  };
  
  // --- JSX (Giao diện mới) ---

  if (loading)
    return (
      <div className="p-6 text-muted-foreground text-center text-lg font-medium">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        Đang tải danh sách hội đồng...
      </div>
    );

  if (error)
    return (
      <div className="p-6 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-center">
        {error}
      </div>
    );

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-bold">Hội đồng của tôi</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Danh sách Hội đồng được phân công</CardTitle>
          <CardDescription>
            Các hội đồng bạn tham gia với vai trò thành viên, thư ký, chủ tịch,
            hoặc phản biện.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bộ lọc */}
          <div className="flex flex-wrap gap-3 items-center p-4 border rounded-lg bg-muted/50">
            <div className="flex-1 min-w-[200px] flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select
                value={filter.kehoach}
                onValueChange={(value) =>
                  setFilter({ ...filter, kehoach: value === "all" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Lọc theo kế hoạch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả kế hoạch</SelectItem>
                  {kehoach.map((k) => (
                    <SelectItem
                      key={k.ID_KEHOACH}
                      value={String(k.ID_KEHOACH)}
                    >
                      {k.TEN_DOT || k.TEN_KEHOACH}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px] flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <Select
                value={filter.chuyennganh}
                onValueChange={(value) =>
                  setFilter({
                    ...filter,
                    chuyennganh: value === "all" ? "" : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Lọc theo chuyên ngành" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả chuyên ngành</SelectItem>
                  {chuyennganh.map((c) => (
                    <SelectItem
                      key={c.ID_CHUYENNGANH}
                      value={String(c.ID_CHUYENNGANH)}
                    >
                      {c.TEN_CHUYENNGANH}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full sm:w-auto"
            >
              Xóa lọc
            </Button>
          </div>

          {/* Bảng */}
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên hội đồng</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Kế hoạch</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Giờ</TableHead>
                  <TableHead>Phòng</TableHead>
                  <TableHead className="text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedHoiDong.length > 0 ? (
                  paginatedHoiDong.map((h) => (
                    <TableRow
                      key={h.ID_HOIDONG}
                      className="hover:bg-muted/50 transition"
                    >
                      <TableCell className="p-3 font-medium text-primary">
                        {h.TEN_HOIDONG}
                      </TableCell>
                      <TableCell className="p-3">
                        <Badge
                          variant={
                            h.LOAI === "phanbien" ? "secondary" : "default"
                          }
                          className="capitalize"
                        >
                          {h.LOAI}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-3 text-muted-foreground">
                        {h.TEN_KEHOACH}
                      </TableCell>
                      <TableCell className="p-3">
                        {h.NGAY_BAOCAO
                          ? new Date(h.NGAY_BAOCAO).toLocaleDateString("vi-VN")
                          : "-"}
                      </TableCell>
                      <TableCell className="p-3">{h.GIO_BAOCAO || "-"}</TableCell>
                      <TableCell className="p-3">{h.PHONG || "-"}</TableCell>
                      <TableCell className="p-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(`/lecturer/council/${h.ID_HOIDONG}`)
                          }
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Sửa
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-5 text-muted-foreground italic"
                    >
                      Bạn không được phân công trong hội đồng nào.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 gap-3">
              <Button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                variant="outline"
              >
                Trước
              </Button>
              <span className="text-muted-foreground font-medium text-sm">
                Trang {page}/{totalPages}
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                variant="outline"
              >
                Tiếp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ListHoiDong;