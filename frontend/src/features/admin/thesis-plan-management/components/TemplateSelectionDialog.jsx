import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getThesisPlanTemplates } from '@/api/thesisPlanService';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FilePlus, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function TemplateSelectionDialog({ isOpen, setIsOpen }) {
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getThesisPlanTemplates()
                .then(setTemplates)
                .catch(() => toast.error("Không thể tải danh sách bản mẫu."))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen]);

    const handleSelectTemplate = (template) => {
        setIsOpen(false);
        // Truyền ID template qua state của navigate để trang form có thể lấy được
        navigate('/admin/thesis-plans/create', { state: { templateId: template.ID_MAU } });
    };

    const handleCreateNew = () => {
        setIsOpen(false);
        navigate('/admin/thesis-plans/create');
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Chọn cách tạo Kế hoạch mới</DialogTitle>
                    <DialogDescription>Bạn có thể tạo mới từ đầu hoặc sử dụng một bản mẫu có sẵn để tiết kiệm thời gian.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Button onClick={handleCreateNew} className="w-full justify-start h-auto p-4 text-left" variant="outline">
                        <FilePlus className="mr-4 h-6 w-6 text-primary shrink-0" />
                        <div>
                            <p className="font-semibold">Tạo mới từ đầu</p>
                            <p className="text-sm text-muted-foreground">Bắt đầu với một biểu mẫu trống và tự điền tất cả thông tin.</p>
                        </div>
                    </Button>

                    <h4 className="text-sm font-medium text-muted-foreground pt-2">Hoặc sử dụng một bản mẫu có sẵn:</h4>

                    {isLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 -mr-2">
                            {templates.length > 0 ? templates.map(template => (
                                <Button
                                    key={template.ID_MAU}
                                    onClick={() => handleSelectTemplate(template)}
                                    className="w-full justify-start h-auto p-3 text-left"
                                    variant="ghost"
                                >
                                    <Copy className="mr-3 h-5 w-5 text-muted-foreground shrink-0" />
                                    {template.TEN_MAU}
                                </Button>
                            )) : (
                                <p className="text-sm text-center text-muted-foreground py-4">Chưa có bản mẫu nào được tạo.</p>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
