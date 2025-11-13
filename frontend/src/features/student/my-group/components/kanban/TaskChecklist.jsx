import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { cn } from '@/lib/utils'; // <--- [ĐÃ THÊM] SỬA LỖI TẠI ĐÂY

export function TaskChecklist({ items = [], onToggle, onAdd, onDelete, isUpdating }) {
    const [newItemContent, setNewItemContent] = useState('');

    const completedCount = items.filter(item => item.DA_HOANTHANH).length;
    const totalCount = items.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleAddItem = () => {
        if (newItemContent.trim()) {
            onAdd(newItemContent.trim());
            setNewItemContent('');
        }
    };

    return (
        <div className="space-y-3">
            <h4 className="text-sm font-semibold">Checklist</h4>
            {totalCount > 0 && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                    <Progress value={progress} className="h-2" />
                </div>
            )}
            
            {/* Danh sách các mục */}
            <div className="space-y-2">
                {items.map(item => (
                    <div key={item.ID_MUCON} className="flex items-center gap-2 group">
                        <Checkbox
                            id={`check-${item.ID_MUCON}`}
                            checked={item.DA_HOANTHANH}
                            onCheckedChange={(checked) => onToggle(item.ID_MUCON, checked)}
                            disabled={isUpdating}
                        />
                        <label
                            htmlFor={`check-${item.ID_MUCON}`}
                            className={cn( // <-- Dòng này đã gây lỗi
                                "flex-1 text-sm cursor-pointer",
                                item.DA_HOANTHANH && "line-through text-muted-foreground"
                            )}
                        >
                            {item.NOIDUNG_MUC}
                        </label>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => onDelete(item.ID_MUCON)}
                            disabled={isUpdating}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
            </div>

            {/* Form thêm mục mới */}
            <div className="flex items-center gap-2">
                <Input
                    placeholder="Thêm mục mới..."
                    value={newItemContent}
                    onChange={(e) => setNewItemContent(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                    disabled={isUpdating}
                />
                <Button size="sm" onClick={handleAddItem} disabled={isUpdating || !newItemContent.trim()}>
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
}