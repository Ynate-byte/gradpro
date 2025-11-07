import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  Users,
  BookOpen,
  GraduationCap,
  Shield,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import * as hoiDongService from "@/api/adminHoiDongService";
// [THÊM MỚI] Import dialog tạo hội đồng
import { CreateHoiDongDialog } from "./CreateHoiDong"; // Giả sử tên file vẫn là CreateHoiDong.jsx

// [Component StatCard] (Không đổi)
const StatCard = ({
  icon: Icon,
  title,
  value,
  isLoading,
  iconBgClass = "bg-primary/10",
  iconColorClass = "text-primary",
}) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className={cn("p-3 rounded-lg", iconBgClass)}>
        <Icon className={cn("h-6 w-6", iconColorClass)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground truncate">
          {title}
        </p>
        {isLoading ? (
          <Skeleton className="h-7 w-12 mt-1" />
        ) : (
          <p className="text-2xl font-bold">{value?.toLocaleString("vi-VN") ?? 0}</p>
        )}
      </div>
    </CardContent>
  </Card>
);

// [Component EditableCell] (Không đổi)
const EditableCell = ({ getValue, row, column, table }) => {
  const initialValue = getValue() || "";
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (newPhong) =>
      hoiDongService.updateHoiDongPhong(row.original.ID_HOIDONG, newPhong),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries(["adminHoiDong"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Cập nhật thất bại!");
      setValue(initialValue);
    },
    onSettled: () => {
      setIsEditing(false);
    },
  });

  const onBlur = () => {
    if (value !== initialValue) {
      mutate(value);
    } else {
      setIsEditing(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      onBlur();
    } else if (e.key === "Escape") {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-8">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return isEditing ? (
    <Input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className="h-8 w-16"
    />
  ) : (
    <div
      className={cn(
        "w-full min-h-[32px] px-3 py-2 text-sm rounded-md cursor-pointer",
        "border border-transparent",
        "hover:bg-muted"
      )}
      onClick={() => setIsEditing(true)}
    >
      {value || <span className="text-muted-foreground italic">Trống</span>}
    </div>
  );
};

// --- Component Chính ---
const ListHoiDong = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  // [THÊM MỚI] State cho dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // --- Data Fetching (Không đổi) ---
  const { data: filterOptions, isLoading: isLoadingFilters } = useQuery({
    queryKey: ["hoidongFilterOptions"],
    queryFn: async () => {
      const [khRes, cnRes] = await Promise.all([
        hoiDongService.getKeHoachOptions(),
        hoiDongService.getChuyenNganhOptions(),
      ]);
      return {
        kehoach: (khRes || []).map((kh) => ({
          label: kh.TEN_DOT,
          value: kh.ID_KEHOACH.toString(),
        })),
        chuyennganh: (cnRes || []).map((cn) => ({
          label: cn.TEN_CHUYENNGANH,
          value: cn.ID_CHUYENNGANH.toString(),
        })),
      };
    },
    onSuccess: (data) => {
      if (!selectedPlanId && data?.kehoach?.length > 0) {
        setSelectedPlanId(data.kehoach[0].value);
      }
    },
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["hoiDongStats", selectedPlanId],
    queryFn: () => hoiDongService.getHoiDongStatistics(selectedPlanId || null),
    enabled: !isLoadingFilters,
  });

  const queryKey = [
    "adminHoiDong",
    pagination,
    columnFilters,
    sorting,
    debouncedSearch,
    selectedPlanId,
  ];
  const { data, isLoading: isLoadingData } = useQuery({
    queryKey,
    queryFn: () =>
      hoiDongService.getHoiDongPaginated({
        pagination,
        sorting,
        columnFilters,
        debouncedSearch,
        selectedPlanId,
      }),
    placeholderData: (prev) => prev,
    enabled: !isLoadingFilters,
  });

  // --- Mutation (Delete) (Không đổi) ---
  const deleteMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => hoiDongService.deleteHoiDong(id))),
    onSuccess: () => {
      const count =
        deleteTarget === "bulk" ? Object.keys(rowSelection).length : 1;
      toast.success(`Đã xóa ${count} hội đồng thành công!`);
      queryClient.invalidateQueries({ queryKey: ["adminHoiDong"] });
      queryClient.invalidateQueries({ queryKey: ["hoiDongStats"] });
      setRowSelection({});
      setDeleteTarget(null);
      setIsAlertOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Xóa thất bại!");
    },
  });

  // --- Cột (Columns) (Không đổi) ---
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
        size: 50,
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
        size: 250,
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
        size: 100,
      },
      {
        accessorKey: "chuyennganh",
        header: "Chuyên ngành",
        accessorFn: (row) => row.chuyennganh?.TEN_CHUYENNGANH,
        cell: ({ row }) => row.original.chuyennganh?.TEN_CHUYENNGANH || "-",
        size: 200,
      },
      {
        accessorKey: "PHONG",
        header: "Phòng",
        cell: EditableCell,
        size: 80,
      },
      {
        accessorKey: "NGAY_BAOCAO",
        header: "Ngày Báo Cáo",
        cell: ({ row }) => {
          const date = row.original.NGAY_BAOCAO;
          try {
            return date ? format(parseISO(date), 'dd/MM/yyyy', { locale: vi }) : "-";
          } catch (e) {
            return date;
          }
        },
        size: 120,
      },
      {
        accessorKey: "GIO_BAOCAO",
        header: "Giờ Báo Cáo",
        cell: ({ row }) => {
            const time = row.original.GIO_BAOCAO;
            return time ? time.substring(0, 5) : "-";
        },
        size: 100,
      },
      {
        accessorKey: "so_thanh_vien",
        header: () => <div className="text-center">Thành viên</div>,
        cell: ({ row }) => (
          <div className="text-center">{row.original.so_thanh_vien || 0}</div>
        ),
        size: 100,
      },
      {
        accessorKey: "so_nhom",
        header: () => <div className="text-center">Nhóm P/B</div>,
        cell: ({ row }) => (
          <div className="text-center">{row.original.so_nhom || 0}</div>
        ),
        size: 100,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Thao tác</div>,
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
        size: 100,
      },
    ],
    [navigate, queryClient]
  );

  const isLoading = isLoadingFilters || isLoadingData;
  const pageCount = data?.meta?.last_page ?? 0;
  const selectedIds = Object.keys(rowSelection)
    .map((key) => data?.data[key]?.ID_HOIDONG)
    .filter(Boolean);

  // [THÊM MỚI] Hàm xử lý khi tạo thành công
  const handleCreateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["adminHoiDong"] });
    queryClient.invalidateQueries({ queryKey: ["hoiDongStats"] });
  };

  return (
    <>
      <div className="p-4 md:p-8 space-y-4 h-full flex flex-col">
        
        {/* Thẻ Thống Kê */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 flex-shrink-0">
          <StatCard
            icon={Users}
            title="Tổng số Hội đồng"
            value={stats?.totalHoiDong}
            isLoading={isLoadingStats}
            iconBgClass="bg-blue-100"
            iconColorClass="text-blue-600"
          />
          <StatCard
            icon={Shield}
            title="HĐ Bảo Vệ"
            value={stats?.totalBaoVe}
            isLoading={isLoadingStats}
            iconBgClass="bg-green-100"
            iconColorClass="text-green-600"
          />
          <StatCard
            icon={BookOpen}
            title="HĐ Phản Biện"
            value={stats?.totalPhanBien}
            isLoading={isLoadingStats}
            iconBgClass="bg-yellow-100"
            iconColorClass="text-yellow-600"
          />
          <StatCard
            icon={GraduationCap}
            title="Tổng Thành viên"
            value={stats?.totalThanhVien}
            isLoading={isLoadingStats}
            iconBgClass="bg-indigo-100"
            iconColorClass="text-indigo-600"
          />
          <StatCard
            icon={Users2}
            title="Nhóm đã phân bổ"
            value={stats?.nhomDaPhanBo}
            isLoading={isLoadingStats}
            iconBgClass="bg-orange-100"
            iconColorClass="text-orange-600"
          />
        </div>

        {/* Header và Nút hành động */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/hoidong/phanbo">
                <Users2 className="mr-2 h-4 w-4" /> Phân bổ nhóm
              </Link>
            </Button>
            {/* [SỬA] Thay đổi onClick */}
            <Button onClick={() => setIsCreateOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Thêm hội đồng
            </Button>
          </div>
          <div className="space-y-2 w-full md:w-[400px]">
            <Label htmlFor="plan-select" className="sr-only">Chọn Kế Hoạch</Label>
            {isLoadingFilters ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                id="plan-select"
                value={selectedPlanId}
                onValueChange={(value) => {
                  setSelectedPlanId(value === "all" ? "" : value);
                  setPagination({ pageIndex: 0, pageSize: 10 });
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
        </div>

        {/* Thanh Bulk Action */}
        {selectedIds.length > 0 && (
          <Card className="flex-shrink-0">
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
          searchColumnId="search"
          searchPlaceholder="Tìm tên hội đồng..."
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          
          chuyenNganhFilterColumnId="chuyennganh"
          chuyenNganhFilterOptions={filterOptions?.chuyennganh}
          
          flexLayout={true}
          className="flex-grow min-h-0"
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
      
      {/* [THÊM MỚI] Render Dialog */}
      <CreateHoiDongDialog
        isOpen={isCreateOpen}
        setIsOpen={setIsCreateOpen}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
};

export default ListHoiDong;