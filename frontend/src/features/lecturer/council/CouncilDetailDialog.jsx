import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getHoiDongDetails } from "@/api/adminHoiDongService";
import axiosClient from "@/api/axiosConfig";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar, Clock, MapPin, Users, BookOpen,
  Briefcase, Info, UserCheck, Pencil, Save, User, GraduationCap
} from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const CouncilDetailDialog = ({ councilId, open, onOpenChange }) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const { data: council, isLoading, isError } = useQuery({
    queryKey: ["councilDetail", councilId],
    queryFn: () => getHoiDongDetails(councilId),
    enabled: !!councilId && open,
  });

  useEffect(() => {
    if (council) {
      setFormData({
        TEN_HOIDONG: council.TEN_HOIDONG,
        NGAY_BAOCAO: council.NGAY_BAOCAO ? council.NGAY_BAOCAO.split("T")[0] : "",
        GIO_BAOCAO: council.GIO_BAOCAO || "",
        PHONG: council.PHONG || "",
        LOAI: council.LOAI,
        ID_KEHOACH: council.ID_KEHOACH,
        ID_CHUYENNGANH: council.ID_CHUYENNGANH,
        giangviens: council.giangviens
      });
    }
  }, [council, isEditing]);

  const handleSave = async () => {
      try {
          const payload = {
              NGAY_BAOCAO: formData.NGAY_BAOCAO,
              GIO_BAOCAO: formData.GIO_BAOCAO,
              TEN_HOIDONG: formData.TEN_HOIDONG,
              PHONG: formData.PHONG,
              ID_KEHOACH: formData.ID_KEHOACH,
              ID_CHUYENNGANH: formData.ID_CHUYENNGANH,
              LOAI: formData.LOAI,
              giangviens: formData.giangviens.map(gv => ({ 
                  id: gv.ID_GIANGVIEN, 
                  vaitro: gv.pivot.VAITRO 
              }))
          };

          await axiosClient.put(`/admin/hoidong/${councilId}`, payload);
          toast.success("Cập nhật thời gian thành công!");
          setIsEditing(false);
          queryClient.invalidateQueries(["councilDetail", councilId]);
          queryClient.invalidateQueries(["adminHoiDong"]); 
      } catch (error) {
          toast.error("Cập nhật thất bại.");
      }
  };

  const formatDate = (d) => d ? format(parseISO(d), "dd/MM/yyyy", { locale: vi }) : "---";

  if (isLoading || isError || !council) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if(!v) setIsEditing(false); onOpenChange(v); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 bg-background overflow-hidden">
        
        {/* HEADER */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0 shrink-0 h-16">
          <div className="flex flex-col gap-0.5">
             <div className="flex items-center gap-3">
                <DialogTitle className="text-lg font-bold text-primary flex items-center gap-2 truncate max-w-[400px]">
                    {council.TEN_HOIDONG}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">{council.LOAI === 'phanbien' ? 'Phản biện' : 'Bảo vệ'}</Badge>
                </DialogTitle>
             </div>
             <p className="text-xs text-muted-foreground font-medium truncate">
                {council.kehoach?.TEN_DOT}
             </p>
          </div>

          {!isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-primary h-8 text-xs">
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Sửa thời gian
              </Button>
          )}
        </DialogHeader>

        {/* BODY - GRID 2 CỘT (Fixed Height & Independent Scroll) */}
        <div className="flex-1 overflow-hidden min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 h-full">
                
                {/* --- CỘT TRÁI: THÔNG TIN & THÀNH VIÊN --- */}
                {/* [FIX SCROLL]: Thêm overflow-y-auto và h-full */}
                <div className="lg:col-span-4 border-r bg-muted/10 h-full overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="p-4 space-y-5">
                        
                        {/* 1. THÔNG TIN PHIÊN HỌP */}
                        <div className="space-y-2">
                            <h3 className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" /> Thông tin phiên họp
                            </h3>
                            <div className="space-y-2">
                                {/* Ngày */}
                                <div className="flex items-center justify-between px-3 py-2 bg-background rounded border shadow-sm h-9">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5" /> Ngày
                                    </div>
                                    {isEditing ? (
                                        <Input type="date" value={formData.NGAY_BAOCAO} onChange={e => setFormData({...formData, NGAY_BAOCAO: e.target.value})} className="h-6 w-28 text-xs bg-white border-0 p-0 text-right focus-visible:ring-0" />
                                    ) : (
                                        <span className="font-semibold text-xs">{formatDate(council.NGAY_BAOCAO)}</span>
                                    )}
                                </div>

                                {/* Giờ */}
                                <div className="flex items-center justify-between px-3 py-2 bg-background rounded border shadow-sm h-9">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5" /> Giờ
                                    </div>
                                    {isEditing ? (
                                        <Input type="time" value={formData.GIO_BAOCAO} onChange={e => setFormData({...formData, GIO_BAOCAO: e.target.value})} className="h-6 w-24 text-xs bg-white border-0 p-0 text-right focus-visible:ring-0" />
                                    ) : (
                                        <span className="font-semibold text-xs">{council.GIO_BAOCAO?.substring(0,5) || "--:--"}</span>
                                    )}
                                </div>

                                {/* Phòng */}
                                <div className="flex items-center justify-between px-3 py-2 bg-background rounded border shadow-sm h-9">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <MapPin className="h-3.5 w-3.5" /> Phòng
                                    </div>
                                    {isEditing ? (
                                        <Input value={formData.PHONG} onChange={e => setFormData({...formData, PHONG: e.target.value})} className="h-6 w-28 text-xs bg-white border-0 p-0 text-right focus-visible:ring-0" />
                                    ) : (
                                        <Badge variant="secondary" className="font-mono text-[10px] h-5 px-1.5">{council.PHONG || "Chưa xếp"}</Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border/60" />

                        {/* 2. THÀNH VIÊN HỘI ĐỒNG (COMPACT VIEW) */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <h3 className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                    <Users className="h-3 w-3" /> Thành viên ({council.giangviens.length})
                                </h3>
                            </div>
                            
                            {/* Grid 1 cột, item nhỏ gọn */}
                            <div className="grid grid-cols-1 gap-2">
                                {council.giangviens.map(gv => (
                                    <div key={gv.ID_GIANGVIEN} className="flex items-center justify-between p-2 rounded-lg border bg-background shadow-sm hover:border-primary/30 transition-colors">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                                                {gv.nguoidung?.HODEM_VA_TEN?.substring(0,2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex flex-col justify-center">
                                                <p className="text-xs font-semibold truncate leading-tight" title={gv.nguoidung?.HODEM_VA_TEN}>
                                                    {gv.nguoidung?.HODEM_VA_TEN}
                                                </p>
                                                <p className="text-[9px] text-muted-foreground truncate flex items-center gap-1 leading-tight">
                                                   {gv.khoabomon?.TEN_KHOA_BOMON}
                                                </p>
                                            </div>
                                        </div>
                                        <RoleBadge role={gv.pivot?.VAITRO} />
                                    </div>
                                ))}
                                {council.giangviens.length === 0 && (
                                    <p className="text-[10px] text-muted-foreground italic text-center py-2">Chưa có thành viên.</p>
                                )}
                            </div>
                        </div>

                        {/* Spacer để không bị sát đáy khi scroll */}
                        <div className="h-4"></div> 

                    </div>
                </div>

                {/* --- CỘT PHẢI: DANH SÁCH NHÓM --- */}
                {/* [FIX SCROLL]: Thêm overflow-y-auto */}
                <div className="lg:col-span-8 h-full overflow-y-auto bg-white dark:bg-zinc-950 custom-scrollbar flex flex-col">
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white dark:bg-zinc-950 z-10 pb-2 border-b">
                            <h3 className="text-xs font-bold uppercase text-primary flex items-center gap-2">
                                <BookOpen className="h-3.5 w-3.5" /> Danh sách Nhóm ({council.nhoms?.length || 0})
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {council.nhoms?.map((nhom, idx) => (
                                <div key={nhom.ID_NHOM} className="group border rounded-lg p-3 hover:border-primary/40 hover:shadow-sm transition-all bg-card">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold mt-0.5">
                                            {idx + 1}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            {/* Tên Đề Tài */}
                                            <h4 className="text-sm font-bold text-foreground leading-snug mb-1">
                                                {nhom.phancong_detai_nhom?.detai?.TEN_DETAI || <span className="text-muted-foreground italic">Chưa đăng ký đề tài</span>}
                                            </h4>
                                            
                                            {/* Thông tin phụ compact */}
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <User className="h-3 w-3" /> 
                                                    <span className="truncate max-w-[150px]">GVHD: <span className="font-medium text-foreground">{nhom.phancong_detai_nhom?.gvhd?.nguoidung?.HODEM_VA_TEN || "---"}</span></span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Users className="h-3 w-3" /> 
                                                    <span className="truncate max-w-[120px]">Nhóm: <span className="font-medium text-foreground">{nhom.TEN_NHOM}</span></span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Nút Info Popover */}
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0 -mt-1 -mr-1">
                                                    <Info className="h-4 w-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-72 p-0 shadow-xl" align="end">
                                                <div className="p-3 border-b bg-muted/50">
                                                    <h5 className="text-xs font-bold flex items-center gap-2">
                                                        <GraduationCap className="h-3.5 w-3.5 text-primary" /> Thành viên thực hiện
                                                    </h5>
                                                </div>
                                                <div className="p-2 max-h-[200px] overflow-y-auto">
                                                    {nhom.thanhviens && nhom.thanhviens.length > 0 ? (
                                                        <ul className="space-y-1">
                                                            {nhom.thanhviens.map(tv => (
                                                                <li key={tv.ID_NGUOIDUNG} className="text-xs flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors">
                                                                    <div className="h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-[9px]">
                                                                        {tv.nguoidung?.HODEM_VA_TEN?.charAt(0)}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <p className="font-medium text-foreground">{tv.nguoidung?.HODEM_VA_TEN}</p>
                                                                        <p className="text-[10px] text-muted-foreground">{tv.nguoidung?.MA_DINHDANH}</p>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-xs italic text-muted-foreground text-center py-2">Chưa có thành viên.</p>
                                                    )}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            ))}
                            {(!council.nhoms || council.nhoms.length === 0) && (
                                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border border-dashed rounded-lg bg-muted/5">
                                    <BookOpen className="h-6 w-6 mb-1 opacity-20" />
                                    <p className="text-[10px]">Chưa có nhóm nào.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>

        {/* FOOTER */}
        <DialogFooter className="px-4 py-3 border-t bg-background shrink-0 h-14 flex items-center">
            {isEditing ? (
                <div className="flex w-full justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="h-8">Hủy</Button>
                    <Button size="sm" onClick={handleSave} className="h-8"><Save className="h-3.5 w-3.5 mr-1.5"/> Lưu thay đổi</Button>
                </div>
            ) : (
                <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto ml-auto h-8 text-xs">Đóng</Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RoleBadge = ({ role }) => {
    let label = "Thành viên";
    let className = "text-muted-foreground border-muted-foreground/20 bg-muted/30";
    if (role === 'chutich') { className = "text-red-600 border-red-200 bg-red-50"; label = "Chủ tịch"; }
    else if (role === 'thuky') { className = "text-blue-600 border-blue-200 bg-blue-50"; label = "Thư ký"; }
    else if (role === 'phanbien') { className = "text-orange-600 border-orange-200 bg-orange-50"; label = "Phản biện"; }
    return <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4.5 font-medium", className)}>{label}</Badge>;
};