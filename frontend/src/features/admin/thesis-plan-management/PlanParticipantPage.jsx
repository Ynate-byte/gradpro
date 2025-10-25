import React, { useState, useEffect, useCallback, useMemo, useId } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { getThesisPlanById, getPlanParticipants, bulkRemoveParticipantsFromPlan } from '@/api/thesisPlanService'; // Thêm bulkRemove...
import { DataTable } from '@/components/shared/data-table/DataTable';
import { getParticipantColumns } from './components/participants/participantColumns';
import { AddParticipantDialog } from './components/participants/AddParticipantDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, UserPlus, Loader2, Trash2 } from 'lucide-react'; // Thêm Trash2
import { Skeleton } from '@/components/ui/skeleton';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
// Thêm import AlertDialog
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
    const [rowSelection, setRowSelection] = useState({}); // State để lưu các hàng được chọn
    const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false); // State cho dialog xóa hàng loạt
    const [isBulkDeleting, setIsBulkDeleting] = useState(false); // State loading khi xóa hàng loạt
    const bulkDeleteTitleId = useId();
    const bulkDeleteDescriptionId = useId();


    // Tải thông tin kế hoạch
    const fetchPlanDetails = useCallback(async () => {
        try {
            const data = await getThesisPlanById(planId);
            setPlan(data);
        } catch {
            toast.error("Không thể tải thông tin kế hoạch.");
            navigate('/admin/thesis-plans'); // Quay lại nếu lỗi
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
            // Gửi filter trạng thái (chuyển đổi 'true'/'false' thành mảng)
            eligible: columnFilters.find(f => f.id === 'DU_DIEUKIEN')?.value,
        };
        getPlanParticipants(planId, params)
            .then(response => {
                setParticipants(response.data);
                setPageCount(response.last_page);
            })
            .catch(() => toast.error("Lỗi khi tải danh sách sinh viên tham gia."))
            .finally(() => setLoading(false));
    }, [planId, pagination, searchTerm, sorting, columnFilters]);

    // Tải dữ liệu ban đầu
    useEffect(() => {
        fetchPlanDetails();
    }, [fetchPlanDetails]);

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
        // Lấy ID_THAMGIA của các hàng được chọn
        const selectedIds = Object.keys(rowSelection)
            .filter(key => rowSelection[key])
            .map(key => participants[parseInt(key)]?.ID_THAMGIA) // Lấy ID_THAMGIA từ data gốc dựa vào index của hàng
            .filter(id => id !== undefined); // Loại bỏ các ID không hợp lệ (nếu có)


        if (selectedIds.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một sinh viên để xóa.");
            setIsBulkDeleteAlertOpen(false);
            return;
        }

        setIsBulkDeleting(true);
        try {
            const res = await bulkRemoveParticipantsFromPlan(planId, selectedIds);
            toast.success(res.message);
            setRowSelection({}); // Reset lựa chọn sau khi xóa thành công
            fetchData(); // Tải lại dữ liệu
        } catch (error) {
            toast.error(error.response?.data?.message || "Xóa hàng loạt thất bại.");
        } finally {
            setIsBulkDeleting(false);
            setIsBulkDeleteAlertOpen(false);
        }
    };


    // Cấu hình cột cho bảng
    const columns = useMemo(() => getParticipantColumns({
        onSuccess: fetchData // Gọi lại fetchData khi có thay đổi từ row actions
    }), [fetchData]);

    // Hiển thị loading nếu chưa có thông tin plan
    if (!plan) {
        return <div className="p-8"><LoadingSkeleton /></div>;
    }

     // Đếm số hàng được chọn
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
                    <Breadcrumb className="mt-2">
                         <BreadcrumbList>
                             <BreadcrumbItem>
                                 <BreadcrumbLink asChild>
                                     <Link to="/admin/thesis-plans">Kế hoạch KLTN</Link>
                                 </BreadcrumbLink>
                             </BreadcrumbItem>
                             <BreadcrumbSeparator />
                             <BreadcrumbItem>
                                 <BreadcrumbPage>Quản lý Sinh viên Tham gia</BreadcrumbPage>
                             </BreadcrumbItem>
                         </BreadcrumbList>
                    </Breadcrumb>
                    <h1 className="text-3xl font-bold mt-1 truncate max-w-xl" title={plan.TEN_DOT}>
                        Kế hoạch: {plan.TEN_DOT}
                    </h1>
                </div>
                 {/* ----- SỬA ĐỔI: Thêm nút Xóa hàng loạt ----- */}
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
                 {/* ----- KẾT THÚC SỬA ĐỔI ----- */}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Danh sách Sinh viên Tham gia</CardTitle>
                    <CardDescription>
                        Quản lý danh sách sinh viên đủ điều kiện hoặc đã đăng ký tham gia vào kế hoạch này.
                    </CardDescription>
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
                        searchPlaceholder="Tìm theo tên, MSSV, email..."
                        statusColumnId="DU_DIEUKIEN"
                        statusOptions={[
                            { value: "true", label: "Đủ điều kiện" }, // Giá trị là string 'true'/'false'
                            { value: "false", label: "Không đủ" }
                        ]}
                        // Enable row selection
                        state={{ rowSelection }} // Truyền state lựa chọn vào DataTable
                        onRowSelectionChange={setRowSelection} // Cập nhật state khi lựa chọn thay đổi
                        onAddUser={null} // Không dùng nút Add/Import của toolbar chung
                        onImportUser={null}
                        addBtnText="" // Bỏ trống text nút Add
                    />
                </CardContent>
            </Card>

            <AddParticipantDialog
                isOpen={isAddDialogOpen}
                setIsOpen={setIsAddDialogOpen}
                onSuccess={fetchData}
                plan={plan}
            />

             {/* ----- THÊM MỚI: Dialog xác nhận xóa hàng loạt ----- */}
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
             {/* ----- KẾT THÚC THÊM MỚI ----- */}
        </div>
    );
}