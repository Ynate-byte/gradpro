import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"; // [MỚI] Import useReducedMotion
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
  Shuffle,
  ArrowUp,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import * as hoiDongService from "@/api/adminHoiDongService";
import { CreateHoiDongDialog } from "./CreateHoiDong";
import { AutoAssignMemberDialog } from "./AutoAssignMemberDialog";
import StatCard from "@/components/shared/StatCard";
import { useTheme } from "@/components/theme-provider"; // [MỚI] Import useTheme

const QUERY_KEY_HOIDONG = "adminHoiDong";
const QUERY_KEY_STATS = "hoiDongStats";
const QUERY_KEY_FILTERS = "hoidongFilterOptions";

const loaiOptions = [
  { label: "Hội đồng", value: "hoidong" },
  { label: "Phản biện", value: "phanbien" },
];

const chamDiemOptions = [
  { label: "Đã chấm điểm", value: "da_cham_diem" },
  { label: "Chưa chấm điểm", value: "chua_cham_diem" },
  { label: "Chưa phân bổ nhóm", value: "chua_phan_bo" },
];

// [MỚI] Hàm tạo variants động dựa trên isReduced
const getVariants = (shouldReduce) => {
    if (shouldReduce) {
        return {
            container: { visible: { opacity: 1 } },
            item: { visible: { opacity: 1, y: 0, scale: 1 } }
        };
    }
    return {
        container: {
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } }
        },
        item: {
            hidden: { y: 30, opacity: 0, scale: 0.95 },
            visible: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
        }
    };
};

