import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

const StatCard = ({ icon: Icon, title, value, onAction, actionLabel = "Xem danh sách" }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {onAction && <Button variant="link" size="sm" className="px-0 h-auto" onClick={onAction}>{actionLabel}</Button>}
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
    const [refreshTrigger, setRefreshTrigger] = useState(false);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
    const [viewingGroup, setViewingGroup] = useState(null);

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

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="space-y-8 p-4 md:p-8">
            <motion.div initial="hidden" animate="visible" variants={containerVariants}>
                <motion.h1 variants={itemVariants} className="text-3xl font-bold">Quản lý Nhóm Đồ án</motion.h1>
                <motion.p variants={itemVariants} className="text-muted-foreground">
                    Thống kê, quản lý, ghép nhóm và xuất báo cáo theo từng kế hoạch khóa luận.
                </motion.p>
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <BookCopy className="h-5 w-5 text-muted-foreground" />
                    <Select onValueChange={setSelectedPlanId} value={selectedPlanId}>
                        <SelectTrigger className="w-full sm:w-[350px]">
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
            </div>

            <motion.div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={itemVariants}><StatCard icon={Users} title="SV chưa có nhóm" value={isLoadingStats || !stats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.studentsWithoutGroup} /></motion.div>
                <motion.div variants={itemVariants}><StatCard icon={UserX} title="SV chưa đăng nhập" value={isLoadingStats || !stats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.inactiveStudents} onAction={() => setIsInactiveStudentOpen(true)} /></motion.div>
                <motion.div variants={itemVariants}><StatCard icon={Users} title="Tổng số nhóm" value={isLoadingStats || !stats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalGroups} /></motion.div>
                <motion.div variants={itemVariants}><StatCard icon={Users} title="Nhóm đã đủ TV" value={isLoadingStats || !stats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.fullGroups} /></motion.div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                 <Card>
                     <CardHeader>
                         <CardTitle>Hành động xử lý</CardTitle>
                         <CardDescription>Thực hiện các thao tác hàng loạt cho kế hoạch đã chọn.</CardDescription>
                     </CardHeader>
                     <CardContent className="flex flex-wrap gap-4">
                        <Button onClick={() => setIsCreateGroupOpen(true)} disabled={!selectedPlanId}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Tạo nhóm mới
                        </Button>
                         <Button onClick={() => setIsAutoGroupOpen(true)} disabled={!selectedPlanId}>
                             <SlidersHorizontal className="mr-2 h-4 w-4" />
                             Tiến hành ghép nhóm tự động
                         </Button>
                         <Button variant="outline" onClick={handleExport} disabled={!selectedPlanId}>
                             <FileDown className="mr-2 h-4 w-4" />
                             Xuất danh sách tổng hợp
                         </Button>
                     </CardContent>
                 </Card>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card>
                    <CardHeader>
                        <CardTitle>Danh sách Nhóm</CardTitle>
                        <CardDescription>Toàn bộ nhóm thuộc kế hoạch đã chọn.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {selectedPlanId ? (
                            <GroupDataTable 
                                key={`${selectedPlanId}-${refreshTrigger}`} 
                                planId={selectedPlanId} 
                                onSuccess={handleSuccess}
                                onViewDetails={handleViewDetails}
                            />
                        ) : (
                            <div className="text-center text-muted-foreground p-8">Vui lòng chọn một kế hoạch để xem danh sách nhóm.</div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            <InactiveStudentsDialog isOpen={isInactiveStudentOpen} setIsOpen={setIsInactiveStudentOpen} onSuccess={handleSuccess} planId={selectedPlanId} />
            <AutoGroupDialog isOpen={isAutoGroupOpen} setIsOpen={setIsAutoGroupOpen} onSuccess={handleSuccess} planId={selectedPlanId} />
            <CreateGroupDialog isOpen={isCreateGroupOpen} setIsOpen={setIsCreateGroupOpen} onSuccess={handleSuccess} planId={selectedPlanId} />
            <GroupDetailSheet group={viewingGroup} isOpen={isDetailSheetOpen} setIsOpen={setIsDetailSheetOpen} />
        </div>
    );
}