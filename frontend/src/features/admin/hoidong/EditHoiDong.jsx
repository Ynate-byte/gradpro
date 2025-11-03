import React, { useEffect, useState, useMemo, useCallback } from "react";
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
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  ArrowLeft,
  Search,
  Save,
  Trash2,
  ShieldAlert,
  Users,
  Info,
  Settings,
  GraduationCap,
  BookOpen,
  UserCheck,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { cn } from "@/lib/utils";

const EditHoiDong = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ----- TOÀN BỘ LOGIC STATE GIỮ NGUYÊN -----
  const [loading, setLoading] = useState(true);
  const [loadingGV, setLoadingGV] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState(null);

  const [form, setForm] = useState({
    TEN_HOIDONG: "",
    NGAY_BAOCAO: "",
    GIO_BAOCAO: "",
    PHONG: "",
    ID_KEHOACH: "",
    ID_CHUYENNGANH: "",
    LOAI: "hoidong",
  });

  const [kehoach, setKehoach] = useState([]);
  const [chuyennganh, setChuyennganh] = useState([]);
  const [availableGiangvien, setAvailableGiangvien] = useState([]);
  const [originalAssignedGV, setOriginalAssignedGV] = useState([]);
  const [selectedGV, setSelectedGV] = useState([]);
  const [gvRoles, setGvRoles] = useState({});
  const [searchGV, setSearchGV] = useState("");
  const [assignedNhoms, setAssignedNhoms] = useState([]);

  // ----- TẤT CẢ CÁC HÀM LOGIC (fetch, submit, delete...) GIỮ NGUYÊN -----
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [hoidongRes, kehoachRes, chuyennganhRes] = await Promise.all([
        axiosClient.get(`/admin/hoidong/${id}`),
        axiosClient.get("/admin/hoidong/kehoach-options"),
        axiosClient.get("/admin/hoidong/chuyennganh-options"),
      ]);

      const hd = hoidongRes.data;
      setKehoach(kehoachRes.data || []);
      setChuyennganh(chuyennganhRes.data || []);
      setAssignedNhoms(hd.nhoms || []);

      const originalGVs = (hd.giangviens || []).map((gv) => ({
        ID_GIANGVIEN: gv.ID_GIANGVIEN,
        HO_TEN: gv.nguoidung?.HODEM_VA_TEN || "N/A",
        MA_GIANGVIEN: gv.nguoidung?.MA_DINHDANH || "N/A",
        KHOA: gv.khoabomon?.TEN_KHOA_BOMON || null,
        HOIDONGS: gv.HOIDONGS || [],
        VAITRO: gv.pivot?.VAITRO || "",
      }));
      setOriginalAssignedGV(originalGVs);
      setSelectedGV(originalGVs.map((gv) => gv.ID_GIANGVIEN));
      const roleMap = {};
      originalGVs.forEach((gv) => {
        roleMap[gv.ID_GIANGVIEN] = gv.VAITRO;
      });
      setGvRoles(roleMap);

      setForm({
        TEN_HOIDONG: hd.TEN_HOIDONG || "",
        NGAY_BAOCAO: hd.NGAY_BAOCAO?.split("T")[0] || "",
        GIO_BAOCAO: hd.GIO_BAOCAO || "",
        PHONG: hd.PHONG || "",
        ID_KEHOACH: hd.ID_KEHOACH || "",
        ID_CHUYENNGANH: hd.ID_CHUYENNGANH || "",
        LOAI: hd.LOAI || "hoidong",
      });
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu hội đồng:", err);
      toast.error("Không thể tải dữ liệu hội đồng.");
      navigate("/admin/hoidong");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchAvailableGiangVien = async () => {
      if (!form.ID_KEHOACH) {
        setAvailableGiangvien([]);
        return;
      }
      setLoadingGV(true);
      try {
        const gvRes = await axiosClient.get("/admin/giangvien", {
          params: { plan_id: form.ID_KEHOACH },
        });
        setAvailableGiangvien(gvRes.data || []);
      } catch (err) {
        console.error("Lỗi khi tải danh sách giảng viên:", err);
        toast.error("Không thể tải danh sách giảng viên.");
      } finally {
        setLoadingGV(false);
      }
    };
    if (form.ID_KEHOACH) {
      fetchAvailableGiangVien();
    }
  }, [form.ID_KEHOACH]);

  const combinedFilteredGV = useMemo(() => {
    const searchLower = searchGV.toLowerCase();
    const combinedMap = new Map();
    originalAssignedGV.forEach((gv) => combinedMap.set(gv.ID_GIANGVIEN, gv));
    availableGiangvien.forEach((gv) => {
      if (!combinedMap.has(gv.ID_GIANGVIEN)) {
        combinedMap.set(gv.ID_GIANGVIEN, gv);
      }
    });
    return Array.from(combinedMap.values()).filter((gv) =>
      gv.HO_TEN.toLowerCase().includes(searchLower)
    );
  }, [availableGiangvien, searchGV, originalAssignedGV]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSelectChange = (name, value) => {
    if (name === "LOAI" && value !== form.LOAI) {
      setSelectedGV([]);
      setGvRoles({});
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleGiangVien = (idGV) => {
    const isSelected = selectedGV.includes(idGV);

    if (form.LOAI === "phanbien" && !isSelected && selectedGV.length >= 1) {
      toast.error("Hội đồng phản biện chỉ được chọn 1 giảng viên.");
      return;
    }
    if (form.LOAI === "hoidong" && !isSelected && selectedGV.length >= 3) {
      toast.error("Hội đồng bảo vệ chỉ được chọn tối đa 3 giảng viên.");
      return;
    }

    setSelectedGV((prev) => {
      const updated = prev.includes(idGV)
        ? prev.filter((id) => id !== idGV)
        : [...prev, idGV];

      if (!updated.includes(idGV)) {
        setGvRoles((roles) => {
          const newRoles = { ...roles };
          delete newRoles[idGV];
          return newRoles;
        });
      } else if (form.LOAI === "phanbien" && updated.includes(idGV)) {
        setGvRoles((roles) => ({ ...roles, [idGV]: "phanbien" }));
      }
      return updated;
    });
  };

  const handleRoleChange = (idGV, role) => {
    if (form.LOAI === "phanbien") {
      toast.info("Vai trò mặc định là Phản biện.");
      return;
    }
    if (form.LOAI === "hoidong") {
      if (role === "phanbien") {
        toast.error("Không thể chọn 'Phản biện' cho Hội đồng bảo vệ.");
        return;
      }
      const otherRoles = Object.keys(gvRoles)
        .filter((id) => id != idGV)
        .map((id) => gvRoles[id]);
      if (
        (role === "chutich" && otherRoles.includes("chutich")) ||
        (role === "thuky" && otherRoles.includes("thuky"))
      ) {
        toast.error(
          `Vai trò '${
            role === "chutich" ? "Chủ tịch" : "Thư ký"
          }' đã có người đảm nhiệm.`
        );
        return;
      }
    }
    setGvRoles((prev) => ({ ...prev, [idGV]: role }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        ID_KEHOACH: Number(form.ID_KEHOACH),
        ID_CHUYENNGANH: Number(form.ID_CHUYENNGANH),
        NGAY_BAOCAO: form.NGAY_BAOCAO || null,
        GIO_BAOCAO: form.GIO_BAOCAO || null,
        PHONG: form.PHONG || null,
        giangviens: selectedGV.map((id) => ({
          id,
          vaitro:
            form.LOAI === "phanbien" ? "phanbien" : gvRoles[id] || "thanhvien",
        })),
      };

      await axiosClient.put(`/admin/hoidong/${id}`, payload);
      toast.success("Cập nhật hội đồng thành công!");
      navigate("/admin/hoidong");
    } catch (err) {
      console.error("Lỗi khi cập nhật:", err);
      if (err.response?.data?.errors) {
        const firstError = Object.values(err.response.data.errors)[0][0];
        toast.error(firstError);
      } else {
        toast.error(err.response?.data?.error || "Cập nhật thất bại!");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await axiosClient.delete(`/admin/hoidong/${id}`);
      toast.success("Đã xóa hội đồng thành công!");
      navigate("/admin/hoidong");
    } catch (err) {
      console.error("Lỗi khi xóa hội đồng:", err);
      toast.error("Không thể xóa hội đồng!");
    } finally {
      setIsDeleting(false);
      setIsDeleteAlertOpen(false);
    }
  };

  const handleXoaNhom = async (idNhom) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa nhóm này khỏi hội đồng?"))
      return;

    setDeletingGroupId(idNhom);
    try {
      await axiosClient.delete(`/admin/hoidong/${id}/nhom/${idNhom}`);
      setAssignedNhoms((prev) => prev.filter((n) => n.ID_NHOM !== idNhom));
      toast.success("Đã xóa nhóm khỏi hội đồng!");
    } catch (err) {
      toast.error("Không thể xóa nhóm, vui lòng thử lại.");
    } finally {
      setDeletingGroupId(null);
    }
  };

  // ----- BẮT ĐẦU PHẦN JSX (ĐÃ SỬA LỖI TABS) -----

  if (loading)
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <Button
        type="button"
        variant="outline"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
      </Button>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="info">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <CardTitle className="text-2xl font-bold text-foreground">
              Chỉnh sửa: {form.TEN_HOIDONG}
            </CardTitle>
            <TabsList>
              <TabsTrigger value="info">
                <Settings className="mr-2 h-4 w-4" /> Thông tin chung
              </TabsTrigger>
              <TabsTrigger value="members">
                <GraduationCap className="mr-2 h-4 w-4" /> Thành viên
              </TabsTrigger>
              <TabsTrigger value="groups">
                <Users className="mr-2 h-4 w-4" /> Các nhóm (
                {assignedNhoms.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: THÔNG TIN CHUNG */}
          <TabsContent value="info">
            <Card className="shadow-lg border-primary">
              <CardHeader>
                <CardTitle>Thông tin chung</CardTitle>
                <CardDescription>Cài đặt cơ bản của hội đồng.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="TEN_HOIDONG">Tên hội đồng</Label>
                    <Input
                      id="TEN_HOIDONG"
                      name="TEN_HOIDONG"
                      value={form.TEN_HOIDONG}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="LOAI">Loại hội đồng</Label>
                    <Select
                      name="LOAI"
                      value={form.LOAI}
                      onValueChange={(v) => handleSelectChange("LOAI", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phanbien">
                          Phản biện (1 người)
                        </SelectItem>
                        <SelectItem value="hoidong">
                          Hội đồng (3 người)
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                  <div className="space-y-2">
                    <Label htmlFor="PHONG">Phòng báo cáo</Label>
                    <Input
                      type="text"
                      id="PHONG"
                      name="PHONG"
                      value={form.PHONG}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ID_KEHOACH">Kế hoạch khóa luận</Label>
                    <Select
                      name="ID_KEHOACH"
                      value={String(form.ID_KEHOACH)}
                      onValueChange={(v) => handleSelectChange("ID_KEHOACH", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="-- Chọn kế hoạch --" />
                      </SelectTrigger>
                      <SelectContent>
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
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="ID_CHUYENNGANH">Chuyên ngành</Label>
                    <Select
                      name="ID_CHUYENNGANH"
                      value={String(form.ID_CHUYENNGANH)}
                      onValueChange={(v) =>
                        handleSelectChange("ID_CHUYENNGANH", v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="-- Chọn chuyên ngành --" />
                      </SelectTrigger>
                      <SelectContent>
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: THÀNH VIÊN (GIAO DIỆN TABLE) */}
          <TabsContent value="members">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Thành viên Hội đồng</CardTitle>
                <CardDescription>
                  Tìm kiếm, thêm/bớt và phân vai trò cho giảng viên.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm giảng viên theo tên..."
                    value={searchGV}
                    onChange={(e) => setSearchGV(e.target.value)}
                    className="pl-10"
                    disabled={!form.ID_KEHOACH || loadingGV}
                  />
                </div>
                <ScrollArea className="h-80 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Giảng viên</TableHead>
                        <TableHead>Khoa/Bộ môn</TableHead>
                        <TableHead className="w-[180px]">Vai trò</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingGV ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                          </TableCell>
                        </TableRow>
                      ) : !form.ID_KEHOACH ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-24 text-center text-muted-foreground"
                          >
                            <Info className="mr-2 h-4 w-4 inline-block" />
                            Vui lòng chọn Kế hoạch để tải danh sách giảng viên.
                          </TableCell>
                        </TableRow>
                      ) : combinedFilteredGV.length > 0 ? (
                        combinedFilteredGV.map((gv) => {
                          const isOriginalMember = originalAssignedGV.some(
                            (oGv) => oGv.ID_GIANGVIEN === gv.ID_GIANGVIEN
                          );
                          const isAssignedToOtherCouncil =
                            gv.HOIDONGS &&
                            gv.HOIDONGS.length > 0 &&
                            !isOriginalMember;
                          const isDisabled = isAssignedToOtherCouncil;

                          let assignedText = null;
                          if (isAssignedToOtherCouncil) {
                            assignedText = `Đã tham gia: ${gv.HOIDONGS.map(
                              (hd) => hd.TEN_HOIDONG
                            ).join(", ")}`;
                          }

                          return (
                            <TableRow
                              key={gv.ID_GIANGVIEN}
                              className={cn(
                                isDisabled &&
                                  "opacity-60 cursor-not-allowed"
                              )}
                              title={assignedText}
                            >
                              <TableCell>
                                <Checkbox
                                  id={`gv-${gv.ID_GIANGVIEN}`}
                                  checked={selectedGV.includes(gv.ID_GIANGVIEN)}
                                  onCheckedChange={() =>
                                    handleToggleGiangVien(gv.ID_GIANGVIEN)
                                  }
                                  disabled={isDisabled}
                                />
                              </TableCell>
                              <TableCell>
                                <Label
                                  htmlFor={`gv-${gv.ID_GIANGVIEN}`}
                                  className={cn(
                                    "font-medium",
                                    !isDisabled && "cursor-pointer"
                                  )}
                                >
                                  {gv.HO_TEN}
                                  {gv.MA_GIANGVIEN && (
                                    <span className="text-muted-foreground text-xs ml-2">
                                      ({gv.MA_GIANGVIEN})
                                    </span>
                                  )}
                                  {isDisabled && (
                                    <p className="text-xs text-destructive italic font-normal">
                                      {assignedText}
                                    </p>
                                  )}
                                </Label>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {gv.KHOA || "N/A"}
                              </TableCell>
                              <TableCell>
                                {selectedGV.includes(gv.ID_GIANGVIEN) && (
                                  <Select
                                    value={
                                      form.LOAI === "phanbien"
                                        ? "phanbien"
                                        : gvRoles[gv.ID_GIANGVIEN] ||
                                          "thanhvien"
                                    }
                                    onValueChange={(value) =>
                                      handleRoleChange(gv.ID_GIANGVIEN, value)
                                    }
                                    disabled={form.LOAI === "phanbien"}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="-- Vai trò --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {form.LOAI === "hoidong" ? (
                                        <>
                                          <SelectItem value="chutich">
                                            Chủ tịch
                                          </SelectItem>
                                          <SelectItem value="thuky">
                                            Thư ký
                                          </SelectItem>
                                          <SelectItem value="thanhvien">
                                            Thành viên
                                          </SelectItem>
                                        </>
                                      ) : (
                                        <SelectItem value="phanbien">
                                          Phản biện
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-muted-foreground py-4"
                          >
                            Không có giảng viên nào phù hợp.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: CÁC NHÓM (HOÀN LẠI GIAO DIỆN LIST) */}
          <TabsContent value="groups">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Các nhóm được phân bổ
                    </CardTitle>
                    <CardDescription>
                      {assignedNhoms.length > 0
                        ? `Đã phân bổ ${assignedNhoms.length} nhóm`
                        : "Chưa có nhóm nào được phân bổ"}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {assignedNhoms.length} nhóm
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {assignedNhoms.length > 0 ? (
                  <ScrollArea className="h-80 p-1"> {/* Thêm ScrollArea */}
                    <div className="space-y-3">
                      {assignedNhoms.map((nhom) => {
                        const detai = nhom.phancong_detai_nhom?.detai;
                        // [SỬA LỖI] Sửa lại tên biến cho đúng
                        const huongdanvien = nhom.phancong_detai_nhom?.gvhd; 

                        return (
                          <div
                            key={nhom.ID_NHOM}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                          >
                            {/* Cột 1: Tên nhóm + số thành viên */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-foreground truncate">
                                {nhom.TEN_NHOM}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {nhom.SO_THANHVIEN_HIENTAI || 0} thành viên
                              </p>
                            </div>

                            {/* Cột 2: Trạng thái (đã sửa) */}
                            <div className="flex-shrink-0 mx-4">
                              <Badge
                                variant={
                                  nhom.phancong_detai_nhom?.TRANGTHAI === "Đã hoàn thành"
                                    ? "success"
                                    : nhom.phancong_detai_nhom
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {nhom.phancong_detai_nhom?.TRANGTHAI || "Chưa có đề tài"}
                              </Badge>
                            </div>

                            {/* Cột 3: Đề tài + GVHD */}
                            <div className="flex-1 min-w-0 text-right">
                              {detai ? (
                                <div className="space-y-1 text-sm">
                                  <div className="flex items-center justify-end gap-2 text-muted-foreground">
                                    <BookOpen className="h-4 w-4 flex-shrink-0" />
                                    <p
                                      className="font-medium text-foreground truncate max-w-[200px]"
                                      title={detai.TEN_DETAI}
                                    >
                                      {detai.TEN_DETAI}
                                    </p>
                                  </div>
                                  {huongdanvien && (
                                    <div className="flex items-center justify-end gap-2 text-muted-foreground">
                                      <UserCheck className="h-4 w-4 flex-shrink-0" />
                                      <span className="text-xs truncate max-w-[180px]">
                                        <strong>
                                          {huongdanvien.nguoidung?.HODEM_VA_TEN}
                                        </strong>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">
                                  Chưa có đề tài
                                </p>
                              )}
                            </div>

                            {/* NÚT XÓA */}
                            <div className="ml-3">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleXoaNhom(nhom.ID_NHOM)}
                                disabled={deletingGroupId === nhom.ID_NHOM}
                              >
                                {deletingGroupId === nhom.ID_NHOM ? (
                                  <Loader2 className=" h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea> // Đóng ScrollArea
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="bg-muted/50 border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Users className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm">
                      Chưa có nhóm nào được phân bổ vào hội đồng này.
                    </p>
                    <p className="text-xs mt-1">
                      Bạn có thể phân bổ nhóm trong mục "Phân bổ".
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* NÚT HÀNH ĐỘNG */}
        <div className="mt-8 flex justify-between items-center border-t pt-6">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setIsDeleteAlertOpen(true)}
            disabled={isDeleting || isSubmitting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa hội đồng
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || isDeleting}
            className="min-w-[150px]"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Lưu thay đổi
          </Button>
        </div>
      </form>

      {/* DIALOG XÁC NHẬN XÓA HỘI ĐỒNG */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-destructive" /> Xác nhận Xóa
              Hội đồng?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa vĩnh viễn hội đồng "
              {form.TEN_HOIDONG}" không? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Xác nhận Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditHoiDong;