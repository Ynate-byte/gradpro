import React, { useState, useMemo, useEffect } from "react";
import axiosClient from "@/api/axiosConfig";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  PlusCircle,
  Trash2,
  Users2,
  Pen,
  ShieldAlert,
} from "lucide-react";

// --- API Functions ---

/**
 * Tải dữ liệu bộ lọc (Kế hoạch, Chuyên ngành)
 */
const fetchFilterOptions = async () => {
  const [khRes, cnRes] = await Promise.all([
    axiosClient.get("/admin/hoidong/kehoach-options"),
    axiosClient.get("/admin/hoidong/chuyennganh-options"),
  ]);
  return {
    kehoach: khRes.data.map((kh) => ({
      label: kh.TEN_DOT,
      value: kh.ID_KEHOACH.toString(),
    })),
    chuyennganh: cnRes.data.map((cn) => ({
      label: cn.TEN_CHUYENNGANH,
      value: cn.ID_CHUYENNGANH.toString(),
    })),
  };
};

/**
 * Tải dữ liệu hội đồng (phân trang)
 */
const fetchHoiDong = async ({
  pagination,
  sorting,
  columnFilters,
  debouncedSearch,
  selectedPlanId, // <-- Tham số mới
}) => {
  const params = {
    page: pagination.pageIndex + 1,
    per_page: pagination.pageSize,
    search: debouncedSearch || undefined,
    // [SỬA] Thêm plan id từ state
    kehoach: selectedPlanId || undefined, 
    // [SỬA] Chỉ lấy chuyên ngành từ bộ lọc datatable
    chuyennganh: columnFilters.find((f) => f.id === "chuyennganh")?.value,
    sort: sorting.length ? sorting[0].id : undefined,
    dir: sorting.length ? (sorting[0].desc ? "desc" : "asc") : undefined,
  };
  const res = await axiosClient.get("/admin/hoidong", { params });
  return res.data; // Trả về dữ liệu có cấu trúc { data: [], meta: {...} }
};

/**
 * Xóa hội đồng
 */
const deleteHoiDong = async (ids) => {
  const idArray = Array.isArray(ids) ? ids : [ids];
  if (idArray.length === 0) return;
  await Promise.all(
    idArray.map((id) => axiosClient.delete(`/admin/hoidong/${id}`))
  );
};

// --- Component Chính ---

const ListHoiDong = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State cho DataTable
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  
  // [MỚI] State cho bộ lọc kế hoạch bên ngoài
  const [selectedPlanId, setSelectedPlanId] = useState(""); 

  // State cho Dialog
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // --- Data Fetching ---

  // 1. Tải các tùy chọn bộ lọc
  const { data: filterOptions, isLoading: isLoadingFilters } = useQuery({
    queryKey: ["hoidongFilterOptions"],
    queryFn: fetchFilterOptions,
    // Tự động chọn kế hoạch đầu tiên khi tải xong
    onSuccess: (data) => {
      if (!selectedPlanId && data?.kehoach?.length > 0) {
        setSelectedPlanId(data.kehoach[0].value);
      }
    },
  });

  // 2. Tải danh sách hội đồng
  const queryKey = [
    "adminHoiDong",
    pagination,
    columnFilters,
    sorting,
    debouncedSearch,
    selectedPlanId, // Thêm state kế hoạch vào query key
  ];
  const { data, isLoading: isLoadingData } = useQuery({
    queryKey,
    queryFn: () =>
      fetchHoiDong({
        pagination,
        sorting,
        columnFilters,
        debouncedSearch,
        selectedPlanId, // Truyền vào hàm fetch
      }),
    placeholderData: (prev) => prev,
    enabled: !isLoadingFilters, // Chỉ chạy khi đã tải xong bộ lọc
  });

  // --- Mutation (Delete) ---
  const deleteMutation = useMutation({
    mutationFn: deleteHoiDong,
    onSuccess: () => {
      const count =
        deleteTarget === "bulk" ? Object.keys(rowSelection).length : 1;
      toast.success(`Đã xóa ${count} hội đồng thành công!`);
      queryClient.invalidateQueries(queryKey);
      setRowSelection({});
      setDeleteTarget(null);
      setIsAlertOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Xóa thất bại!");
    },
  });

  // --- Cột (Columns) ---
  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "TEN_HOIDONG",
        header: "Tên hội đồng",
        cell: ({ row }) => (
          <Link
            to={`/admin/hoidong/detail/${row.original.ID_HOIDONG}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.TEN_HOIDONG}
          </Link>
        ),
      },
      {
        accessorKey: "LOAI",
        header: "Loại",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.LOAI === "phanbien" ? "secondary" : "default"
            }
            className="capitalize"
          >
            {row.original.LOAI === "phanbien" ? "Phản biện" : "Hội đồng"}
          </Badge>
        ),
      },
      {
        accessorKey: "chuyennganh", // Cột ảo để lọc
        header: "Chuyên ngành",
        accessorFn: (row) => row.chuyennganh?.TEN_CHUYENNGANH,
        cell: ({ row }) => row.original.chuyennganh?.TEN_CHUYENNGANH || "-",
      },
      {
        accessorKey: "so_thanh_vien",
        header: "Thành viên",
        cell: ({ row }) => (
          <div className="text-center">{row.original.so_thanh_vien || 0}</div>
        ),
      },
      {
        accessorKey: "so_nhom",
        header: "Nhóm P/B",
        cell: ({ row }) => (
          <div className="text-center">{row.original.so_nhom || 0}</div>
        ),
      },
      {
        id: "actions",
        header: "Thao tác",
        cell: ({ row }) => (
          <div className="text-right space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/admin/hoidong/detail/${row.original.ID_HOIDONG}`)
              }
            >
              <Pen className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeleteTarget(row.original.ID_HOIDONG);
                setIsAlertOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const isLoading = isLoadingFilters || isLoadingData;
  const pageCount = data?.meta?.last_page ?? 0;
  const selectedIds = Object.keys(rowSelection)
    .map((key) => data?.data[key]?.ID_HOIDONG)
    .filter(Boolean);

  return (
    <div className="p-4 md:p-8 space-y-4 h-full flex flex-col">
      {/* Header và Nút hành động */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/hoidong/phanbo">
              <Users2 className="mr-2 h-4 w-4" /> Phân bổ nhóm
            </Link>
          </Button>
          <Button onClick={() => navigate("/admin/hoidong/create")}>
            <PlusCircle className="mr-2 h-4 w-4" /> Thêm hội đồng
          </Button>
        </div>
      </div>

      {/* Thanh Bulk Action */}
      {selectedIds.length > 0 && (
        <Card>
          <CardContent className="p-3 flex items-center justify-between">
            <div className="text-sm font-medium">
              Đã chọn {selectedIds.length} hội đồng.
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeleteTarget("bulk");
                setIsAlertOpen(true);
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa mục đã chọn
            </Button>
          </CardContent>
        </Card>
      )}

      {/* [MỚI] Bộ lọc Kế hoạch bên ngoài */}
      <div className="max-w-xs space-y-2">
        <Label htmlFor="plan-select">Chọn Kế Hoạch</Label>
        {isLoadingFilters ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Select
            id="plan-select"
            value={selectedPlanId}
            onValueChange={(value) => {
              setSelectedPlanId(value === "all" ? "" : value);
              setPagination({ pageIndex: 0, pageSize: 10 }); // Reset trang
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn kế hoạch..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả kế hoạch</SelectItem>
              {filterOptions?.kehoach.map((plan) => (
                <SelectItem key={plan.value} value={plan.value}>
                  {plan.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Bảng Dữ liệu */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        pageCount={pageCount}
        loading={isLoading}
        pagination={pagination}
        setPagination={setPagination}
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
        sorting={sorting}
        setSorting={setSorting}
        onRowSelectionChange={setRowSelection}
        state={{
          pagination,
          sorting,
          columnFilters,
          rowSelection,
        }}
        // Props cho Toolbar
        searchColumnId="search"
        searchPlaceholder="Tìm tên hội đồng..."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        
        // [XÓA] Bộ lọc Kế hoạch (vì đã đưa ra ngoài)
        // khoaBomonFilterColumnId="kehoach"
        // khoaBomonFilterTitle="Kế hoạch"
        // khoaBomonFilterOptions={filterOptions?.kehoach}
        
        // Bộ lọc Chuyên ngành (Giữ nguyên)
        chuyenNganhFilterColumnId="chuyennganh"
        chuyenNganhFilterOptions={filterOptions?.chuyennganh}
        
        // Style co dãn
        className="flex-1 flex flex-col h-[calc(100vh-25rem)]"
      />

      {/* Dialog Xác nhận Xóa */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              Xác nhận Xóa Hội đồng?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === "bulk"
                ? `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedIds.length} hội đồng đã chọn?`
                : "Bạn có chắc chắn muốn xóa vĩnh viễn hội đồng này?"}
              <br />
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => {
                const ids =
                  deleteTarget === "bulk"
                    ? selectedIds
                    : [deleteTarget];
                deleteMutation.mutate(ids);
              }}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Xác nhận Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ListHoiDong;