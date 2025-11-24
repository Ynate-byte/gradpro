import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { submitHoiDong } from "@/api/chamDiemService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, PenSquare } from "lucide-react";

const GradingModal = ({ isOpen, onClose, onSaveSuccess, group, currentScore, currentComment }) => {
  const [diem, setDiem] = useState("");
  const [nhanxet, setNhanxet] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && group) {
      setDiem(currentScore !== null && currentScore !== undefined ? currentScore : "");
      setNhanxet(currentComment || "");
    }
  }, [isOpen, group, currentScore, currentComment]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const diemValue = parseFloat(diem);
      if (isNaN(diemValue) || diemValue < 0 || diemValue > 10) {
        toast.error("Điểm phải là số từ 0 đến 10.");
        setIsSaving(false);
        return;
      }

      await submitHoiDong(group.ID_NHOM, {
        DIEM: diemValue,
        NHANXET: nhanxet,
      });

      toast.success("Lưu điểm hội đồng thành công!");
      onSaveSuccess();
    } catch (error) {
      console.error("Lỗi chấm điểm:", error);
      toast.error(error.response?.data?.error || "Lỗi khi lưu điểm.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!group) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <PenSquare className="w-5 h-5" /> Chấm điểm Hội Đồng
          </DialogTitle>
          <DialogDescription>
            Nhóm: <strong>{group.TEN_NHOM}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-5 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="diem" className="text-right font-semibold">
              Điểm số <span className="text-red-500">*</span>
            </Label>
            <div className="col-span-3 relative">
              <Input
                id="diem"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={diem}
                onChange={(e) => setDiem(e.target.value)}
                className="h-11 text-lg font-bold pl-4"
                placeholder="0 - 10"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="nhanxet" className="text-right pt-2 font-semibold">
              Nhận xét
            </Label>
            <Textarea
              id="nhanxet"
              value={nhanxet}
              onChange={(e) => setNhanxet(e.target.value)}
              className="col-span-3 min-h-[100px]"
              placeholder="Nhập nhận xét (tùy chọn)..."
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Hủy</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Lưu điểm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GradingModal;