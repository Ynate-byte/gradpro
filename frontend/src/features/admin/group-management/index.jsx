import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserX, SlidersHorizontal, FileDown, BookCopy, Loader2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getGroupStatistics, exportGroups } from '@/api/adminGroupService';
import { getAllPlans } from '@/api/thesisPlanService';
import { AutoGroupDialog } from './components/AutoGroupDialog';
import { InactiveStudentsDialog } from './components/InactiveStudentsDialog';
import { GroupDataTable } from './components/GroupDataTable';
import { CreateGroupDialog } from './components/CreateGroupDialog';
import { GroupDetailSheet } from './components/GroupDetailSheet';
import { UngroupedStudentsDialog } from './components/UngroupedStudentsDialog'; // Thêm dòng này

const StatCard = ({ icon: Icon, title, value, onAction, actionLabel = "Xem danh sách" }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {onAction && <Button variant="link" size="sm" className="px-0 h-auto -mt-2" onClick={onAction}>{actionLabel}</Button>}
        </CardContent>
    </Card>
);

export default function GroupAdminPage() {
    const [allPlans, setAllPlans] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [stats, setStats] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isAutoGroupOpen, setIsAutoGroupOpen] = useState(false);
    const [isInactiveStudentOpen, setIsInactiveStudentOpen] = useState(false);
    const [isUngroupedStudentOpen, setIsUngroupedStudentOpen] = useState(false); // Thêm dòng này
    const [refreshTrigger, setRefreshTrigger] = useState(false);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
    const [viewingGroup, setViewingGroup] = useState(null);

    // ... (các hàm và useEffect khác giữ nguyên)
    useEffect(() => {
        getAllPlans().then(data => {
            setAllPlans(data);
            if (data.length > 0) {
                setSelectedPlanId(String(data[0].ID_KEHOACH));
            }
        }).catch(() => toast.error("Không thể tải danh sách kế hoạch."));
    }, []);

    const handleSuccess = () => {
        setRefreshTrigger(prev => !prev);
        fetchStats();
    };

    const fetchStats = useCallback(() => {
        if (!selectedPlanId) return;
        setIsLoadingStats(true);
        getGroupStatistics(selectedPlanId)
            .then(setStats)
            .catch(() => toast.error("Lỗi khi tải thống kê."))
            .finally(() => setIsLoadingStats(false));
    }, [selectedPlanId]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleViewDetails = (group) => {
        setViewingGroup(group);
        setIsDetailSheetOpen(true);
    };

    const handleExport = async () => {
        if (!selectedPlanId) {
            toast.warning("Vui lòng chọn một kế hoạch để xuất file.");
            return;
        }
        toast.info("Đang chuẩn bị file, vui lòng đợi...");
        try {
            const blob = await exportGroups(selectedPlanId);
            const planName = allPlans.find(p => p.ID_KEHOACH == selectedPlanId)?.TEN_DOT || 'plan';
            const fileName = `danh-sach-nhom-${planName.replace(/\s/g, '_')}.xlsx`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success("Tải file thành công!");
        } catch (error) {
            toast.error("Không thể xuất file. Vui lòng thử lại.");
        }
    };

    return (
        <div className="space-y-6 p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                     <Button onClick={() => setIsCreateGroupOpen(true)} disabled={!selectedPlanId}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Tạo nhóm mới
                    </Button>
                    <Button variant="outline" onClick={() => setIsAutoGroupOpen(true)} disabled={!selectedPlanId}>
                        <SlidersHorizontal className="mr-2 h-4 w-4" /> Ghép nhóm tự động
                    </Button>
                    <Button variant="outline" onClick={handleExport} disabled={!selectedPlanId}>
                        <FileDown className="mr-2 h-4 w-4" /> Xuất danh sách
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
                <BookCopy className="h-5 w-5 text-muted-foreground shrink-0" />
                <Select onValueChange={setSelectedPlanId} value={selectedPlanId}>
                    <SelectTrigger className="w-full sm:w-[450px]">
                        <SelectValue placeholder="Chọn một kế hoạch..." />
                    </SelectTrigger>
                    <SelectContent>
                        {allPlans.map(plan => (
                            <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                {plan.TEN_DOT}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* === SỬA ĐỔI: Thêm onAction vào StatCard === */}
                <StatCard 
                    icon={Users} 
                    title="SV chưa có nhóm" 
                    value={isLoadingStats || !stats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.studentsWithoutGroup}
                    onAction={() => setIsUngroupedStudentOpen(true)}
                />
                <StatCard icon={UserX} title="SV chưa đăng nhập" value={isLoadingStats || !stats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.inactiveStudents} onAction={() => setIsInactiveStudentOpen(true)} />
                <StatCard icon={Users} title="Tổng số nhóm" value={isLoadingStats || !stats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalGroups} />
                <StatCard icon={Users} title="Nhóm đã đủ TV" value={isLoadingStats || !stats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.fullGroups} />
            </div>
            
            <div className="space-y-4">
                {selectedPlanId ? (
                    <GroupDataTable 
                        key={`${selectedPlanId}-${refreshTrigger}`} 
                        planId={selectedPlanId} 
                        onSuccess={handleSuccess}
                        onViewDetails={handleViewDetails}
                    />
                ) : (
                    <div className="text-center text-muted-foreground p-8 border rounded-lg">Vui lòng chọn một kế hoạch để xem danh sách nhóm.</div>
                )}
            </div>

            <InactiveStudentsDialog isOpen={isInactiveStudentOpen} setIsOpen={setIsInactiveStudentOpen} onSuccess={handleSuccess} planId={selectedPlanId} />
            <AutoGroupDialog isOpen={isAutoGroupOpen} setIsOpen={setIsAutoGroupOpen} onSuccess={handleSuccess} planId={selectedPlanId} />
            <CreateGroupDialog isOpen={isCreateGroupOpen} setIsOpen={setIsCreateGroupOpen} onSuccess={handleSuccess} planId={selectedPlanId} />
            <GroupDetailSheet group={viewingGroup} isOpen={isDetailSheetOpen} setIsOpen={setIsDetailSheetOpen} />
            {/* === Thêm Dialog mới vào cuối === */}
            <UngroupedStudentsDialog isOpen={isUngroupedStudentOpen} setIsOpen={setIsUngroupedStudentOpen} planId={selectedPlanId} />
        </div>
    );
}