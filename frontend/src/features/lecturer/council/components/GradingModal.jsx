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
import { Loader2, Save, PenSquare, Calculator, User, FileText } from "lucide-react";
import { toast } from "sonner";
import { submitHoiDong } from "@/api/chamDiemService";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const GradingModal = ({ isOpen, onClose, onSaveSuccess, group, currentScore, currentComment }) => { // [UPDATE] Nhận thêm props currentScore, currentComment
    const { user } = useAuth();

    // State
    const [diemChung, setDiemChung] = useState("");
    const [diemRieng, setDiemRieng] = useState({});
    const [nhanxet, setNhanxet] = useState("");
    const [isIndividual, setIsIndividual] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Load data
    useEffect(() => {
        if (isOpen && group && user?.giangvien) {
            // Sử dụng props currentScore và currentComment nếu được truyền vào
            // Nếu không có props (như trường hợp từ danh sách nhóm ngoài), tự tìm trong group.diem_hoi_dong
            let score = currentScore;
            let comment = currentComment;
            let details = null;

            if (score === undefined) {
                const myId = user.giangvien.ID_GIANGVIEN;
                const myScoreRecord = group.diem_hoi_dong?.find(d => d.ID_GIANGVIEN === myId);
                score = myScoreRecord ? myScoreRecord.DIEM : "";
                comment = myScoreRecord ? myScoreRecord.NHANXET : "";
                details = myScoreRecord ? myScoreRecord.DIEM_CHI_TIET : null;
            } else {
                 // Nếu truyền từ ngoài vào, cần logic lấy chi tiết nếu có (hiện tại CouncilDetailDialog chưa truyền details, nên mặc định null hoặc cần bổ sung)
                 // Tạm thời logic này ổn cho việc chấm điểm mới hoặc sửa điểm chung
            }

            if (typeof details === 'string') {
                try { details = JSON.parse(details); } catch (e) { }
            }

            setNhanxet(comment || "");

            if (details && Array.isArray(details) && details.length > 0) {
                setIsIndividual(true);
                const scoresMap = {};
                details.forEach(item => {
                    scoresMap[item.student_id] = item.score;
                });
                setDiemRieng(scoresMap);
            } else {
                setIsIndividual(false);
                setDiemChung(score !== null ? score : "");
                const initScores = {};
                group.thanhviens?.forEach(tv => {
                    initScores[tv.ID_NGUOIDUNG] = score !== null ? score : "";
                });
                setDiemRieng(initScores);
            }
        }
    }, [isOpen, group, user, currentScore, currentComment]);

    const calculatedAverage = useMemo(() => {
        if (!group?.thanhviens?.length) return 0;
        const scores = group.thanhviens.map(tv => {
            const s = parseFloat(diemRieng[tv.ID_NGUOIDUNG]);
            return isNaN(s) ? 0 : s;
        });
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
        if (parseFloat(val) > 10) return;
        setDiemRieng(prev => ({ ...prev, [studentId]: val }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let payload = {
                NHANXET: nhanxet,
                IS_INDIVIDUAL: isIndividual
            };

            if (!isIndividual) {
                const val = parseFloat(diemChung);
                if (isNaN(val) || val < 0 || val > 10) {
                    toast.error("Điểm chung không hợp lệ (0-10).");
                    setIsSaving(false); return;
                }
                payload.DIEM = val;
                payload.DIEM_CHI_TIET = null;
            } else {
                const details = [];
                let total = 0;
                for (const tv of group.thanhviens) {
                    const sVal = parseFloat(diemRieng[tv.ID_NGUOIDUNG]);
                    if (isNaN(sVal) || sVal < 0 || sVal > 10) {
                        toast.error(`Điểm của sinh viên ${tv.nguoidung?.HODEM_VA_TEN} chưa hợp lệ.`);
                        setIsSaving(false); return;
                    }
                    details.push({ student_id: tv.ID_NGUOIDUNG, score: sVal });
                    total += sVal;
                }
                payload.DIEM_CHI_TIET = details;
                payload.DIEM = (total / details.length).toFixed(2);
            }

            await submitHoiDong(group.ID_NHOM, payload);
            toast.success("Đã lưu điểm thành công!");
            
            if (onSaveSuccess) {
                onSaveSuccess(); 
            }
            // Tự động đóng modal sau khi lưu thành công
            onClose();

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
            <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden bg-background flex flex-col max-h-[90vh] h-full">
                
                {/* HEADER */}
                <DialogHeader className="px-6 py-4 border-b bg-muted/10 shrink-0 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <DialogTitle className="flex items-center gap-2 text-primary text-xl">
                            <PenSquare className="w-5 h-5" /> Chấm điểm Hội Đồng
                        </DialogTitle>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-muted-foreground">Nhóm:</span>
                            <Badge variant="secondary" className="font-bold text-sm px-2">{group.TEN_NHOM}</Badge>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-background border px-3 py-1.5 rounded-full shadow-sm">
                        <Label htmlFor="mode-switch" className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                            {isIndividual ? "Chấm chi tiết" : "Chấm chung"}
                        </Label>
                        <Switch
                            id="mode-switch"
                            checked={isIndividual}
                            onCheckedChange={setIsIndividual}
                            className="data-[state=checked]:bg-blue-600 scale-90"
                        />
                    </div>
                </DialogHeader>

                {/* BODY */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-0">
                    
                    {/* CỘT TRÁI (7/12) */}
                    <div className="md:col-span-7 p-0 border-r flex flex-col h-full overflow-hidden bg-gray-50/50 dark:bg-gray-900/20 relative">
                        
                        {!isIndividual ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-6 p-6">
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Điểm tổng kết nhóm</h3>
                                    <p className="text-sm text-muted-foreground px-8">
                                        Điểm số này sẽ được áp dụng cho tất cả thành viên trong nhóm.
                                    </p>
                                </div>
                                
                                <div className="relative w-48 group">
                                    <Input
                                        type="number"
                                        step="0.1"
                                        min="0" max="10"
                                        value={diemChung}
                                        onChange={(e) => handleDiemChungChange(e.target.value)}
                                        className="h-24 text-5xl font-bold text-center border-2 border-blue-200 focus-visible:ring-blue-500 rounded-2xl shadow-sm bg-white dark:bg-card transition-all group-hover:border-blue-400"
                                        placeholder="0.0"
                                        autoFocus
                                    />
                                    <span className="absolute top-3 right-4 text-gray-400 text-sm font-medium">/10</span>
                                </div>

                                <div className="flex flex-wrap justify-center gap-2 w-full px-4">
                                    {group.thanhviens?.map((tv) => (
                                        <Badge key={tv.ID_NGUOIDUNG} variant="outline" className="bg-background py-1 px-2">
                                            <User className="w-3 h-3 mr-1.5 opacity-70" />
                                            {tv.nguoidung?.HODEM_VA_TEN}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between p-4 border-b bg-background/50 shrink-0">
                                    <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                        Danh sách sinh viên ({group.thanhviens?.length})
                                    </Label>
                                    <Badge variant="secondary" className="h-6 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 border-green-200">
                                        <Calculator className="w-3 h-3 mr-1.5"/> 
                                        TB: <span className="font-bold ml-1">{calculatedAverage}</span>
                                    </Badge>
                                </div>
                                
                                <div className="flex-1 overflow-hidden relative">
                                    <ScrollArea className="h-full w-full">
                                        <div className="divide-y">
                                            {group.thanhviens?.map((tv) => (
                                                <div key={tv.ID_NGUOIDUNG} className="grid grid-cols-12 items-center py-3 px-4 hover:bg-muted/30 transition-colors group">
                                                    <div className="col-span-8 pr-2">
                                                        <div className="font-medium text-sm truncate text-foreground group-hover:text-primary transition-colors" title={tv.nguoidung?.HODEM_VA_TEN}>
                                                            {tv.nguoidung?.HODEM_VA_TEN}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                                            {tv.nguoidung?.MA_DINHDANH}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-4 flex justify-end">
                                                        <Input 
                                                            type="number" 
                                                            step="0.1" 
                                                            min="0" max="10"
                                                            value={diemRieng[tv.ID_NGUOIDUNG] ?? ""}
                                                            onChange={(e) => handleDiemRiengChange(tv.ID_NGUOIDUNG, e.target.value)}
                                                            className="h-9 w-20 text-center font-bold text-base border-blue-100 focus-visible:ring-blue-500"
                                                            placeholder="0.0"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CỘT PHẢI (5/12): Nhận xét */}
                    <div className="md:col-span-5 p-6 flex flex-col h-full bg-white dark:bg-background border-t md:border-t-0">
                        <Label htmlFor="nhanxet" className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Nhận xét & Đánh giá
                        </Label>
                        
                        <div className="flex-1 relative min-h-[150px]">
                            <Textarea
                                id="nhanxet"
                                value={nhanxet}
                                onChange={(e) => setNhanxet(e.target.value)}
                                className="w-full h-full resize-none text-sm leading-relaxed p-4 border-gray-200 focus-visible:ring-blue-500 bg-gray-50/50 focus:bg-background transition-colors rounded-xl"
                                placeholder="Nhập nhận xét chi tiết về phần trình bày, ưu điểm, nhược điểm của nhóm..."
                            />
                             <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded pointer-events-none border">
                                {nhanxet.length} ký tự
                            </div>
                        </div>
                    </div>

                </div>

                {/* FOOTER */}
                <DialogFooter className="p-4 border-t bg-background shrink-0 flex justify-between items-center">
                    <Button variant="outline" onClick={onClose} disabled={isSaving} className="text-muted-foreground hover:text-foreground border-gray-300">
                        Đóng
                    </Button>
                    
                    <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Lưu kết quả
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
};

export default GradingModal;