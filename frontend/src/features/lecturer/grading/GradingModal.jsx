import React, { useState, useEffect } from "react";
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
// [ĐÃ SỬA] Thêm PenSquare vào import
import { Loader2, Save, PenSquare } from "lucide-react";
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
    // Lấy điểm hiện tại từ props group nếu có (được map từ API getMyGradingTasks)
    // API trả về key dạng: diem_huongdan_hientai, diem_phanbien_hientai, ...
    const currentScoreKey = `diem_${role}_hientai`;
    // Nếu có điểm (kể cả 0), hiển thị điểm đó. Nếu null thì để trống.
    const initialScore = (group && group[currentScoreKey] !== null && group[currentScoreKey] !== undefined) 
                         ? group[currentScoreKey] 
                         : ""; 

    const [diem, setDiem] = useState(initialScore);
    const [nhanxet, setNhanxet] = useState(""); 
    const [isSaving, setIsSaving] = useState(false);

    // Cập nhật state khi mở modal lại hoặc group thay đổi
    useEffect(() => {
        if (isOpen && group) {
            const key = `diem_${role}_hientai`;
            const val = (group[key] !== null && group[key] !== undefined) ? group[key] : "";
            setDiem(val);
            // Lưu ý: Hiện tại API chưa trả về nhận xét cũ trong list, nên tạm thời reset rỗng
            // Nếu sau này backend trả về, bạn có thể map vào đây (vd: group[`nhanxet_${role}`])
            setNhanxet(""); 
        }
    }, [isOpen, group, role]);

    const handleSave = async () => {
        setIsSaving(true);
        
        // Mapping function submit
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
            onSaveSuccess(); // Callback để refresh list bên ngoài
        } catch (error) {
            console.error("Lỗi khi lưu điểm:", error);
            toast.error(error.response?.data?.error || "Lưu điểm thất bại.");
        } finally {
            setIsSaving(false);
        }
    };

    const getRoleName = () => {
        if (role === "huongdan") return "Giảng viên Hướng Dẫn";
        if (role === "phanbien") return "Giảng viên Phản Biện";
        if (role === "hoidong") return "Thành viên Hội Đồng";
        return "Giảng viên";
    };

    const detaiName = group.detai?.TEN_DETAI || group.phancong_detai_nhom?.detai?.TEN_DETAI || "Chưa có đề tài";

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !isSaving && onClose()}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-primary">
                         {/* Icon PenSquare được sử dụng ở đây */}
                         <PenSquare className="w-5 h-5" /> Chấm điểm - {getRoleName()}
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        <div className="bg-muted/50 p-3 rounded-md border text-sm space-y-1">
                            <p><span className="font-semibold">Nhóm:</span> {group.TEN_NHOM}</p>
                            <p><span className="font-semibold">Đề tài:</span> {detaiName}</p>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-5 py-4">
                    <div className="grid grid-cols-5 items-center gap-4">
                        <Label htmlFor="diem" className="text-right font-semibold col-span-1">
                            Điểm số <span className="text-red-500">*</span>
                        </Label>
                        <div className="col-span-4 relative">
                            <Input
                                id="diem"
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                value={diem}
                                onChange={(e) => setDiem(e.target.value)}
                                className="h-11 text-lg font-bold w-full pl-4"
                                placeholder="0 - 10"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                                / 10
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-5 items-start gap-4">
                        <Label htmlFor="nhanxet" className="text-right pt-2 font-semibold col-span-1">
                            Nhận xét
                        </Label>
                        <Textarea
                            id="nhanxet"
                            value={nhanxet}
                            onChange={(e) => setNhanxet(e.target.value)}
                            className="col-span-4 min-h-[120px] resize-none"
                            placeholder="Nhập đánh giá, nhận xét chi tiết về nhóm..."
                        />
                    </div>
                </div>
                
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Hủy bỏ
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px] bg-primary hover:bg-primary/90">
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" /> Lưu điểm
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};