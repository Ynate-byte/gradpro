import React, { useEffect, useState, useCallback } from "react";
import axiosClient from "@/api/axiosConfig";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Save, Settings, GraduationCap } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const EditCouncilPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- Logic state và fetch dữ liệu giữ nguyên ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    TEN_HOIDONG: "",
    NGAY_BAOCAO: "",
    GIO_BAOCAO: "",
    PHONG: "",
    LOAI: "",
  });
  const [giangvienTrongHoiDong, setGiangvienTrongHoiDong] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Giảng viên dùng route /admin/hoidong/:id để xem chi tiết
      const hoidongRes = await axiosClient.get(`/admin/hoidong/${id}`);
      const hd = hoidongRes.data;
      setForm({
        TEN_HOIDONG: hd.TEN_HOIDONG || "",
        NGAY_BAOCAO: hd.NGAY_BAOCAO?.split("T")[0] || "", // Lấy date
        GIO_BAOCAO: hd.GIO_BAOCAO || "",
        PHONG: hd.PHONG || "",
        LOAI: hd.LOAI || "",
      });

      if (Array.isArray(hd.giangviens)) {
        const gvList = hd.giangviens.map((gv) => ({
          ID_GIANGVIEN: gv.ID_GIANGVIEN,
          HO_TEN: gv.nguoidung?.HODEM_VA_TEN || "N/A",
          MA_GIANGVIEN: gv.nguoidung?.MA_DINHDANH || "N/A",
          VAITRO: gv.pivot?.VAITRO || "",
        }));
        setGiangvienTrongHoiDong(gvList);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu hội đồng:", err);
      toast.error("Không thể tải dữ liệu hội đồng.");
      navigate(-1); // Quay lại
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        NGAY_BAOCAO: form.NGAY_BAOCAO || null,
        GIO_BAOCAO: form.GIO_BAOCAO || null,
        PHONG: form.PHONG || null,
      };

      await axiosClient.put(`/admin/hoidong/${id}`, payload);
      toast.success("Cập nhật thông tin hội đồng thành công!");
      navigate(-1); // Quay lại trang trước
    } catch (err) {
      console.error("Lỗi khi cập nhật:", err);
      toast.error(err.response?.data?.error || "Cập nhật thất bại!");
    } finally {
      setSaving(false);
    }
  };

  // --- JSX (Giao diện mới) ---

  if (loading)
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <Button
        type="button"
        variant="outline"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
      </Button>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="info" className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Chi tiết Hội đồng
              </CardTitle>
              <CardDescription className="mt-1">
                {form.TEN_HOIDONG}
              </CardDescription>
            </div>
            <TabsList>
              <TabsTrigger value="info">
                <Settings className="mr-2 h-4 w-4" />
                Cài đặt
              </TabsTrigger>
              <TabsTrigger value="members">
                <GraduationCap className="mr-2 h-4 w-4" />
                Thành viên ({giangvienTrongHoiDong.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: THÔNG TIN (FORM CẬP NHẬT) */}
          <TabsContent value="info">
            <Card className="shadow-lg border-primary">
              <CardHeader>
                <CardTitle>Cập nhật Thời gian & Địa điểm</CardTitle>
                <CardDescription>
                  Chỉ giảng viên trong hội đồng mới có thể cập nhật thông tin
                  này.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="LOAI">Loại hội đồng</Label>
                    <Input
                      id="LOAI"
                      type="text"
                      value={
                        form.LOAI === "phanbien"
                          ? "Phản biện"
                          : form.LOAI === "hoidong"
                          ? "Hội đồng"
                          : "-"
                      }
                      disabled
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="PHONG">Phòng báo cáo</Label>
                    <Input
                      id="PHONG"
                      name="PHONG"
                      value={form.PHONG}
                      onChange={handleChange}
                      placeholder="Ví dụ: B1.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="NGAY_BAOCAO">Ngày báo cáo</Label>
                    <Input
                      type="date"
                      id="NGAY_BAOCAO"
                      name="NGAY_BAOCAO"
                      value={form.NGAY_BAOCAO}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="GIO_BAOCAO">Giờ báo cáo</Label>
                    <Input
                      type="time"
                      id="GIO_BAOCAO"
                      name="GIO_BAOCAO"
                      value={form.GIO_BAOCAO}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button
                  type="submit"
                  disabled={saving}
                  className="min-w-[150px] ml-auto"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Lưu thay đổi
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* TAB 2: DANH SÁCH THÀNH VIÊN (CHỈ XEM) */}
          <TabsContent value="members">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Thành viên Hội đồng</CardTitle>
                <CardDescription>
                  Danh sách các giảng viên tham gia hội đồng này.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>STT</TableHead>
                        <TableHead>Họ tên</TableHead>
                        <TableHead>Mã giảng viên</TableHead>
                        <TableHead>Vai trò</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {giangvienTrongHoiDong.length > 0 ? (
                        giangvienTrongHoiDong.map((gv, index) => {
                          const roleLabel =
                            gv.VAITRO === "chutich"
                              ? "Chủ tịch"
                              : gv.VAITRO === "thuky"
                              ? "Thư ký"
                              : gv.VAITRO === "thanhvien"
                              ? "Thành viên"
                              : gv.VAITRO === "phanbien"
                              ? "Phản biện"
                              : "Chưa chọn";

                          return (
                            <TableRow key={gv.ID_GIANGVIEN}>
                              <TableCell className="text-center">
                                {index + 1}
                              </TableCell>
                              <TableCell className="font-medium">
                                {gv.HO_TEN}
                              </TableCell>
                              <TableCell>{gv.MA_GIANGVIEN || "-"}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    gv.VAITRO === "chutich"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="capitalize"
                                >
                                  {roleLabel}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-24 text-center text-muted-foreground"
                          >
                            Không có giảng viên trong hội đồng này.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
};

export default EditCouncilPage;