// ... (Phần EditableTextCell giữ nguyên) ...
const EditableTextCell = ({ getValue, row, colId }) => {
    const initialValue = getValue() || "";
    const [value, setValue] = useState(initialValue);
    const [isEditing, setIsEditing] = useState(false);
    const queryClient = useQueryClient();
    const { mutate, isPending } = useMutation({
        mutationFn: (newValue) => {
            if (colId === "TEN_HOIDONG") {
                return hoiDongService.updateHoiDongName(row.original.ID_HOIDONG, newValue);
            } else if (colId === "PHONG") {
                return hoiDongService.updateHoiDongPhong(row.original.ID_HOIDONG, newValue);
            }
            return Promise.reject(new Error("Unknown column"));
        },
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY_HOIDONG] });
        },
        onError: (err) => {
            const errorMsg = err.response?.data?.errors?.TEN_HOIDONG?.[0] || err.response?.data?.error || "Cập nhật thất bại!";
            toast.error(errorMsg);
            setValue(initialValue);
        },
        onSettled: () => {
            setIsEditing(false);
        },
    });
  
    const onBlur = () => {
        const trimmedValue = String(value).trim();
        if (colId === "TEN_HOIDONG" && !trimmedValue) {
            toast.error("Tên Hội đồng không được để trống.");
            setValue(initialValue);
            setIsEditing(false);
            return;
        }
        if (trimmedValue !== initialValue) {
            mutate(trimmedValue);
        } else {
            setIsEditing(false);
        }
    };
  
    const onKeyDown = (e) => {
        if (e.key === "Enter") {
            e.currentTarget.blur();
        } else if (e.key === "Escape") {
            setValue(initialValue);
            e.currentTarget.blur();
        }
    };
  
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);
  
    if (isPending) {
        return (
            <div className={cn("flex items-center justify-center h-8", colId === "TEN_HOIDONG" ? "justify-start" : "text-center")}>
                <Loader2 className="h-4 w-4 animate-spin" />
            </div>
        );
    }
  
    const displayValue = initialValue || <span className="text-muted-foreground italic">Trống</span>;
  
    if (isEditing) {
        return (
            <Input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                className={cn("h-8 min-w-[50px] p-2", colId === "TEN_HOIDONG" ? "w-full" : "w-16 text-center")}
            />
        );
    }
  
    return (
        <div
            className={cn(
                "w-full min-h-[32px] px-3 py-2 text-sm rounded-md cursor-pointer",
                "border border-transparent hover:bg-muted",
                colId === "TEN_HOIDONG" ? "font-medium text-primary" : "text-center"
            )}
            onClick={() => setIsEditing(true)}
        >
            {displayValue}
        </div>
    );
};

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAutoAssignOpen, setIsAutoAssignOpen] = useState(false);
  const [isUpgradeAlertOpen, setIsUpgradeAlertOpen] = useState(false);
  const [isSingleUpgradeAlertOpen, setIsSingleUpgradeAlertOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState(null);
  const [isInitialPlanSet, setIsInitialPlanSet] = useState(false);

  // [MỚI] Kiểm tra Reduce Motion
  const shouldReduceMotion = useReducedMotion();
  const { reduceMotion } = useTheme();
  const isReduced = reduceMotion || shouldReduceMotion;
  
  const variants = useMemo(() => getVariants(isReduced), [isReduced]);

  const { data: filterOptions, isLoading: isLoadingFilters } = useQuery({
    queryKey: [QUERY_KEY_FILTERS],
    queryFn: async () => {
      const [khRes, cnRes] = await Promise.all([
        hoiDongService.getKeHoachOptions(),
        hoiDongService.getChuyenNganhOptions(),
      ]);
      return {
        kehoach: (khRes || []).map((kh) => ({
          label: kh.TEN_DOT,
          value: kh.ID_KEHOACH.toString(),
          ...kh,
        })),
        chuyennganh: (cnRes || []).map((cn) => ({
          label: cn.TEN_CHUYENNGANH,
          value: cn.ID_CHUYENNGANH.toString(),
        })),
      };
    },
  });

  useEffect(() => {
    if (!isInitialPlanSet && filterOptions?.kehoach?.length > 0) {
      setSelectedPlanId(filterOptions.kehoach[0].value);
      setIsInitialPlanSet(true);
    }
  }, [filterOptions, isInitialPlanSet]);

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: [QUERY_KEY_STATS, selectedPlanId],
    queryFn: () => hoiDongService.getHoiDongStatistics(selectedPlanId || null),
    enabled: !!isLoadingFilters,
  });

  const queryKey = [
    QUERY_KEY_HOIDONG,
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
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        sort: sorting.length > 0 ? `${sorting[0].id},${sorting[0].desc ? "desc" : "asc"}` : undefined,
        search: debouncedSearch,
        kehoach: selectedPlanId,
        chuyennganh: columnFilters.find((f) => f.id === "chuyennganh")?.value,
        loai: columnFilters.find((f) => f.id === "LOAI")?.value,
        trang_thai_cham_diem: columnFilters.find((f) => f.id === "trang_thai_cham_diem")?.value,
      }),
    placeholderData: (prev) => prev,
    enabled: !isLoadingFilters,
  });

  const deleteMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map((id) => hoiDongService.deleteHoiDong(id))),
    onSuccess: () => {
      const count = deleteTarget === "bulk" ? Object.keys(rowSelection).length : 1;
      toast.success(`Đã xóa ${count} hội đồng thành công!`);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_HOIDONG] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STATS] });
      setRowSelection({});
      setDeleteTarget(null);
      setIsAlertOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Xóa thất bại!");
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: (ids) => hoiDongService.bulkUpgradeHoiDong(ids),
    onSuccess: (data) => {
      toast.success(data.message || "Nâng cấp hàng loạt thành công!");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_HOIDONG] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STATS] });
      setRowSelection({});
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Nâng cấp thất bại!");
    },
    onSettled: () => {
      setIsUpgradeAlertOpen(false);
    },
  });

  const singleUpgradeMutation = useMutation({
    mutationFn: (id) => hoiDongService.upgradePhanBienToHoiDong(id),
    onSuccess: (data) => {
      toast.success(data.message || "Nâng cấp thành công!");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_HOIDONG] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STATS] });
      setUpgradeTarget(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Nâng cấp thất bại!");
    },
    onSettled: () => {
      setIsSingleUpgradeAlertOpen(false);
    },
  });

  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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
        cell: ({ row, getValue }) => (
          <EditableTextCell getValue={getValue} row={row} colId="TEN_HOIDONG" />
        ),
        size: 250,
      },
      {
        accessorKey: "LOAI",
        header: "Loại",
        cell: ({ row }) => (
          <Badge
            variant={row.original.LOAI === "phanbien" ? "secondary" : "default"}
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
        accessorKey: "trang_thai_cham_diem",
        header: "Trạng thái chấm",
        cell: ({ row }) => {
          const status = row.original.trang_thai_cham_diem;
          if (status === 'da_cham_diem') {
            return <Badge variant="success">Đã chấm điểm</Badge>;
          }
          if (status === 'chua_cham_diem') {
            return <Badge variant="warning">Chưa chấm điểm</Badge>;
          }
          return <Badge variant="secondary">Chưa phân bổ</Badge>;
        },
        size: 130,
      },
      {
        accessorKey: "PHONG",
        header: "Phòng",
        cell: ({ row, getValue }) => (
          <EditableTextCell getValue={getValue} row={row} colId="PHONG" />
        ),
        size: 80,
      },
      {
        accessorKey: "NGAY_BAOCAO",
        header: "Ngày Báo Cáo",
        cell: ({ row }) => {
          const date = row.original.NGAY_BAOCAO;
          try {
            return date ? format(parseISO(date), "dd/MM/yyyy", { locale: vi }) : "-";
          } catch {
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
        cell: ({ row }) => <div className="text-center">{row.original.so_thanh_vien || 0}</div>,
        size: 100,
      },
      {
        accessorKey: "so_nhom",
        header: () => <div className="text-center">Nhóm P/B</div>,
        cell: ({ row }) => <div className="text-center">{row.original.so_nhom || 0}</div>,
        size: 100,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => {
          const hoidong = row.original;
          const isPhanBien = hoidong.LOAI === "phanbien";
          return (
            <div className="text-right space-x-2 flex justify-end">
              {isPhanBien && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    setUpgradeTarget(hoidong);
                    setIsSingleUpgradeAlertOpen(true);
                  }}
                  title="Nâng cấp lên Hội đồng Bảo vệ (3 thành viên)"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(`/admin/hoidong/detail/${hoidong.ID_HOIDONG}`)}
              >
                <Pen className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => {
                  setDeleteTarget(hoidong.ID_HOIDONG);
                  setIsAlertOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
        size: 100,
      },
    ],
    [navigate, queryClient]
  );

  const isLoading = isLoadingFilters || isLoadingData;
  const pageCount = data?.meta?.last_page ?? 0;
  const selectedIds = useMemo(
    () => Object.keys(rowSelection).map((key) => data?.data[key]?.ID_HOIDONG).filter(Boolean),
    [rowSelection, data?.data]
  );

  const handleCreateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY_HOIDONG] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STATS] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY_FILTERS] });
  };

  const bulkActions = (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsUpgradeAlertOpen(true)}
        disabled={upgradeMutation.isPending || deleteMutation.isPending}
      >
        <ArrowUp className="mr-2 h-4 w-4" />
        Nâng cấp HĐ Phản Biện
      </Button>
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
    </div>
  );

  const handleStatCardClick = (filterId, value) => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    
    setColumnFilters(prevFilters => {
      const otherFilters = prevFilters.filter(f => f.id !== filterId);
      if (value === undefined) {
        return otherFilters;
      }
      return [...otherFilters, { id: filterId, value: [value] }];
    });
  };

  const [tableHeight, setTableHeight] = useState('auto');
  const tableRef = useRef(null);

  useLayoutEffect(() => {
    if (tableRef.current) {
      const height = tableRef.current.getBoundingClientRect().height;
      setTableHeight(height);
    }
  }, [data, isLoadingData, pagination]);

  return (
    <>
      <div className="p-4 md:p-8 space-y-4 h-full flex flex-col">
        <motion.div 
          className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 flex-shrink-0"
          variants={variants.container}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={variants.item}>
            <StatCard 
              icon={Users} 
              title="Tổng số Hội đồng" 
              value={isLoadingStats ? 'loading' : stats?.totalHoiDong} 
              iconBgClass="bg-blue-100" 
              iconColorClass="text-blue-600"
              onClick={() => handleStatCardClick('loai', undefined)}
            />
          </motion.div>
          <motion.div variants={variants.item}>
            <StatCard 
              icon={Shield} 
              title="HĐ Bảo Vệ" 
              value={isLoadingStats ? 'loading' : stats?.totalBaoVe} 
              iconBgClass="bg-green-100" 
              iconColorClass="text-green-600"
              onClick={() => handleStatCardClick('LOAI', 'hoidong')}
            />
          </motion.div>
          <motion.div variants={variants.item}>
            <StatCard 
              icon={BookOpen} 
              title="HĐ Phản Biện" 
              value={isLoadingStats ? 'loading' : stats?.totalPhanBien} 
              iconBgClass="bg-yellow-100" 
              iconColorClass="text-yellow-600"
              onClick={() => handleStatCardClick('LOAI', 'phanbien')}
            />
          </motion.div>
          <motion.div variants={variants.item}>
            <StatCard 
              icon={GraduationCap} 
              title="Tổng Thành viên" 
              value={isLoadingStats ? 'loading' : stats?.totalThanhVien} 
              iconBgClass="bg-indigo-100" 
              iconColorClass="text-indigo-600" 
            />
          </motion.div>
          <motion.div variants={variants.item}>
            <StatCard 
              icon={Users2} 
              title="Nhóm đã phân bổ" 
              value={isLoadingStats ? 'loading' : stats?.nhomDaPhanBo} 
              iconBgClass="bg-orange-100" 
              iconColorClass="text-orange-600" 
            />
          </motion.div>
        </motion.div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="default" onClick={() => setIsAutoAssignOpen(true)} disabled={!selectedPlanId}>
              <Shuffle className="mr-2 h-4 w-4" /> Phân công thành viên tự động
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/hoidong/phanbo">
                <Users2 className="mr-2 h-4 w-4" /> Phân bổ nhóm
              </Link>
            </Button>
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

        {/* [MỚI] Animation cho bảng */}
        <motion.div
          initial={false}
          animate={{ height: tableHeight }}
          transition={{
              duration: isReduced ? 0 : 0.5,
              ease: [0.4, 0, 0.2, 1]
          }}
          style={{ overflow: 'hidden' }}
          className="flex-grow"
        >
          <div ref={tableRef}>
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
              state={{ pagination, sorting, columnFilters, rowSelection }}
              searchColumnId="search"
              searchPlaceholder="Tìm tên hội đồng..."
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              chuyenNganhFilterColumnId="chuyennganh"
              chuyenNganhFilterOptions={filterOptions?.chuyennganh}
              khoaBomonFilterColumnId="LOAI" 
              khoaBomonFilterTitle="Loại Hội đồng"
              khoaBomonFilterOptions={loaiOptions}
              statusColumnId="trang_thai_cham_diem"
              statusOptions={chamDiemOptions}
              bulkActions={bulkActions}
            />
          </div>
        </motion.div>

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
              <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  const ids = deleteTarget === "bulk" ? selectedIds : [deleteTarget];
                  deleteMutation.mutate(ids);
                }}
              >
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Xác nhận Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isUpgradeAlertOpen} onOpenChange={setIsUpgradeAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ArrowUp className="h-6 w-6 text-primary" />
                Xác nhận Nâng cấp Hội đồng?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn nâng cấp {selectedIds.length} HĐ Phản Biện đã chọn lên HĐ Bảo Vệ không?
                <br />
                Hệ thống sẽ chỉ nâng cấp các HĐ hợp lệ (loại "phản biện" và có 1 thành viên).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={upgradeMutation.isPending}>Hủy</AlertDialogCancel>
              <AlertDialogAction
                disabled={upgradeMutation.isPending}
                onClick={() => {
                  upgradeMutation.mutate(selectedIds);
                }}
              >
                {upgradeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Xác nhận Nâng cấp
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isSingleUpgradeAlertOpen} onOpenChange={setIsSingleUpgradeAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ArrowUp className="h-6 w-6 text-primary" />
                Xác nhận Nâng cấp Hội đồng?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn nâng cấp HĐ Phản Biện "{upgradeTarget?.TEN_HOIDONG}" lên Hội đồng Bảo vệ (3 thành viên)?
                <br /><br />
                Quy trình này sẽ giữ lại 1 GV Phản biện làm Thành viên và yêu cầu bạn bổ sung 2 GV (Chủ tịch, Thư ký).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={singleUpgradeMutation.isPending}>Hủy</AlertDialogCancel>
              <AlertDialogAction
                disabled={singleUpgradeMutation.isPending}
                onClick={() => {
                  if (upgradeTarget) {
                    singleUpgradeMutation.mutate(upgradeTarget.ID_HOIDONG);
                  }
                }}
              >
                {singleUpgradeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Xác nhận Nâng cấp
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <CreateHoiDongDialog
          isOpen={isCreateOpen}
          setIsOpen={setIsCreateOpen}
          onSuccess={handleCreateSuccess}
        />

        <AutoAssignMemberDialog
          isOpen={isAutoAssignOpen}
          setIsOpen={setIsAutoAssignOpen}
          selectedPlanId={selectedPlanId}
          planOptions={filterOptions?.kehoach}
          onSuccess={handleCreateSuccess}
        />
      </div>
    </>
  );
};

export default ListHoiDong;