import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getNhomInfoForGrading, getTyTrongDiem, getSavedScoresForGroup, saveCombinedScores } from "@/api/chamDiemService";
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, ArrowLeft, Users, GraduationCap, Info, BookUser, MessageSquare, ListTree } from 'lucide-react';
import { cn } from "@/lib/utils";

// Helper: Màu sắc cho vai trò
const getRoleVariant = (role) => {
  if (!role) return 'default';
  const roleLower = role.toLowerCase();
  if (roleLower.includes('chutich')) return 'destructive';
  if (roleLower.includes('thuky')) return 'secondary';
  if (roleLower.includes('phanbien')) return 'outline';
  return 'default';
};

const formatRole = (role, loaiMacDinh) => {
  if (!role) return loaiMacDinh === 'huongdan' ? 'Hướng dẫn' : (loaiMacDinh === 'phanbien' ? 'Phản biện' : 'Thành viên');
  const formatted = role.replace('HĐ', '').trim();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

// --- Component con: Hiển thị chi tiết điểm (nếu chấm riêng) ---
const DetailedScorePopover = ({ details, students }) => {
    if (!details || !Array.isArray(details) || details.length === 0) return null;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-[10px] text-blue-600 bg-blue-50 hover:text-blue-700 hover:bg-blue-100 border border-blue-200 mt-1"
                >
                    <ListTree className="w-3 h-3 mr-1"/> Chi tiết
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="center">
                <div className="px-3 py-2 bg-muted/50 border-b text-xs font-bold text-muted-foreground flex justify-between items-center">
                    <span>Sinh viên</span>
                    <span>Điểm thành phần</span>
                </div>
                <div className="max-h-[250px] overflow-y-auto">
                    {details.map((item, idx) => {
                        // 1. Tìm sinh viên trong danh sách dựa trên ID
                        // item.student_id là ID_NGUOIDUNG được lưu trong DB
                        const found = students.find(s => 
                            String(s.ID_NGUOIDUNG) === String(item.student_id) || 
                            String(s.ID_SINHVIEN) === String(item.student_id) // Fallback nếu mapping nhầm
                        );

                        // 2. Xác định tên hiển thị
                        let displayName = `Sinh viên ID: ${item.student_id}`;
                        if (found) {
                            // Lấy tên từ các trường có thể có
                            displayName = found.HODEM_VA_TEN || found.HOTEN || displayName;
                            // Thêm MSSV nếu có
                            if (found.MA_DINHDANH) {
                                displayName += ` (${found.MA_DINHDANH})`;
                            }
                        }

                        return (
                            <div key={idx} className="flex justify-between items-center px-3 py-2 text-xs border-b last:border-0 hover:bg-muted/20">
                                <span className="truncate font-medium text-foreground/90 mr-2 flex-1" title={displayName}>
                                    {displayName}
                                </span>
                                <Badge variant="outline" className="font-bold text-primary border-primary/30 h-5 min-w-[35px] justify-center">
                                    {item.score}
                                </Badge>
                            </div>
                        )
                    })}
                </div>
                <div className="p-2 bg-yellow-50 text-[10px] text-yellow-700 text-center border-t border-yellow-100">
                    Điểm hiển thị bên ngoài là trung bình cộng.
                </div>
            </PopoverContent>
        </Popover>
    );
}

// --- Component con: Bảng điểm cho từng loại ---
const DiemTable = ({ title, icon: Icon, list, loai, tinhDiemTB, handleDiemChange, students }) => (
  <Card className="shadow-sm border-t-4 border-t-primary/20">
    <CardHeader className="pb-3 pt-4 px-5 bg-muted/5 border-b">
      <CardTitle className="flex items-center gap-2 text-base md:text-lg">
        <div className="p-1.5 bg-primary/10 rounded-full text-primary">
            <Icon className="h-4 w-4 md:h-5 md:w-5" />
        </div>
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b-muted/50">
            <TableHead className="w-[40%] pl-5">Giảng viên</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead className="w-[140px] text-center pr-5">Điểm (0-10)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map(gv => {
             // Kiểm tra xem giảng viên này có chấm điểm chi tiết không
             const hasDetails = gv.DIEM_CHI_TIET && Array.isArray(gv.DIEM_CHI_TIET) && gv.DIEM_CHI_TIET.length > 0;
             
             return (
                <TableRow key={gv.ID_GIANGVIEN} className="hover:bg-muted/30">
                  <TableCell className="font-medium pl-5">
                      <div className="flex flex-col">
                          <span className="text-sm">{gv.HOTEN}</span>
                      </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleVariant(gv.VAITRO || loai)} className="capitalize font-normal text-[10px] px-2">
                      {formatRole(gv.VAITRO, loai)}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-5">
                    <div className="flex flex-col items-center justify-center py-1">
                        {/* Input điểm trung bình */}
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="10"
                          value={gv.DIEM}
                          onChange={(e) => handleDiemChange(loai, gv.ID_GIANGVIEN, e.target.value)}
                          className={cn(
                              "w-20 text-center font-bold text-base h-9 transition-all focus:ring-1",
                              hasDetails ? "border-blue-400 bg-blue-50/50 text-blue-700" : "bg-background"
                          )}
                          title={hasDetails ? "Đây là điểm trung bình. Bấm 'Chi tiết' để xem điểm từng sinh viên." : "Điểm chung cho cả nhóm"}
                        />
                        
                        {/* Nút xem chi tiết nếu có */}
                        {hasDetails && (
                            <DetailedScorePopover details={gv.DIEM_CHI_TIET} students={students} />
                        )}
                    </div>
                  </TableCell>
                </TableRow>
             )
          })}
        </TableBody>
        <TableFooter className="bg-muted/20">
          <TableRow>
            <TableCell colSpan={2} className="text-right font-semibold text-muted-foreground text-xs uppercase tracking-wide">
              Trung bình {title}:
            </TableCell>
            <TableCell className="text-center font-bold text-lg text-primary pr-5">
              {tinhDiemTB(loai) !== null ? tinhDiemTB(loai).toFixed(2) : '-'}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </CardContent>
  </Card>
);

