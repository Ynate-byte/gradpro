import React, { useState } from 'react'; // Bỏ useState
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyGroup } from '@/api/groupService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, LayoutDashboard, ArrowLeft } from 'lucide-react'; // Bỏ Plus
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// CSS cho Kanban
import '../components/kanban/Kanban.css';

export default function KanbanPage() {
    const { nhomId } = useParams();
    const navigate = useNavigate();

    // 1. Lấy dữ liệu tên nhóm (Giữ nguyên)
    const { data: groupData, isLoading: isLoadingGroup } = useQuery({
        queryKey: ['myGroupDetails_kanban', Number(nhomId)],
        // [SỬA] Sửa lại API call cho đúng
        queryFn: () => getMyGroup({ plan_id: null, force_group_id: Number(nhomId) }),
        enabled: !!nhomId,
        select: (data) => data.group_data,
        onError: () => {
             // Thêm toast error
            toast.error("Không thể tải thông tin nhóm.");
        }
    });

    // 2. Logic tạo task đã được chuyển vào KanbanBoard
    
    return (
        <div className="p-4 md:p-8 space-y-6">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại Nhóm của tôi
            </Button>

            <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <LayoutDashboard className="h-6 w-6" />
                            {/* [SỬA] Hiển thị loading... */}
                            Bảng Công việc - {isLoadingGroup ? "Đang tải..." : (groupData?.TEN_NHOM || `Nhóm ${nhomId}`)}
                        </CardTitle>
                         <CardDescription>
                            Kéo và thả các công việc giữa các cột để cập nhật tiến độ.
                        </CardDescription>
                    </div>
                    {/* ===== [GỠ BỎ] Nút "Tạo Công việc" ở đây ===== */}
                </CardHeader>
                <CardContent>
                    <KanbanBoard nhomId={Number(nhomId)} />
                </CardContent>
            </Card>

            {/* Dialog đã được chuyển vào bên trong KanbanBoard */}
        </div>
    );
}