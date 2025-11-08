import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  submitHuongDan,
  submitPhanBien,
  submitHoiDong,
} from "@/api/chamDiemService";

export const GradingModal = ({
  isOpen,
  onClose,
  onSaveSuccess,
  group,
  role,
}) => {
  // --- Logic giữ nguyên ---
  const [diem, setDiem] = useState(0);
  const [nhanxet, setNhanxet] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    let submitFunction;
    if (role === "huongdan") submitFunction = submitHuongDan;
    else if (role === "phanbien") submitFunction = submitPhanBien;
    else if (role === "hoidong") submitFunction = submitHoiDong;
    else {
      toast.error("Vai trò chấm điểm không xác định!");
      setIsSaving(false);
      return;
    }
    try {
      const diemValue = parseFloat(diem);
      if (isNaN(diemValue) || diemValue < 0 || diemValue > 10) {
        toast.error("Điểm phải là một số từ 0 đến 10.");
        setIsSaving(false);
        return;
      }
      await submitFunction(group.ID_NHOM, {
        DIEM: diemValue,
        NHANXET: nhanxet,
      });
      toast.success("Lưu điểm thành công!");
      onSaveSuccess();
    } catch (error) {
      console.error("Lỗi khi lưu điểm:", error);
      toast.error(error.response?.data?.message || "Lưu điểm thất bại.");
      setIsSaving(false);
    }
  };

  const getRoleName = () => {
    if (role === "huongdan") return "Hướng Dẫn";
    if (role === "phanbien") return "Phản Biện";
    if (role === "hoidong") return "Hội Đồng";
    return "";
  };

  const detai =
    group.detai?.TEN_DETAI || group.phancong_detai_nhom?.detai?.TEN_DETAI;
  
  // --- JSX (Giao diện mới) ---

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Chấm điểm - Vai trò: {getRoleName()}</DialogTitle>
          <DialogDescription>
            Nhóm: <strong>{group.TEN_NHOM}</strong>
            <br />
            Đề tài: {detai || "N/A"}
          </DialogDescription>
        </DialogHeader>
        
        {/* Cải tiến bố cục form */}
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="diem" className="text-right font-semibold">
              Điểm
            </Label>
            <Input
              id="diem"
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={diem}
              onChange={(e) => setDiem(e.target.value)}
              className="col-span-3 h-10 text-lg font-bold"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="nhanxet" className="text-right pt-2 font-semibold">
              Nhận xét
            </Label>
            <Textarea
              id="nhanxet"
              value={nhanxet}
              onChange={(e) => setNhanxet(e.target.value)}
              className="col-span-3 min-h-[120px]"
              placeholder="Nhận xét của bạn (tùy chọn)..."
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};