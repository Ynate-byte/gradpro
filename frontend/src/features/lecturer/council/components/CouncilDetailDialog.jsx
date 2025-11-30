import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getHoiDongDetails } from "@/api/adminHoiDongService";
import axiosClient from "@/api/axiosConfig";
import { toast } from "sonner";
import { format, parseISO, startOfDay, isBefore, isWithinInterval, endOfDay } from "date-fns";
import { vi } from "date-fns/locale";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import {
  Calendar, Clock, MapPin, Users, BookOpen, Pencil, Save, User, PenSquare, Info, GraduationCap, Lock, Clock as ClockIcon
} from "lucide-react";

import RoleBadge from "./RoleBadge";
import GradingModal from "./GradingModal";

// [HELPER] Hàm kiểm tra Feature Flag (Cấu hình thời gian)
const checkFeatureActive = (settings, key) => {
    if (!settings || !settings[key]) return false;
    const config = settings[key];
    if (config.manual_override === 'ENABLED') return true;
    if (config.manual_override === 'DISABLED') return false;
    if (!config.start || !config.end) return false;
    const now = new Date();
    try {
        return isWithinInterval(now, {
            start: startOfDay(parseISO(config.start)),
            end: endOfDay(parseISO(config.end))
        });
    } catch (e) {
        return false;
    }
};