// --- MAIN COMPONENT ---
const ChamDiemChiTiet = () => {
  const { idNhom } = useParams();
  const navigate = useNavigate();
  
  // State
  const [nhom, setNhom] = useState(null);
  const [tytrong, setTytrong] = useState(null);
  const [diem, setDiem] = useState({ huongdan: [], phanbien: [], hoidong: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State lưu điểm tổng kết đã được lưu trong DB
  const [diemTongKetTuBackend, setDiemTongKetTuBackend] = useState(null);

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [nhomRes, tytrongRes, tongketRes] = await Promise.all([
        getNhomInfoForGrading(idNhom),
        getTyTrongDiem(),
        getSavedScoresForGroup(idNhom),
      ]);

      const nhomData = nhomRes.nhom;
      const tongketData = tongketRes;

      setNhom(nhomData);
      setTytrong(tytrongRes);

      const finalScore = tongketData.DIEM_TONG !== null && tongketData.DIEM_TONG !== undefined
        ? parseFloat(tongketData.DIEM_TONG) : null;
      setDiemTongKetTuBackend(finalScore);

      const gvHDMap = new Map();
      const gvPBMap = new Map();
      const gvHDONGMap = new Map();

      // Tạo khung dữ liệu từ danh sách giảng viên trong nhóm
      (nhomData.GIANGVIEN || []).forEach(gv => {
        const baseInfo = {
          ID_GIANGVIEN: gv.ID_GIANGVIEN,
          HOTEN: gv.HOTEN,
          VAITRO: gv.VAITRO,
          DIEM: 0,
          DIEM_CHI_TIET: null
        };
        if (gv.VAITRO === 'Hướng dẫn') gvHDMap.set(gv.ID_GIANGVIEN, baseInfo);
        else if (gv.VAITRO === 'Phản biện') gvPBMap.set(gv.ID_GIANGVIEN, baseInfo);
        else gvHDONGMap.set(gv.ID_GIANGVIEN, { ...baseInfo, VAITRO: gv.VAITRO });
      });

      // Helper merge dữ liệu từ DB
      const mergeScores = (sourceList, targetMap) => {
          (sourceList || []).forEach(row => {
              const gvId = row.ID_GIANGVIEN;
              const score = parseFloat(row.DIEM ?? 0);
              
              // Xử lý JSON chi tiết
              let details = row.DIEM_CHI_TIET;
              if (typeof details === 'string') {
                  try { details = JSON.parse(details); } catch(e) {}
              }

              if (targetMap.has(gvId)) {
                  const entry = targetMap.get(gvId);
                  entry.DIEM = score;
                  entry.DIEM_CHI_TIET = details;
              } else {
                  targetMap.set(gvId, {
                      ID_GIANGVIEN: gvId,
                      HOTEN: `GV #${gvId}`,
                      VAITRO: 'Unknown',
                      DIEM: score,
                      DIEM_CHI_TIET: details
                  });
              }
          });
      };

      mergeScores(tongketData.diem_huong_dan, gvHDMap);
      mergeScores(tongketData.diem_phan_bien, gvPBMap);
      mergeScores(tongketData.diem_hoi_dong, gvHDONGMap);

      setDiem({
        huongdan: Array.from(gvHDMap.values()),
        phanbien: Array.from(gvPBMap.values()),
        hoidong: Array.from(gvHDONGMap.values()),
      });

    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải dữ liệu chấm điểm!");
    } finally {
      setLoading(false);
    }
  }, [idNhom]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDiemChange = (loai, id_giangvien, value) => {
    const numericValue = parseFloat(value);
    const diemValue = isNaN(numericValue) ? 0 : Math.max(0, Math.min(10, numericValue));
    
    setDiem(prev => ({
      ...prev,
      [loai]: prev[loai].map(gv =>
        gv.ID_GIANGVIEN === id_giangvien ? { 
            ...gv, 
            DIEM: diemValue,
            // Khi sửa tay điểm TB, giữ nguyên chi tiết
        } : gv
      ),
    }));
    setDiemTongKetTuBackend(null);
  };

  const tinhDiemTB = useCallback((loai) => {
    const list = diem[loai];
    if (!list || list.length === 0) return null;
    const validScores = list.filter(gv => typeof gv.DIEM === 'number' && !isNaN(gv.DIEM));
    if (validScores.length === 0) return null;
    const total = validScores.reduce((sum, gv) => sum + gv.DIEM, 0);
    return total / validScores.length;
  }, [diem]);

  const diemTB_HD = useMemo(() => tinhDiemTB('huongdan'), [tinhDiemTB]);
  const diemTB_PB = useMemo(() => tinhDiemTB('phanbien'), [tinhDiemTB]);
  const diemTB_HDONG = useMemo(() => tinhDiemTB('hoidong'), [tinhDiemTB]);

  const { tyTrongHienThi } = useMemo(() => {
    const globalWeights = tytrong || { HUONGDAN: 0.4, PHANBIEN: 0.3, HOIDONG: 0.3 };
    const planWeights = nhom?.kehoach;
    const wHD = parseFloat(planWeights?.TYTRONG_DIEM_QUATRINH ?? globalWeights.HUONGDAN);
    const wPB = parseFloat(planWeights?.TYTRONG_DIEM_PHANBIEN ?? globalWeights.PHANBIEN);
    const wHDONG = parseFloat(planWeights?.TYTRONG_DIEM_HOIDONG ?? globalWeights.HOIDONG);
    return { tyTrongHienThi: { HD: wHD, PB: wPB, HDONG: wHDONG } };
  }, [nhom, tytrong]);

  const diemTongDuKien = useMemo(() => {
    const totalScore = ((diemTB_HD ?? 0) * tyTrongHienThi.HD) + 
                       ((diemTB_PB ?? 0) * tyTrongHienThi.PB) + 
                       ((diemTB_HDONG ?? 0) * tyTrongHienThi.HDONG);
    
    if (diemTB_HD !== null || diemTB_PB !== null || diemTB_HDONG !== null) {
        return totalScore.toFixed(2);
    }
    return '---';
  }, [diemTB_HD, diemTB_PB, diemTB_HDONG, tyTrongHienThi]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        diem_huongdan: diem.huongdan.map(d => ({ ID_GIANGVIEN: d.ID_GIANGVIEN, DIEM: d.DIEM })),
        diem_phanbien: diem.phanbien.map(d => ({ ID_GIANGVIEN: d.ID_GIANGVIEN, DIEM: d.DIEM })),
        diem_hoidong: diem.hoidong.map(d => ({ ID_GIANGVIEN: d.ID_GIANGVIEN, DIEM: d.DIEM, VAITRO: d.VAITRO })),
      };

      await saveCombinedScores(idNhom, payload);
      toast.success("Lưu điểm thành công!");
      fetchData();
    } catch (err) {
      toast.error("Lưu điểm thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const displayFinalScore = diemTongKetTuBackend !== null 
      ? diemTongKetTuBackend.toFixed(2) 
      : diemTongDuKien;

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!nhom) return <div className="p-8 text-center">Không tìm thấy nhóm</div>;

  // [QUAN TRỌNG] Chuẩn hóa danh sách sinh viên để truyền vào Popover
  // Dùng nhom.thanhviens nếu có (chứa full quan hệ user)
  // Nếu không, dùng nhom.SINHVIEN (dữ liệu đã map từ controller)
  // Đảm bảo có ID_NGUOIDUNG và HODEM_VA_TEN để hiển thị
  const studentList = (() => {
      if (nhom.thanhviens && nhom.thanhviens.length > 0) {
          return nhom.thanhviens.map(tv => ({
              ID_NGUOIDUNG: tv.ID_NGUOIDUNG, // Key chính để map
              HODEM_VA_TEN: tv.nguoidung?.HODEM_VA_TEN,
              MA_DINHDANH: tv.nguoidung?.MA_DINHDANH,
              ID_SINHVIEN: tv.nguoidung?.sinhvien?.ID_SINHVIEN // Backup
          }));
      }
      
      if (nhom.SINHVIEN && nhom.SINHVIEN.length > 0) {
          return nhom.SINHVIEN.map(sv => ({
              ID_NGUOIDUNG: sv.ID_NGUOIDUNG || sv.ID_SINHVIEN, // Backend có thể trả về 1 trong 2
              HODEM_VA_TEN: sv.HODEM_VA_TEN || sv.HOTEN,
              MA_DINHDANH: sv.MA_DINHDANH,
              ID_SINHVIEN: sv.ID_SINHVIEN
          }));
      }
      
      return [];
  })();

  return (
    <TooltipProvider>
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
        {/* Header & Info */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between pb-4 border-b">
            <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="shrink-0">
                    <ArrowLeft className="h-4 w-4"/>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-primary tracking-tight">{nhom.TEN_NHOM}</h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <BookUser className="w-3 h-3" /> 
                        <span className="font-medium text-foreground/80">Đề tài:</span> 
                        {nhom.DETAI || 'Chưa có tên'}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border">
                    <span>GVHD: {diem.huongdan.map(g=>g.HOTEN).join(', ') || '---'}</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* CỘT TRÁI: BẢNG ĐIỂM */}
          <div className="lg:col-span-2 space-y-8">
            {diem.huongdan.length > 0 && 
              <DiemTable 
                title="Điểm Hướng Dẫn" 
                icon={BookUser} 
                list={diem.huongdan} 
                loai="huongdan" 
                tinhDiemTB={tinhDiemTB} 
                handleDiemChange={handleDiemChange} 
                students={studentList} 
              />
            }
            {diem.phanbien.length > 0 && 
              <DiemTable 
                title="Điểm Phản Biện" 
                icon={MessageSquare} 
                list={diem.phanbien} 
                loai="phanbien" 
                tinhDiemTB={tinhDiemTB} 
                handleDiemChange={handleDiemChange} 
                students={studentList} 
              />
            }
            {diem.hoidong.length > 0 && 
              <DiemTable 
                title="Điểm Hội Đồng" 
                icon={Users} 
                list={diem.hoidong} 
                loai="hoidong" 
                tinhDiemTB={tinhDiemTB} 
                handleDiemChange={handleDiemChange} 
                students={studentList} 
              />
            }
            
            {diem.huongdan.length === 0 && diem.phanbien.length === 0 && diem.hoidong.length === 0 && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Chưa có dữ liệu chấm điểm</AlertTitle>
                    <AlertDescription>
                        Nhóm này chưa được phân công giảng viên hướng dẫn, phản biện hoặc hội đồng.
                    </AlertDescription>
                </Alert>
            )}
          </div>

          {/* CỘT PHẢI: TỔNG KẾT */}
          <div className="lg:col-span-1 space-y-6">
             <Card className="sticky top-6 shadow-lg border-t-4 border-t-green-600">
                <CardHeader className="pb-2 bg-muted/10 border-b">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <GraduationCap className="h-5 w-5 text-green-600" />
                        Tổng Kết Điểm
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="text-center p-6 bg-gradient-to-b from-green-50 to-white dark:from-green-950/30 dark:to-background rounded-xl border border-green-200 dark:border-green-900/50 shadow-inner">
                        <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-widest mb-2 block">
                            {diemTongKetTuBackend !== null ? "Điểm Chính Thức" : "Điểm Dự Kiến"}
                        </span>
                        <div className="text-7xl font-black text-green-600 dark:text-green-500 tracking-tighter tabular-nums leading-none">
                            {displayFinalScore}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-3 font-medium">Thang điểm 10</p>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <h4 className="font-semibold text-xs uppercase text-muted-foreground flex items-center gap-2">
                             <Info className="h-3.5 w-3.5" /> Tỷ trọng thành phần
                        </h4>
                        
                        <div className="grid gap-2 text-sm">
                             <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                                 <span className="text-muted-foreground">Hướng Dẫn ({Math.round(tyTrongHienThi.HD * 100)}%)</span>
                                 <span className="font-bold tabular-nums">{diemTB_HD !== null ? diemTB_HD.toFixed(2) : '-'}</span>
                             </div>
                             <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                                 <span className="text-muted-foreground">Phản Biện ({Math.round(tyTrongHienThi.PB * 100)}%)</span>
                                 <span className="font-bold tabular-nums">{diemTB_PB !== null ? diemTB_PB.toFixed(2) : '-'}</span>
                             </div>
                             <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                                 <span className="text-muted-foreground">Hội Đồng ({Math.round(tyTrongHienThi.HDONG * 100)}%)</span>
                                 <span className="font-bold tabular-nums">{diemTB_HDONG !== null ? diemTB_HDONG.toFixed(2) : '-'}</span>
                             </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/10 border-t pt-4">
                    <Button onClick={handleSave} disabled={saving} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold shadow-md">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Lưu Bảng Điểm
                    </Button>
                </CardFooter>
             </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ChamDiemChiTiet;