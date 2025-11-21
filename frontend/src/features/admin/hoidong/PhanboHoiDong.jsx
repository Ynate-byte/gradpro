import React, { useState, useEffect, useMemo, useCallback } from "react";
import axiosClient from "@/api/axiosConfig";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Save, Search, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { autoAssignGroups } from "@/api/adminHoiDongService";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// ----- Component Item Nhóm (Click để chuyển) -----
const GroupSelectItem = ({ group, onMove }) => {
  const handleMove = () => onMove(group.ID_NHOM);

  return (
    <div
      className={cn(
        "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
        "bg-background hover:bg-primary/10 hover:border-primary/30"
      )}
      onClick={handleMove}
      title={`Nhấn để chuyển nhóm "${group.TEN_NHOM}"`}
    >
      <div className="flex-1 overflow-hidden">
        <p className="font-medium truncate" title={group.TEN_NHOM}>
          {group.TEN_NHOM}
        </p>
        <p
          className="text-sm text-muted-foreground truncate"
          title={group.TEN_DETAI || "Chưa đăng ký"}
        >
          {group.TEN_DETAI || "Chưa đăng ký đề tài"}
        </p>
      </div>
    </div>
  );
};

// ----- Component Cột (Trái hoặc Phải) -----
const GroupTransferList = ({
  title,
  groups = [],
  onMove,
  searchTerm = "",
  onSearchChange,
  showSearch,
  children,
}) => {
  return (
    <Card className="flex flex-col h-[60vh]">
      <CardHeader className="py-4 border-b">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>{title}</span>
          <span className="text-base font-medium text-muted-foreground">
            {groups.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-1 flex flex-col min-h-0 space-y-3">
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Lọc theo tên nhóm, đề tài..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
        <ScrollArea className="flex-1 border rounded-md">
          <div className="p-3 space-y-2">
            {groups.length > 0 ? (
              groups.map((group) => (
                <GroupSelectItem
                  key={group.ID_NHOM}
                  group={group}
                  onMove={onMove}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                {searchTerm ? "Không tìm thấy nhóm." : "Không có nhóm nào."}
              </div>
            )}
          </div>
        </ScrollArea>
        {children}
      </CardContent>
    </Card>
  );
};

// ----- Component Chính: PhanboHoiDong -----
const PhanboHoiDong = () => {
  const [kehoach, setKehoach] = useState([]);
  const [hoidongList, setHoidongList] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [chonKehoach, setChonKehoach] = useState("");
  const [chonHoiDong, setChonHoiDong] = useState("");

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State cho Dialog xác nhận phân bổ tự động
  const [isAutoAssignDialogOpen, setIsAutoAssignDialogOpen] = useState(false);
  // State chọn loại hội đồng khi phân bổ tự động ('hoidong' hoặc 'phanbien')
  const [autoAssignType, setAutoAssignType] = useState("hoidong");

  const navigate = useNavigate();

  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");

  // Tải Kế hoạch
  useEffect(() => {
    (async () => {
      try {
        const [khRes] = await Promise.all([
          axiosClient.get("/admin/hoidong/kehoach-options"),
        ]);
        setKehoach(khRes.data || []);
      } catch (error) {
        toast.error("Không thể tải danh sách kế hoạch!");
      }
    })();
  }, []);

  // Tải dữ liệu khi chọn kế hoạch
  const fetchData = useCallback(async () => {
    if (!chonKehoach) {
      setAllGroups([]);
      setHoidongList([]);
      setChonHoiDong("");
      setLeftSearch("");
      setRightSearch("");
      return;
    }

    setLoading(true);
    try {
      const [nhomRes, hoidongRes] = await Promise.all([
        axiosClient.get(`/admin/hoidong/${chonKehoach}/nhoms`),
        // Lấy tất cả hội đồng để hiển thị dropdown
        axiosClient.get("/admin/hoidong", {
          params: {
            kehoach: chonKehoach,
            all: true,
          },
        }),
      ]);

      setAllGroups(nhomRes.data || []);

      const hoidongData = hoidongRes.data || [];
      setHoidongList(hoidongData);

      // Nếu chưa chọn hội đồng nào, chọn cái đầu tiên
      if (!chonHoiDong && hoidongData.length > 0) {
        setChonHoiDong(String(hoidongData[0].ID_HOIDONG));
      }
    } catch (error) {
      toast.error("Không thể tải dữ liệu nhóm/hội đồng!");
    } finally {
      setLoading(false);
    }
  }, [chonKehoach, chonHoiDong]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tính toán dữ liệu phân bổ (Client-side state)
  const { hoidongGroupCounts, unassignedGroups, assignedGroups } = useMemo(() => {
    const counts = new Map();
    const unassigned = [];
    const assigned = [];
    const currentCouncilIdStr = chonHoiDong;

    allGroups.forEach((group) => {
      const groupIdNum = group.ID_HOIDONG;

      // Đếm số nhóm theo hội đồng (để hiển thị trong dropdown)
      if (groupIdNum) {
        counts.set(groupIdNum, (counts.get(groupIdNum) || 0) + 1);
      }

      // Phân loại nhóm vào cột trái/phải
      const groupIdStr = groupIdNum ? String(groupIdNum) : null;

      if (groupIdStr === null) {
        unassigned.push(group);
      } else if (groupIdStr === currentCouncilIdStr) {
        assigned.push(group);
      }
    });

    return {
      hoidongGroupCounts: counts,
      unassignedGroups: unassigned,
      assignedGroups: assigned,
    };
  }, [allGroups, chonHoiDong]);

  // Lọc tìm kiếm cột trái
  const filteredLeft = useMemo(() => {
    if (!leftSearch) return unassignedGroups;
    const term = leftSearch.toLowerCase();
    return unassignedGroups.filter(
      (g) =>
        g.TEN_NHOM.toLowerCase().includes(term) ||
        (g.TEN_DETAI && g.TEN_DETAI.toLowerCase().includes(term))
    );
  }, [unassignedGroups, leftSearch]);

  // Lọc tìm kiếm cột phải
  const filteredRight = useMemo(() => {
    if (!rightSearch) return assignedGroups;
    const term = rightSearch.toLowerCase();
    return assignedGroups.filter(
      (g) =>
        g.TEN_NHOM.toLowerCase().includes(term) ||
        (g.TEN_DETAI && g.TEN_DETAI.toLowerCase().includes(term))
    );
  }, [assignedGroups, rightSearch]);

  // Di chuyển thủ công sang phải (Gán vào hội đồng đang chọn)
  const handleMoveRight = useCallback(
    (groupId) => {
      const councilId = Number(chonHoiDong);
      if (!councilId) {
        toast.warning("Vui lòng chọn hội đồng trước!");
        return;
      }

      setAllGroups((prev) =>
        prev.map((g) =>
          g.ID_NHOM === groupId ? { ...g, ID_HOIDONG: councilId } : g
        )
      );
    },
    [chonHoiDong]
  );

  // Di chuyển thủ công sang trái (Gỡ khỏi hội đồng)
  const handleMoveLeft = useCallback((groupId) => {
    setAllGroups((prev) =>
      prev.map((g) =>
        g.ID_NHOM === groupId ? { ...g, ID_HOIDONG: null } : g
      )
    );
  }, []);

  // 1. Hàm kiểm tra điều kiện mở Dialog
  const onOpenAutoAssignDialog = () => {
    if (!chonKehoach) {
      toast.warning("Vui lòng chọn kế hoạch trước!");
      return;
    }

    if (unassignedGroups.length === 0) {
      toast.info("Tất cả các nhóm đã được phân bổ.");
      return;
    }
    
    // Mở dialog thay vì window.confirm
    setIsAutoAssignDialogOpen(true);
  };

  // 2. Hàm thực thi logic khi bấm "Xác nhận" trong Dialog
  const handleConfirmAutoAssign = async () => {
    setLoading(true);
    try {
      // Gọi API với thêm tham số LOAI
      const res = await autoAssignGroups(chonKehoach, autoAssignType);
      toast.success(res.message);
      // Tải lại dữ liệu mới nhất từ server sau khi phân bổ xong
      await fetchData(); 
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Phân bổ thất bại.");
    } finally {
      setLoading(false);
      setIsAutoAssignDialogOpen(false); // Đóng dialog
    }
  };

  // Lưu phân bổ (Cho các thao tác thủ công)
  const handleSave = async () => {
    if (!chonKehoach) {
      toast.warning("Vui lòng chọn kế hoạch!");
      return;
    }

    const payload = allGroups.map((g) => ({
      ID_NHOM: g.ID_NHOM,
      ID_HOIDONG: g.ID_HOIDONG ?? null,
    }));

    setIsSaving(true);
    try {
      await axiosClient.post("/admin/hoidong/phanbo-nhom", payload);
      toast.success("Lưu phân bổ thành công!");
      await fetchData();
    } catch (err) {
      toast.error("Lưu thất bại. Vui lòng thử lại!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-full mx-auto">
      <Button
        type="button"
        variant="outline"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
      </Button>
      <Card className="shadow-lg">
        <CardContent className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-2">
              <Select value={chonKehoach} onValueChange={setChonKehoach}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="-- Chọn kế hoạch --" />
                </SelectTrigger>
                <SelectContent>
                  {kehoach.map((k) => (
                    <SelectItem
                      key={k.ID_KEHOACH}
                      value={String(k.ID_KEHOACH)}
                    >
                      {k.TEN_DOT}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 md:text-right">
              {/* Nút phân bổ tự động (Server-side) */}
              <Button
                type="button"
                variant="default"
                className="mr-2 bg-purple-600 hover:bg-purple-700 text-white"
                onClick={onOpenAutoAssignDialog} // Gọi hàm mở dialog
                disabled={
                  isSaving ||
                  loading ||
                  !chonKehoach ||
                  unassignedGroups.length === 0 ||
                  hoidongList.length === 0
                }
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Phân bổ tự động
              </Button>

              {/* Nút Lưu (cho thao tác thủ công) */}
              <Button
                onClick={handleSave}
                disabled={isSaving || loading || !chonKehoach}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Lưu phân bổ
              </Button>
            </div>
          </div>

          {/* Hàng 2: Giao diện 2 cột */}
          {loading ? (
            <div className="text-center p-8">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chonKehoach ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Cột trái: Chưa phân bổ */}
              <GroupTransferList
                title="Nhóm chưa phân bổ"
                groups={filteredLeft}
                onMove={handleMoveRight}
                searchTerm={leftSearch}
                onSearchChange={setLeftSearch}
                showSearch={true}
              />

              {/* Cột phải: Hội đồng */}
              <div className="flex flex-col h-[60vh] space-y-4">
                <Select
                  value={chonHoiDong}
                  onValueChange={setChonHoiDong}
                  disabled={!hoidongList.length}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        hoidongList.length
                          ? "--- Chọn hội đồng để xem ---"
                          : "Chưa có hội đồng"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {hoidongList.map((hd) => (
                      <SelectItem
                        key={hd.ID_HOIDONG}
                        value={String(hd.ID_HOIDONG)}
                      >
                        {hd.TEN_HOIDONG} ({hoidongGroupCounts.get(hd.ID_HOIDONG) || 0} nhóm)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {chonHoiDong ? (
                  <GroupTransferList
                    title="Nhóm thuộc hội đồng này"
                    groups={filteredRight}
                    onMove={handleMoveLeft}
                    searchTerm={rightSearch}
                    onSearchChange={setRightSearch}
                    showSearch={true}
                  />
                ) : (
                  <Card className="flex-1 flex flex-col min-w-[300px]">
                    <CardHeader className="py-4 border-b">
                      <CardTitle className="text-lg">
                        Chưa chọn hội đồng
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 min-h-[300px] flex items-center justify-center">
                      <p className="text-muted-foreground">
                        {hoidongList.length > 0
                          ? "Vui lòng chọn một hội đồng từ danh sách ở trên."
                          : "Kế hoạch này chưa có hội đồng nào được tạo."}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">
              Vui lòng chọn kế hoạch để bắt đầu.
            </p>
          )}
        </CardContent>
      </Card>

      {/* DIALOG XÁC NHẬN PHÂN BỔ TỰ ĐỘNG */}
      <AlertDialog open={isAutoAssignDialogOpen} onOpenChange={setIsAutoAssignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Xác nhận Phân bổ Tự động?
            </AlertDialogTitle>
            
            {/* Sử dụng asChild để tránh lỗi <ul> bên trong <p> */}
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                Hệ thống sẽ tự động phân bổ <strong>{unassignedGroups.length} nhóm</strong> chưa có hội đồng vào các hội đồng phù hợp nhất.
                <br /><br />

                {/* Chọn loại hội đồng */}
                <div className="mb-4 p-3 bg-muted/50 rounded-md border">
                  <Label className="mb-2 block text-xs font-bold uppercase">Chọn loại hội đồng đích:</Label>
                  <RadioGroup 
                    defaultValue="hoidong" 
                    value={autoAssignType} 
                    onValueChange={setAutoAssignType} 
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hoidong" id="opt-hd" />
                      <Label htmlFor="opt-hd" className="cursor-pointer">Hội đồng Bảo vệ</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phanbien" id="opt-pb" />
                      <Label htmlFor="opt-pb" className="cursor-pointer">Phản biện</Label>
                    </div>
                  </RadioGroup>
                </div>

                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Ưu tiên gán vào Hội đồng có <strong>cùng chuyên ngành</strong>.</li>
                  <li>Cân bằng số lượng nhóm giữa các hội đồng.</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAutoAssign} 
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tiến hành phân bổ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PhanboHoiDong;