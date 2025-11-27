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
  Loader2, Search, Info, Calendar, 
  MapPin, Sparkles, PenTool, RefreshCw, Database, Zap 
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { getAutoCreateStats, createBulkByDepartment } from "@/api/adminHoiDongService"; 
import { getKhoaBomons } from "@/api/userService";

export const CreateHoiDongDialog = ({ isOpen, setIsOpen, onSuccess }) => {
  const [activeTab, setActiveTab] = useState("auto"); 
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STATE DỮ LIỆU CHUNG ---
  const [kehoach, setKehoach] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Form chung
  const [form, setForm] = useState({
    soLuong: 1, 
    TEN_HOIDONG: "",
    LOAI: "hoidong", 
    ID_KEHOACH: "",
    ID_KHOA_BOMON: "",
    NGAY_BAOCAO: "",
    GIO_BAOCAO: "",
    PHONG: "",
  });

  // --- STATE CHO TAB AUTO (BỘ MÔN) ---
  const [loadingStats, setLoadingStats] = useState(false);
  const [ratio, setRatio] = useState(5); 
  const [deptStats, setDeptStats] = useState([]);

  // --- STATE CHO TAB MANUAL ---
  const [loadingGV, setLoadingGV] = useState(false);
  const [giangvien, setGiangvien] = useState([]);
  const [selectedGV, setSelectedGV] = useState([]);
  const [gvRoles, setGvRoles] = useState({});
  const [searchGV, setSearchGV] = useState("");

  // 1. Khởi tạo
  useEffect(() => {
    if (isOpen) {
      fetchOptions();
    } else {
        setTimeout(() => {
            setForm(prev => ({
                ...prev,
                soLuong: 1,
                TEN_HOIDONG: "",
                ID_KHOA_BOMON: "",
            }));
            setSelectedGV([]);
            setGvRoles({});
            setSearchGV("");
            setDeptStats([]);
        }, 300);
    }
  }, [isOpen]);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const [khRes, deptRes] = await Promise.all([
        axiosClient.get("/admin/hoidong/kehoach-options"),
        getKhoaBomons(),
      ]);
      setKehoach(khRes.data || []);
      setDepartments(deptRes || []);
      
      if (!form.ID_KEHOACH && khRes.data?.length > 0) {
          setForm(prev => ({ ...prev, ID_KEHOACH: String(khRes.data[0].ID_KEHOACH) }));
      }
    } catch (err) {
      toast.error("Không thể tải dữ liệu ban đầu.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Logic Auto Stats
  useEffect(() => {
    if (isOpen && activeTab === 'auto' && form.ID_KEHOACH) {
        fetchAutoStats();
    }
  }, [isOpen, activeTab, form.ID_KEHOACH, form.LOAI]);

  useEffect(() => {
      if (deptStats.length > 0) {
          setDeptStats(prev => prev.map(item => ({
              ...item,
              suggested_councils: Math.ceil(item.group_count / ratio) || 1
          })));
      }
  }, [ratio]);

  // 3. Logic Manual Fetch GV
  useEffect(() => {
    const fetchGiangVien = async () => {
      if (!form.ID_KEHOACH || !isOpen || activeTab !== 'manual') return;
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
  }, [form.ID_KEHOACH, isOpen, activeTab]);

  // API & Handlers
  const fetchAutoStats = async () => {
      if (!form.ID_KEHOACH) return;
      setLoadingStats(true);
      try {
          const data = await getAutoCreateStats(form.ID_KEHOACH, form.LOAI);
          
          const mappedData = data.map(item => ({
              ...item,
              suggested_councils: Math.ceil(item.group_count / ratio) || 1,
              prefix_name: `${form.LOAI === 'hoidong' ? 'HĐ Bảo vệ' : 'HĐ Phản biện'} - ${item.MA_KHOA_BOMON}`
          }));
          setDeptStats(mappedData);
      } catch (error) {
          console.error(error);
          toast.error("Không thể lấy thống kê nhóm.");
      } finally {
          setLoadingStats(false);
      }
  }

  const handleDeptStatChange = (id, field, value) => {
      setDeptStats(prev => prev.map(item => 
          item.ID_KHOA_BOMON === id ? { ...item, [field]: value } : item
      ));
  };

  const filteredGV = useMemo(
    () => giangvien.filter((gv) => gv.HO_TEN.toLowerCase().includes(searchGV.toLowerCase())),
    [giangvien, searchGV]
  );

  const handleToggleGV = (id) => {
    const isSelected = selectedGV.includes(id);
    if (form.LOAI === "phanbien" && !isSelected && selectedGV.length >= 1) { 
      return toast.warning("Hội đồng phản biện chỉ được chọn 1 người.");
    }
    if (form.LOAI === "hoidong" && !isSelected && selectedGV.length >= 3) { 
      return toast.warning("Hội đồng bảo vệ tối đa 3 người.");
    }

    setSelectedGV((prev) => {
      const updated = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!updated.includes(id)) {
        setGvRoles((roles) => {
            const newRoles = { ...roles };
            delete newRoles[id];
            return newRoles;
        });
      } else if (form.LOAI === "phanbien") { 
          setGvRoles((roles) => ({ ...roles, [id]: "phanbien" }));
      }
      return updated;
    });
  };

  const handleRoleChange = (id, role) => {
    if (form.LOAI === "hoidong") { 
      const otherRoles = Object.keys(gvRoles).filter((gvId) => gvId != id).map((gvId) => gvRoles[gvId]);
      if ((role === "chutich" && otherRoles.includes("chutich")) || (role === "thuky" && otherRoles.includes("thuky"))) {
        return toast.warning(`Vai trò này đã có người đảm nhiệm.`);
      }
    }
    setGvRoles((prev) => ({ ...prev, [id]: role }));
  };

  const getWorkloadColor = (count) => {
      if (count === 0) return "bg-muted text-muted-foreground border-muted-foreground/20";
      if (count <= 2) return "bg-blue-50 text-blue-600 border-blue-200";
      if (count <= 5) return "bg-orange-50 text-orange-600 border-orange-200";
      return "bg-red-50 text-red-600 border-red-200";
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  
  const handleSelectChange = (name, value) => {
      setForm((prev) => ({ ...prev, [name]: value }));
      if (name === 'LOAI') { 
          setSelectedGV([]);
          setGvRoles({});
          if (activeTab === 'auto' && deptStats.length > 0) {
             setDeptStats(prev => prev.map(item => ({
                 ...item,
                 prefix_name: `${value === 'hoidong' ? 'HĐ Bảo vệ' : 'HĐ Phản biện'} - ${item.MA_KHOA_BOMON}`
             })));
          }
      }
  };

  // --- SUBMIT ---
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (!form.ID_KEHOACH) {
          toast.error("Vui lòng chọn Kế hoạch trước.");
          setIsSubmitting(false);
          return;
      }

      // 1. TAB AUTO
      if (activeTab === 'auto') {
          const itemsToCreate = deptStats
            .filter(d => d.suggested_councils > 0)
            .map(d => ({
                ID_KHOA_BOMON: d.ID_KHOA_BOMON,
                quantity: d.suggested_councils,
                prefix: d.prefix_name,
            }));

          if (itemsToCreate.length === 0) {
              toast.warning("Không có hội đồng nào cần tạo.");
              setIsSubmitting(false);
              return;
          }

          await createBulkByDepartment({
              ID_KEHOACH: form.ID_KEHOACH,
              LOAI: form.LOAI,
              items: itemsToCreate
          });

          toast.success(`Đã tạo hội đồng cho ${itemsToCreate.length} bộ môn.`);
      } 
      // 2. TAB QUICK & MANUAL
      else {
          if (!form.ID_KHOA_BOMON) {
              toast.error("Vui lòng chọn Khoa/Bộ môn.");
              setIsSubmitting(false);
              return;
          }

          const payload = {
            ...form, 
            ID_KEHOACH: Number(form.ID_KEHOACH),
            ID_KHOA_BOMON: Number(form.ID_KHOA_BOMON),
            TEN_HOIDONG: form.TEN_HOIDONG || (form.LOAI === 'hoidong' ? 'HĐ Bảo vệ' : 'HĐ Phản biện'),
            
            soLuong: activeTab === 'quick' ? Number(form.soLuong) : 1,
            giangviens: activeTab === 'manual' ? selectedGV.map((id) => ({
              id,
              vaitro: form.LOAI === "phanbien" ? "phanbien" : gvRoles[id] || "thanhvien", 
            })) : [],
            
            NGAY_BAOCAO: activeTab === 'manual' ? (form.NGAY_BAOCAO || null) : null,
            GIO_BAOCAO: activeTab === 'manual' ? (form.GIO_BAOCAO || null) : null,
            PHONG: activeTab === 'manual' ? (form.PHONG || null) : null,
          };
          
          await axiosClient.post("/admin/hoidong", payload);
          toast.success(activeTab === 'quick' 
              ? `Đã tạo nhanh ${form.soLuong} hội đồng.` 
              : "Đã tạo hội đồng thủ công thành công!"
          );
      }

      onSuccess(); 
      setIsOpen(false);
    } catch (err) {
       console.error(err);
       const errorMsg = err.response?.data?.message || err.response?.data?.errors?.TEN_HOIDONG?.[0] || "Có lỗi xảy ra!";
       toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTabIcon = () => {
      if (activeTab === 'auto') return <Database className="w-6 h-6" />;
      if (activeTab === 'quick') return <Zap className="w-6 h-6" />;
      return <PenTool className="w-6 h-6" />;
  }
  const getTabDesc = () => {
      if (activeTab === 'auto') return 'Tự động tính toán và tạo nhanh theo số liệu thực tế.';
      if (activeTab === 'quick') return 'Tạo hàng loạt hội đồng rỗng cho một bộ môn.';
      return 'Tạo từng hội đồng và chỉ định thành viên ngay.';
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-background flex flex-col max-h-[90vh] border-none shadow-2xl">
        
        <DialogHeader className="px-6 py-5 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-background">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-xl text-primary shadow-sm ring-1 ring-primary/10">
                    {getTabIcon()}
                </div>
                <div>
                    <DialogTitle className="text-xl font-bold text-primary">Thêm Hội Đồng Mới</DialogTitle>
                    <DialogDescription className="text-sm mt-1 text-muted-foreground font-medium">
                        {getTabDesc()}
                    </DialogDescription>
                </div>
            </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-muted/10">
            <div className="p-6">
                {/* 1. Chọn Kế Hoạch & Loại */}
                <div className="bg-card rounded-xl border shadow-sm p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label>Kế hoạch áp dụng <span className="text-destructive">*</span></Label>
                        <Select value={form.ID_KEHOACH} onValueChange={(v) => handleSelectChange("ID_KEHOACH", v)}>
                            <SelectTrigger className="bg-background"><SelectValue placeholder="Chọn kế hoạch..." /></SelectTrigger>
                            <SelectContent>
                                {kehoach.map((k) => (
                                    <SelectItem key={k.ID_KEHOACH} value={String(k.ID_KEHOACH)}>{k.TEN_DOT}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Loại Hội đồng <span className="text-destructive">*</span></Label>
                        <Select value={form.LOAI} onValueChange={(v) => handleSelectChange("LOAI", v)}>
                            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="hoidong">Hội đồng Bảo vệ (3 người)</SelectItem>
                                <SelectItem value="phanbien">Hội đồng Phản biện (1 người)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* 2. TABS */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                        <TabsTrigger value="auto"><Sparkles className="w-4 h-4 mr-2" /> Tự động</TabsTrigger>
                        <TabsTrigger value="quick"><Zap className="w-4 h-4 mr-2" /> Tạo nhanh</TabsTrigger>
                        <TabsTrigger value="manual"><PenTool className="w-4 h-4 mr-2" /> Thủ công</TabsTrigger>
                    </TabsList>
                    
                    {/* === TAB 1: AUTO === */}
                    <TabsContent value="auto" className="space-y-4">
                         <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                            <div className="p-4 border-b bg-blue-50/50 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Label className="whitespace-nowrap font-semibold text-sm">Tỷ lệ (Đề tài / HĐ):</Label>
                                        <Input 
                                            type="number" 
                                            value={ratio} 
                                            onChange={(e) => setRatio(parseInt(e.target.value) || 1)}
                                            className="w-20 h-9 bg-white border-primary/30 focus:border-primary"
                                            min={1}
                                        />
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={fetchAutoStats} disabled={loadingStats || !form.ID_KEHOACH}>
                                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingStats ? 'animate-spin' : ''}`} />
                                    Làm mới dữ liệu
                                </Button>
                            </div>

                            <div className="relative min-h-[200px]">
                                {loadingStats && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 text-muted-foreground">
                                        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Đang phân tích dữ liệu...
                                    </div>
                                )}

                                {!form.ID_KEHOACH ? (
                                     <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                                        <Info className="h-8 w-8 mb-2 opacity-50" />
                                        <p>Vui lòng chọn Kế hoạch trước.</p>
                                     </div>
                                ) : deptStats.length === 0 && !loadingStats ? (
                                     <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                                        <Info className="h-8 w-8 mb-2 opacity-50" />
                                        <p>Không có nhóm nào cần tạo hội đồng.</p>
                                     </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-muted/20">
                                            <TableRow>
                                                <TableHead>Bộ môn</TableHead>
                                                <TableHead className="text-center">Số nhóm cần chấm</TableHead>
                                                <TableHead className="w-[280px]">Tên định danh (Prefix)</TableHead>
                                                <TableHead className="text-center w-[120px]">Số lượng HĐ</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {deptStats.map((dept) => (
                                                <TableRow key={dept.ID_KHOA_BOMON}>
                                                    <TableCell className="font-medium">{dept.TEN_KHOA_BOMON}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary" className="text-sm">{dept.group_count}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            value={dept.prefix_name} 
                                                            onChange={(e) => handleDeptStatChange(dept.ID_KHOA_BOMON, 'prefix_name', e.target.value)}
                                                            className="h-8 text-sm bg-background"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center justify-center">
                                                            <Input 
                                                                type="number"
                                                                min={0}
                                                                value={dept.suggested_councils} 
                                                                onChange={(e) => handleDeptStatChange(dept.ID_KHOA_BOMON, 'suggested_councils', parseInt(e.target.value) || 0)}
                                                                className="h-9 w-20 text-center font-bold text-primary border-primary/30 focus:border-primary"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* === TAB 2: QUICK === */}
                    <TabsContent value="quick" className="space-y-4">
                        <div className="bg-card rounded-xl border shadow-sm p-5">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                                <div className="space-y-2">
                                    <Label>Số lượng cần tạo <span className="text-destructive">*</span></Label>
                                    <div className="flex items-center gap-3">
                                        <Input type="number" min="1" max="50" name="soLuong" value={form.soLuong} onChange={handleChange} className="text-2xl font-bold text-center w-32 h-12 border-primary/30 focus:border-primary bg-primary/5" />
                                        <span className="text-muted-foreground">Hội đồng</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Khoa/Bộ môn <span className="text-destructive">*</span></Label>
                                    <Select value={form.ID_KHOA_BOMON} onValueChange={(v) => handleSelectChange("ID_KHOA_BOMON", v)}>
                                        <SelectTrigger><SelectValue placeholder="Chọn bộ môn..." /></SelectTrigger>
                                        <SelectContent>
                                            {departments.map((c) => (
                                                <SelectItem key={c.ID_KHOA_BOMON} value={String(c.ID_KHOA_BOMON)}>{c.TEN_KHOA_BOMON}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                             </div>
                             <div className="space-y-2">
                                <Label>Tên định danh (Prefix)</Label>
                                <Input name="TEN_HOIDONG" value={form.TEN_HOIDONG} onChange={handleChange} placeholder={`VD: ${form.LOAI === 'hoidong' ? 'HĐ Bảo vệ' : 'HĐ Phản biện'}...`} />
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <Info className="w-3 h-3"/> Hệ thống sẽ tự động thêm số thứ tự (1, 2, 3...) vào sau tên này.
                                </p>
                            </div>
                        </div>
                    </TabsContent>

                    {/* === TAB 3: MANUAL === */}
                    <TabsContent value="manual" className="space-y-4">
                        <div className="bg-card rounded-xl border shadow-sm p-5">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                                <div className="space-y-2">
                                    <Label>Tên hội đồng cụ thể</Label>
                                    <Input name="TEN_HOIDONG" value={form.TEN_HOIDONG} onChange={handleChange} placeholder="VD: HĐ Bảo vệ Nhóm 1" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Khoa/Bộ môn <span className="text-destructive">*</span></Label>
                                    <Select value={form.ID_KHOA_BOMON} onValueChange={(v) => handleSelectChange("ID_KHOA_BOMON", v)}>
                                        <SelectTrigger><SelectValue placeholder="Chọn bộ môn..." /></SelectTrigger>
                                        <SelectContent>
                                            {departments.map((c) => (
                                                <SelectItem key={c.ID_KHOA_BOMON} value={String(c.ID_KHOA_BOMON)}>{c.TEN_KHOA_BOMON}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                             </div>
                             
                             <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="space-y-2">
                                    <Label>Ngày báo cáo</Label>
                                    <Input type="date" name="NGAY_BAOCAO" value={form.NGAY_BAOCAO} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Giờ</Label>
                                    <Input type="time" name="GIO_BAOCAO" value={form.GIO_BAOCAO} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phòng</Label>
                                    <Input name="PHONG" value={form.PHONG} onChange={handleChange} placeholder="VD: B1.01" />
                                </div>
                             </div>

                             {/* Chọn giảng viên */}
                             <div className="border rounded-xl overflow-hidden bg-background">
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
                                <ScrollArea className="h-[200px] p-0">
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
                                                const hoidongCount = gv.HOIDONGS ? gv.HOIDONGS.length : 0;
                                                
                                                return (
                                                    <div key={gv.ID_GIANGVIEN} className={cn("flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors", isSelected && "bg-primary/5")}>
                                                         <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <Checkbox id={`gv-${gv.ID_GIANGVIEN}`} checked={isSelected} onCheckedChange={() => handleToggleGV(gv.ID_GIANGVIEN)} />
                                                            <div className="flex flex-col min-w-0">
                                                                <label htmlFor={`gv-${gv.ID_GIANGVIEN}`} className="text-sm font-medium truncate cursor-pointer flex items-center gap-2">
                                                                    {gv.HOCVI ? `${gv.HOCVI}. ` : ''}{gv.HO_TEN}
                                                                    {hoidongCount > 0 && (
                                                                        <Badge variant="outline" className={cn("text-[10px] px-1 py-0 h-4", getWorkloadColor(hoidongCount))}>
                                                                            {hoidongCount} HĐ
                                                                        </Badge>
                                                                    )}
                                                                </label>
                                                                <span className="text-[10px] text-muted-foreground">{gv.MA_GIANGVIEN} • {gv.KHOA || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                        {isSelected && (
                                                            <div className="w-[110px]">
                                                                <Select 
                                                                    value={form.LOAI === 'phanbien' ? 'phanbien' : (gvRoles[gv.ID_GIANGVIEN] || 'thanhvien')}
                                                                    onValueChange={(v) => handleRoleChange(gv.ID_GIANGVIEN, v)}
                                                                    disabled={form.LOAI === 'phanbien'}
                                                                >
                                                                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
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
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </ScrollArea>
                             </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/10 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Đóng</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || loading || !form.ID_KEHOACH}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {activeTab === 'auto' ? 'Tạo Hàng Loạt' : (activeTab === 'quick' ? 'Tạo Nhanh' : 'Tạo Thủ Công')}
            </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};