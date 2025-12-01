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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import { Loader2, Save, ArrowLeft, Users, GraduationCap, Info, BookUser, MessageSquare, User } from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Helper Functions ---
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

// --- Component 1: Bảng nhập điểm (Cột Trái) ---
// Trả về nguyên bản gọn gàng để nhập liệu
const DiemTable = ({ title, icon: Icon, list, loai, tinhDiemTB, handleDiemChange }) => {
  return (
    <Card className="shadow-sm border-t-4 border-t-primary/20 h-full mb-6 last:mb-0">
      <CardHeader className="pb-3 pt-4 px-4 bg-muted/5 border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 bg-primary/10 rounded-full text-primary">
            <Icon className="h-4 w-4" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b-muted/50">
              <TableHead className="w-[40%] pl-4">Giảng viên</TableHead>
              <TableHead className="w-[30%]">Vai trò</TableHead>
              <TableHead className="w-[30%] text-right pr-4">Điểm</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map(gv => (
                <TableRow key={gv.ID_GIANGVIEN} className="hover:bg-muted/30">
                  <TableCell className="font-medium pl-4 py-2 text-sm">
                      {gv.HOTEN}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant={getRoleVariant(gv.VAITRO || loai)} className="capitalize font-normal text-[10px] px-1.5">
                      {formatRole(gv.VAITRO, loai)}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-4 py-2 text-right">
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={gv.DIEM}
                        onChange={(e) => handleDiemChange(loai, gv.ID_GIANGVIEN, e.target.value)}
                        className="w-16 text-center font-bold h-8 ml-auto bg-background focus:bg-white transition-all"
                    />
                  </TableCell>
                </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-muted/20">
            <TableRow>
              <TableCell colSpan={2} className="text-right font-semibold text-muted-foreground text-xs uppercase">
                Trung bình:
              </TableCell>
              <TableCell className="text-right font-bold text-base text-primary pr-4">
                {tinhDiemTB(loai) !== null ? tinhDiemTB(loai).toFixed(2) : '-'}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
};

// --- Component 2: Bảng điểm chi tiết Sinh viên (Cột Giữa - MỚI) ---
const StudentDetailCard = ({ students, diemData, tyTrong }) => {
    
    // Hàm tính điểm cá nhân của 1 sinh viên từ danh sách điểm giảng viên
    const calculateStudentComponentScore = (studentId, lecturerList) => {
        if (!lecturerList || lecturerList.length === 0) return null;

        let total = 0;
        let count = 0;

        lecturerList.forEach(gv => {
            let score = parseFloat(gv.DIEM || 0); // Mặc định lấy điểm chung
            
            // Nếu GV có chấm chi tiết, ưu tiên lấy điểm chi tiết
            if (gv.DIEM_CHI_TIET && Array.isArray(gv.DIEM_CHI_TIET)) {
                const detail = gv.DIEM_CHI_TIET.find(d => 
                    String(d.student_id) === String(studentId)
                );
                if (detail) {
                    score = parseFloat(detail.score || 0);
                }
            }
            
            total += score;
            count++;
        });

        return count > 0 ? (total / count) : 0;
    };

    return (
        <Card className="shadow-md border-t-4 border-t-blue-500 h-full flex flex-col">
            <CardHeader className="pb-3 pt-4 px-5 bg-muted/5 border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                    Chi tiết Sinh viên
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-[400px]">
                <ScrollArea className="h-full max-h-[calc(100vh-200px)]">
                    <div className="divide-y">
                        {students.map((sv, index) => {
                            // Tính điểm thành phần cho sinh viên này
                            const scoreHD = calculateStudentComponentScore(sv.ID_NGUOIDUNG, diemData.huongdan);
                            const scorePB = calculateStudentComponentScore(sv.ID_NGUOIDUNG, diemData.phanbien);
                            const scoreHDong = calculateStudentComponentScore(sv.ID_NGUOIDUNG, diemData.hoidong);

                            // Tính tổng kết cá nhân
                            let finalScore = 0;
                            let hasScore = false;
                            
                            if (tyTrong.HD > 0 && scoreHD !== null) { finalScore += scoreHD * tyTrong.HD; hasScore = true; }
                            if (tyTrong.PB > 0 && scorePB !== null) { finalScore += scorePB * tyTrong.PB; hasScore = true; }
                            if (tyTrong.HDONG > 0 && scoreHDong !== null) { finalScore += scoreHDong * tyTrong.HDONG; hasScore = true; }
                            
                            if (!hasScore) finalScore = 0;

                            return (
                                <div key={sv.ID_NGUOIDUNG || index} className="p-4 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                {sv.HODEM_VA_TEN ? sv.HODEM_VA_TEN.charAt(0) : 'S'}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm">{sv.HODEM_VA_TEN}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{sv.MA_DINHDANH}</div>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "text-xl font-bold tabular-nums",
                                            finalScore >= 4.0 ? "text-green-600" : "text-red-600"
                                        )}>
                                            {finalScore.toFixed(2)}
                                        </div>
                                    </div>

                                    {/* Grid điểm thành phần */}
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        {tyTrong.HD > 0 && (
                                            <div className="bg-muted/50 p-2 rounded border flex flex-col items-center">
                                                <span className="text-muted-foreground mb-1">Hướng dẫn</span>
                                                <span className="font-bold">{scoreHD !== null ? scoreHD.toFixed(2) : '-'}</span>
                                            </div>
                                        )}
                                        {tyTrong.PB > 0 && (
                                            <div className="bg-muted/50 p-2 rounded border flex flex-col items-center">
                                                <span className="text-muted-foreground mb-1">Phản biện</span>
                                                <span className="font-bold">{scorePB !== null ? scorePB.toFixed(2) : '-'}</span>
                                            </div>
                                        )}
                                        {tyTrong.HDONG > 0 && (
                                            <div className="bg-muted/50 p-2 rounded border flex flex-col items-center">
                                                <span className="text-muted-foreground mb-1">Hội đồng</span>
                                                <span className="font-bold">{scoreHDong !== null ? scoreHDong.toFixed(2) : '-'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};


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
      
      // Lấy điểm tổng kết (nếu đã chốt)
      const finalScore = tongketData.DIEM_TONG !== null && tongketData.DIEM_TONG !== undefined
        ? parseFloat(tongketData.DIEM_TONG) : null;
      setDiemTongKetTuBackend(finalScore);

      // Map dữ liệu điểm
      const mapScores = (lecturers, savedScores) => {
          const scoreMap = new Map();
          (savedScores || []).forEach(s => scoreMap.set(s.ID_GIANGVIEN, s));

          return (lecturers || []).map(gv => {
             const saved = scoreMap.get(gv.ID_GIANGVIEN);
             // Parse JSON chi tiết nếu có
             let details = saved?.DIEM_CHI_TIET;
             if (typeof details === 'string') {
                 try { details = JSON.parse(details); } catch(e) {}
             }
             return {
                 ID_GIANGVIEN: gv.ID_GIANGVIEN,
                 HOTEN: gv.HOTEN,
                 VAITRO: gv.VAITRO,
                 DIEM: saved ? parseFloat(saved.DIEM) : 0,
                 DIEM_CHI_TIET: details || null // Quan trọng: giữ chi tiết để tính toán bên cột giữa
             };
          });
      };
      
      // Tách danh sách giảng viên từ response getNhomInfoForGrading
      const gvList = nhomData.GIANGVIEN || [];
      const hdList = gvList.filter(g => g.VAITRO === 'Hướng dẫn');
      const pbList = gvList.filter(g => g.VAITRO === 'Phản biện');
      const hdongList = gvList.filter(g => g.VAITRO !== 'Hướng dẫn' && g.VAITRO !== 'Phản biện');

      setDiem({
        huongdan: mapScores(hdList, tongketData.diem_huong_dan),
        phanbien: mapScores(pbList, tongketData.diem_phan_bien),
        hoidong: mapScores(hdongList, tongketData.diem_hoi_dong),
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
        gv.ID_GIANGVIEN === id_giangvien ? { ...gv, DIEM: diemValue } : gv
      ),
    }));
    setDiemTongKetTuBackend(null); // Reset điểm backend khi có thay đổi để hiển thị điểm dự kiến
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

  // Tính điểm tổng kết dự kiến của NHÓM (trung bình cộng)
  const diemTongDuKien = useMemo(() => {
    let totalScore = 0;
    if (tyTrongHienThi.HD > 0) totalScore += ((diemTB_HD ?? 0) * tyTrongHienThi.HD);
    if (tyTrongHienThi.PB > 0) totalScore += ((diemTB_PB ?? 0) * tyTrongHienThi.PB);
    if (tyTrongHienThi.HDONG > 0) totalScore += ((diemTB_HDONG ?? 0) * tyTrongHienThi.HDONG);
    
    const hasAnyScore = 
        (tyTrongHienThi.HD > 0 && diemTB_HD !== null) || 
        (tyTrongHienThi.PB > 0 && diemTB_PB !== null) || 
        (tyTrongHienThi.HDONG > 0 && diemTB_HDONG !== null);

    return hasAnyScore ? totalScore.toFixed(2) : '---';
  }, [diemTB_HD, diemTB_PB, diemTB_HDONG, tyTrongHienThi]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Chuẩn bị payload, giữ nguyên DIEM_CHI_TIET nếu có để không bị mất khi lưu đè
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

  // Chuẩn hóa danh sách sinh viên
  const studentList = (() => {
      if (nhom.thanhviens && nhom.thanhviens.length > 0) {
          return nhom.thanhviens.map(tv => ({
              ID_NGUOIDUNG: tv.ID_NGUOIDUNG, 
              HODEM_VA_TEN: tv.nguoidung?.HODEM_VA_TEN,
              MA_DINHDANH: tv.nguoidung?.MA_DINHDANH,
              ID_SINHVIEN: tv.nguoidung?.sinhvien?.ID_SINHVIEN 
          }));
      }
      // Fallback nếu dùng data cũ
      if (nhom.SINHVIEN && nhom.SINHVIEN.length > 0) {
          return nhom.SINHVIEN.map(sv => ({
              ID_NGUOIDUNG: sv.ID_NGUOIDUNG || sv.ID_SINHVIEN,
              HODEM_VA_TEN: sv.HODEM_VA_TEN || sv.HOTEN,
              MA_DINHDANH: sv.MA_DINHDANH,
              ID_SINHVIEN: sv.ID_SINHVIEN
          }));
      }
      return [];
  })();

  return (
    <TooltipProvider>
      <div className="w-full max-w-full h-full overflow-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
        
        {/* Header & Info */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between pb-4 border-b">
            <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="shrink-0">
                    <ArrowLeft className="h-4 w-4"/>
                </Button>
                <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <span className="font-medium text-foreground/80">Đề tài:</span> 
                        <span className="line-clamp-1" title={nhom.DETAI}>{nhom.DETAI || 'Chưa có tên'}</span>
                    </p>
                </div>
            </div>
        </div>

        {/* MAIN GRID LAYOUT - CHIA 3 CỘT */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          <div className="xl:col-span-4 space-y-6">
            {/* Chỉ hiển thị nếu có tỷ trọng > 0 */}
            {tyTrongHienThi.HD > 0 && diem.huongdan.length > 0 && (
              <DiemTable 
                title={`Điểm Hướng Dẫn (${tyTrongHienThi.HD * 100}%)`}
                icon={BookUser} 
                list={diem.huongdan} 
                loai="huongdan" 
                tinhDiemTB={tinhDiemTB} 
                handleDiemChange={handleDiemChange} 
              />
            )}

            {tyTrongHienThi.PB > 0 && diem.phanbien.length > 0 && (
              <DiemTable 
                title={`Điểm Phản Biện (${tyTrongHienThi.PB * 100}%)`}
                icon={MessageSquare} 
                list={diem.phanbien} 
                loai="phanbien" 
                tinhDiemTB={tinhDiemTB} 
                handleDiemChange={handleDiemChange} 
              />
            )}

            {tyTrongHienThi.HDONG > 0 && diem.hoidong.length > 0 && (
              <DiemTable 
                title={`Điểm Hội Đồng (${tyTrongHienThi.HDONG * 100}%)`}
                icon={Users} 
                list={diem.hoidong} 
                loai="hoidong" 
                tinhDiemTB={tinhDiemTB} 
                handleDiemChange={handleDiemChange} 
              />
            )}
            
            {diem.huongdan.length === 0 && diem.phanbien.length === 0 && diem.hoidong.length === 0 && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Chưa có dữ liệu</AlertTitle>
                    <AlertDescription>Nhóm chưa được phân công GVHD, GVPB hoặc Hội đồng.</AlertDescription>
                </Alert>
            )}
          </div>

          {/* CỘT 2 (GIỮA - 4 phần): CHI TIẾT SINH VIÊN */}
          <div className="xl:col-span-4">
              <StudentDetailCard 
                students={studentList} 
                diemData={diem} 
                tyTrong={tyTrongHienThi} 
              />
          </div>

          {/* CỘT 3 (PHẢI - 3 phần): TỔNG KẾT */}
          <div className="xl:col-span-4 space-y-6">
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
                             {tyTrongHienThi.HD > 0 && (
                                 <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                                     <span className="text-muted-foreground">Hướng Dẫn ({Math.round(tyTrongHienThi.HD * 100)}%)</span>
                                     <span className="font-bold tabular-nums">{diemTB_HD !== null ? diemTB_HD.toFixed(2) : '-'}</span>
                                 </div>
                             )}
                             
                             {tyTrongHienThi.PB > 0 && (
                                 <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                                     <span className="text-muted-foreground">Phản Biện ({Math.round(tyTrongHienThi.PB * 100)}%)</span>
                                     <span className="font-bold tabular-nums">{diemTB_PB !== null ? diemTB_PB.toFixed(2) : '-'}</span>
                                 </div>
                             )}

                             {tyTrongHienThi.HDONG > 0 && (
                                 <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                                     <span className="text-muted-foreground">Hội Đồng ({Math.round(tyTrongHienThi.HDONG * 100)}%)</span>
                                     <span className="font-bold tabular-nums">{diemTB_HDONG !== null ? diemTB_HDONG.toFixed(2) : '-'}</span>
                                 </div>
                             )}
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