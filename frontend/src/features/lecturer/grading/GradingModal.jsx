import React, { useState, useEffect, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch"; // Component Switch
import { Loader2, Save, PenSquare, User, Calculator } from "lucide-react";
import { toast } from "sonner";
import {
    submitHuongDan,
    submitPhanBien,
    submitHoiDong,
} from "@/api/chamDiemService";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const GradingModal = ({
    isOpen,
    onClose,
    onSaveSuccess,
    group,
    role,
}) => {
    // Helper xác định key dữ liệu từ API
    const getInitialData = () => {
        if (!group) return { score: "", details: null, comment: "" };
        
        // Mapping key theo role (backend trả về)
        const scoreKey = `diem_${role}_hientai`;
        const detailKey = `diem_${role}_chitiet`; // Backend cần trả về key này (JSON)
        // const commentKey = `nhanxet_${role}`; // Nếu backend có trả về

        return {
            score: group[scoreKey] ?? "",
            details: group[detailKey] ?? null,
            comment: "" // Hiện tại API chưa trả về comment trong list, để trống
        };
    };

    const [diemChung, setDiemChung] = useState("");
    const [diemRieng, setDiemRieng] = useState({}); // Object: { [studentId]: score }
    const [nhanxet, setNhanxet] = useState("");
    const [isIndividual, setIsIndividual] = useState(false); // Chế độ chấm riêng
    const [isSaving, setIsSaving] = useState(false);

    // Reset form khi mở modal
    useEffect(() => {
        if (isOpen && group) {
            const { score, details, comment } = getInitialData();
            
            setNhanxet(comment);

            // Kiểm tra xem trước đó đã chấm riêng hay chưa
            if (details && Array.isArray(details) && details.length > 0) {
                setIsIndividual(true);
                const scoresMap = {};
                details.forEach(item => {
                    scoresMap[item.student_id] = item.score;
                });
                setDiemRieng(scoresMap);
                setDiemChung(score); // Vẫn giữ điểm TB để tham khảo
            } else {
                setIsIndividual(false);
                setDiemChung(score);
                // Khởi tạo điểm riêng bằng điểm chung (để tiện nếu user bật switch)
                const initScores = {};
                group.thanhviens?.forEach(tv => {
                    initScores[tv.ID_NGUOIDUNG] = score;
                });
                setDiemRieng(initScores);
            }
        }
    }, [isOpen, group, role]);

    // Tự động tính điểm trung bình khi nhập điểm riêng
    const calculatedAverage = useMemo(() => {
        if (!group?.thanhviens?.length) return 0;
        const scores = Object.values(diemRieng).map(s => parseFloat(s)).filter(s => !isNaN(s));
        if (scores.length === 0) return 0;
        const sum = scores.reduce((a, b) => a + b, 0);
        return (sum / scores.length).toFixed(2);
    }, [diemRieng, group]);

    // Xử lý thay đổi điểm chung (đồng bộ xuống điểm riêng)
    const handleDiemChungChange = (val) => {
        setDiemChung(val);
        const newScores = {};
        group.thanhviens?.forEach(tv => {
            newScores[tv.ID_NGUOIDUNG] = val;
        });
        setDiemRieng(newScores);
    };

    // Xử lý thay đổi điểm riêng
    const handleDiemRiengChange = (studentId, val) => {
        setDiemRieng(prev => ({
            ...prev,
            [studentId]: val
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);

        // Mapping API function
        const submitFunction = {
            "huongdan": submitHuongDan,
            "phanbien": submitPhanBien,
            "hoidong": submitHoiDong
        }[role];

        if (!submitFunction) {
            toast.error("Lỗi xác định vai trò chấm điểm.");
            setIsSaving(false);
            return;
        }

        try {
            let payload = {
                NHANXET: nhanxet,
                IS_INDIVIDUAL: isIndividual
            };

            if (!isIndividual) {
                // --- CHẾ ĐỘ CHẤM CHUNG ---
                const val = parseFloat(diemChung);
                if (isNaN(val) || val < 0 || val > 10) {
                    toast.error("Điểm chung không hợp lệ (0-10).");
                    setIsSaving(false); return;
                }
                payload.DIEM = val;
                payload.DIEM_CHI_TIET = null;
            } else {
                // --- CHẾ ĐỘ CHẤM RIÊNG ---
                const details = [];
                let total = 0;
                
                // Duyệt qua tất cả thành viên để đảm bảo ai cũng có điểm
                for (const tv of group.thanhviens) {
                    const sVal = parseFloat(diemRieng[tv.ID_NGUOIDUNG]);
                    if (isNaN(sVal) || sVal < 0 || sVal > 10) {
                        toast.error(`Điểm của sinh viên ${tv.nguoidung?.HODEM_VA_TEN} không hợp lệ.`);
                        setIsSaving(false); return;
                    }
                    details.push({ student_id: tv.ID_NGUOIDUNG, score: sVal });
                    total += sVal;
                }
                
                payload.DIEM_CHI_TIET = details;
                payload.DIEM = (total / details.length).toFixed(2); // Gửi điểm TB lên để lưu vào cột chính
            }

            await submitFunction(group.ID_NHOM, payload);
            toast.success("Đã lưu kết quả chấm điểm!");
            onSaveSuccess();
        } catch (error) {
            console.error("Lỗi lưu điểm:", error);
            toast.error(error.response?.data?.error || "Có lỗi xảy ra khi lưu điểm.");
        } finally {
            setIsSaving(false);
        }
    };

    const getRoleLabel = () => {
        if (role === "huongdan") return "Giảng viên Hướng Dẫn";
        if (role === "phanbien") return "Giảng viên Phản Biện";
        return "Thành viên Hội Đồng";
    };

    if (!group) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !isSaving && onClose()}>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-primary">
                        <PenSquare className="w-5 h-5" /> Chấm điểm - {getRoleLabel()}
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        <div className="bg-muted/40 p-3 rounded-lg border text-sm grid grid-cols-1 gap-1">
                            <p><span className="font-semibold text-foreground">Nhóm:</span> {group.TEN_NHOM}</p>
                            <p className="truncate"><span className="font-semibold text-foreground">Đề tài:</span> {group.detai?.TEN_DETAI || group.phancong_detai_nhom?.detai?.TEN_DETAI || "---"}</p>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2 space-y-6">
                    {/* 1. SWITCH CHUYỂN CHẾ ĐỘ */}
                    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="space-y-0.5">
                            <Label className="text-base font-semibold text-blue-900 dark:text-blue-100">Chấm điểm chi tiết từng sinh viên?</Label>
                            <p className="text-xs text-muted-foreground">Bật nếu các thành viên trong nhóm có mức độ đóng góp khác nhau.</p>
                        </div>
                        <Switch 
                            checked={isIndividual} 
                            onCheckedChange={setIsIndividual} 
                            className="data-[state=checked]:bg-blue-600"
                        />
                    </div>

                    {/* 2. KHU VỰC NHẬP ĐIỂM */}
                    <div className="space-y-4">
                        {!isIndividual ? (
                            // --- FORM CHẤM CHUNG ---
                            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <Label className="font-semibold">Điểm chung cho cả nhóm <span className="text-red-500">*</span></Label>
                                <div className="flex items-center gap-3">
                                    <Input 
                                        type="number" 
                                        step="0.1" 
                                        min="0" max="10"
                                        value={diemChung}
                                        onChange={(e) => handleDiemChungChange(e.target.value)}
                                        className="h-12 text-xl font-bold w-32 text-center border-primary/50 focus-visible:ring-primary"
                                        placeholder="0-10"
                                        autoFocus
                                    />
                                    <span className="text-sm text-muted-foreground">/ 10 điểm</span>
                                </div>
                            </div>
                        ) : (
                            // --- FORM CHẤM RIÊNG (TABLE) ---
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between">
                                    <Label className="font-semibold">Danh sách sinh viên</Label>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        <Calculator className="w-3 h-3 mr-1"/> TB: {calculatedAverage}
                                    </Badge>
                                </div>
                                <div className="border rounded-md overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>Sinh viên</TableHead>
                                                <TableHead className="w-[120px] text-right">Điểm số</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {group.thanhviens?.map((tv) => (
                                                <TableRow key={tv.ID_NGUOIDUNG}>
                                                    <TableCell>
                                                        <div className="font-medium">{tv.nguoidung?.HODEM_VA_TEN}</div>
                                                        <div className="text-xs text-muted-foreground">{tv.nguoidung?.MA_DINHDANH}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Input 
                                                            type="number" 
                                                            step="0.1" 
                                                            min="0" max="10"
                                                            value={diemRieng[tv.ID_NGUOIDUNG] ?? ""}
                                                            onChange={(e) => handleDiemRiengChange(tv.ID_NGUOIDUNG, e.target.value)}
                                                            className="h-9 w-20 text-center font-bold ml-auto"
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {/* 3. NHẬN XÉT */}
                        <div className="space-y-2">
                            <Label htmlFor="nhanxet" className="font-semibold">Nhận xét / Đánh giá</Label>
                            <Textarea
                                id="nhanxet"
                                value={nhanxet}
                                onChange={(e) => setNhanxet(e.target.value)}
                                placeholder="Nhập nhận xét về chất lượng đồ án, thái độ làm việc..."
                                className="min-h-[100px] resize-none"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Hủy bỏ</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px] bg-blue-600 hover:bg-blue-700">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Lưu kết quả
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};