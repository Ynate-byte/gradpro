import React, { useMemo } from 'react';
import * as Diff from 'diff';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileDiff, ArrowRightLeft, MousePointerClick } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

// Map tên trường DB sang Tiếng Việt
const FIELD_MAP = {
    'TEN_DETAI': 'Tên đề tài',
    'MOTA': 'Mô tả chi tiết',
    'YEUCAU': 'Yêu cầu kiến thức/kỹ năng',
    'MUCTIEU': 'Mục tiêu đề tài',
    'KETQUA_MONGDOI': 'Kết quả mong đợi',
    'SO_NHOM_TOIDA': 'Số lượng nhóm tối đa',
    'TRANGTHAI': 'Trạng thái',
    'ID_KHOA_BOMON': 'Bộ môn (ID)',
    'LA_TAISUDUNG': 'Là đề tài tái sử dụng'
};

const DiffText = ({ text, diffs, type }) => {
    if (!text) return <span className="text-muted-foreground italic text-xs">(Trống)</span>;

    return (
        <span className="whitespace-pre-wrap break-words text-sm leading-relaxed font-mono">
            {diffs.map((part, index) => {
                if (type === 'old') {
                    if (part.added) return null;
                    return (
                        <span 
                            key={index} 
                            className={cn(part.removed ? "bg-red-200 text-red-900 line-through decoration-red-500/50" : "")}
                        >
                            {part.value}
                        </span>
                    );
                }
                if (type === 'new') {
                    if (part.removed) return null;
                    return (
                        <span 
                            key={index} 
                            className={cn(part.added ? "bg-green-200 text-green-900 font-semibold" : "")}
                        >
                            {part.value}
                        </span>
                    );
                }
                return null;
            })}
        </span>
    );
};

const TopicHistoryDiffPanel = ({ historyItem }) => {
    
    const changes = useMemo(() => {
        if (!historyItem || !historyItem.CHI_TIET) return [];
        
        let details = historyItem.CHI_TIET;
        if (typeof details === 'string') {
            try { details = JSON.parse(details); } catch (e) { return []; }
        }

        if (details.changes && Array.isArray(details.changes)) {
            return details.changes.map(change => {
                const oldVal = String(change.old || '');
                const newVal = String(change.new || '');
                const diffResult = Diff.diffWords(oldVal, newVal);
                
                return {
                    field: change.field,
                    label: FIELD_MAP[change.field] || change.field,
                    old: oldVal,
                    new: newVal,
                    diffs: diffResult
                };
            });
        }
        return [];
    }, [historyItem]);

    if (!historyItem) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/10 rounded-xl border-2 border-dashed m-4">
                <MousePointerClick className="w-12 h-12 mb-4 opacity-20" />
                <h3 className="font-semibold text-lg">Chưa chọn hoạt động</h3>
                <p className="text-sm max-w-xs mt-2">Chọn một mục lịch sử bên trái để xem chi tiết các thay đổi (nếu có).</p>
            </div>
        );
    }

    if (changes.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/10 rounded-xl border border-muted m-4">
                <ArrowRightLeft className="w-12 h-12 mb-4 opacity-20" />
                <h3 className="font-semibold text-lg">Không có chi tiết so sánh</h3>
                <p className="text-sm max-w-xs mt-2">Hành động này không ghi nhận sự thay đổi cụ thể về dữ liệu.</p>
                <div className="mt-6 text-xs bg-background p-3 rounded border text-left w-full max-w-sm">
                    <p><strong>Loại:</strong> {historyItem.LOAI_HANH_DONG}</p>
                    <p><strong>Tiêu đề:</strong> {historyItem.TIEU_DE}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background/50">
            {/* Header Panel */}
            <div className="px-6 py-4 border-b bg-background shrink-0">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <FileDiff className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            Chi tiết thay đổi
                            <Badge variant="outline" className="font-normal text-xs">
                                {changes.length} trường
                            </Badge>
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>Bởi: <strong>{historyItem.nguoidung?.HODEM_VA_TEN || 'Hệ thống'}</strong></span>
                            <span>•</span>
                            <span>{format(new Date(historyItem.NGAY_TAO), "HH:mm - dd/MM/yyyy", { locale: vi })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Scroll */}
            <ScrollArea className="flex-1">
                <div className="p-6 space-y-8">
                    {changes.map((change, index) => (
                        <div key={index} className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="flex items-center gap-2 px-1">
                                <Badge variant="secondary" className="rounded-md px-2 py-1 font-bold text-xs uppercase tracking-wider text-primary bg-primary/10">
                                    {change.label}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 border rounded-xl overflow-hidden shadow-sm bg-background">
                                {/* CỘT TRÁI: DỮ LIỆU CŨ */}
                                <div className="flex flex-col border-b md:border-b-0 md:border-r bg-red-50/10 dark:bg-red-950/10">
                                    <div className="px-3 py-2 bg-red-100/30 dark:bg-red-900/20 border-b border-red-200/30 flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                            TRƯỚC
                                        </span>
                                    </div>
                                    <div className="p-3 min-h-[80px] bg-red-50/5 dark:bg-transparent">
                                        <DiffText text={change.old} diffs={change.diffs} type="old" />
                                    </div>
                                </div>

                                {/* CỘT PHẢI: DỮ LIỆU MỚI */}
                                <div className="flex flex-col bg-green-50/10 dark:bg-green-950/10">
                                    <div className="px-3 py-2 bg-green-100/30 dark:bg-green-900/20 border-b border-green-200/30 flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                            SAU
                                        </span>
                                    </div>
                                    <div className="p-3 min-h-[80px] bg-green-50/5 dark:bg-transparent">
                                        <DiffText text={change.new} diffs={change.diffs} type="new" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

export default TopicHistoryDiffPanel;