const CouncilDetailDialog = ({ councilId, open, onOpenChange }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  // State cho chấm điểm
  const [gradingGroup, setGradingGroup] = useState(null);
  const [gradingScore, setGradingScore] = useState(null);
  const [gradingComment, setGradingComment] = useState(null);

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
        ID_KHOA_BOMON: council.ID_KHOA_BOMON,
        giangviens: council.giangviens
      });
    }
  }, [council, isEditing]);

  const isCouncilMember = useMemo(() => {
    if (!user?.giangvien || !council) return false;
    return council.giangviens.some(gv => gv.ID_GIANGVIEN === user.giangvien.ID_GIANGVIEN);
  }, [user, council]);

  const isReportTimeValid = useMemo(() => {
    if (!council?.NGAY_BAOCAO) return false;
    const today = startOfDay(new Date());
    const reportDate = startOfDay(parseISO(council.NGAY_BAOCAO));
    return !isBefore(today, reportDate);
  }, [council?.NGAY_BAOCAO]);

  const isSystemGradingActive = useMemo(() => {
      if (!council?.kehoach?.SETTINGS) return false;
      return checkFeatureActive(council.kehoach.SETTINGS, 'CHAM_DIEM');
  }, [council?.kehoach]);

  const handleOpenGrading = (nhom) => {
    let myScore = null;
    let myComment = null;
    if (nhom.diem_hoi_dong && user.giangvien) {
       const record = nhom.diem_hoi_dong.find(d => d.ID_GIANGVIEN === user.giangvien.ID_GIANGVIEN);
       if (record) {
           myScore = record.DIEM;
           myComment = record.NHANXET;
       }
    }
    setGradingGroup(nhom);
    setGradingScore(myScore);
    setGradingComment(myComment);
  };

  const handleSaveInfo = async () => {
    try {
      const payload = {
        ...formData,
        giangviens: formData.giangviens.map(gv => ({
          id: gv.ID_GIANGVIEN,
          vaitro: gv.pivot.VAITRO
        }))
      };
      await axiosClient.put(`/admin/hoidong/${councilId}`, payload);
      toast.success("Cập nhật thông tin thành công!");
      setIsEditing(false);
      queryClient.invalidateQueries(["councilDetail", councilId]);
      queryClient.invalidateQueries(["adminHoiDong"]); 
    } catch (error) {
      toast.error("Cập nhật thất bại.");
    }
  };

  const onGradingSuccess = () => {
      setGradingGroup(null);
      queryClient.invalidateQueries(["councilDetail", councilId]);
  };

  const formatDate = (d) => d ? format(parseISO(d), "dd/MM/yyyy", { locale: vi }) : "---";

  if (isLoading || isError || !council) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if(!v) setIsEditing(false); onOpenChange(v); }}>
        {/* QUAN TRỌNG: h-[90vh] để ép chiều cao, flex-col để chia layout */}
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 bg-background outline-none overflow-hidden">
            
            {/* HEADER: Chiều cao cố định */}
            <DialogHeader className="px-6 py-4 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0 shrink-0 h-16">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-3">
                        <DialogTitle className="text-lg font-bold text-primary flex items-center gap-2 truncate max-w-[400px]">
                            {council.TEN_HOIDONG}
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                                {council.LOAI === 'phanbien' ? 'Phản biện' : 'Bảo vệ'}
                            </Badge>
                        </DialogTitle>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium truncate">{council.kehoach?.TEN_DOT}</p>
                </div>
                {!isEditing && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-primary h-8 text-xs">
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Sửa thời gian
                    </Button>
                )}
            </DialogHeader>

            {/* BODY CONTENT: flex-1 để chiếm hết không gian còn lại, min-h-0 để overflow hoạt động */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 h-full">
                    
                    {/* CỘT TRÁI: THÔNG TIN - overflow-y-auto để cuộn riêng */}
                    <div className="lg:col-span-4 border-r bg-muted/10 h-full overflow-y-auto custom-scrollbar">
                        <div className="p-4 space-y-5">
                            <div className="space-y-2">
                                <h3 className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3" /> Thông tin phiên họp
                                </h3>
                                <div className="space-y-2">
                                    {/* Ngày */}
                                    <div className="flex items-center justify-between px-3 py-2 bg-background rounded border shadow-sm h-9">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> Ngày</div>
                                        {isEditing ? <Input type="date" value={formData.NGAY_BAOCAO} onChange={e => setFormData({...formData, NGAY_BAOCAO: e.target.value})} className="h-6 w-30 text-xs bg-white border-0 p-0 text-right" /> : <span className="font-semibold text-xs">{formatDate(council.NGAY_BAOCAO)}</span>}
                                    </div>
                                    {/* Giờ */}
                                    <div className="flex items-center justify-between px-3 py-2 bg-background rounded border shadow-sm h-9">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Giờ</div>
                                        {isEditing ? <Input type="time" value={formData.GIO_BAOCAO} onChange={e => setFormData({...formData, GIO_BAOCAO: e.target.value})} className="h-6 w-24 text-xs bg-white border-0 p-0 text-right" /> : <span className="font-semibold text-xs">{council.GIO_BAOCAO?.substring(0,5) || "--:--"}</span>}
                                    </div>
                                    {/* Phòng */}
                                    <div className="flex items-center justify-between px-3 py-2 bg-background rounded border shadow-sm h-9">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> Phòng</div>
                                        {isEditing ? <Input value={formData.PHONG} onChange={e => setFormData({...formData, PHONG: e.target.value})} className="h-6 w-28 text-xs bg-white border-0 p-0 text-right" /> : <Badge variant="secondary" className="font-mono text-[10px] h-5 px-1.5">{council.PHONG || "Chưa xếp"}</Badge>}
                                    </div>
                                </div>
                            </div>
                            <Separator className="bg-border/60" />
                            {/* Thành viên */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                        <Users className="h-3 w-3" /> Thành viên ({council.giangviens.length})
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {council.giangviens.map(gv => (
                                        <div key={gv.ID_GIANGVIEN} className="flex items-center justify-between p-2 rounded-lg border bg-background shadow-sm hover:border-primary/30 transition-colors">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                                                    {gv.nguoidung?.HODEM_VA_TEN?.substring(0,2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex flex-col justify-center">
                                                    <p className="text-xs font-semibold truncate leading-tight" title={gv.nguoidung?.HODEM_VA_TEN}>{gv.nguoidung?.HODEM_VA_TEN}</p>
                                                    <p className="text-[9px] text-muted-foreground truncate">{gv.khoabomon?.TEN_KHOA_BOMON}</p>
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
                        </div>
                    </div>

                    {/* CỘT PHẢI: QUAN TRỌNG - Phải có h-full và flex-col */}
                    <div className="lg:col-span-8 h-full flex flex-col bg-white dark:bg-zinc-950 min-h-0">
                        {/* 1. Tiêu đề danh sách (Cố định, không cuộn) */}
                        <div className="px-5 py-4 border-b shrink-0 bg-background/95 z-10"> 
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase text-primary flex items-center gap-2">
                                    <BookOpen className="h-3.5 w-3.5" /> Danh sách Nhóm ({council.nhoms?.length || 0})
                                </h3>
                            </div>
                        </div>

                        {/* 2. Vùng danh sách (Cuộn ở đây) - flex-1 overflow-y-auto */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                            <div className="space-y-3">
                                {council.nhoms?.map((nhom, idx) => {
                                    let myScore = null;
                                    if (nhom.diem_hoi_dong && user?.giangvien) {
                                        const record = nhom.diem_hoi_dong.find(d => d.ID_GIANGVIEN === user.giangvien.ID_GIANGVIEN);
                                        if (record) myScore = record.DIEM;
                                    }

                                    return (
                                        <div key={nhom.ID_NHOM} className="group border rounded-lg p-3 hover:border-primary/40 hover:shadow-sm transition-all bg-card">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-xs font-bold">{idx + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-foreground leading-snug mb-1">{nhom.phancong_detai_nhom?.detai?.TEN_DETAI || <span className="text-muted-foreground italic">Chưa đăng ký đề tài</span>}</h4>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> GVHD: {nhom.phancong_detai_nhom?.gvhd?.nguoidung?.HODEM_VA_TEN || "---"}</span>
                                                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Nhóm: {nhom.TEN_NHOM}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {isCouncilMember && (
                                                        <>
                                                            {!isSystemGradingActive ? (
                                                                <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 cursor-not-allowed" title="Tính năng chấm điểm đang đóng trong Kế hoạch">
                                                                    <Lock className="h-3 w-3" />
                                                                    <span className="hidden sm:inline">Đóng</span>
                                                                </div>
                                                            ) : !isReportTimeValid ? (
                                                                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded border cursor-not-allowed" title={`Chưa đến ngày báo cáo (${formatDate(council.NGAY_BAOCAO)})`}>
                                                                    <ClockIcon className="h-3 w-3" />
                                                                    <span className="hidden sm:inline">Chưa mở</span>
                                                                </div>
                                                            ) : myScore !== null ? (
                                                                <div className="flex items-center gap-2">
                                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs h-8 px-2.5 font-medium flex items-center gap-1">
                                                                            <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                                                            {myScore}đ
                                                                        </Badge>
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenGrading(nhom)} title="Sửa điểm">
                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                </div>
                                                            ) : (
                                                                <Button size="sm" className="h-8 text-xs px-3 bg-primary text-white hover:bg-primary/90" onClick={() => handleOpenGrading(nhom)}>
                                                                        <PenSquare className="h-3.5 w-3.5 mr-1.5" /> Chấm điểm
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                    
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"><Info className="h-4 w-4" /></Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-72 p-0 shadow-xl" align="end">
                                                            <div className="p-3 border-b bg-muted/50"><h5 className="text-xs font-bold flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5 text-primary" /> Thành viên</h5></div>
                                                            <div className="p-2 max-h-[200px] overflow-y-auto">
                                                                <ul className="space-y-1">
                                                                    {nhom.thanhviens?.map(tv => (
                                                                        <li key={tv.ID_NGUOIDUNG} className="text-xs flex items-center gap-3 p-2 rounded hover:bg-muted/50"><div className="h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-[9px]">{tv.nguoidung?.HODEM_VA_TEN?.charAt(0)}</div><div className="flex-1"><p className="font-medium">{tv.nguoidung?.HODEM_VA_TEN}</p><p className="text-[10px] text-muted-foreground">{tv.nguoidung?.MA_DINHDANH}</p></div></li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!council.nhoms || council.nhoms.length === 0) && <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border border-dashed rounded-lg bg-muted/5"><BookOpen className="h-6 w-6 mb-1 opacity-20" /><p className="text-[10px]">Chưa có nhóm nào.</p></div>}
                                {/* Padding bottom để không bị che bởi browser chrome */}
                                <div className="h-6"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER: Cố định */}
            <DialogFooter className="px-4 py-3 border-t bg-background shrink-0 h-14 flex items-center">
                {isEditing ? (
                    <div className="flex w-full justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="h-8">Hủy</Button>
                        <Button size="sm" onClick={handleSaveInfo} className="h-8"><Save className="h-3.5 w-3.5 mr-1.5"/> Lưu thay đổi</Button>
                    </div>
                ) : (
                    <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto ml-auto h-8 text-xs">Đóng</Button>
                )}
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <GradingModal 
        isOpen={!!gradingGroup}
        onClose={() => setGradingGroup(null)}
        onSaveSuccess={onGradingSuccess}
        group={gradingGroup}
        currentScore={gradingScore}
        currentComment={gradingComment}
        role="hoidong" // [QUAN TRỌNG] Truyền vai trò hoidong để GradingModal biết cần gọi API nào
      />
    </>
  );
};

export default CouncilDetailDialog;