import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { assignTopicToGroup, getAssignableTopics } from '@/api/adminGroupService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Search, Check } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function AssignTopicDialog({ isOpen, setIsOpen, group, onSuccess, planId }) {
    // Khởi tạo state là mảng rỗng để an toàn
    const [topics, setTopics] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    const [openCombobox, setOpenCombobox] = useState(false);

    // Reset state khi mở dialog
    useEffect(() => {
        if (isOpen && planId) {
            setIsFetching(true);
            setSelectedTopicId(null);
            setTopics([]); // Reset topics trước khi fetch

            getAssignableTopics(planId)
                .then(data => {
                    // Đảm bảo data luôn là mảng
                    setTopics(Array.isArray(data) ? data : []);
                })
                .catch(() => toast.error("Lỗi khi tải danh sách đề tài."))
                .finally(() => setIsFetching(false));
        }
    }, [isOpen, planId]);

    const handleSubmit = async () => {
        if (!selectedTopicId) {
            toast.warning("Vui lòng chọn một đề tài.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await assignTopicToGroup(group.ID_NHOM, selectedTopicId);
            toast.success(res.message);
            onSuccess();
            setIsOpen(false);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Gán đề tài thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    // [SỬA LỖI TẠI ĐÂY]: Thêm optional chaining (?.) hoặc check mảng
    const selectedTopic = Array.isArray(topics) 
        ? topics.find(t => t.ID_DETAI === selectedTopicId) 
        : null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md overflow-visible">
                <DialogHeader>
                    <DialogTitle>Gán Đề tài cho nhóm</DialogTitle>
                    <DialogDescription>
                        Chọn đề tài cho nhóm <strong>{group?.TEN_NHOM}</strong>. 
                        <br/>Tên nhóm sẽ được cập nhật theo tên đề tài.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCombobox}
                                className="w-full justify-between text-left h-auto min-h-[2.5rem] whitespace-normal"
                                disabled={isFetching}
                            >
                                {selectedTopic 
                                    ? <span className="line-clamp-1">{selectedTopic.TEN_DETAI}</span>
                                    : (isFetching ? "Đang tải đề tài..." : "Chọn đề tài...")}
                                <BookOpen className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Tìm kiếm tên đề tài..." />
                                <CommandList>
                                    <CommandEmpty>Không tìm thấy đề tài.</CommandEmpty>
                                    <CommandGroup>
                                        {/* Thêm kiểm tra mảng trước khi map */}
                                        {Array.isArray(topics) && topics.map((topic) => (
                                            <CommandItem
                                                key={topic.ID_DETAI}
                                                value={topic.TEN_DETAI}
                                                onSelect={() => {
                                                    setSelectedTopicId(topic.ID_DETAI);
                                                    setOpenCombobox(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedTopicId === topic.ID_DETAI ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{topic.TEN_DETAI}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        GV: {topic.ten_giang_vien || topic.nguoi_dexuat?.nguoidung?.HODEM_VA_TEN || 'N/A'}
                                                    </span>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    {selectedTopic && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-md text-sm space-y-2 border">
                            <p><strong>GVHD dự kiến:</strong> {selectedTopic.ten_giang_vien}</p>
                            <p className="text-muted-foreground line-clamp-3"><strong>Mô tả:</strong> {selectedTopic.MOTA}</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || !selectedTopicId}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Xác nhận Gán
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}