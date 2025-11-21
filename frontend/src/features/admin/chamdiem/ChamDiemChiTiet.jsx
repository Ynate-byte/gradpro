import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getNhomInfoForGrading, getTyTrongDiem, getSavedScoresForGroup, saveCombinedScores } from "@/api/chamDiemService";
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Save,
  ArrowLeft,
  Users,
  GraduationCap,
  FileText,
  Info,
  Percent,
  BookUser,
  MessageSquare,
  CheckCircle
} from 'lucide-react';

// Helper: Màu sắc cho vai trò trong hội đồng
const getRoleVariant = (role) => {
  if (!role) return 'default';
  const roleLower = role.toLowerCase();
  if (roleLower.includes('chutich')) return 'destructive'; // Đỏ
  if (roleLower.includes('thuky')) return 'secondary'; // Xám
  if (roleLower.includes('phanbien')) return 'outline'; // Viền
  return 'default'; // Xanh
};

const formatRole = (role, loaiMacDinh) => {
  if (!role) return loaiMacDinh === 'huongdan' ? 'Hướng dẫn' : (loaiMacDinh === 'phanbien' ? 'Phản biện' : 'Thành viên');
  const formatted = role.replace('HĐ', '').trim();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const DiemTable = ({ title, icon: Icon, list, loai, tinhDiemTB, handleDiemChange }) => (
  <Card className="shadow-sm border-t-4 border-t-primary/20">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-lg">
        <div className="p-2 bg-primary/10 rounded-full text-primary">
            <Icon className="h-5 w-5" />
        </div>
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[45%]">Giảng viên</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead className="w-[120px] text-center">Điểm (0-10)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map(gv => (
            <TableRow key={gv.ID_GIANGVIEN}>
              <TableCell className="font-medium">
                  <div className="flex flex-col">
                      <span>{gv.HOTEN}</span>
                      {/* <span className="text-xs text-muted-foreground">ID: {gv.ID_GIANGVIEN}</span> */}
                  </div>
              </TableCell>
              <TableCell>
                <Badge variant={getRoleVariant(gv.VAITRO || loai)} className="capitalize font-normal">
                  {formatRole(gv.VAITRO, loai)}
                </Badge>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={gv.DIEM}
                  onChange={(e) => handleDiemChange(loai, gv.ID_GIANGVIEN, e.target.value)}
                  className="w-24 text-center mx-auto font-bold text-lg h-9"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="bg-muted/30">
          <TableRow>
            <TableCell colSpan={2} className="text-right font-semibold text-muted-foreground">
              Điểm trung bình:
            </TableCell>
            <TableCell className="text-center font-bold text-lg text-primary">
              {tinhDiemTB(loai) !== null ? tinhDiemTB(loai).toFixed(2) : 'N/A'}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </CardContent>
  </Card>
);

const ChamDiemChiTiet = () => {
  const { idNhom } = useParams();
  const navigate = useNavigate();
  
  // State
  const [nhom, setNhom] = useState(null);
  const [tytrong, setTytrong] = useState(null);
  const [diem, setDiem] = useState({
    huongdan: [],
    phanbien: [],
    hoidong: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State lưu điểm tổng kết đã được lưu trong DB (nếu có)
  // Nếu người dùng sửa input -> set về null để hiển thị điểm dự kiến
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

      // Lưu điểm tổng kết từ DB (nếu đã chấm xong)
      const finalScore = tongketData.DIEM_TONG !== null && tongketData.DIEM_TONG !== undefined
        ? parseFloat(tongketData.DIEM_TONG)
        : null;
      setDiemTongKetTuBackend(finalScore);

      // Phân loại giảng viên vào các bucket và merge với điểm đã lưu
      const gvHDMap = new Map();
      const gvPBMap = new Map();
      const gvHDONGMap = new Map();
      const allGvFromNhomData = new Map();

      // 1. Tạo danh sách GV từ thông tin nhóm (Cấu trúc khung)
      (nhomData.GIANGVIEN || []).forEach(gv => {
        const baseInfo = {
          ID_GIANGVIEN: gv.ID_GIANGVIEN,
          HOTEN: gv.HOTEN,
          VAITRO: gv.VAITRO,
          DIEM: 0 // Mặc định 0
        };

        allGvFromNhomData.set(gv.ID_GIANGVIEN, gv.HOTEN);

        if (gv.VAITRO === 'Hướng dẫn') {
          gvHDMap.set(gv.ID_GIANGVIEN, baseInfo);
        } else if (gv.VAITRO === 'Phản biện') {
          gvPBMap.set(gv.ID_GIANGVIEN, baseInfo);
        } else {
          gvHDONGMap.set(gv.ID_GIANGVIEN, { ...baseInfo, VAITRO: gv.VAITRO });
        }
      });

      // 2. Merge điểm đã lưu từ DB vào khung
      (tongketData.diem_huong_dan || []).forEach(diemRow => {
        const gvId = diemRow.ID_GIANGVIEN;
        const score = parseFloat(diemRow.DIEM ?? 0);
        if (gvHDMap.has(gvId)) {
          gvHDMap.get(gvId).DIEM = score;
        }
      });

      (tongketData.diem_phan_bien || []).forEach(diemRow => {
        const gvId = diemRow.ID_GIANGVIEN;
        const score = parseFloat(diemRow.DIEM ?? 0);
        if (gvPBMap.has(gvId)) {
          gvPBMap.get(gvId).DIEM = score;
        } else {
            // Trường hợp đặc biệt: GV Phản biện lưu trong bảng điểm nhưng không có trong danh sách nhóm (hiếm)
            const tenGV = allGvFromNhomData.get(gvId);
            gvPBMap.set(gvId, {
                ID_GIANGVIEN: gvId,
                HOTEN: tenGV || `GV (ID: ${gvId})`,
                VAITRO: 'Phản biện',
                DIEM: score
            });
        }
      });

      (tongketData.diem_hoi_dong || []).forEach(diemRow => {
        const gvId = diemRow.ID_GIANGVIEN;
        const score = parseFloat(diemRow.DIEM ?? 0);
        if (gvHDONGMap.has(gvId)) {
          gvHDONGMap.get(gvId).DIEM = score;
        }
      });

      setDiem({
        huongdan: Array.from(gvHDMap.values()),
        phanbien: Array.from(gvPBMap.values()),
        hoidong: Array.from(gvHDONGMap.values()),
      });

    } catch (err) {
      console.error("Lỗi tải dữ liệu chấm điểm:", err);
      toast.error(err.response?.data?.error || "Lỗi tải dữ liệu chấm điểm!");
    } finally {
      setLoading(false);
    }
  }, [idNhom]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers ---

  const handleDiemChange = (loai, id_giangvien, value) => {
    // Cho phép nhập số thập phân, giới hạn 0-10
    const numericValue = parseFloat(value);
    const diemValue = isNaN(numericValue) ? 0 : Math.max(0, Math.min(10, numericValue));
    
    setDiem(prev => ({
      ...prev,
      [loai]: prev[loai].map(gv =>
        gv.ID_GIANGVIEN === id_giangvien ? { ...gv, DIEM: diemValue } : gv
      ),
    }));
    
    // Khi người dùng sửa điểm -> Xóa trạng thái "điểm từ backend" để hiện điểm dự kiến
    setDiemTongKetTuBackend(null);
  };

  const tinhDiemTB = useCallback((loai) => {
    const list = diem[loai];
    if (!list || list.length === 0) return null;
    
    // Chỉ tính trung bình các điểm hợp lệ (số)
    // Ở đây ta mặc định input trả về DIEM là number (do đã parse ở handleDiemChange và load)
    // Nếu muốn strict hơn, có thể filter > 0 hoặc check isNaN
    const validScores = list.filter(gv => typeof gv.DIEM === 'number' && !isNaN(gv.DIEM));
    if (validScores.length === 0) return null;

    const total = validScores.reduce((sum, gv) => sum + gv.DIEM, 0);
    return total / validScores.length;
  }, [diem]);

  // Memoize các điểm trung bình
  const diemTB_HD = useMemo(() => tinhDiemTB('huongdan'), [tinhDiemTB]);
  const diemTB_PB = useMemo(() => tinhDiemTB('phanbien'), [tinhDiemTB]);
  const diemTB_HDONG = useMemo(() => tinhDiemTB('hoidong'), [tinhDiemTB]);

  // Lấy tỷ trọng áp dụng (Ưu tiên Plan -> Global)
  const { tyTrongHienThi } = useMemo(() => {
    const globalWeights = tytrong || { HUONGDAN: 0.4, PHANBIEN: 0.3, HOIDONG: 0.3 };
    
    // Kiểm tra nếu kế hoạch có cấu hình tỷ trọng riêng
    const planWeights = nhom?.kehoach;
    
    const wHD = parseFloat(planWeights?.TYTRONG_DIEM_QUATRINH ?? globalWeights.HUONGDAN);
    const wPB = parseFloat(planWeights?.TYTRONG_DIEM_PHANBIEN ?? globalWeights.PHANBIEN);
    const wHDONG = parseFloat(planWeights?.TYTRONG_DIEM_HOIDONG ?? globalWeights.HOIDONG);

    return {
        tyTrongHienThi: {
            HD: wHD,
            PB: wPB,
            HDONG: wHDONG
        }
    };
  }, [nhom, tytrong]);

  // Tính điểm tổng kết dự kiến (Client-side Calculation)
  const diemTongDuKien = useMemo(() => {
    const wHD = tyTrongHienThi.HD;
    const wPB = tyTrongHienThi.PB;
    const wHDONG = tyTrongHienThi.HDONG;

    const scoreHD = diemTB_HD ?? 0;
    const scorePB = diemTB_PB ?? 0;
    const scoreHDONG = diemTB_HDONG ?? 0;

    const totalScore = (scoreHD * wHD) + (scorePB * wPB) + (scoreHDONG * wHDONG);

    if (diemTB_HD !== null || diemTB_PB !== null || diemTB_HDONG !== null) {
        return totalScore.toFixed(2);
    }
    return 'N/A';
  }, [diemTB_HD, diemTB_PB, diemTB_HDONG, tyTrongHienThi]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        diem_huongdan: diem.huongdan.map(d => ({ ID_GIANGVIEN: d.ID_GIANGVIEN, DIEM: d.DIEM })),
        diem_phanbien: diem.phanbien.map(d => ({ ID_GIANGVIEN: d.ID_GIANGVIEN, DIEM: d.DIEM })),
        diem_hoidong: diem.hoidong.map(d => ({ ID_GIANGVIEN: d.ID_GIANGVIEN, DIEM: d.DIEM, VAITRO: d.VAITRO })),
      };

      const res = await saveCombinedScores(idNhom, payload);
      toast.success(res.message || "Lưu điểm thành công!");
      fetchData(); // Reload data để cập nhật điểm tổng kết chính thức từ server
    } catch (err) {
      console.error("Lỗi khi lưu điểm:", err);
      toast.error(err.response?.data?.error || "Lưu điểm thất bại.");
    } finally {
      setSaving(false);
    }
  };

  // --- Render Helpers ---
  const giangVienHuongDan = useMemo(() => {
      return diem.huongdan.map(gv => gv.HOTEN).join(', ');
  }, [diem.huongdan]);


  if (loading) {
    return <div className="h-[calc(100vh-4rem)] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!nhom || !tytrong) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-10">
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Lỗi dữ liệu</AlertTitle>
          <AlertDescription>
            Không tìm thấy thông tin nhóm hoặc cấu hình tỷ trọng điểm. Vui lòng kiểm tra lại đường dẫn.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4 w-full">
          <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại
        </Button>
      </div>
    );
  }

  const hasNoTeachers = diem.huongdan.length === 0 && diem.phanbien.length === 0 && diem.hoidong.length === 0;
  
  // Quyết định hiển thị điểm nào: Từ Backend (nếu đã lưu và chưa sửa) hay Từ Client (dự kiến)
  const displayFinalScore = diemTongKetTuBackend !== null 
      ? diemTongKetTuBackend.toFixed(2) 
      : diemTongDuKien;

  return (
    <TooltipProvider>
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
        
        {/* --- HEADER & INFO --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
            </div>

            <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button 
                            variant="outline" 
                            className="flex items-center gap-2 px-3 py-5 h-auto bg-background hover:bg-accent/50 border-primary/20 max-w-full"
                        >
                            <div className="bg-primary/10 p-2 rounded-full">
                                <CheckCircle className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex flex-col items-start text-left min-w-0">
                                <span className="font-bold text-sm truncate max-w-[200px] md:max-w-[400px]">{nhom.TEN_NHOM}</span>
                                <span className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-[400px]">{nhom.DETAI || 'Chưa có tên đề tài'}</span>
                            </div>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-4" align="start">
                        <div className="grid gap-4">
                            <div className="space-y-1">
                                <h4 className="font-semibold leading-none text-lg text-primary">{nhom.TEN_NHOM}</h4>
                                <p className="text-sm text-muted-foreground">{nhom.kehoach?.TEN_DOT}</p>
                            </div>
                            <Separator />
                            <div className="flex items-start gap-3">
                                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <span className="font-semibold block text-sm">Đề tài:</span>
                                    <p className="text-sm text-muted-foreground">{nhom.DETAI}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <span className="font-semibold block text-sm">Sinh viên:</span>
                                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                                        {nhom.SINHVIEN.map(sv => (
                                            <li key={sv.MA_DINHDANH}>{sv.HODEM_VA_TEN} ({sv.MA_DINHDANH})</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
                
                {giangVienHuongDan && (
                    <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border text-sm text-muted-foreground">
                        <BookUser className="h-4 w-4" />
                        <span>GVHD: <span className="font-medium text-foreground">{giangVienHuongDan}</span></span>
                    </div>
                )}
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0 w-full md:w-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Quay lại</p></TooltipContent>
            </Tooltip>
            <Button onClick={handleSave} disabled={saving || hasNoTeachers} className="min-w-[140px] shadow-md w-full md:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saving ? 'Đang lưu...' : 'Lưu kết quả'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* --- LEFT COLUMN: GRADING TABLES --- */}
          <div className="lg:col-span-2 space-y-8">
            {hasNoTeachers && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Chưa có thông tin</AlertTitle>
                <AlertDescription>
                  Nhóm này chưa được gán giảng viên chấm điểm (HD, PB hoặc Hội đồng). Vui lòng kiểm tra lại phân công.
                </AlertDescription>
              </Alert>
            )}
            
            {/* 1. Bảng Điểm Hướng Dẫn */}
            {diem.huongdan.length > 0 && 
              <DiemTable 
                title="Điểm Hướng Dẫn (Quá trình)" 
                icon={BookUser}
                list={diem.huongdan} 
                loai="huongdan"
                tinhDiemTB={tinhDiemTB}
                handleDiemChange={handleDiemChange}
              />
            }

            {/* 2. Bảng Điểm Phản Biện */}
            {diem.phanbien.length > 0 && 
              <DiemTable 
                title="Điểm Phản Biện" 
                icon={MessageSquare}
                list={diem.phanbien} 
                loai="phanbien"
                tinhDiemTB={tinhDiemTB}
                handleDiemChange={handleDiemChange}
              />
            }

            {/* 3. Bảng Điểm Hội Đồng */}
            {diem.hoidong.length > 0 && 
              <DiemTable 
                title="Điểm Hội Đồng Bảo Vệ" 
                icon={Users}
                list={diem.hoidong} 
                loai="hoidong"
                tinhDiemTB={tinhDiemTB}
                handleDiemChange={handleDiemChange}
              />
            }
          </div>

          {/* --- RIGHT COLUMN: SUMMARY & WEIGHTS --- */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="sticky top-6 shadow-lg border-t-4 border-t-green-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                    <GraduationCap className="h-6 w-6 text-green-600" />
                    Tổng kết điểm
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {/* Tổng điểm Box */}
                <div className="text-center p-6 bg-gradient-to-b from-green-50 to-white dark:from-green-950/30 dark:to-background rounded-xl border border-green-200 dark:border-green-900/50 shadow-inner">
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
                    {diemTongKetTuBackend !== null ? "Điểm Chính Thức" : "Điểm Dự Kiến"}
                  </span>
                  <div className="text-7xl font-bold text-green-600 dark:text-green-500 mt-2 tracking-tighter tabular-nums">
                    {displayFinalScore}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Thang điểm 10</p>
                </div>

                <Separator />

                {/* Chi tiết điểm thành phần */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground flex items-center gap-2">
                    <Info className="h-4 w-4" /> Chi tiết thành phần
                  </h4>
                  
                  {tyTrongHienThi.HD > 0 && (
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground">Hướng Dẫn</span>
                      <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                              {Math.round(tyTrongHienThi.HD * 100)}%
                          </Badge>
                          <span className="font-bold text-lg min-w-[40px] text-right tabular-nums">
                              {diemTB_HD !== null ? diemTB_HD.toFixed(2) : '-'}
                          </span>
                      </div>
                    </div>
                  )}
                  
                  {tyTrongHienThi.PB > 0 && (
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground">Phản Biện</span>
                      <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                              {Math.round(tyTrongHienThi.PB * 100)}%
                          </Badge>
                          <span className="font-bold text-lg min-w-[40px] text-right tabular-nums">
                              {diemTB_PB !== null ? diemTB_PB.toFixed(2) : '-'}
                          </span>
                      </div>
                    </div>
                  )}
                  
                  {tyTrongHienThi.HDONG > 0 && (
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground">Hội Đồng</span>
                      <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                              {Math.round(tyTrongHienThi.HDONG * 100)}%
                          </Badge>
                          <span className="font-bold text-lg min-w-[40px] text-right tabular-nums">
                              {diemTB_HDONG !== null ? diemTB_HDONG.toFixed(2) : '-'}
                          </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="bg-muted/10 border-t py-4">
                <div className="w-full flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <Percent className="h-3.5 w-3.5" />
                  <span>Tỷ trọng được áp dụng từ Kế hoạch khóa luận</span>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ChamDiemChiTiet;