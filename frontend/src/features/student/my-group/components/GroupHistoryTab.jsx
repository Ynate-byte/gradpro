import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGroupHistory } from '@/api/historyService';
import HistoryTimeline from '@/components/shared/HistoryTimeline';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Search, Filter } from 'lucide-react';
import { useDebounce } from 'use-debounce';

const GroupHistoryTab = ({ groupId }) => {
    const [filterType, setFilterType] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    // Debounce để tránh gọi API quá nhiều khi gõ tìm kiếm
    const [debouncedSearch] = useDebounce(searchTerm, 500);

    const { data, isLoading } = useQuery({
        // Thêm filter params vào queryKey để tự động refetch khi thay đổi
        queryKey: ['group-history', groupId, filterType, debouncedSearch],
        queryFn: () => getGroupHistory(groupId, { 
            per_page: 50, // Lấy nhiều hơn chút cho nhóm
            type: filterType === 'ALL' ? null : filterType,
            search: debouncedSearch 
        }),
        enabled: !!groupId,
        keepPreviousData: true
    });

    const historyItems = data?.data || [];

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="px-0 pt-0 pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-orange-500" />
                        Nhật ký hoạt động nhóm
                    </CardTitle>
                    
                    {/* --- BỘ LỌC & TÌM KIẾM --- */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Ô tìm kiếm */}
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Tìm theo tên, hành động..." 
                                className="pl-9 h-9" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Dropdown Lọc loại */}
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-[160px] h-9">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                    <SelectValue placeholder="Lọc" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tất cả</SelectItem>
                                <SelectItem value="SUBMIT_PRODUCT">Nộp sản phẩm</SelectItem>
                                <SelectItem value="TASK_MOVE">Tiến độ công việc</SelectItem>
                                <SelectItem value="TASK_CREATE">Tạo công việc</SelectItem>
                                <SelectItem value="JOIN_GROUP">Gia nhập nhóm</SelectItem>
                                <SelectItem value="INVITE_MEMBER">Mời thành viên</SelectItem>
                                <SelectItem value="LEAVE_GROUP">Rời nhóm</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <HistoryTimeline items={historyItems} isLoading={isLoading} />
            </CardContent>
        </Card>
    );
};

export default GroupHistoryTab;