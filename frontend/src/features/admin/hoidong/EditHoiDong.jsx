import React, { useEffect, useState, useMemo, useCallback } from "react";
import axiosClient from "@/api/axiosConfig";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Loader2, ArrowLeft, Search, Save, Trash2, ShieldAlert,
  Users, Settings, GraduationCap, Calendar, MapPin, BookCopy,
  LayoutTemplate, Briefcase, Info, User
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const EditHoiDong = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ----- STATE -----
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

  // ----- DATA FETCHING -----
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
        HOCVI: gv.HOCVI || "", 
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

  // ----- HANDLERS -----
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
      toast.warning("Hội đồng phản biện chỉ được chọn 1 giảng viên.");
      return;
    }
    if (form.LOAI === "hoidong" && !isSelected && selectedGV.length >= 3) {
      toast.warning("Hội đồng bảo vệ chỉ được chọn tối đa 3 giảng viên.");
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
    if (form.LOAI === "phanbien") return;
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
        toast.warning(
          `Vai trò '${
            role === "chutich" ? "Chủ tịch" : "Thư ký"
          }' đã có người đảm nhiệm.`
        );
        return;
      }
    }
    setGvRoles((prev) => ({ ...prev, [idGV]: role }));
  };

  const getWorkloadColor = (count) => {
      if (count === 0) return "bg-muted text-muted-foreground border-muted-foreground/20";
      if (count <= 2) return "bg-blue-50 text-blue-600 border-blue-200";
      if (count <= 5) return "bg-orange-50 text-orange-600 border-orange-200";
      return "bg-red-50 text-red-600 border-red-200";
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
      fetchData(); 
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

  // ----- RENDER -----
  if (loading)
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-muted/10 overflow-hidden p-4">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background shadow-sm shrink-0 z-10 h-16">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 rounded-full hover:bg-muted/80">
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Button>
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-foreground tracking-tight">{form.TEN_HOIDONG}</h1>
                    <Badge variant={form.LOAI === 'phanbien' ? 'secondary' : 'default'} className="font-medium px-2.5 py-0.5 text-xs rounded-md shadow-sm">
                        {form.LOAI === 'phanbien' ? 'Phản biện' : 'Bảo vệ'}
                    </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 font-medium">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {selectedGV.length} thành viên</span>
                    <span className="text-muted-foreground/30">•</span>
                    <span className="flex items-center gap-1"><BookCopy className="h-3.5 w-3.5" /> {assignedNhoms.length} nhóm</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-3">
             <Button 
                variant="outline" 
                size="sm" 
                className="h-9 border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive hover:border-destructive/40"
                onClick={() => setIsDeleteAlertOpen(true)}
                disabled={isDeleting || isSubmitting}
            >
                <Trash2 className="h-4 w-4 mr-2" /> Xóa
            </Button>
            <Button 
                size="sm" 
                className="h-9 min-w-[120px] font-semibold shadow-md shadow-primary/20"
                onClick={handleSubmit}
                disabled={isDeleting || isSubmitting}
            >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Lưu thay đổi
            </Button>
        </div>
      </div>

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex overflow-hidden">
          
          {/* CỘT TRÁI: Sidebar */}
          <aside className="w-[380px] xl:w-[420px] flex flex-col border-r bg-background shrink-0 z-0 overflow-hidden">
             <ScrollArea className="flex-1">
                <div className="p-6 space-y-8">
                    {/* Form thông tin chung */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                            <div className="p-1.5 rounded bg-primary/10 text-primary"><Settings className="h-4 w-4" /></div>
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Thông tin cơ bản</h3>
                        </div>
                        <div className="grid gap-5">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase">Tên Hội đồng</Label>
                                <Input name="TEN_HOIDONG" value={form.TEN_HOIDONG} onChange={handleChange} className="h-10 font-medium border-muted-foreground/20 focus-visible:ring-primary/20" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase">Loại Hội đồng</Label>
                                <Select value={form.LOAI} onValueChange={(v) => handleSelectChange("LOAI", v)}>
                                    <SelectTrigger className="h-10 border-muted-foreground/20"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hoidong">Hội đồng Bảo vệ (3 người)</SelectItem>
                                        <SelectItem value="phanbien">Phản biện (1 người)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                            <div className="p-1.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/20"><Calendar className="h-4 w-4" /></div>
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Thời gian & Địa điểm</h3>
                        </div>
                        <div className="bg-muted/20 p-4 rounded-xl border border-border/60 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">Ngày</Label>
                                    <Input type="date" name="NGAY_BAOCAO" value={form.NGAY_BAOCAO} onChange={handleChange} className="h-9 bg-background" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">Giờ</Label>
                                    <Input type="time" name="GIO_BAOCAO" value={form.GIO_BAOCAO} onChange={handleChange} className="h-9 bg-background" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">Phòng</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input name="PHONG" value={form.PHONG} onChange={handleChange} placeholder="VD: B1.01" className="h-9 pl-9 bg-background" />
                                </div>
                            </div>
                        </div>
                    </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                            <div className="p-1.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/20"><LayoutTemplate className="h-4 w-4" /></div>
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Hệ</h3>
                        </div>
                        <div className="space-y-4">
                             <div className="space-y-2">
                                <Label className="text-xs font-medium">Kế hoạch</Label>
                                <Select value={String(form.ID_KEHOACH)} onValueChange={(v) => handleSelectChange("ID_KEHOACH", v)}>
                                    <SelectTrigger className="h-9 text-sm bg-muted/10 border-dashed border-border"><SelectValue placeholder="Chọn kế hoạch" /></SelectTrigger>
                                    <SelectContent>
                                        {kehoach.map((k) => (
                                            <SelectItem key={k.ID_KEHOACH} value={String(k.ID_KEHOACH)}>{k.TEN_DOT}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Chuyên ngành</Label>
                                <Select value={String(form.ID_CHUYENNGANH)} onValueChange={(v) => handleSelectChange("ID_CHUYENNGANH", v)}>
                                    <SelectTrigger className="h-9 text-sm bg-muted/10 border-dashed border-border"><SelectValue placeholder="Chọn chuyên ngành" /></SelectTrigger>
                                    <SelectContent>
                                        {chuyennganh.map((c) => (
                                            <SelectItem key={c.ID_CHUYENNGANH} value={String(c.ID_CHUYENNGANH)}>{c.TEN_CHUYENNGANH}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>
             </ScrollArea>
          </aside>

          {/* CỘT PHẢI: Content */}
          <main className="flex-1 flex flex-col min-w-0 bg-muted/10 overflow-hidden">
             <Tabs defaultValue="members" className="flex-1 flex flex-col h-full overflow-hidden">
                {/* [Header Tabs] */}
                <div className="px-6 pt-4 shrink-0">
                    <TabsList className="bg-background border shadow-sm h-11 p-1 w-full justify-start rounded-xl">
                        <TabsTrigger value="members" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 h-full font-semibold flex-1 md:flex-none">
                            <GraduationCap className="mr-2 h-4 w-4" /> Thành viên ({selectedGV.length})
                        </TabsTrigger>
                        <TabsTrigger value="groups" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 h-full font-semibold flex-1 md:flex-none">
                            <Users className="mr-2 h-4 w-4" /> Các nhóm ({assignedNhoms.length})
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Tab 2: Thành viên */}
                <TabsContent value="members" className="hidden flex-1 flex-col min-h-0 p-6 mt-0 data-[state=active]:flex overflow-hidden">
                    <Card className="flex-1 flex flex-col border-none shadow-sm min-h-0 overflow-hidden">
                        <div className="p-4 border-b flex items-center gap-3 shrink-0">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Tìm giảng viên..." 
                                    value={searchGV}
                                    onChange={(e) => setSearchGV(e.target.value)}
                                    className="pl-9 h-10 bg-muted/20 border-transparent focus:bg-background focus:border-input transition-all"
                                    disabled={!form.ID_KEHOACH || loadingGV}
                                />
                            </div>
                            <div className="ml-auto text-sm text-muted-foreground">
                                <Badge variant="secondary" className="text-xs font-normal">
                                    Đã chọn: <strong className="text-primary">{selectedGV.length}</strong> / {form.LOAI === 'hoidong' ? '3' : '1'}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 relative">
                            <ScrollArea className="h-full w-full absolute inset-0">
                                <Table>
                                    <TableHeader className="bg-background sticky top-0 z-10 shadow-sm border-b">
                                        <TableRow className="hover:bg-transparent border-b-muted-foreground/10">
                                            <TableHead className="w-[60px] text-center font-bold">Chọn</TableHead>
                                            <TableHead className="font-bold">Giảng viên</TableHead>
                                            <TableHead className="hidden md:table-cell font-bold">Khoa/Bộ môn</TableHead>
                                            <TableHead className="w-[180px] font-bold">Vai trò</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingGV ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-32 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/50" /></TableCell>
                                            </TableRow>
                                        ) : !form.ID_KEHOACH ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-48 text-center text-muted-foreground flex flex-col items-center justify-center">
                                                    <LayoutTemplate className="h-10 w-10 mb-2 opacity-20" />
                                                    Vui lòng chọn Kế hoạch ở cột bên trái.
                                                </TableCell>
                                            </TableRow>
                                        ) : combinedFilteredGV.length > 0 ? (
                                            combinedFilteredGV.map((gv) => {
                                                const isOriginalMember = originalAssignedGV.some((oGv) => oGv.ID_GIANGVIEN === gv.ID_GIANGVIEN);
                                                // Không disable giảng viên đã có hội đồng khác
                                                // Chỉ hiển thị badge thông báo số lượng
                                                const hoidongCount = gv.HOIDONGS ? gv.HOIDONGS.length : 0;
                                                const isSelected = selectedGV.includes(gv.ID_GIANGVIEN);

                                                return (
                                                    <TableRow 
                                                        key={gv.ID_GIANGVIEN} 
                                                        className={cn(
                                                            "transition-colors h-16 border-b last:border-0",
                                                            isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                                                        )}
                                                    >
                                                        <TableCell className="text-center py-2">
                                                            <Checkbox 
                                                                checked={isSelected}
                                                                onCheckedChange={() => handleToggleGiangVien(gv.ID_GIANGVIEN)}
                                                                // Đã bỏ disable
                                                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary w-5 h-5 rounded"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            <div className={cn("flex flex-col gap-0.5")}>
                                                                <span className="font-semibold text-sm text-foreground">
                                                                    {gv.HOCVI ? <span className="text-primary/80 mr-1">{gv.HOCVI}.</span> : ''}
                                                                    {gv.HO_TEN}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-mono text-muted-foreground border-muted-foreground/30">{gv.MA_GIANGVIEN}</Badge>
                                                                    {/* [SỬA ĐỔI]: HIỂN THỊ SỐ LƯỢNG HỘI ĐỒNG BẰNG BADGE */}
                                                                    {hoidongCount > 0 && (
                                                                        <Badge 
                                                                            variant="outline" 
                                                                            className={cn("text-[10px] px-1 py-0 h-4", getWorkloadColor(hoidongCount))}
                                                                        >
                                                                            {hoidongCount} HĐ
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2 text-sm text-muted-foreground hidden md:table-cell font-medium">
                                                            {gv.KHOA || "---"}
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            {isSelected && (
                                                                <Select 
                                                                    value={form.LOAI === 'phanbien' ? 'phanbien' : (gvRoles[gv.ID_GIANGVIEN] || 'thanhvien')}
                                                                    onValueChange={(v) => handleRoleChange(gv.ID_GIANGVIEN, v)}
                                                                    disabled={form.LOAI === 'phanbien'}
                                                                >
                                                                    <SelectTrigger className="h-9 text-xs w-full border-primary/30 bg-background shadow-sm focus:ring-primary/20">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {form.LOAI === 'hoidong' ? (
                                                                            <>
                                                                                <SelectItem value="chutich">Chủ tịch</SelectItem>
                                                                                <SelectItem value="thuky">Thư ký</SelectItem>
                                                                                <SelectItem value="thanhvien">Thành viên</SelectItem>
                                                                            </>
                                                                        ) : (
                                                                            <SelectItem value="phanbien">Phản biện</SelectItem>
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
                                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Không tìm thấy giảng viên nào.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </Card>
                </TabsContent>

                {/* Tab 3: Các nhóm - [SỬA ĐỔI: DÙNG TABLE + POPOVER] */}
                <TabsContent value="groups" className="hidden flex-1 flex-col min-h-0 p-6 mt-0 data-[state=active]:flex overflow-hidden">
                    {assignedNhoms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 bg-background rounded-xl border border-dashed shadow-sm">
                            <div className="p-4 bg-muted/50 rounded-full">
                                <Users className="h-10 w-10 opacity-30" />
                            </div>
                            <div className="text-center">
                                <p className="text-base font-medium text-foreground">Chưa phân bổ nhóm</p>
                                <p className="text-sm mt-1">Hãy đến trang Phân bổ để thêm nhóm vào hội đồng này.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => navigate('/admin/hoidong/phanbo')}>
                                Đến trang Phân bổ
                            </Button>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 relative rounded-md border bg-background shadow-sm">
                             <ScrollArea className="h-full w-full absolute inset-0">
                                <Table>
                                    <TableHeader className="bg-muted/20 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-[50px] text-center">#</TableHead>
                                            <TableHead>Tên Nhóm</TableHead>
                                            <TableHead>Đề tài</TableHead>
                                            <TableHead>GVHD</TableHead>
                                            <TableHead>Trạng thái</TableHead>
                                            <TableHead className="text-right">Thao tác</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assignedNhoms.map((nhom, index) => {
                                            const detai = nhom.phancong_detai_nhom?.detai;
                                            const gvhd = nhom.phancong_detai_nhom?.gvhd?.nguoidung;
                                            
                                            return (
                                                <TableRow key={nhom.ID_NHOM}>
                                                    <TableCell className="text-center text-muted-foreground text-xs">{index + 1}</TableCell>
                                                    <TableCell className="font-medium text-primary">{nhom.TEN_NHOM}</TableCell>
                                                    <TableCell>
                                                        {detai ? (
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                                                                        <Info className="w-4 h-4 text-muted-foreground" />
                                                                        <span className="truncate max-w-[200px]" title={detai.TEN_DETAI}>
                                                                            {detai.TEN_DETAI}
                                                                        </span>
                                                                    </div>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-80">
                                                                    <div className="space-y-2">
                                                                        <h4 className="font-medium leading-none text-primary">{detai.TEN_DETAI}</h4>
                                                                        <p className="text-sm text-muted-foreground">
                                                                            {detai.MOTA || "Không có mô tả."}
                                                                        </p>
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        ) : (
                                                            <span className="text-muted-foreground italic text-sm">Chưa có đề tài</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {gvhd ? (
                                                            <div className="flex items-center gap-2">
                                                                <User className="w-4 h-4 text-muted-foreground" />
                                                                <span className="text-sm">{gvhd.HODEM_VA_TEN}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">Chưa phân công</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="text-[10px] font-normal bg-muted text-muted-foreground">
                                                            {nhom.phancong_detai_nhom?.TRANGTHAI || 'N/A'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleXoaNhom(nhom.ID_NHOM)}
                                                            disabled={deletingGroupId === nhom.ID_NHOM}
                                                            title="Gỡ nhóm khỏi hội đồng"
                                                        >
                                                            {deletingGroupId === nhom.ID_NHOM ? (
                                                                <Loader2 className="h-4 w-4 animate-spin"/>
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                             </ScrollArea>
                        </div>
                    )}
                </TabsContent>
             </Tabs>
          </main>
      </div>

      {/* DIALOG XÁC NHẬN XÓA */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" /> Xác nhận Xóa
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn hội đồng <strong>{form.TEN_HOIDONG}</strong> và không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditHoiDong;