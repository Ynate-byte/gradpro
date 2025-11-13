import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyGroup } from '@/api/groupService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LayoutDashboard, Loader2, ArrowRight } from 'lucide-react'; // [THÊM] ArrowRight
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, startOfWeek, endOfWeek, addWeeks, isSameWeek } from 'date-fns'; // [THÊM]
import { vi } from 'date-fns/locale'; // [THÊM]

import '../components/kanban/Kanban.css';

export default function KanbanPage() {
    const { nhomId } = useParams();
    const navigate = useNavigate();
    
    // 1. STATE & LOGIC ĐIỀU HƯỚNG TUẦN (NEW)
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const options = useMemo(() => ({ locale: vi, weekStartsOn: 1 }), []); 
    
    const weekRange = useMemo(() => {
        const start = startOfWeek(currentDate, options);
        const end = endOfWeek(currentDate, options);
        return {
            start: format(start, 'yyyy-MM-dd'),
            end: format(end, 'yyyy-MM-dd'),
            display: `${format(start, 'dd/MM', options)} - ${format(end, 'dd/MM/yyyy', options)}`,
        };
    }, [currentDate, options]);

    const isCurrentWeek = useMemo(() => isSameWeek(currentDate, new Date(), options), [currentDate, options]);

    const handleWeekChange = (direction) => {
        setCurrentDate(prev => addWeeks(prev, direction));
    };

    const handleGoToToday = () => {
        setCurrentDate(new Date());
    };
    // END OF NAVIGATION LOGIC

    // 2. Fetch data (Cần lấy tên nhóm)
    const { data: groupData, isLoading: isLoadingGroup } = useQuery({
        queryKey: ['myGroupDetails_kanban', Number(nhomId)], 
        queryFn: () => getMyGroup({ 
            plan_id: null, 
            force_group_id: Number(nhomId),
        }),
        enabled: !!nhomId,
        select: (data) => data.group_data,
        onError: () => {
            toast.error("Không thể tải thông tin nhóm.");
        }
    });

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
                            Bảng Công việc - {isLoadingGroup ? "Đang tải..." : (groupData?.TEN_NHOM || `Nhóm ${nhomId}`)}
                        </CardTitle>
                        <CardDescription>
                            Kéo và thả các công việc giữa các cột để cập nhật tiến độ.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* [NEW UI] Week Navigation Bar */}
                    <div className="flex justify-between items-center mb-4 border-b pb-4">
                        <Button variant="outline" size="sm" onClick={() => handleWeekChange(-1)}>
                            <ArrowLeft className="h-4 w-4 mr-1" /> Trở về
                        </Button>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-primary">{weekRange.display}</span>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={handleGoToToday}
                                disabled={isCurrentWeek}
                                className="h-7"
                            >
                                Hiện tại
                            </Button>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleWeekChange(1)}>
                            Tiếp <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                    {/* END OF NEW UI */}
                    
                    {/* [MODIFIED] Truyền ngày xuống KanbanBoard */}
                    <KanbanBoard 
                        nhomId={Number(nhomId)} 
                        start_date={weekRange.start} 
                        end_date={weekRange.end}
                    />
                </CardContent>
            </Card>
        </div>
    );
}