import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axiosClient from "@/api/axiosConfig";
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
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
  Loader2,
  Save,
  ArrowLeft,
  Users,
  GraduationCap,
  FileText,
  Info,
  Percent,
  BookUser,
  MessageSquare
} from 'lucide-react';

// --- Helper Functions for UI ---

/**
 * Trả về variant của Badge dựa trên vai trò
 */
const getRoleVariant = (role) => {
  if (!role) return 'default';
  const roleLower = role.toLowerCase();
  if (roleLower.includes('chutich')) return 'destructive';
  if (roleLower.includes('thuky')) return 'secondary';
  if (roleLower.includes('phanbien')) return 'outline';
  return 'default';
};

/**
 * Định dạng lại tên vai trò cho dễ đọc
 */
const formatRole = (role, loaiMacDinh) => {
  if (!role) return loaiMacDinh;
  const formatted = role.replace('HĐ', '').trim();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

// --- Component Bảng Điểm ---

const DiemTable = ({ title, icon: Icon, list, loai, tinhDiemTB, handleDiemChange }) => (
  <Card className="shadow-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Giảng viên</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead className="w-[100px] text-center">Điểm</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map(gv => (
            <TableRow key={gv.ID_GIANGVIEN}>
              <TableCell className="font-medium">{gv.HOTEN}</TableCell>
              <TableCell>
                <Badge
                  variant={getRoleVariant(gv.VAITRO || loai)}
                  className="capitalize"
                >
                  {formatRole(gv.VAITRO, loai)}
                </Badge>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={gv.DIEM}
                  onChange={(e) => handleDiemChange(loai, gv.ID_GIANGVIEN, e.target.value)}
                  className="w-24 text-center mx-auto"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="text-right font-semibold text-base">
              Điểm trung bình
            </TableCell>
            <TableCell className="text-center font-bold text-lg text-primary">
              {tinhDiemTB(loai).toFixed(2)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </CardContent>
  </Card>
);

// --- Component Chính ---

const ChamDiemChiTiet = () => {
  const { idNhom } = useParams();
  const navigate = useNavigate();
  const [nhom, setNhom] = useState(null);
  const [tytrong, setTytrong] = useState({ HUONGDAN: 0.4, PHANBIEN: 0.3, HOIDONG: 0.3 });
  const [diem, setDiem] = useState({
    huongdan: [],
    phanbien: [],
    hoidong: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tải dữ liệu (Logic giữ nguyên)
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [nhomRes, tytrongRes, tongketRes] = await Promise.all([
        axiosClient.get(`/chamdiem/nhom/${idNhom}`),
        axiosClient.get('/chamdiem/tytrong'),
        axiosClient.get(`/chamdiem/tongket/${idNhom}`),
      ]);

      const nhomData = nhomRes.data.nhom;
      const tongketData = tongketRes.data;

      setNhom(nhomData);
      setTytrong(tytrongRes.data);

      const gvHD = nhomData.GIANGVIEN.filter(gv => gv.VAITRO === 'Hướng dẫn');
      const gvPB = nhomData.GIANGVIEN.filter(gv => gv.VAITRO === 'Phản biện');
      const gvHDONG = nhomData.GIANGVIEN.filter(gv =>
        gv.VAITRO.includes('HĐ') || ['chutich', 'thuky', 'thanhvien'].includes(gv.VAITRO)
      );

      const diemHDMap = new Map(tongketData?.diem_huong_dan?.map(d => [d.ID_GIANGVIEN, d.DIEM]));
      const diemPBMap = new Map(tongketData?.diem_phan_bien?.map(d => [d.ID_GIANGVIEN, d.DIEM]));
      const diemHDONGMap = new Map(tongketData?.diem_hoi_dong?.map(d => [d.ID_GIANGVIEN, d.DIEM]));

      const getScore = (map, id) => map.get(id) ?? 0;

      setDiem({
        huongdan: gvHD.map(gv => ({
          ID_GIANGVIEN: gv.ID_GIANGVIEN,
          HOTEN: gv.HOTEN,
          DIEM: getScore(diemHDMap, gv.ID_GIANGVIEN)
        })),
        phanbien: gvPB.map(gv => ({
          ID_GIANGVIEN: gv.ID_GIANGVIEN,
          HOTEN: gv.HOTEN,
          DIEM: getScore(diemPBMap, gv.ID_GIANGVIEN)
        })),
        hoidong: gvHDONG.map(gv => ({
          ID_GIANGVIEN: gv.ID_GIANGVIEN,
          HOTEN: gv.HOTEN,
          VAITRO: gv.VAITRO,
          DIEM: getScore(diemHDONGMap, gv.ID_GIANGVIEN)
        })),
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

  // Xử lý thay đổi điểm (Logic giữ nguyên)
  const handleDiemChange = (loai, id_giangvien, value) => {
    const diemValue = Math.max(0, Math.min(10, Number(value) || 0));
    setDiem(prev => ({
      ...prev,
      [loai]: prev[loai].map(gv =>
        gv.ID_GIANGVIEN === id_giangvien ? { ...gv, DIEM: diemValue } : gv
      ),
    }));
  };

  // Tính điểm trung bình (Logic giữ nguyên)
  const tinhDiemTB = useCallback((loai) => {
    const list = diem[loai];
    if (!list || list.length === 0) return 0;
    const total = list.reduce((sum, gv) => sum + (Number(gv.DIEM) || 0), 0);
    return total / list.length;
  }, [diem]);

  const diemTB_HD = useMemo(() => tinhDiemTB('huongdan'), [tinhDiemTB]);
  const diemTB_PB = useMemo(() => tinhDiemTB('phanbien'), [tinhDiemTB]);
  const diemTB_HDONG = useMemo(() => tinhDiemTB('hoidong'), [tinhDiemTB]);

  // Tính toán điểm tổng và tỷ trọng hiển thị (Logic giữ nguyên)
  const { diemTong, tyTrongHienThi } = useMemo(() => {
    const hasHuongDan = diem.huongdan.length > 0;
    const hasPhanBien = diem.phanbien.length > 0;
    const hasHoiDong = diem.hoidong.length > 0;

    const wHD = parseFloat(tytrong.HUONGDAN ?? 0);
    const wPB = parseFloat(tytrong.PHANBIEN ?? 0);
    const wHDONG = parseFloat(tytrong.HOIDONG ?? 0);

    let final_wHD = 0, final_wPB = 0, final_wHDONG = 0;
    let finalScore = 0;

    if (hasHuongDan && hasPhanBien && hasHoiDong) {
      final_wHD = wHD;
      final_wPB = wPB;
      final_wHDONG = wHDONG;
      finalScore = (diemTB_HD * final_wHD) + (diemTB_PB * final_wPB) + (diemTB_HDONG * final_wHDONG);
    }
    else if (hasHuongDan && hasHoiDong) {
      final_wHD = wHD;
      final_wPB = 0;
      final_wHDONG = wPB + wHDONG;
      finalScore = (diemTB_HD * final_wHD) + (diemTB_HDONG * final_wHDONG);
    }
    else if (hasHuongDan && hasPhanBien) {
      final_wHD = wHD;
      final_wPB = wPB + wHDONG;
      final_wHDONG = 0;
      finalScore = (diemTB_HD * final_wHD) + (diemTB_PB * final_wPB);
    }
    else if (hasHuongDan) {
      final_wHD = 1.0;
      final_wPB = 0;
      final_wHDONG = 0;
      finalScore = diemTB_HD;
    }

    const totalWeight = final_wHD + final_wPB + final_wHDONG;
    if (totalWeight > 0 && Math.abs(1.0 - totalWeight) > 0.001) {
       finalScore = finalScore / totalWeight;
    }

    return {
      diemTong: finalScore.toFixed(2),
      tyTrongHienThi: {
        HD: final_wHD,
        PB: final_wPB,
        HDONG: final_wHDONG
      }
    };
  }, [diem, diemTB_HD, diemTB_PB, diemTB_HDONG, tytrong]);

  // Lưu điểm (Logic giữ nguyên)
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        diem_huongdan: diem.huongdan.map(d => ({ ID_GIANGVIEN: d.ID_GIANGVIEN, DIEM: d.DIEM })),
        diem_phanbien: diem.phanbien.map(d => ({ ID_GIANGVIEN: d.ID_GIANGVIEN, DIEM: d.DIEM })),
        diem_hoidong: diem.hoidong.map(d => ({ ID_GIANGVIEN: d.ID_GIANGVIEN, DIEM: d.DIEM })),
      };
      const res = await axiosClient.post(`/chamdiem/combined/${idNhom}`, payload);
      toast.success(res.data.message || "Lưu điểm thành công!");
      fetchData();
    } catch (err) {
      console.error("Lỗi khi lưu điểm:", err);
      toast.error(err.response?.data?.error || "Lưu điểm thất bại!");
    } finally {
      setSaving(false);
    }
  };

  // --- Render (Giao diện đã nâng cấp) ---

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>;
  }

  if (!nhom) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>
            Không tìm thấy thông tin nhóm. Vui lòng kiểm tra lại đường dẫn.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
      </div>
    );
  }

  const hasNoTeachers = diem.huongdan.length === 0 && diem.phanbien.length === 0 && diem.hoidong.length === 0;

  return (
    <TooltipProvider>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* 1. Header: Tiêu đề và Nút hành động */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            Chấm điểm chi tiết
          </h1>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Quay lại</p></TooltipContent>
            </Tooltip>
            <Button onClick={handleSave} disabled={saving || hasNoTeachers} className="min-w-[120px]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saving ? 'Đang lưu...' : 'Lưu tất cả'}
            </Button>
          </div>
        </div>

        {/* 2. Thông tin nhóm */}
        <Card className="shadow-lg border-l-4 border-primary">
          <CardHeader>
            <CardTitle className="text-xl mb-2">Thông tin Đồ án/Khóa luận</CardTitle>
            <Badge variant="secondary" className="text-base font-semibold w-fit">
              {nhom.TEN_NHOM}
            </Badge>
          </CardHeader>
          <CardContent className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              <div>
                <span className="font-semibold text-gray-800">Đề tài:</span>
                <p className="text-muted-foreground">{nhom.DETAI}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              <div>
                <span className="font-semibold text-gray-800">Sinh viên thực hiện:</span>
                <div className="flex flex-col text-muted-foreground">
                  {nhom.SINHVIEN.map(sv => (
                    <span key={sv.MA_DINHDANH}>{sv.HOTEN} ({sv.MA_DINHDANH})</span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Khu vực chấm điểm */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {hasNoTeachers && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Chưa có giảng viên</AlertTitle>
                <AlertDescription>
                  Nhóm này chưa được gán giảng viên hướng dẫn, phản biện, hoặc hội đồng.
                  Không thể thực hiện chấm điểm.
                </AlertDescription>
              </Alert>
            )}
            {diem.huongdan.length > 0 &&
              <DiemTable
                title="Điểm Hướng Dẫn"
                icon={BookUser}
                list={diem.huongdan}
                loai="huongdan"
                tinhDiemTB={tinhDiemTB}
                handleDiemChange={handleDiemChange}
              />}
            {diem.phanbien.length > 0 &&
              <DiemTable
                title="Điểm Phản Biện"
                icon={MessageSquare}
                list={diem.phanbien}
                loai="phanbien"
                tinhDiemTB={tinhDiemTB}
                handleDiemChange={handleDiemChange}
              />}
            {diem.hoidong.length > 0 &&
              <DiemTable
                title="Điểm Hội Đồng"
                icon={Users}
                list={diem.hoidong}
                loai="hoidong"
                tinhDiemTB={tinhDiemTB}
                handleDiemChange={handleDiemChange}
              />}
          </div>

          {/* 4. Cột tổng kết */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="sticky top-20 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">Tổng kết điểm</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Điểm tổng nổi bật */}
                <div className="text-center p-6 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="text-sm font-medium text-primary uppercase tracking-wider">
                    Điểm tổng kết (Dự kiến)
                  </span>
                  <div className="text-6xl font-bold text-primary mt-1">{diemTong}</div>
                </div>

                {/* Chi tiết điểm TB */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-semibold">Chi tiết điểm thành phần:</h4>
                  {tyTrongHienThi.HD > 0 && (
                    <div className="flex justify-between items-center text-md">
                      <span className="text-muted-foreground">Điểm TB Hướng Dẫn</span>
                      <span className="font-semibold">{diemTB_HD.toFixed(2)}</span>
                    </div>
                  )}
                  {tyTrongHienThi.PB > 0 && (
                    <div className="flex justify-between items-center text-md">
                      <span className="text-muted-foreground">Điểm TB Phản Biện</span>
                      <span className="font-semibold">{diemTB_PB.toFixed(2)}</span>
                    </div>
                  )}
                  {tyTrongHienThi.HDONG > 0 && (
                    <div className="flex justify-between items-center text-md">
                      <span className="text-muted-foreground">Điểm TB Hội Đồng</span>
                      <span className="font-semibold">{diemTB_HDONG.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              
              {/* Tỷ trọng */}
              <CardFooter className="flex flex-col gap-2 border-t pt-4">
                <h4 className="font-semibold text-left w-full flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  Tỷ trọng đang áp dụng:
                </h4>
                <div className="w-full space-y-1">
                  {tyTrongHienThi.HD > 0 && (
                    <div className="flex justify-between w-full text-sm text-muted-foreground">
                      <span>Hướng dẫn:</span>
                      <span className="font-medium">{Math.round(tyTrongHienThi.HD * 100)}%</span>
                    </div>
                  )}
                  {tyTrongHienThi.PB > 0 && (
                    <div className="flex justify-between w-full text-sm text-muted-foreground">
                      <span>Phản biện:</span>
                      <span className="font-medium">{Math.round(tyTrongHienThi.PB * 100)}%</span>
                    </div>
                  )}
                  {tyTrongHienThi.HDONG > 0 && (
                    <div className="flex justify-between w-full text-sm text-muted-foreground">
                      <span>Hội đồng:</span>
                      <span className="font-medium">{Math.round(tyTrongHienThi.HDONG * 100)}%</span>
                    </div>
                  )}
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