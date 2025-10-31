import React, { useState, useEffect, useCallback, useMemo, useId } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { getThesisPlanById, getPlanParticipants, bulkRemoveParticipantsFromPlan } from '@/api/thesisPlanService';
import { getChuyenNganhs } from '@/api/userService'; 
import { UserDetailSheet } from '@/features/admin/user-management/components/UserDetailSheet'; 
import { DataTable } from '@/components/shared/data-table/DataTable';
import { getParticipantColumns } from './components/participants/participantColumns';
import { AddParticipantDialog } from './components/participants/AddParticipantDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, UserPlus, Loader2, Trash2 } from 'lucide-react'; 
import { Skeleton } from '@/components/ui/skeleton';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
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

const columnVisibility = {
    chuyen_nganh_id: false,
};


// Hiển thị skeleton khi đang tải
const LoadingSkeleton = () => (
    <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-96 w-full" />
    </div>
);

// Trang quản lý sinh viên tham gia kế hoạch
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
    const [columnFilters, setColumnFilters] = useState([]);
    const [rowSelection, setRowSelection] = useState({}); 
    const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false); 
    const [isBulkDeleting, setIsBulkDeleting] = useState(false); 
    const bulkDeleteTitleId = useId();
    const bulkDeleteDescriptionId = useId();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [viewingUserId, setViewingUserId] = useState(null);
    const [chuyenNganhOptions, setChuyenNganhOptions] = useState([]);


    // Tải thông tin kế hoạch VÀ các tùy chọn lọc
    const fetchPlanDetailsAndOptions = useCallback(async () => {
        try {
            // Tải song song
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

    // Tải danh sách sinh viên tham gia
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

    // Tải dữ liệu ban đầu (plan + filter options)
    useEffect(() => {
        fetchPlanDetailsAndOptions();
    }, [fetchPlanDetailsAndOptions]);

    // Tải lại danh sách SV khi thay đổi bộ lọc, phân trang, sắp xếp
    useEffect(() => {
        if (plan) { // Chỉ fetch khi đã có thông tin plan
            fetchData();
        }
    }, [fetchData, plan]);

    // Reset trang về 0 khi tìm kiếm hoặc lọc
    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [searchTerm, columnFilters]);

    // Hàm xử lý xóa hàng loạt
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

    // Hàm mở Sheet chi tiết
    const handleViewDetails = (sinhvienThamgia) => {
        const userId = sinhvienThamgia?.sinhvien?.ID_NGUOIDUNG;
        if (userId) {
            setViewingUserId(userId);
            setIsSheetOpen(true);
        } else {
            toast.error("Không tìm thấy thông tin người dùng của sinh viên này.");
        }
    };

    // Cấu hình cột cho bảng
    const columns = useMemo(() => getParticipantColumns({
        onSuccess: fetchData,
        onViewDetails: handleViewDetails 
    }), [fetchData]); 

    // Chuyển đổi options cho bộ lọc
    const chuyenNganhFilterOptions = useMemo(() => 
        chuyenNganhOptions.map(cn => ({ label: cn.TEN_CHUYENNGANH, value: String(cn.ID_CHUYENNGANH) })),
        [chuyenNganhOptions]
    );


    // Hiển thị loading nếu chưa có thông tin plan
    if (!plan) {
        return <div className="p-8"><LoadingSkeleton /></div>;
    }

    const selectedRowCount = Object.values(rowSelection).filter(Boolean).length;


    return (
        <div className="space-y-6 p-4 md:p-8">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/admin/thesis-plans')}
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" /> DS Kế hoạch
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    {selectedRowCount > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setIsBulkDeleteAlertOpen(true)}
                            disabled={isBulkDeleting}
                        >
                            {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Xóa ({selectedRowCount})
                        </Button>
                    )}
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Thêm Sinh viên
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                </CardHeader>
                <CardContent>
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
                    />
                </CardContent>
            </Card>

            <AddParticipantDialog
                isOpen={isAddDialogOpen}
                setIsOpen={setIsAddDialogOpen}
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
        </div>
    );
}