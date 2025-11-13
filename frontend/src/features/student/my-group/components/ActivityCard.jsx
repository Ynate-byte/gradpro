import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Component Card Thống kê (cho Lịch học, Lịch thi)
 * @param {string} title - Tiêu đề card (vd: "Lịch học trong tuần")
 * @param {number} count - Con số hiển thị (vd: 2)
 * @param {React.ElementType} icon - Icon từ lucide-react (vd: CalendarCheck)
 * @param {'blue' | 'orange'} colorClass - Chủ đề màu
 * @param {Function} onClick - Hàm xử lý khi nhấn "Xem chi tiết"
 */
export function ActivityCard({ title, count, icon: IconComponent, colorClass, onClick }) {
    
    // Ánh xạ màu dựa trên prop
    const colorStyles = {
        blue: 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
        orange: 'bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
    };
    
    const countColor = {
        blue: 'text-blue-600 dark:text-blue-400',
        orange: 'text-orange-600 dark:text-orange-400'
    };

    return (
        <Card className={cn("flex flex-col h-full", colorStyles[colorClass] || 'bg-muted')}>
            <CardContent className="p-4 flex flex-col justify-between flex-1 w-full">
                <div className="flex items-center justify-between w-full mb-3">
                    <h3 className="text-sm font-semibold">{title}</h3>
                    {IconComponent && <IconComponent className={cn("h-5 w-5", colorStyles[colorClass] ? 'opacity-70' : 'text-muted-foreground')} />}
                </div>
                <div className="flex items-baseline justify-between w-full">
                    <span className={cn("text-4xl font-bold", countColor[colorClass] || 'text-primary')}>
                        {count}
                    </span>
                    <Button 
                        variant="link" 
                        className={cn("p-0 h-auto text-xs", countColor[colorClass] || 'text-primary', "hover:underline")} 
                        onClick={onClick}
                    >
                        Xem chi tiết
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}