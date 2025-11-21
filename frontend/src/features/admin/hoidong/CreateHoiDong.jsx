import React, { useState, useEffect, useMemo } from "react";
import axiosClient from "@/api/axiosConfig";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, UserPlus, Search, Info, Calendar, 
  MapPin, Users, Sparkles, PenTool, Briefcase 
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export const CreateHoiDongDialog = ({ isOpen, setIsOpen, onSuccess }) => {
  const [activeTab, setActiveTab] = useState("auto"); // 'auto' | 'manual'
  const [loading, setLoading] = useState(true);
  const [loadingGV, setLoadingGV] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    soLuong: 1,
    TEN_HOIDONG: "",
    LOAI: "hoidong", // [SỬA] Đổi 'loai' thành 'LOAI' để khớp với Backend
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

  // Reset form khi đóng mở
  useEffect(() => {
    if (isOpen) {
      fetchOptions();
    } else {
      // Delay reset để tránh flash UI khi đóng
      setTimeout(() => {
        setForm(prev => ({
            ...prev,
            soLuong: 1,
            TEN_HOIDONG: "",
            // Giữ lại ID_KEHOACH để tiện nhập tiếp
        }));
        setSelectedGV([]);
        setGvRoles({});
        setSearchGV("");
      }, 300);
    }
  }, [isOpen]);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const [khRes, cnRes] = await Promise.all([
        axiosClient.get("/admin/hoidong/kehoach-options"),
        axiosClient.get("/admin/hoidong/chuyennganh-options"),
      ]);
      setKehoach(khRes.data || []);
      setChuyennganh(cnRes.data || []);
      
      // Auto select kế hoạch đầu tiên nếu chưa chọn
      if (!form.ID_KEHOACH && khRes.data?.length > 0) {
          setForm(prev => ({ ...prev, ID_KEHOACH: String(khRes.data[0].ID_KEHOACH) }));
      }
    } catch (err) {
      toast.error("Không thể tải dữ liệu ban đầu.");
    } finally {
      setLoading(false);
    }
  };

  // Logic kiểm tra loại hội đồng
  const isPhanBienAllowed = useMemo(() => {
    if (!form.ID_KEHOACH) return true;
    const selectedPlan = kehoach.find(k => String(k.ID_KEHOACH) === form.ID_KEHOACH);
    return selectedPlan?.allow_phanbien !== false;
  }, [form.ID_KEHOACH, kehoach]);

  // Tải giảng viên khi chọn kế hoạch
  useEffect(() => {
    const fetchGiangVien = async () => {
      if (!form.ID_KEHOACH || !isOpen) return;
      setLoadingGV(true);
      try {
        const gvRes = await axiosClient.get("/admin/giangvien", {
          params: { plan_id: form.ID_KEHOACH },
        });
        setGiangvien(gvRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingGV(false);
      }
    };
    fetchGiangVien();
  }, [form.ID_KEHOACH, isOpen]);

  // Lọc giảng viên
  const filteredGV = useMemo(
    () => giangvien.filter((gv) => gv.HO_TEN.toLowerCase().includes(searchGV.toLowerCase())),
    [giangvien, searchGV]
  );

  // Handlers
  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  
  const handleSelectChange = (name, value) => {
      setForm((prev) => ({ ...prev, [name]: value }));
      // Reset danh sách chọn nếu đổi loại hội đồng
      if (name === 'LOAI') { // [SỬA] name='LOAI'
          setSelectedGV([]);
          setGvRoles({});
      }
  };

  const handleToggleGV = (id) => {
    const isSelected = selectedGV.includes(id);
    // Validate số lượng
    if (form.LOAI === "phanbien" && !isSelected && selectedGV.length >= 1) { // [SỬA] form.LOAI
      return toast.warning("Hội đồng phản biện chỉ được chọn 1 người.");
    }
    if (form.LOAI === "hoidong" && !isSelected && selectedGV.length >= 3) { // [SỬA] form.LOAI
      return toast.warning("Hội đồng bảo vệ tối đa 3 người.");
    }

    setSelectedGV((prev) => {
      const updated = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!updated.includes(id)) {
        // Xóa role nếu bỏ chọn
        setGvRoles((roles) => {
            const newRoles = { ...roles };
            delete newRoles[id];
            return newRoles;
        });
      } else if (form.LOAI === "phanbien") { // [SỬA] form.LOAI
          setGvRoles((roles) => ({ ...roles, [id]: "phanbien" }));
      }
      return updated;
    });
  };

  const handleRoleChange = (id, role) => {
    // Validate trùng vai trò (Chủ tịch/Thư ký)
    if (form.LOAI === "hoidong") { // [SỬA] form.LOAI
      const otherRoles = Object.keys(gvRoles).filter((gvId) => gvId != id).map((gvId) => gvRoles[gvId]);
      if ((role === "chutich" && otherRoles.includes("chutich")) || (role === "thuky" && otherRoles.includes("thuky"))) {
        return toast.warning(`Vai trò này đã có người đảm nhiệm.`);
      }
    }
    setGvRoles((prev) => ({ ...prev, [id]: role }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const isManual = activeTab === 'manual';

    try {
      if (!form.ID_KEHOACH || !form.ID_CHUYENNGANH) {
        toast.error("Thiếu thông tin Kế hoạch hoặc Chuyên ngành.");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        ...form, // Giờ đây form chứa LOAI (uppercase), nên payload sẽ đúng
        ID_KEHOACH: Number(form.ID_KEHOACH),
        ID_CHUYENNGANH: Number(form.ID_CHUYENNGANH),
        NGAY_BAOCAO: form.NGAY_BAOCAO || null,
        GIO_BAOCAO: form.GIO_BAOCAO || null,
        PHONG: form.PHONG || null,
        TEN_HOIDONG: form.TEN_HOIDONG || null,
      };

      if (isManual) {
        payload.giangviens = selectedGV.map((id) => ({
          id,
          vaitro: form.LOAI === "phanbien" ? "phanbien" : gvRoles[id] || "thanhvien", // [SỬA] form.LOAI
        }));
      } else {
        // Auto mode
        payload.soLuong = Number(form.soLuong) || 1;
        payload.giangviens = [];
      }

      await axiosClient.post("/admin/hoidong", payload);
      toast.success(isManual ? "Đã tạo hội đồng thành công!" : `Đã tạo ${payload.soLuong} hội đồng tự động!`);
      onSuccess();
      setIsOpen(false);
    } catch (err) {
       const errorMsg = err.response?.data?.errors 
            ? Object.values(err.response.data.errors)[0][0] 
            : (err.response?.data?.error || "Có lỗi xảy ra!");
       toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden bg-background flex flex-col max-h-[90vh] border-none shadow-2xl">
        
        {/* HEADER */}
        <DialogHeader className="px-6 py-5 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-background">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-xl text-primary shadow-sm ring-1 ring-primary/10">
                    {activeTab === 'auto' ? <Sparkles className="w-6 h-6" /> : <PenTool className="w-6 h-6" />}
                </div>
                <div>
                    <DialogTitle className="text-xl font-bold text-primary">Thêm Hội Đồng Mới</DialogTitle>
                    <DialogDescription className="text-sm mt-1 text-muted-foreground font-medium">
                        {activeTab === 'auto' ? 'Tạo nhanh nhiều hội đồng trống để phân bổ sau.' : 'Tạo hội đồng chi tiết và chỉ định thành viên ngay.'}
                    </DialogDescription>
                </div>
            </div>
        </DialogHeader>

        {/* BODY SCROLLABLE */}
        <div className="flex-1 overflow-y-auto bg-muted/10">
            <div className="p-6 space-y-6">
                
                {/* PHẦN CHUNG */}
                <div className="bg-card rounded-xl border shadow-sm p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase font-bold">Kế hoạch áp dụng <span className="text-destructive">*</span></Label>
                            <Select value={form.ID_KEHOACH} onValueChange={(v) => handleSelectChange("ID_KEHOACH", v)}>
                                <SelectTrigger className="h-10 bg-background border-input shadow-sm hover:border-primary/50 transition-colors">
                                    <SelectValue placeholder="Chọn kế hoạch..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {kehoach.map((k) => (
                                        <SelectItem key={k.ID_KEHOACH} value={String(k.ID_KEHOACH)}>{k.TEN_DOT}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase font-bold">Chuyên ngành <span className="text-destructive">*</span></Label>
                            <Select value={form.ID_CHUYENNGANH} onValueChange={(v) => handleSelectChange("ID_CHUYENNGANH", v)}>
                                <SelectTrigger className="h-10 bg-background border-input shadow-sm hover:border-primary/50 transition-colors">
                                    <SelectValue placeholder="Chọn chuyên ngành..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {chuyennganh.map((c) => (
                                        <SelectItem key={c.ID_CHUYENNGANH} value={String(c.ID_CHUYENNGANH)}>{c.TEN_CHUYENNGANH}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                        <div className="col-span-2 md:col-span-1 space-y-2">
                            <Label className="text-xs font-semibold">Loại Hội đồng</Label>
                            <Select value={form.LOAI} onValueChange={(v) => handleSelectChange("LOAI", v)}> {/* [SỬA] value={form.LOAI} */}
                                <SelectTrigger className="h-9 bg-muted/30 border-muted-foreground/20 focus:bg-background transition-colors">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hoidong">Hội đồng (3)</SelectItem>
                                    {isPhanBienAllowed && <SelectItem value="phanbien">Phản biện (1)</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-2 md:col-span-1 space-y-2">
                            <Label className="text-xs font-semibold">Ngày báo cáo</Label>
                            <Input type="date" name="NGAY_BAOCAO" value={form.NGAY_BAOCAO} onChange={handleChange} className="h-9 bg-muted/30 border-muted-foreground/20 focus:bg-background transition-colors" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Giờ</Label>
                            <Input type="time" name="GIO_BAOCAO" value={form.GIO_BAOCAO} onChange={handleChange} className="h-9 bg-muted/30 border-muted-foreground/20 focus:bg-background transition-colors" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Phòng</Label>
                            <Input placeholder="Vd: B1.01" name="PHONG" value={form.PHONG} onChange={handleChange} className="h-9 bg-muted/30 border-muted-foreground/20 focus:bg-background transition-colors" />
                        </div>
                    </div>
                </div>

                <Separator className="bg-border/60" />

                {/* TABS MODE */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 h-12 rounded-xl border border-muted">
                        <TabsTrigger value="auto" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm h-full transition-all font-semibold data-[state=active]:ring-1 data-[state=active]:ring-border">
                             <Sparkles className="w-4 h-4 mr-2" /> Tự động (Số lượng)
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm h-full transition-all font-semibold data-[state=active]:ring-1 data-[state=active]:ring-border">
                             <PenTool className="w-4 h-4 mr-2" /> Thủ công (Chi tiết)
                        </TabsTrigger>
                    </TabsList>
                    
                    {/* MODE TỰ ĐỘNG */}
                    <TabsContent value="auto" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-card rounded-xl border p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold text-foreground">Số lượng cần tạo</Label>
                                <div className="flex items-center gap-3">
                                    <div className="relative group">
                                        <Input type="number" min="1" max="50" name="soLuong" value={form.soLuong} onChange={handleChange} className="text-3xl font-bold text-center w-28 h-16 border-2 border-primary/20 focus-visible:border-primary bg-primary/5 rounded-xl transition-all group-hover:bg-primary/10" />
                                    </div>
                                    <span className="text-base font-medium text-muted-foreground">Hội đồng</span>
                                </div>
                            </div>
                            <div className="space-y-3 pl-0 md:pl-8 md:border-l">
                                <Label className="text-sm font-semibold text-foreground">Tên định danh (Prefix)</Label>
                                <Input name="TEN_HOIDONG" value={form.TEN_HOIDONG} onChange={handleChange} placeholder="VD: HĐ Bảo vệ K20..." className="h-11" />
                                <p className="text-[11px] text-muted-foreground bg-blue-50 text-blue-600 p-2 rounded border border-blue-100 flex items-start gap-2">
                                    <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"/> 
                                    <span>Hệ thống sẽ tự động thêm số thứ tự (1, 2, 3...) vào sau tên này.</span>
                                </p>
                            </div>
                        </div>
                    </TabsContent>

                    {/* MODE THỦ CÔNG */}
                    <TabsContent value="manual" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <div className="space-y-2">
                            <Label className="text-sm font-semibold">Tên hội đồng cụ thể</Label>
                            <Input name="TEN_HOIDONG" value={form.TEN_HOIDONG} onChange={handleChange} placeholder="VD: HĐ Bảo vệ Nhóm 1" className="h-10" />
                        </div>

                        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                            <div className="bg-muted/40 px-4 py-3 border-b flex items-center gap-3">
                                <Search className="w-4 h-4 text-muted-foreground" />
                                <input 
                                    className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground font-medium"
                                    placeholder="Tìm kiếm giảng viên để thêm..."
                                    value={searchGV}
                                    onChange={(e) => setSearchGV(e.target.value)}
                                    disabled={!form.ID_KEHOACH}
                                />
                            </div>
                            
                            <ScrollArea className="h-[240px] p-0">
                                {loadingGV ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                        <span className="text-xs font-medium">Đang tải danh sách...</span>
                                    </div>
                                ) : !form.ID_KEHOACH ? (
                                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                        Vui lòng chọn Kế hoạch trước.
                                    </div>
                                ) : filteredGV.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                        Không tìm thấy giảng viên.
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {filteredGV.map((gv) => {
                                            const isSelected = selectedGV.includes(gv.ID_GIANGVIEN);
                                            const isAssigned = gv.HOIDONGS && gv.HOIDONGS.length > 0;
                                            
                                            return (
                                                <div 
                                                    key={gv.ID_GIANGVIEN} 
                                                    className={cn(
                                                        "flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors",
                                                        isSelected && "bg-primary/5 hover:bg-primary/10"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <Checkbox 
                                                            id={`gv-${gv.ID_GIANGVIEN}`}
                                                            checked={isSelected}
                                                            onCheckedChange={() => handleToggleGV(gv.ID_GIANGVIEN)}
                                                        />
                                                        <div className="flex flex-col min-w-0">
                                                            <label 
                                                                htmlFor={`gv-${gv.ID_GIANGVIEN}`} 
                                                                className="text-sm font-medium truncate cursor-pointer"
                                                            >
                                                                {/* Hiển thị học vị */}
                                                                {gv.HOCVI ? `${gv.HOCVI}. ` : ''}{gv.HO_TEN}
                                                            </label>
                                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                {gv.MA_GIANGVIEN} • {gv.KHOA || 'N/A'}
                                                                {isAssigned && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 ml-1 border-orange-200 text-orange-600 bg-orange-50">Bận</Badge>}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Dropdown chọn Role (chỉ hiện khi đã chọn) */}
                                                    {isSelected && (
                                                        <div className="w-[110px] flex-shrink-0 animate-in zoom-in-95 duration-200">
                                                            <Select 
                                                                value={form.LOAI === 'phanbien' ? 'phanbien' : (gvRoles[gv.ID_GIANGVIEN] || 'thanhvien')} // [SỬA] form.LOAI
                                                                onValueChange={(v) => handleRoleChange(gv.ID_GIANGVIEN, v)}
                                                                disabled={form.LOAI === 'phanbien'} // [SỬA] form.LOAI
                                                            >
                                                                <SelectTrigger className="h-7 text-xs">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {form.LOAI === 'hoidong' ? ( // [SỬA] form.LOAI
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
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                            <span>Đã chọn: <span className="font-medium text-primary">{selectedGV.length}</span> giảng viên</span>
                            {form.LOAI === 'hoidong' && <span>(Tối đa 3)</span>}
                            {form.LOAI === 'phanbien' && <span>(Tối đa 1)</span>}
                        </div>
                    </TabsContent>
                </Tabs>

            </div>
        </div>

        {/* FOOTER */}
        <DialogFooter className="p-4 border-t bg-muted/10 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Đóng</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || loading || !form.ID_KEHOACH}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {activeTab === 'manual' ? 'Tạo Thủ Công' : `Tạo ${form.soLuong} Hội đồng`}
            </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};