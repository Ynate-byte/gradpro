import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
import { Switch } from "@/components/ui/switch"; 
import { Loader2, Save, PenSquare, Calculator } from "lucide-react";
import { toast } from "sonner";
import { submitHoiDong } from "@/api/chamDiemService";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const GradingModal = ({ isOpen, onClose, onSaveSuccess, group }) => {
    const { user } = useAuth(); // Lấy user để biết Giảng viên nào đang chấm
    
    // State
    const [diemChung, setDiemChung] = useState("");
    const [diemRieng, setDiemRieng] = useState({}); // { [studentId]: score }
    const [nhanxet, setNhanxet] = useState("");
    const [isIndividual, setIsIndividual] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Reset và load dữ liệu cũ khi mở modal
    useEffect(() => {
        if (isOpen && group && user?.giangvien) {
            const myId = user.giangvien.ID_GIANGVIEN;
            
            // Tìm điểm của chính giảng viên này trong mảng diem_hoi_dong của nhóm
            // Lưu ý: Backend phải trả về relationship 'diemHoiDong' (đã sửa ở controller trên)
            const myScoreRecord = group.diem_hoi_dong?.find(d => d.ID_GIANGVIEN === myId);

            const score = myScoreRecord ? myScoreRecord.DIEM : "";
            const comment = myScoreRecord ? myScoreRecord.NHANXET : "";
            // Parse chi tiết nếu có (Backend trả về mảng hoặc JSON string)
            let details = myScoreRecord ? myScoreRecord.DIEM_CHI_TIET : null;
            
            // Handle trường hợp backend trả về string JSON
            if (typeof details === 'string') {
                try { details = JSON.parse(details); } catch (e) {}
            }

            setNhanxet(comment || "");

            if (details && Array.isArray(details) && details.length > 0) {
                setIsIndividual(true);
                const scoresMap = {};
                details.forEach(item => {
                    scoresMap[item.student_id] = item.score;
                });
                setDiemRieng(scoresMap);
                setDiemChung(score);
            } else {
                setIsIndividual(false);
                setDiemChung(score);
                // Khởi tạo điểm riêng bằng điểm chung để tiện thao tác
                const initScores = {};
                group.thanhviens?.forEach(tv => {
                    initScores[tv.ID_NGUOIDUNG] = score;
                });
                setDiemRieng(initScores);
            }
        }
    }, [isOpen, group, user]);

    // Tự động tính trung bình khi chấm riêng
    const calculatedAverage = useMemo(() => {
        if (!group?.thanhviens?.length) return 0;
        const scores = Object.values(diemRieng).map(s => parseFloat(s)).filter(s => !isNaN(s));
        if (scores.length === 0) return 0;
        const sum = scores.reduce((a, b) => a + b, 0);
        return (sum / scores.length).toFixed(2);
    }, [diemRieng, group]);

    const handleDiemChungChange = (val) => {
        setDiemChung(val);
        const newScores = {};
        group.thanhviens?.forEach(tv => {
            newScores[tv.ID_NGUOIDUNG] = val;
        });
        setDiemRieng(newScores);
    };

    const handleDiemRiengChange = (studentId, val) => {
        setDiemRieng(prev => ({
            ...prev,
            [studentId]: val
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let payload = {
                NHANXET: nhanxet,
                IS_INDIVIDUAL: isIndividual
            };

            if (!isIndividual) {
                // CHẤM CHUNG
                const val = parseFloat(diemChung);
                if (isNaN(val) || val < 0 || val > 10) {
                    toast.error("Điểm chung không hợp lệ (0-10).");
                    setIsSaving(false); return;
                }
                payload.DIEM = val;
                payload.DIEM_CHI_TIET = null;
            } else {
                // CHẤM RIÊNG
                const details = [];
                let total = 0;
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
                payload.DIEM = (total / details.length).toFixed(2);
            }

            await submitHoiDong(group.ID_NHOM, payload);
            
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
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-primary">
                        <PenSquare className="w-5 h-5" /> Chấm điểm Hội Đồng
                    </DialogTitle>
                    <DialogDescription className="pt-1">
                        Nhóm: <span className="font-bold text-foreground">{group.TEN_NHOM}</span>
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-5 py-2">
                    {/* Switch Chế độ */}
                    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                Chấm điểm chi tiết từng sinh viên?
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Bật nếu các thành viên trong nhóm có mức độ đóng góp khác nhau.
                            </p>
                        </div>
                        <Switch 
                            checked={isIndividual} 
                            onCheckedChange={setIsIndividual} 
                            className="data-[state=checked]:bg-blue-600"
                        />
                    </div>

                    {/* Khu vực nhập điểm */}
                    <div className="space-y-4">
                        {!isIndividual ? (
                            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
                                <Label className="font-semibold">Điểm số <span className="text-red-500">*</span></Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        type="number"
                                        step="0.1"
                                        min="0" max="10"
                                        value={diemChung}
                                        onChange={(e) => handleDiemChungChange(e.target.value)}
                                        className="h-11 text-lg font-bold w-full pl-4"
                                        placeholder="0 - 10"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
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
                                                <TableHead className="w-[100px] text-right">Điểm</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {group.thanhviens && group.thanhviens.length > 0 ? (
                                                group.thanhviens.map((tv) => (
                                                    <TableRow key={tv.ID_NGUOIDUNG}>
                                                        <TableCell className="py-2">
                                                            <div className="font-medium text-sm">{tv.nguoidung?.HODEM_VA_TEN}</div>
                                                            <div className="text-[10px] text-muted-foreground">{tv.nguoidung?.MA_DINHDANH}</div>
                                                        </TableCell>
                                                        <TableCell className="text-right py-2">
                                                            <Input 
                                                                type="number" 
                                                                step="0.1" 
                                                                min="0" max="10"
                                                                value={diemRieng[tv.ID_NGUOIDUNG] ?? ""}
                                                                onChange={(e) => handleDiemRiengChange(tv.ID_NGUOIDUNG, e.target.value)}
                                                                className="h-8 w-20 text-center font-bold ml-auto text-sm"
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={2} className="text-center text-muted-foreground text-sm py-4">
                                                        Không tìm thấy danh sách thành viên.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="nhanxet" className="font-semibold">Nhận xét</Label>
                            <Textarea
                                id="nhanxet"
                                value={nhanxet}
                                onChange={(e) => setNhanxet(e.target.value)}
                                className="min-h-[100px] resize-none"
                                placeholder="Nhập nhận xét (tùy chọn)..."
                            />
                        </div>
                    </div>
                </div>
                
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Hủy bỏ</Button>
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