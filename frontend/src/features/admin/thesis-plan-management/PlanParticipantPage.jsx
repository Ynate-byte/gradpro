import React, { useState, useEffect, useCallback, useMemo, useId } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { getThesisPlanById, getPlanParticipants, bulkRemoveParticipantsFromPlan } from '@/api/thesisPlanService';
import { getChuyenNganhs } from '@/api/userService'; 
import { UserDetailSheet } from '@/features/admin/user-management/components/UserDetailSheet'; 
import { DataTable } from '@/components/shared/data-table/DataTable';
import { getParticipantColumns } from './components/participants/participantColumns';
import { AddParticipantDialog } from './components/participants/AddParticipantDialog';
import { ImportWizardDialog } from './components/participants/ImportWizardDialog'; 
import { Card, CardContent } from '@/components/ui/card'; 
import { Button } from '@/components/ui/button';
import { ChevronLeft, UserPlus, Loader2, Trash2, Upload, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
// [THÊM MỚI] Import cho Animation
import { motion, useReducedMotion } from 'framer-motion';
import { useTheme } from "@/components/theme-provider";

const columnVisibility = {
    chuyen_nganh_id: false,
};

// [THÊM MỚI] Cấu hình Animation variants
const getVariants = (shouldReduce) => {
    // Nếu bật chế độ giảm chuyển động, chỉ hiện ngay lập tức (opacity 1)
    if (shouldReduce) {
        return {
            container: { visible: { opacity: 1 } },
            item: { visible: { opacity: 1, y: 0 } },
        };
    }
    // Ngược lại, chạy hiệu ứng Stagger (xuất hiện lần lượt) và Slide Up
    return {
        container: {
            hidden: { opacity: 0 },
            visible: { 
                opacity: 1, 
                transition: { staggerChildren: 0.1, delayChildren: 0.1 } 
            }
        },
        item: {
            hidden: { y: 20, opacity: 0 },
            visible: { 
                y: 0, 
                opacity: 1, 
                transition: { type: "spring", stiffness: 100, damping: 15 } 
            }
        }
    };
};

const LoadingSkeleton = () => (
    <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-48" />
            </div>
        </div>
        <Skeleton className="h-[500px] w-full rounded-xl" />
    </div>
);

export default function PlanParticipantPage() {
    const { planId } = useParams();
    const navigate = useNavigate();
    const [plan, setPlan] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [pageCount, setPageCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });
    const [sorting, setSorting] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
    const [columnFilters, setColumnFilters] = useState([]);
    const [rowSelection, setRowSelection] = useState({}); 
    const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false); 
    const [isBulkDeleting, setIsBulkDeleting] = useState(false); 
    const bulkDeleteTitleId = useId();
    const bulkDeleteDescriptionId = useId();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [viewingUserId, setViewingUserId] = useState(null);
    const [chuyenNganhOptions, setChuyenNganhOptions] = useState([]);

    // [THÊM MỚI] Logic xử lý Reduce Motion
    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme();
    const isReduced = reduceMotion || shouldReduceMotion;
    const variants = useMemo(() => getVariants(isReduced), [isReduced]);

    const fetchPlanDetailsAndOptions = useCallback(async () => {
        try {
            const [planData, cnData] = await Promise.all([
                getThesisPlanById(planId),
                getChuyenNganhs()
            ]);
            setPlan(planData);
            setChuyenNganhOptions(cnData || []);
        } catch (err) {
            if (err.config?.url?.includes('thesis-plans')) {
                toast.error("Không thể tải thông tin kế hoạch.");
                navigate('/admin/thesis-plans');
            } else {
                toast.error("Không thể tải tùy chọn bộ lọc chuyên ngành.");
            }
        }
    }, [planId, navigate]);

    const fetchData = useCallback(() => {
        if (!planId) return;
        setLoading(true);

        const params = {
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
            search: searchTerm,
            sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined,
            eligible: columnFilters.find(f => f.id === 'DU_DIEUKIEN')?.value,
            chuyen_nganh_ids: columnFilters.find(f => f.id === 'chuyen_nganh_id')?.value,
        };

        getPlanParticipants(planId, params)
            .then(response => {
                setParticipants(response.data);
                setPageCount(response.last_page);
            })
            .catch(() => toast.error("Lỗi khi tải danh sách sinh viên tham gia."))
            .finally(() => setLoading(false));
    }, [planId, pagination, searchTerm, sorting, columnFilters]);

    useEffect(() => {
        fetchPlanDetailsAndOptions();
    }, [fetchPlanDetailsAndOptions]);

    useEffect(() => {
        if (plan) {
            fetchData();
        }
    }, [fetchData, plan]);

    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [searchTerm, columnFilters]);

    const handleBulkDelete = async () => {
        const selectedIds = Object.keys(rowSelection)
            .filter(key => rowSelection[key])
            .map(key => participants[parseInt(key)]?.ID_THAMGIA) 
            .filter(id => id !== undefined); 

        if (selectedIds.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một sinh viên để xóa.");
            setIsBulkDeleteAlertOpen(false);
            return;
        }

        setIsBulkDeleting(true);
        try {
            const res = await bulkRemoveParticipantsFromPlan(planId, selectedIds);
            toast.success(res.message);
            setRowSelection({}); 
            fetchData(); 
        } catch (error) {
            toast.error(error.response?.data?.message || "Xóa hàng loạt thất bại.");
        } finally {
            setIsBulkDeleting(false);
            setIsBulkDeleteAlertOpen(false);
        }
    };

    const handleViewDetails = (sinhvienThamgia) => {
        const userId = sinhvienThamgia?.sinhvien?.ID_NGUOIDUNG;
        if (userId) {
            setViewingUserId(userId);
            setIsSheetOpen(true);
        } else {
            toast.error("Không tìm thấy thông tin người dùng của sinh viên này.");
        }
    };

    const columns = useMemo(() => getParticipantColumns({
        onSuccess: fetchData,
        onViewDetails: handleViewDetails 
    }), [fetchData]); 

    const chuyenNganhFilterOptions = useMemo(() => 
        chuyenNganhOptions.map(cn => ({ label: cn.TEN_CHUYENNGANH, value: String(cn.ID_CHUYENNGANH) })),
        [chuyenNganhOptions]
    );

    if (!plan) {
        return <LoadingSkeleton />;
    }

    const selectedRowCount = Object.values(rowSelection).filter(Boolean).length;

    return (
        // [UPDATE] Chuyển div thành motion.div và thêm variants container
        <motion.div 
            className="h-full flex flex-col space-y-4 p-4 md:p-6 overflow-hidden bg-background"
            initial="hidden"
            animate="visible"
            variants={variants.container}
        >
            {/* Header Area - Bọc trong motion.div variants.item */}
            <motion.div 
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 pb-2"
                variants={variants.item}
            >
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full border bg-background hover:bg-accent hover:text-accent-foreground"
                        onClick={() => navigate('/admin/thesis-plans')}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                           {plan.TEN_DOT}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    {selectedRowCount > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="shadow-sm"
                            onClick={() => setIsBulkDeleteAlertOpen(true)}
                            disabled={isBulkDeleting}
                        >
                            {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Xóa ({selectedRowCount})
                        </Button>
                    )}
                    <Button variant="outline" size="sm" className="shadow-sm border-dashed" onClick={() => setIsImportWizardOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" /> Import Excel
                    </Button>
                    <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="shadow-sm">
                        <UserPlus className="mr-2 h-4 w-4" /> Thêm Sinh viên
                    </Button>
                </div>
            </motion.div>

            {/* Table Container - Bọc trong motion.div variants.item */}
            <motion.div 
                className="flex-1 flex flex-col min-h-0"
                variants={variants.item}
            >
                <Card className="flex-1 flex flex-col min-h-0 border-border/60 shadow-sm bg-card">
                    <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                        <div className="flex-1 min-h-0">
                            <DataTable
                                columns={columns}
                                data={participants}
                                pageCount={pageCount}
                                loading={loading}
                                pagination={pagination}
                                setPagination={setPagination}
                                columnFilters={columnFilters}
                                setColumnFilters={setColumnFilters}
                                sorting={sorting}
                                setSorting={setSorting}
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                searchColumnId="search"
                                searchPlaceholder="Tìm theo tên, MSSV, email..."
                                statusColumnId="DU_DIEUKIEN"
                                statusOptions={[
                                    { value: "true", label: "Đủ điều kiện" }, 
                                    { value: "false", label: "Không đủ" }
                                ]}
                                chuyenNganhFilterColumnId="chuyen_nganh_id" 
                                chuyenNganhFilterOptions={chuyenNganhFilterOptions} 
                                columnVisibility={columnVisibility} 
                                state={{ rowSelection }} 
                                onRowSelectionChange={setRowSelection} 
                                onAddUser={null} 
                                onImportUser={null}
                                addBtnText="" 
                                
                                flexLayout={true}
                                containerClassName="h-full border-none shadow-none"
                                className="h-full"
                            />
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Dialogs - Giữ nguyên logic */}
            <AddParticipantDialog
                isOpen={isAddDialogOpen}
                setIsOpen={setIsAddDialogOpen}
                onSuccess={fetchData}
                plan={plan}
            />
            
            <ImportWizardDialog
                isOpen={isImportWizardOpen}
                setIsOpen={setIsImportWizardOpen}
                onSuccess={fetchData}
                plan={plan}
            />

            <UserDetailSheet
                userId={viewingUserId}
                isOpen={isSheetOpen}
                setIsOpen={setIsSheetOpen}
            />

            <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
                <AlertDialogContent aria-labelledby={bulkDeleteTitleId} aria-describedby={bulkDeleteDescriptionId}>
                    <AlertDialogHeader>
                        <AlertDialogTitle id={bulkDeleteTitleId}>Xác nhận Xóa Sinh viên?</AlertDialogTitle>
                        <AlertDialogDescription id={bulkDeleteDescriptionId}>
                            Hành động này sẽ xóa vĩnh viễn <strong>{selectedRowCount}</strong> sinh viên đã chọn khỏi kế hoạch này. Bạn chắc chắn muốn tiếp tục?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkDeleting}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Xác nhận Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}