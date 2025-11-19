import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPersonalHistory } from '@/api/historyService';
import HistoryTimeline from '@/components/shared/HistoryTimeline';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
    History, Search, Filter, Activity, 
    CalendarDays, ArrowLeft, ArrowRight, Shield, Layers 
} from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { cn } from "@/lib/utils";

export default function PersonalHistoryPage() {
    const [page, setPage] = useState(1);
    const [filterType, setFilterType] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    // Debounce search để tránh gọi API liên tục khi gõ
    const [debouncedSearch] = useDebounce(searchTerm, 500);

    // Fetch data
    const { data, isLoading } = useQuery({
        queryKey: ['personal-history', page, filterType, debouncedSearch],
        queryFn: () => getPersonalHistory({ 
            page, 
            per_page: 20,
            type: filterType === 'ALL' ? null : filterType,
            search: debouncedSearch 
        }),
        keepPreviousData: true
    });

    const historyItems = data?.data || [];
    const totalPages = data?.last_page || 1;
    const totalItems = data?.total || 0;

    // Danh sách các bộ lọc nhanh
    const filters = [
        { id: 'ALL', label: 'Tất cả', icon: Layers },
        { id: 'LOGIN', label: 'Đăng nhập & Bảo mật', icon: Shield },
        { id: 'TASK_MOVE', label: 'Công việc (Kanban)', icon: Activity },
        { id: 'SUBMIT_PRODUCT', label: 'Nộp sản phẩm', icon: CalendarDays },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-primary">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <History className="h-8 w-8 text-primary" />
                        </div>
                        Nhật ký hoạt động
                    </h1>
                </div>
                
                {/* Thẻ thống kê nhanh */}
                <Card className="bg-primary/5 border-primary/20 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-background rounded-full shadow-sm border">
                            <Activity className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase">Tổng hoạt động</p>
                            <p className="text-2xl font-bold text-primary">{totalItems}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            <div className="bg-card p-4 rounded-xl border shadow-sm space-y-4 md:space-y-0">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                     {/* Bộ lọc nhanh (Horizontal) */}
                    <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                         <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2 shrink-0">
                            <Filter className="h-4 w-4" />
                            <span className="hidden sm:inline">Lọc theo:</span>
                        </div>
                        {filters.map((item) => {
                            const isActive = filterType === item.id;
                            return (
                                <Button
                                    key={item.id}
                                    variant={isActive ? "secondary" : "outline"}
                                    size="sm"
                                    className={cn(
                                        "gap-2 border-dashed h-9",
                                        isActive && "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 border-solid font-medium"
                                    )}
                                    onClick={() => setFilterType(item.id)}
                                >
                                    <item.icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                                    {item.label}
                                </Button>
                            );
                        })}
                    </div>
                    
                    {/* Tìm kiếm */}
                    <div className="relative w-full md:w-72 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Tìm kiếm hoạt động..." 
                            className="pl-9 bg-muted/30 focus:bg-background transition-all h-9" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* --- TIMELINE CONTENT (Full Width) --- */}
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-2 border-b mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Dòng thời gian</CardTitle>
                            <CardDescription>Hiển thị kết quả trang {page}</CardDescription>
                        </div>
                        {filterType !== 'ALL' && (
                            <Badge variant="outline" className="bg-background hidden sm:flex">
                                Đang lọc: {filters.find(f => f.id === filterType)?.label}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                
                <CardContent className="p-0 sm:p-6">
                    <HistoryTimeline items={historyItems} isLoading={isLoading} />
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t mt-6 pt-4 px-4 sm:px-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                                className="gap-1"
                            >
                                <ArrowLeft className="h-4 w-4" /> Trước
                            </Button>
                            
                            <span className="text-sm font-medium text-muted-foreground">
                                Trang {page} / {totalPages}
                            </span>
                            
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || isLoading}
                                className="gap-1"
                            >
                                Sau <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}