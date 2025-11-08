import React, { useState, useEffect, useMemo } from "react";
import axiosClient from "@/api/axiosConfig";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
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
import { Loader2, UserPlus, Search, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const CreateHoiDongDialog = ({ isOpen, setIsOpen, onSuccess }) => {
  const [isManual, setIsManual] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingGV, setLoadingGV] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    soLuong: 1,
    TEN_HOIDONG: "",
    loai: "hoidong",
    ID_KEHOACH: "",
    ID_CHUYENNGANH: "",
    NGAY_BAOCAO: "",
    GIO_BAOCAO: "",
    PHONG: "",
  });

  const [kehoach, setKehoach] = useState([]);
  const [chuyennganh, setChuyennganh] = useState([]);
  const [giangvien, setGiangvien] = useState([]);
  const [selectedGV, setSelectedGV] = useState([]);
  const [gvRoles, setGvRoles] = useState({});
  const [searchGV, setSearchGV] = useState("");

  const resetForm = () => {
    setIsManual(false);
    setLoading(true);
    setLoadingGV(false);
    setIsSubmitting(false);
    setForm({
      soLuong: 1,
      TEN_HOIDONG: "",
      loai: "hoidong",
      ID_KEHOACH: "",
      ID_CHUYENNGANH: "",
      NGAY_BAOCAO: "",
      GIO_BAOCAO: "",
      PHONG: "",
    });
    setGiangvien([]);
    setSelectedGV([]);
    setGvRoles({});
    setSearchGV("");
  };

  useEffect(() => {
    if (isOpen) {
      const fetchOptions = async () => {
        setLoading(true);
        try {
          const [khRes, cnRes] = await Promise.all([
            axiosClient.get("/admin/hoidong/kehoach-options"),
            axiosClient.get("/admin/hoidong/chuyennganh-options"),
          ]);
          setKehoach(khRes.data || []);
          setChuyennganh(cnRes.data || []);
        } catch (err) {
          console.error("Lỗi khi tải dữ liệu:", err);
          toast.error("Không thể tải dữ liệu.");
          setIsOpen(false);
        } finally {
          setLoading(false);
        }
      };
      fetchOptions();
    } else {
      setTimeout(resetForm, 300);
    }
  }, [isOpen, setIsOpen]);

  const isPhanBienAllowed = useMemo(() => {
    if (!form.ID_KEHOACH) return true;
    const selectedPlan = kehoach.find(k => String(k.ID_KEHOACH) === form.ID_KEHOACH);
    return selectedPlan?.allow_phanbien !== false;
  }, [form.ID_KEHOACH, kehoach]);

  useEffect(() => {
    if (!isPhanBienAllowed && form.loai === 'phanbien') {
       setForm(prev => ({ ...prev, loai: 'hoidong' }));
       setSelectedGV([]);
       setGvRoles({});
       toast.info("Kế hoạch này không yêu cầu phản biện. Đã tự động chuyển sang loại Hội đồng.");
    }
  }, [isPhanBienAllowed, form.loai]);

  useEffect(() => {
    const fetchGiangVien = async () => {
      if (!form.ID_KEHOACH || !isOpen) {
        setGiangvien([]);
        return;
      }
      setLoadingGV(true);
      setSelectedGV([]);
      setGvRoles({});
      try {
        const gvRes = await axiosClient.get("/admin/giangvien", {
          params: { plan_id: form.ID_KEHOACH },
        });
        setGiangvien(gvRes.data || []);
      } catch (err) {
        console.error("Lỗi tải giảng viên:", err);
        toast.error("Không thể tải danh sách giảng viên.");
      } finally {
        setLoadingGV(false);
      }
    };
    if (isOpen) fetchGiangVien();
  }, [form.ID_KEHOACH, isOpen]);

  const filteredGV = useMemo(
    () => giangvien.filter((gv) => gv.HO_TEN.toLowerCase().includes(searchGV.toLowerCase())),
    [giangvien, searchGV]
  );

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSelectChange = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleToggleGV = (id) => {
    const isSelected = selectedGV.includes(id);
    if (form.loai === "phanbien" && !isSelected && selectedGV.length >= 1) {
      toast.error("Hội đồng phản biện chỉ được chọn 1 giảng viên.");
      return;
    }
    if (form.loai === "hoidong" && !isSelected && selectedGV.length >= 3) {
      toast.error("Hội đồng bảo vệ chỉ được chọn tối đa 3 giảng viên.");
      return;
    }
    setSelectedGV((prev) => {
      const updated = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!updated.includes(id)) {
        setGvRoles((roles) => {
          const newRoles = { ...roles };
          delete newRoles[id];
          return newRoles;
        });
      } else if (form.loai === "phanbien" && updated.includes(id)) {
        setGvRoles((roles) => ({ ...roles, [id]: "phanbien" }));
      }
      return updated;
    });
  };

  const handleRoleChange = (id, role) => {
    if (form.loai === "phanbien") return;
    if (form.loai === "hoidong") {
      if (role === "phanbien") {
        toast.error("Không thể chọn 'Phản biện' cho Hội đồng bảo vệ.");
        return;
      }
      const otherRoles = Object.keys(gvRoles).filter((gvId) => gvId != id).map((gvId) => gvRoles[gvId]);
      if ((role === "chutich" && otherRoles.includes("chutich")) || (role === "thuky" && otherRoles.includes("thuky"))) {
        toast.error(`Vai trò '${role === "chutich" ? "Chủ tịch" : "Thư ký"}' đã có người đảm nhiệm.`);
        return;
      }
    }
    setGvRoles((prev) => ({ ...prev, [id]: role }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!form.ID_KEHOACH || !form.ID_CHUYENNGANH) {
        toast.error("Vui lòng chọn Kế hoạch và Chuyên ngành.");
        setIsSubmitting(false);
        return;
      }
      const payload = {
        LOAI: form.loai,
        ID_KEHOACH: Number(form.ID_KEHOACH),
        ID_CHUYENNGANH: Number(form.ID_CHUYENNGANH),
        NGAY_BAOCAO: form.NGAY_BAOCAO || null,
        GIO_BAOCAO: form.GIO_BAOCAO || null,
        PHONG: form.PHONG || null,
      };
      if (isManual) {
        payload.TEN_HOIDONG = form.TEN_HOIDONG || null;
        payload.giangviens = selectedGV.map((id) => ({
          id,
          vaitro: form.loai === "phanbien" ? "phanbien" : gvRoles[id] || "thanhvien",
        }));
      } else {
        payload.soLuong = Number(form.soLuong) || 1;
        payload.TEN_HOIDONG = form.TEN_HOIDONG || null;
      }
      await axiosClient.post("/admin/hoidong", payload);
      toast.success(isManual ? "Tạo hội đồng thủ công thành công!" : `Tạo ${payload.soLuong} hội đồng tự động thành công!`);
      onSuccess();
      setIsOpen(false);
    } catch (err) {
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        Object.keys(errors).forEach(key => toast.error(errors[key][0]));
      } else {
        toast.error(err.response?.data?.error || "Lỗi khi tạo hội đồng!");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                {isManual ? "Tạo Hội Đồng Thủ Công" : "Tạo Hội Đồng Tự Động"}
              </DialogTitle>
              <DialogDescription>
                {isManual ? "Tự điền thông tin và chọn giảng viên." : "Tạo nhanh nhiều hội đồng cùng lúc."}
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Label htmlFor="mode-switch-dialog">
                {isManual ? "Thủ công" : "Tự động"}
              </Label>
              <Switch id="mode-switch-dialog" checked={isManual} onCheckedChange={setIsManual} />
            </div>
          </div>
        </DialogHeader>

        <form id="create-hoidong-form" onSubmit={handleSubmit} className="flex-grow min-h-0 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground h-full flex items-center justify-center min-h-[300px]">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!isManual && (
                  <div className="space-y-2">
                    <Label htmlFor="soLuong-dialog">Số lượng hội đồng</Label>
                    <Input type="number" id="soLuong-dialog" name="soLuong" min="1" value={form.soLuong} onChange={handleChange} />
                  </div>
                )}
                {isManual && (
                  <div className="space-y-2">
                    <Label htmlFor="TEN_HOIDONG-dialog">Tên hội đồng (Tùy chọn)</Label>
                    <Input type="text" id="TEN_HOIDONG-dialog" name="TEN_HOIDONG" value={form.TEN_HOIDONG} onChange={handleChange} placeholder="Để trống để tự động tạo tên..." />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="loai-dialog">Loại hội đồng *</Label>
                  <Select name="loai" value={form.loai} onValueChange={(v) => handleSelectChange("loai", v)}>
                    <SelectTrigger id="loai-dialog"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hoidong">Hội đồng (3 người)</SelectItem>
                      {isPhanBienAllowed && <SelectItem value="phanbien">Phản biện (1 người)</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ID_KEHOACH-dialog">Kế hoạch *</Label>
                  <Select name="ID_KEHOACH" value={form.ID_KEHOACH} onValueChange={(v) => handleSelectChange("ID_KEHOACH", v)}>
                    <SelectTrigger id="ID_KEHOACH-dialog"><SelectValue placeholder="-- Chọn kế hoạch --" /></SelectTrigger>
                    <SelectContent>
                      {kehoach.map((k) => (
                        <SelectItem key={k.ID_KEHOACH} value={String(k.ID_KEHOACH)}>{k.TEN_DOT}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ID_CHUYENNGANH-dialog">Chuyên ngành *</Label>
                  <Select name="ID_CHUYENNGANH" value={form.ID_CHUYENNGANH} onValueChange={(v) => handleSelectChange("ID_CHUYENNGANH", v)}>
                    <SelectTrigger id="ID_CHUYENNGANH-dialog"><SelectValue placeholder="-- Chọn chuyên ngành --" /></SelectTrigger>
                    <SelectContent>
                      {chuyennganh.map((c) => (
                        <SelectItem key={c.ID_CHUYENNGANH} value={String(c.ID_CHUYENNGANH)}>{c.TEN_CHUYENNGANH}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="NGAY_BAOCAO-dialog">Ngày báo cáo (Tùy chọn)</Label>
                  <Input type="date" id="NGAY_BAOCAO-dialog" name="NGAY_BAOCAO" value={form.NGAY_BAOCAO} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="GIO_BAOCAO-dialog">Giờ báo cáo (Tùy chọn)</Label>
                  <Input type="time" id="GIO_BAOCAO-dialog" name="GIO_BAOCAO" value={form.GIO_BAOCAO} onChange={handleChange} />
                </div>
                <div className={isManual ? "md:col-span-2 space-y-2" : "space-y-2"}>
                  <Label htmlFor="PHONG-dialog">Phòng báo cáo (Tùy chọn)</Label>
                  <Input type="text" id="PHONG-dialog" name="PHONG" value={form.PHONG} onChange={handleChange} placeholder="Ví dụ: B1.01" />
                </div>
              </div>

              {isManual && (
                <div className="mt-8 space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold text-primary mb-3">Giảng viên tham gia</h3>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input type="text" placeholder="Tìm kiếm giảng viên theo tên..." value={searchGV} onChange={(e) => setSearchGV(e.target.value)} className="pl-10" disabled={!form.ID_KEHOACH || loadingGV} />
                  </div>
                  <ScrollArea className="h-64 border rounded-md p-3 bg-muted/50">
                    {loadingGV ? (
                      <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : !form.ID_KEHOACH ? (
                      <div className="flex justify-center items-center h-full text-muted-foreground text-sm"><Info className="mr-2 h-4 w-4" /> Vui lòng chọn Kế hoạch để tải danh sách giảng viên.</div>
                    ) : filteredGV.length > 0 ? (
                      filteredGV.map((gv) => {
                        const isAssigned = gv.HOIDONGS && gv.HOIDONGS.length > 0;
                        const assignedText = isAssigned ? `Đã tham gia: ${gv.HOIDONGS.map((hd) => hd.TEN_HOIDONG).join(", ")}` : null;
                        return (
                          <div key={gv.ID_GIANGVIEN} className="flex flex-col sm:flex-row justify-between sm:items-center py-2 border-b last:border-b-0" title={assignedText}>
                            <Label htmlFor={`gv-dialog-${gv.ID_GIANGVIEN}`} className={cn("flex items-center gap-2 text-sm", isAssigned ? "cursor-not-allowed text-muted-foreground opacity-70" : "cursor-pointer")}>
                              <Checkbox id={`gv-dialog-${gv.ID_GIANGVIEN}`} checked={selectedGV.includes(gv.ID_GIANGVIEN)} onCheckedChange={() => handleToggleGV(gv.ID_GIANGVIEN)} disabled={isAssigned} />
                              <div className="flex flex-col">
                                <span>{gv.HO_TEN} <span className="text-muted-foreground text-xs">({gv.MA_GIANGVIEN})</span></span>
                                {isAssigned && <span className="text-xs text-destructive italic">{assignedText}</span>}
                              </div>
                            </Label>
                            {selectedGV.includes(gv.ID_GIANGVIEN) && (
                              <Select value={form.loai === "phanbien" ? "phanbien" : gvRoles[gv.ID_GIANGVIEN] || "thanhvien"} onValueChange={(value) => handleRoleChange(gv.ID_GIANGVIEN, value)} disabled={form.loai === "phanbien"}>
                                <SelectTrigger className="h-8 text-xs w-full sm:w-[150px] mt-2 sm:mt-0"><SelectValue placeholder="-- Vai trò --" /></SelectTrigger>
                                <SelectContent>
                                  {form.loai === "hoidong" ? (
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
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-4">Không có giảng viên nào phù hợp.</p>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </form>

        <DialogFooter className="p-6 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
          <Button type="submit" form="create-hoidong-form" disabled={loading || isSubmitting || !form.ID_KEHOACH || !form.ID_CHUYENNGANH} className="min-w-[150px]">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {isManual ? "Tạo hội đồng" : "Tạo hội đồng tự động"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};